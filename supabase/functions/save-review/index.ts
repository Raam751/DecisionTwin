/**
 * save-review
 *
 * Persists what a human reviewer did to one evidence record.
 *
 * The browser holds the public key and both tables are read-only under Row
 * Level Security, so a review can only be written from here, with the service
 * role. The record row is updated with the reviewer's working copy, and every
 * genuinely new override or decision is appended to reviewer_events, which is
 * the audit trail: what changed, from what, to what, why, and who did it.
 *
 * This function never verifies citations. Verification happens once, when the
 * evidence is generated, and the stored flag is carried through untouched.
 *
 * Self-contained on purpose: the deploy platform bundles this file alone.
 *
 * Required secrets, provided by the platform:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

interface RequestBody {
  recordId?: unknown;
  /**
   * Which browser workspace owns this record. Required, because matching on the
   * record id alone would let a review be written against a row this workspace
   * can never read back, which loses the reviewer's work silently.
   */
  workspaceId?: unknown;
  evidence?: unknown;
  reviewerEdits?: unknown;
  humanDecision?: unknown;
  /** The hiring stage the candidate is in now. Optional for old clients. */
  currentStage?: unknown;
  /** One decision per stage, most recent last. Optional for old clients. */
  decisions?: unknown;
}

interface EvidenceItem {
  criterionId: string;
  status: string;
  quotedText: string;
  sourceStartLine: number;
  sourceEndLine: number;
  explanation: string;
  citationVerified: boolean;
  recordedAtInterview: boolean;
  recordedBy: string;
  recordedAt: string;
  /** The hiring stage this interview item was captured in, if any. */
  stage?: string;
}

interface ReviewerEdit {
  field: string;
  previousValue: string;
  newValue: string;
  reason: string;
  reviewer: string;
  timestamp: string;
}

interface HumanDecision {
  disposition: string;
  reason: string;
  reviewerName: string;
  timestamp: string;
}

interface StageDecision extends HumanDecision {
  stage: string;
}

interface ReviewerEvent {
  event_type: "override" | "decision";
  field: string;
  previous_value: string;
  new_value: string;
  reason: string;
  reviewer: string;
}

const STATUSES = ["supported", "uncertain", "conflicting"];

const asText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const asLine = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;

/**
 * Only the fields the review screen actually uses are kept, so a stray key in
 * the payload can never end up in the stored record.
 */
function shapeEvidence(raw: unknown): EvidenceItem[] {
  if (!Array.isArray(raw)) return [];
  const out: EvidenceItem[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const criterionId = asText(item.criterionId);
    const status = asText(item.status);
    if (!criterionId || !STATUSES.includes(status)) continue;

    out.push({
      criterionId,
      status,
      quotedText: typeof item.quotedText === "string" ? item.quotedText : "",
      sourceStartLine: asLine(item.sourceStartLine),
      sourceEndLine: asLine(item.sourceEndLine),
      explanation:
        typeof item.explanation === "string" ? item.explanation : "",
      citationVerified: item.citationVerified === true,
      recordedAtInterview: item.recordedAtInterview === true,
      recordedBy: asText(item.recordedBy),
      recordedAt: asText(item.recordedAt),
      stage: asText(item.stage) || undefined,
    });
  }

  return out;
}

/**
 * The identity of an evidence item in the stored record.
 *
 * There is exactly one document item per criterion, and one interview item per
 * criterion per hiring stage. This key is what lets a Round 2 answer keep the
 * Round 1 answer for the same criterion instead of collapsing them.
 */
const evidenceKey = (item: {
  criterionId: string;
  recordedAtInterview?: boolean;
  stage?: string;
}): string =>
  item.recordedAtInterview
    ? `${item.criterionId}|interview:${item.stage ?? ""}`
    : `${item.criterionId}|document`;

/**
 * Merges a reviewer's changes into the stored evidence.
 *
 * A reviewer may change a status and its explanation. A reviewer may NOT change
 * a citation, and may never set citationVerified, because only the evidence
 * generator can check a quote against the source document, and this function
 * never receives the document. So every citation field is taken from the stored
 * record and the request's values are discarded.
 *
 * Interview-sourced items are the one deliberate exception, and it is a narrow
 * one: the answer IS the quote, so the reviewer's own words are kept, but the
 * server still enforces the unverified defaults. There is no document for an
 * interview answer, so it always lands with no line numbers and
 * citationVerified false, whoever sent it. This function can therefore never
 * be used to smuggle a verified citation into the record.
 *
 * An item with no stored counterpart cannot have been verified by this service,
 * so it is kept with citationVerified false and no line numbers. That is also
 * the correct handling for evidence captured from an interview rather than a
 * document.
 */
