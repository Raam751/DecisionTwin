/**
 * generate-evidence
 *
 * Takes a role's criteria and a candidate's numbered document lines, asks the
 * model for source-linked evidence, then verifies every citation server-side
 * before returning or storing anything.
 *
 * Required secrets:
 *   MODEL_API_URL   model endpoint, base URL is fine, the path is normalised
 *   MODEL_API_KEY   credential for that endpoint
 *   MODEL_NAME      model identifier
 * Optional:
 *   MODEL_PROTOCOL      "anthropic" or "openai". Auto-detected when unset:
 *                       a model name containing "claude" uses the Anthropic
 *                       Messages protocol, everything else uses
 *                       OpenAI-compatible chat completions.
 *   MODEL_AUTH_SCHEME   "x-api-key", "bearer" or "both". Pins the credential
 *                       form once you know which one the gateway accepts,
 *                       instead of trying each in turn.
 *   MODEL_EXTRA_HEADERS JSON object of additional headers, for gateways that
 *                       require project attribution or similar. Example:
 *                       {"x-project-id":"abc123"}
 * Provided automatically by Supabase:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * The service role key must never be sent to the browser.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Server-side citation verification.
//
// Kept inline on purpose. The deploy platform bundles this file alone, so a
// shared module would mean the deployed code could drift from the repository.
// This is the core trust mechanism: the model proposes a quote and a line
// range, and this code independently checks the quote really exists there. The
// model never sets citationVerified. Only this code does.
// ---------------------------------------------------------------------------

type EvidenceStatus = "supported" | "uncertain" | "conflicting";

interface DocumentLine {
  lineNumber: number;
  text: string;
}

interface EvidenceItem {
  criterionId: string;
  status: EvidenceStatus;
  quotedText: string;
  sourceStartLine: number;
  sourceEndLine: number;
  explanation: string;
  citationVerified: boolean;
}

const UNVERIFIED_EXPLANATION =
  "Citation could not be verified against the source document.";

/** Whitespace is collapsed on both sides so newline or space joins both match. */
const normalise = (value: string): string =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** Joins a line range exactly the way verification expects. */
function joinRange(
  lines: DocumentLine[],
  startLine: number,
  endLine: number,
): string {
  return lines
    .filter((l) => l.lineNumber >= startLine && l.lineNumber <= endLine)
    .sort((a, b) => a.lineNumber - b.lineNumber)
    .map((l) => l.text)
    .join(" ");
}

/**
 * Verifies one item, downgrading it when the citation does not hold up.
 * A claim the server cannot confirm becomes uncertain rather than supported.
 */
