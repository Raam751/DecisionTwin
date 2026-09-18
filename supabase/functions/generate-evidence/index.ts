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
 *   MODEL_PROTOCOL  "anthropic" or "openai". Auto-detected when unset:
 *                   a model name containing "claude" uses the Anthropic
 *                   Messages protocol, everything else uses OpenAI-compatible
 *                   chat completions.
 * Provided automatically by Supabase:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * The service role key must never be sent to the browser.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Shared module, inlined for deployment (the platform bundler only bundles the
// single function file). Mirrors supabase/functions/_shared/verify.ts.
// ---------------------------------------------------------------------------

export type EvidenceStatus = "supported" | "uncertain" | "conflicting";

export interface DocumentLine {
  lineNumber: number;
  text: string;
}

export interface EvidenceItem {
  criterionId: string;
  status: EvidenceStatus;
  quotedText: string;
  sourceStartLine: number;
  sourceEndLine: number;
  explanation: string;
  citationVerified: boolean;
}

export const normalise = (value: string): string =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** Joins a line range exactly the way verification expects. */
export function joinRange(
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

const UNVERIFIED_EXPLANATION =
  "Citation could not be verified against the source document.";

/**
 * Verifies one item, downgrading it when the citation does not hold up.
 * A claim the server cannot confirm becomes uncertain rather than supported.
 */
export function verifyItem(
  item: EvidenceItem,
  lines: DocumentLine[],
): EvidenceItem {
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

  const quote = normalise(item.quotedText);
  const haystack = rangeIsSane
    ? normalise(joinRange(lines, item.sourceStartLine, item.sourceEndLine))
    : "";

  const holds = rangeIsSane && quote.length > 0 && haystack.includes(quote);

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

export function verifyAll(
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
export async function hashInput(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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

interface CallOptions {
  /** OpenAI JSON mode, or Anthropic assistant prefill. Both force JSON. */
  forceJson: boolean;
}

async function postModel(
  prompt: string,
  protocol: Protocol,
  { forceJson }: CallOptions,
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
        "x-api-key": key,
        "anthropic-version": ANTHROPIC_VERSION,
        // Some gateways proxy to Anthropic and expect a bearer token instead.
        Authorization: `Bearer ${key}`,
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
      Authorization: `Bearer ${key}`,
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
async function callModel(prompt: string): Promise<unknown> {
  const url = Deno.env.get("MODEL_API_URL");
  const key = Deno.env.get("MODEL_API_KEY");
  const model = Deno.env.get("MODEL_NAME");
  if (!url || !key || !model) {
    throw new Error(
      "Model is not configured. Set MODEL_API_URL, MODEL_API_KEY and MODEL_NAME.",
    );
  }

  const protocol = resolveProtocol();
  let options: CallOptions = { forceJson: true };
  let response = await postModel(prompt, protocol, options);

  if (!response.ok && response.status >= 400 && response.status < 500) {
    options = { forceJson: false };
    response = await postModel(prompt, protocol, options);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `model returned ${response.status} from ${resolveUrl(protocol)} using the ${protocol} protocol${
        detail ? `: ${detail.slice(0, 300)}` : ""
      }`,
    );
  }

  const content = await readContent(response, protocol, options);
  try {
    return extractJson(content);
  } catch {
    const retryOptions: CallOptions = { forceJson: false };
    const retry = await postModel(prompt, protocol, retryOptions);
    if (!retry.ok) throw new Error(`model returned ${retry.status} on retry`);
    return extractJson(await readContent(retry, protocol, retryOptions));
  }
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

  const prompt = buildPrompt(body);

  let parsed: {
    evidence?: EvidenceItem[];
    interviewQuestions?: { criterionId: string; question: string }[];
  };
  try {
    parsed = (await callModel(prompt)) as typeof parsed;
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

  const record = {
    id: `evidence-${body.candidateId}`,
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

  return json({ record, rejectedCitations: rejected, persisted: body.persist !== false });
});