function mergeEvidence(
  stored: EvidenceItem[],
  incoming: EvidenceItem[],
): EvidenceItem[] {
  const byKey = new Map(stored.map((item) => [evidenceKey(item), item]));

  return incoming.map((item) => {
    const key = evidenceKey(item);
    const prior = byKey.get(key);

    if (item.recordedAtInterview) {
      return {
        criterionId: item.criterionId,
        status: item.status,
        quotedText: item.quotedText,
        sourceStartLine: 0,
        sourceEndLine: 0,
        explanation: item.explanation || prior?.explanation || "",
        citationVerified: false,
        recordedAtInterview: true,
        recordedBy: item.recordedBy || prior?.recordedBy || "",
        recordedAt: item.recordedAt || prior?.recordedAt || "",
        stage: item.stage || prior?.stage || "",
      };
    }

    if (!prior) {
      return {
        ...item,
        sourceStartLine: 0,
        sourceEndLine: 0,
        citationVerified: false,
      };
    }

    return {
      ...prior,
      status: item.status,
      explanation: item.explanation || prior.explanation,
    };
  });
}

function shapeEdits(raw: unknown): ReviewerEdit[] {
  if (!Array.isArray(raw)) return [];
  const out: ReviewerEdit[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const edit = entry as Record<string, unknown>;
    const field = asText(edit.field);
    const timestamp = asText(edit.timestamp);
    if (!field || !timestamp) continue;

    out.push({
      field,
      previousValue: asText(edit.previousValue),
      newValue: asText(edit.newValue),
      reason: asText(edit.reason),
      reviewer: asText(edit.reviewer),
      timestamp,
    });
  }

  return out;
}

function shapeDecision(raw: unknown): HumanDecision | null {
  if (!raw || typeof raw !== "object") return null;
  const decision = raw as Record<string, unknown>;
  const disposition = asText(decision.disposition);
  const reviewerName = asText(decision.reviewerName);
  if (!disposition || !reviewerName) return null;

  return {
    disposition,
    reason: asText(decision.reason),
    reviewerName,
    timestamp: asText(decision.timestamp) || new Date().toISOString(),
  };
}

/**
 * Shapes the per-stage decision history, preserving its order. An entry without
 * a disposition or a named reviewer is not a real decision and is dropped.
 */
function shapeStageDecisions(raw: unknown): StageDecision[] {
  if (!Array.isArray(raw)) return [];
  const out: StageDecision[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const decision = entry as Record<string, unknown>;
    const disposition = asText(decision.disposition);
    const reviewerName = asText(decision.reviewerName);
    if (!disposition || !reviewerName) continue;
    out.push({
      disposition,
      reason: asText(decision.reason),
      reviewerName,
      timestamp: asText(decision.timestamp) || new Date().toISOString(),
      stage: asText(decision.stage),
    });
  }

  return out;
}