function verifyItem(item: EvidenceItem, lines: DocumentLine[]): EvidenceItem {
  if (item.status === "uncertain") {
    return {
      ...item,
      quotedText: "",
      sourceStartLine: 0,
      sourceEndLine: 0,
      citationVerified: false,
    };
  }

  const rangeIsSane =
    Number.isInteger(item.sourceStartLine) &&
    Number.isInteger(item.sourceEndLine) &&
    item.sourceStartLine >= 1 &&
    item.sourceEndLine >= item.sourceStartLine &&
    lines.some((l) => l.lineNumber === item.sourceStartLine) &&
    lines.some((l) => l.lineNumber === item.sourceEndLine);

  const haystack = rangeIsSane
    ? normalise(joinRange(lines, item.sourceStartLine, item.sourceEndLine))
    : "";

  // A contradiction lives in two places at once, so a quote may be several
  // passages joined by " ... ". Every segment must still appear verbatim inside
  // the cited range. A single contiguous quote is just the one-segment case.
  const segments = normalise(item.quotedText)
    .split(/\s*\.\.\.\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const holds =
    rangeIsSane &&
    segments.length > 0 &&
    segments.every((segment) => haystack.includes(segment));

  if (holds) {
    return { ...item, citationVerified: true };
  }

  return {
    ...item,
    status: "uncertain",
    quotedText: "",
    sourceStartLine: 0,
    sourceEndLine: 0,
    explanation: UNVERIFIED_EXPLANATION,
    citationVerified: false,
  };
}

function verifyAll(
  items: EvidenceItem[],
  lines: DocumentLine[],
): { verified: EvidenceItem[]; rejected: string[] } {
  const rejected: string[] = [];
  const verified = items.map((item) => {
    const result = verifyItem(item, lines);
    if (item.status !== "uncertain" && result.status === "uncertain") {
      rejected.push(item.criterionId);
    }
    return result;
  });
  return { verified, rejected };
}

/** Cheap deterministic hash of the model input, for the replay record. */
async function hashInput(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// Edge function
// ---------------------------------------------------------------------------

const PROMPT_VERSION = "v1";
const SCHEMA_VERSION = "v1";

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
  candidateId: string;
  roleId: string;
  criteria: { id: string; label: string; description: string }[];
  documentLines: DocumentLine[];
  persist?: boolean;
  /** Which browser workspace generated this, so records stay isolated. */
  workspaceId?: string;
}

function buildPrompt(body: RequestBody): string {
  const numbered = body.documentLines
    .map((l) => `${l.lineNumber}: ${l.text}`)
    .join("\n");

  const criteria = body.criteria
    .map((c) => `- ${c.id} (${c.label}): ${c.description}`)
    .join("\n");

  return [
    "You assess whether a candidate document supports a set of hiring criteria.",
    "",
    "CRITERIA",
    criteria,
    "",
    "SOURCE DOCUMENT, one numbered line per line",
    numbered,
    "",
    "RULES",
    "1. Return exactly one evidence item per criterion, using the criterion id.",
    '2. status is "supported" only when the document directly supports the criterion.',
    '3. status is "uncertain" when support is missing, vague or too weak.',
    '4. status is "conflicting" when the document makes two claims that cannot both be true.',
    "5. quotedText must be copied verbatim from the lines you cite. Never paraphrase.",
    "6. When you cite several consecutive lines, join their text with a single space.",
    "7. sourceStartLine and sourceEndLine must be the real line numbers of that quote.",
    '8. For "uncertain", set quotedText to an empty string and both line numbers to 0.',
    "9. Never invent evidence. A missing citation is the correct answer, not a failure.",
    "10. Add one interviewQuestion for every criterion that is not supported.",
    '11. For a conflicting criterion, quote BOTH clashing passages verbatim, separated by " ... ", and set sourceStartLine to the first passage\'s line and sourceEndLine to the last passage\'s line.',
    "",
    "Return only JSON in this shape:",
    '{"evidence":[{"criterionId":"","status":"supported|uncertain|conflicting",',
    '"quotedText":"","sourceStartLine":0,"sourceEndLine":0,"explanation":""}],',
    '"interviewQuestions":[{"criterionId":"","question":""}]}',
  ].join("\n");
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object in response");
  return JSON.parse(trimmed.slice(start, end + 1));
}

const SYSTEM_PROMPT =
  "You return only valid JSON. You never invent evidence that is not in the source document. You copy quotes verbatim.";

const MAX_TOKENS = 4000;
const ANTHROPIC_VERSION = "2023-06-01";

type Protocol = "anthropic" | "openai";

function resolveProtocol(): Protocol {
  const explicit = Deno.env.get("MODEL_PROTOCOL")?.toLowerCase().trim();
  if (explicit === "anthropic" || explicit === "openai") return explicit;

  const model = (Deno.env.get("MODEL_NAME") ?? "").toLowerCase();
  const url = (Deno.env.get("MODEL_API_URL") ?? "").toLowerCase();
  if (model.includes("claude") || url.includes("/messages")) return "anthropic";
  return "openai";
}

/**
 * Gateways are strict about routes, and people paste base URLs. Normalise to
 * the correct path for the protocol without breaking an already correct URL.
 */
function resolveUrl(protocol: Protocol): string {
  const raw = (Deno.env.get("MODEL_API_URL") ?? "").trim().replace(/\/+$/, "");
  if (protocol === "anthropic") {
    if (raw.includes("/messages")) return raw;
    return raw.endsWith("/v1") ? `${raw}/messages` : `${raw}/v1/messages`;
  }
  if (raw.includes("/chat/completions")) return raw;
  return raw.endsWith("/v1") ? `${raw}/chat/completions` : `${raw}/v1/chat/completions`;
}

/**
 * How the credential is presented. Gateways differ, and sending the wrong
 * combination can fail even with a valid key: a gateway that validates the
 * Authorization header as a JWT will reject a plain API key sent that way.
 */
type AuthScheme = "x-api-key" | "bearer" | "both";

interface CallOptions {
  /** OpenAI JSON mode, or Anthropic assistant prefill. Both force JSON. */
  forceJson: boolean;
  authScheme: AuthScheme;
}

function authHeaders(scheme: AuthScheme, key: string): Record<string, string> {
  if (scheme === "x-api-key") return { "x-api-key": key };
  if (scheme === "bearer") return { Authorization: `Bearer ${key}` };
  return { "x-api-key": key, Authorization: `Bearer ${key}` };
}

/**
 * Extra headers some gateways require, such as project attribution. Supplied as
 * a JSON object in MODEL_EXTRA_HEADERS so a new requirement never needs a code
 * change. Invalid JSON is ignored rather than breaking the call.
 */
function extraHeaders(): Record<string, string> {
  const raw = Deno.env.get("MODEL_EXTRA_HEADERS");
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [name, value] of Object.entries(parsed)) {
      if (typeof value === "string") out[name] = value;
    }
    return out;
  } catch {
    return {};
  }
}

