/**
 * masked-rerun
 *
 * Runs the same evidence extraction a second time against a version of the
 * document with the candidate's name and pronouns removed, then compares the
 * result per criterion against the record already stored.
 *
 * This is a REVIEW TRIGGER, not a fairness result. It masks a name and pronouns
 * only, so it cannot detect every proxy. A changed status means a human should
 * look, and nothing more than that.
 *
 * It never writes to the record's evidence, questions, edits, decisions or
 * stage. The only thing it writes is sensitivity_diagnostic.
 *
 * Secrets are shared with generate-evidence. The protocol handling, auth scheme
 * ladder, URL normalisation, verification rule and prompt below are copied from
 * generate-evidence deliberately, because the deploy platform bundles this file
 * alone and the two runs must be compared like for like.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// ---------------------------------------------------------------------------
// Masking
//
// Substitution in place only. The line count and every line number must survive
// untouched, otherwise citations from the masked run would point at the wrong
// place and the comparison would be meaningless. Nothing is summarised,
// reordered or rewritten.
// ---------------------------------------------------------------------------

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const PRONOUNS: [RegExp, string][] = [
  [/\bhe\b/gi, "they"],
  [/\bshe\b/gi, "they"],
  [/\bhim\b/gi, "them"],
  [/\bhis\b/gi, "their"],
  [/\bhers\b/gi, "theirs"],
  [/\bher\b/gi, "their"],
  [/\bhimself\b/gi, "themselves"],
  [/\bherself\b/gi, "themselves"],
];

export const MASKED_FIELDS_LABEL =
  "candidate name and gendered pronouns, replaced in place";

function maskLines(
  lines: DocumentLine[],
  candidateName: string,
): DocumentLine[] {
  const parts = (candidateName ?? "")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1);

  return lines.map((line) => {
    let text = line.text;
    for (const part of parts) {
      text = text.replace(
        new RegExp(`\\b${escapeRegExp(part)}\\b`, "gi"),
        "CANDIDATE",
      );
    }
    for (const [pattern, replacement] of PRONOUNS) {
      text = text.replace(pattern, replacement);
    }
    // lineNumber is carried through unchanged on purpose.
    return { lineNumber: line.lineNumber, text };
  });
}


interface RequestBody {
  workspaceId?: string;
  candidateId?: string;
  roleId?: string;
  candidateName?: string;
  criteria?: { id: string; label: string; description: string }[];
  documentLines?: DocumentLine[];
}

type ComparableStatus = EvidenceStatus | "missing";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const workspaceId = (body.workspaceId ?? "").trim();
  if (!workspaceId) return json({ error: "workspaceId is required" }, 400);

  if (
    !body.candidateId ||
    !body.roleId ||
    !Array.isArray(body.criteria) ||
    !Array.isArray(body.documentLines) ||
    body.documentLines.length === 0
  ) {
    return json(
      {
        error:
          "candidateId, roleId, criteria and documentLines are required",
      },
      400,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "the review store is not configured" }, 500);
  }
  const admin = createClient(supabaseUrl, serviceKey);

  // The unmasked side of the comparison is whatever is already stored. This
  // function never regenerates it.
  const { data: stored, error: readError } = await admin
    .from("evidence_records")
    .select("id, evidence")
    .eq("workspace_id", workspaceId)
    .eq("candidate_id", body.candidateId)
    .maybeSingle();

  if (readError) {
    return json(
      { error: `could not read the record: ${readError.message}` },
      502,
    );
  }
  if (!stored) {
    return json(
      {
        error:
          "there is no generated record for this candidate yet, so there is nothing to compare against. Generate the evidence first.",
        code: "record_missing",
      },
      404,
    );
  }

  const maskedLines = maskLines(body.documentLines, body.candidateName ?? "");
  const prompt = buildPrompt({
    criteria: body.criteria,
    documentLines: maskedLines,
  });

  let parsed: { evidence?: EvidenceItem[] };
  try {
    const result = await callModel(prompt);
    parsed = result.parsed as { evidence?: EvidenceItem[] };
  } catch (error) {
    return json(
      { error: `model call failed: ${(error as Error).message}` },
      502,
    );
  }

  const proposed = Array.isArray(parsed.evidence) ? parsed.evidence : [];
  const seen = new Set(proposed.map((item) => item.criterionId));
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

  // Verified against the MASKED lines, which is why masking had to preserve
  // the numbering.
  const { verified } = verifyAll(proposed, maskedLines);

  // Compare document-sourced evidence only. An interview answer has no masked
  // counterpart, so including it would produce a meaningless difference.
  const storedEvidence = Array.isArray(stored.evidence)
    ? (stored.evidence as EvidenceItem[])
    : [];
  const unmaskedByCriterion = new Map<string, EvidenceStatus>();
  for (const item of storedEvidence) {
    const isInterview = (item as { recordedAtInterview?: boolean })
      .recordedAtInterview;
    if (isInterview) continue;
    unmaskedByCriterion.set(item.criterionId, item.status);
  }
  const maskedByCriterion = new Map<string, EvidenceStatus>();
  for (const item of verified) {
    maskedByCriterion.set(item.criterionId, item.status);
  }

  const comparisons = body.criteria.map((criterion) => {
    const unmaskedStatus: ComparableStatus =
      unmaskedByCriterion.get(criterion.id) ?? "missing";
    const maskedStatus: ComparableStatus =
      maskedByCriterion.get(criterion.id) ?? "missing";
    return {
      criterionId: criterion.id,
      unmaskedStatus,
      maskedStatus,
      changed: unmaskedStatus !== maskedStatus,
    };
  });

  const diagnostic = {
    runTimestamp: new Date().toISOString(),
    maskedFields: MASKED_FIELDS_LABEL,
    comparisons,
    changedCount: comparisons.filter((entry) => entry.changed).length,
  };

  // The ONLY column this function writes.
  const { error: writeError } = await admin
    .from("evidence_records")
    .update({ sensitivity_diagnostic: diagnostic })
    .eq("id", stored.id)
    .eq("workspace_id", workspaceId);

  if (writeError) {
    return json({ diagnostic, persisted: false, persistError: writeError.message });
  }

  return json({ diagnostic, persisted: true });
});