/** Two edits are the same action when they touch one field at one instant. */
const editKey = (edit: { field?: unknown; timestamp?: unknown }): string =>
  `${asText(edit?.field)}|${asText(edit?.timestamp)}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const recordId = asText(body?.recordId);
  if (!recordId) return json({ error: "recordId is required" }, 400);

  const workspaceId = asText(body?.workspaceId);
  if (!workspaceId) return json({ error: "workspaceId is required" }, 400);

  // A malformed payload must not wipe the record, so the two collections the
  // review screen owns are required to be arrays before anything is written.
  if (!Array.isArray(body?.evidence) || !Array.isArray(body?.reviewerEdits)) {
    return json(
      { error: "evidence and reviewerEdits must both be arrays" },
      400,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "the review store is not configured" }, 500);
  }

  const evidence = shapeEvidence(body.evidence);
  const reviewerEdits = shapeEdits(body.reviewerEdits);
  const humanDecision = shapeDecision(body.humanDecision);
  const stageDecisions = shapeStageDecisions(body.decisions);
  const incomingStage =
    typeof body?.currentStage === "string" ? body.currentStage.trim() : null;

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: existing, error: readError } = await admin
    .from("evidence_records")
    .select(
      "evidence, reviewer_edits, human_decision, current_stage, decisions",
    )
    .eq("id", recordId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (readError) {
    return json({ error: `could not read the record: ${readError.message}` }, 502);
  }
  if (!existing) {
    return json(
      {
        error:
          "this review is not in the store yet, so reviewer actions cannot be saved against it. Generate the evidence record first.",
        code: "record_missing",
      },
      404,
    );
  }

  // Citations come from the stored record only. The request cannot introduce or
  // alter a verified citation.
  const storedEvidence = shapeEvidence(existing.evidence);
  const mergedEvidence = mergeEvidence(storedEvidence, evidence);

  const priorEdits = Array.isArray(existing.reviewer_edits)
    ? (existing.reviewer_edits as { field?: unknown; timestamp?: unknown }[])
    : [];
  const knownEdits = new Set(priorEdits.map(editKey));
  const events: ReviewerEvent[] = [];

  for (const edit of reviewerEdits) {
    const key = editKey(edit);
    if (knownEdits.has(key)) continue;
    knownEdits.add(key);
    // An edit without a reason or a name is not an auditable action, so it is
    // stored on the record but kept out of the audit trail.
    if (!edit.reason || !edit.reviewer) continue;

    events.push({
      event_type: "override",
      field: edit.field,
      previous_value: edit.previousValue,
      new_value: edit.newValue,
      reason: edit.reason,
      reviewer: edit.reviewer,
    });
  }

  const priorDecision = shapeDecision(existing.human_decision);
  const decisionChanged =
    (humanDecision?.timestamp ?? null) !==
    (priorDecision?.timestamp ?? null);

  if (decisionChanged && humanDecision) {
    events.push({
      event_type: "decision",
      field: "humanDecision.disposition",
      previous_value: priorDecision?.disposition ?? "",
      new_value: humanDecision.disposition,
      reason: humanDecision.reason || "Decision recorded by the reviewer.",
      reviewer: humanDecision.reviewerName,
    });
  } else if (decisionChanged && priorDecision) {
    events.push({
      event_type: "decision",
      field: "humanDecision.disposition",
      previous_value: priorDecision.disposition,
      new_value: "",
      reason: "Decision retracted by the reviewer and reopened.",
      reviewer: priorDecision.reviewerName,
    });
  }

  // A stage advance is a human action: name the stage moved from and to, and
  // carry the reason and reviewer of the decision that justified it.
  const priorStage =
    typeof existing.current_stage === "string" ? existing.current_stage : null;
  if (incomingStage !== null && priorStage !== incomingStage) {
    events.push({
      event_type: "decision",
      field: "currentStage",
      previous_value: priorStage ?? "",
      new_value: incomingStage,
      reason:
        humanDecision?.reason || "Stage advanced by the reviewer.",
      reviewer: humanDecision?.reviewerName || "",
    });
  }

  // Only the two fields the review screen owns are ever replaced outright.
  const patch: Record<string, unknown> = {
    evidence: mergedEvidence,
    reviewer_edits: reviewerEdits,
    human_decision: humanDecision,
  };
  // Stage fields are written only when the client sends them, so a client
  // built before stages can never wipe stage data by saving without it.
  if (Array.isArray(body?.decisions)) patch.decisions = stageDecisions;
  if (incomingStage !== null) patch.current_stage = incomingStage;

  // updated_at is maintained by the touch trigger on the table.
  const { error: updateError } = await admin
    .from("evidence_records")
    .update(patch)
    .eq("id", recordId)
    .eq("workspace_id", workspaceId);

  if (updateError) {
    return json(
      { error: `could not save the review: ${updateError.message}` },
      502,
    );
  }

  if (events.length > 0) {
    const { error: insertError } = await admin
      .from("reviewer_events")
      .insert(events.map((event) => ({ record_id: recordId, ...event })));

    if (insertError) {
      // The review itself is saved. Say plainly that the audit append failed
      // rather than reporting a save that leaves no trace.
      return json(
        {
          saved: true,
          events: 0,
          auditWarning: `the review was saved, but the audit trail could not be appended: ${insertError.message}`,
        },
        202,
      );
    }
  }

  // Echo the stored evidence so the client can adopt anything the server
  // corrected, rather than keeping a local view the store disagrees with.
  return json({ saved: true, events: events.length, evidence: mergedEvidence });
});