async function postModel(
  prompt: string,
  protocol: Protocol,
  { forceJson, authScheme }: CallOptions,
): Promise<Response> {
  const key = Deno.env.get("MODEL_API_KEY")!;
  const model = Deno.env.get("MODEL_NAME")!;
  const url = resolveUrl(protocol);

  if (protocol === "anthropic") {
    const messages: { role: string; content: string }[] = [
      { role: "user", content: prompt },
    ];
    // Prefilling the assistant turn with "{" is the Anthropic way to force JSON.
    if (forceJson) messages.push({ role: "assistant", content: "{" });

    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": ANTHROPIC_VERSION,
        ...extraHeaders(),
        ...authHeaders(authScheme, key),
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });
  }

  const body: Record<string, unknown> = {
    model,
    temperature: 0,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  };
  if (forceJson) body.response_format = { type: "json_object" };

  return await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders(),
      ...authHeaders(authScheme, key),
    },
    body: JSON.stringify(body),
  });
}

async function readContent(
  response: Response,
  protocol: Protocol,
  { forceJson }: CallOptions,
): Promise<string> {
  const payload = await response.json();

  if (protocol === "anthropic") {
    const blocks = Array.isArray(payload?.content) ? payload.content : [];
    const text = blocks
      .filter((b: { type?: string }) => b?.type === "text")
      .map((b: { text?: string }) => b?.text ?? "")
      .join("");
    if (!text) throw new Error("unexpected model response");
    // Put back the brace we prefilled so the JSON is complete.
    return forceJson ? `{${text}` : text;
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("unexpected model response");
  return content;
}

/**
 * Calls the model and tolerates the usual provider differences: a gateway that
 * rejects forced JSON, and a model that wraps JSON in prose. Falls back once on
 * a 4xx, then once more if parsing fails.
 */
async function callModel(
  prompt: string,
): Promise<{ parsed: unknown; authScheme: AuthScheme; forcedJson: boolean }> {
  const url = Deno.env.get("MODEL_API_URL");
  const key = Deno.env.get("MODEL_API_KEY");
  const model = Deno.env.get("MODEL_NAME");
  if (!url || !key || !model) {
    throw new Error(
      "Model is not configured. Set MODEL_API_URL, MODEL_API_KEY and MODEL_NAME.",
    );
  }

  const protocol = resolveProtocol();
  const forced = Deno.env.get("MODEL_AUTH_SCHEME")?.toLowerCase().trim();
  const schemes: AuthScheme[] =
    forced === "x-api-key" || forced === "bearer" || forced === "both"
      ? [forced]
      : protocol === "anthropic"
        ? ["x-api-key", "bearer", "both"]
        : ["bearer", "x-api-key", "both"];

  const attempts: string[] = [];

  for (const authScheme of schemes) {
    for (const forceJson of [true, false]) {
      const options: CallOptions = { forceJson, authScheme };
      const response = await postModel(prompt, protocol, options);

      if (response.ok) {
        const content = await readContent(response, protocol, options);
        try {
          return { parsed: extractJson(content), authScheme, forcedJson: forceJson };
        } catch {
          // Malformed JSON. Try once more without forcing, then give up.
          if (!forceJson) {
            attempts.push(`${authScheme}/json=${forceJson}: unparseable response`);
            break;
          }
          continue;
        }
      }

      const detail = await response.text().catch(() => "");
      attempts.push(
        `${authScheme}/json=${forceJson}: ${response.status}${
          detail ? ` ${detail.slice(0, 160)}` : ""
        }`,
      );

      // An auth failure will not be fixed by changing the body shape.
      if (response.status === 401 || response.status === 403) break;
    }
  }

  throw new Error(
    `model call failed at ${resolveUrl(protocol)} using the ${protocol} protocol. Attempts: ${attempts.join(" | ")}`,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  if (
    !body?.candidateId ||
    !body?.roleId ||
    !Array.isArray(body.criteria) ||
    !Array.isArray(body.documentLines) ||
    body.documentLines.length === 0
  ) {
    return json({ error: "candidateId, roleId, criteria and documentLines are required" }, 400);
  }

  if (body.workspaceId !== undefined && typeof body.workspaceId !== "string") {
    return json({ error: "workspaceId must be a string when provided" }, 400);
  }

  const prompt = buildPrompt(body);

  type ModelPayload = {
    evidence?: EvidenceItem[];
    interviewQuestions?: { criterionId: string; question: string }[];
  };

  let parsed: ModelPayload;
  let authScheme: AuthScheme;
  try {
    const result = await callModel(prompt);
    parsed = result.parsed as ModelPayload;
    authScheme = result.authScheme;
  } catch (error) {
    return json({ error: `model call failed: ${(error as Error).message}` }, 502);
  }

  const proposed = Array.isArray(parsed.evidence) ? parsed.evidence : [];
  if (proposed.length === 0) {
    return json({ error: "model returned no evidence items" }, 502);
  }

  // Fill in any criterion the model skipped, so the UI never shows a gap.
  const seen = new Set(proposed.map((e) => e.criterionId));
  for (const criterion of body.criteria) {
    if (!seen.has(criterion.id)) {
      proposed.push({
        criterionId: criterion.id,
        status: "uncertain",
        quotedText: "",
        sourceStartLine: 0,
        sourceEndLine: 0,
        explanation: "The model did not return an assessment for this criterion.",
        citationVerified: false,
      });
    }
  }

  const { verified, rejected } = verifyAll(proposed, body.documentLines);

  const unresolved = new Set(
    verified.filter((e) => e.status !== "supported").map((e) => e.criterionId),
  );
  const interviewQuestions = (parsed.interviewQuestions ?? []).filter((q) =>
    unresolved.has(q.criterionId),
  );

  // The record id carries the workspace so two browsers never collide on the
  // same candidate: seeded ids like candidate-a exist in every workspace, and
  // the primary key is the id, so the workspace prefix keeps each browser's
  // record separate.
  const workspaceId = body.workspaceId?.trim();
  const record = {
    id: workspaceId
      ? `evidence-${workspaceId.slice(0, 8)}-${body.candidateId}`
      : `evidence-${body.candidateId}`,
    candidateId: body.candidateId,
    roleId: body.roleId,
    evidence: verified,
    interviewQuestions,
    reviewerEdits: [],
    humanDecision: null,
    replayMetadata: {
      modelName: Deno.env.get("MODEL_NAME") ?? "unknown",
      promptVersion: PROMPT_VERSION,
      schemaVersion: SCHEMA_VERSION,
      inputHash: await hashInput(prompt),
      runTimestamp: new Date().toISOString(),
    },
  };

  if (body.persist !== false) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && serviceKey) {
      const admin = createClient(supabaseUrl, serviceKey);
      const { error } = await admin.from("evidence_records").upsert(
        {
          id: record.id,
          workspace_id: workspaceId ?? null,
          candidate_id: record.candidateId,
          role_id: record.roleId,
          evidence: record.evidence,
          interview_questions: record.interviewQuestions,
          reviewer_edits: record.reviewerEdits,
          human_decision: record.humanDecision,
          replay_metadata: record.replayMetadata,
        },
        { onConflict: "id" },
      );
      if (error) {
        return json({ record, rejectedCitations: rejected, persisted: false, persistError: error.message });
      }
    }
  }

  return json({
    record,
    rejectedCitations: rejected,
    persisted: body.persist !== false,
    // Which credential form the gateway accepted. Pin it with MODEL_AUTH_SCHEME.
    authScheme,
  });
});
