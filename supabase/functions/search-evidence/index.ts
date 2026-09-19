/**
 * search-evidence
 *
 * Answers a reviewer's question using ONLY evidence that already passed
 * server-side citation verification. The caller assembles that corpus and sends
 * it; this function never reads the database and never sees anything unverified.
 *
 * It does not rank candidates, score them, or name a best candidate. If the
 * supplied evidence does not answer the question, it says so.
 *
 * Secrets are shared with generate-evidence. The protocol handling, auth scheme
 * ladder, URL normalisation and JSON extraction below are copied from it
 * deliberately, because the deploy platform bundles this file alone.
 */

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


interface CorpusItem {
  candidateId?: string;
  candidateName?: string;
  criterionId?: string;
  criterionLabel?: string;
  quotedText?: string;
  sourceStartLine?: number;
  sourceEndLine?: number;
}

interface RequestBody {
  question?: string;
  roleTitle?: string;
  evidence?: CorpusItem[];
}

const MAX_CORPUS_ITEMS = 120;

function buildSearchPrompt(
  question: string,
  roleTitle: string,
  corpus: CorpusItem[],
): string {
  const lines = corpus.map((item, index) => {
    const range =
      item.sourceStartLine === item.sourceEndLine
        ? `line ${item.sourceStartLine}`
        : `lines ${item.sourceStartLine} to ${item.sourceEndLine}`;
    return [
      `[${index + 1}]`,
      `candidateId: ${item.candidateId}`,
      `candidate: ${item.candidateName}`,
      `criterionId: ${item.criterionId}`,
      `criterion: ${item.criterionLabel}`,
      `cited at: ${range}`,
      `verified quote: "${item.quotedText}"`,
    ].join("\n");
  });

  return [
    `A reviewer is asking a question about candidates for the role "${roleTitle}".`,
    "",
    "QUESTION",
    question,
    "",
    "VERIFIED EVIDENCE, the only material you may use",
    lines.join("\n\n"),
    "",
    "RULES",
    "1. Answer using ONLY the evidence above. Never use outside knowledge and never infer beyond what a quote states.",
    "2. Every statement you make must be backed by one of the numbered entries.",
    "3. If the evidence does not answer the question, say so plainly. Do not guess.",
    "4. Do not rank the candidates, do not score them, and never name a best or strongest candidate.",
    "5. Keep the answer to a few sentences of plain prose.",
    "6. Do not use em dashes or en dashes.",
    "",
    "Return only JSON in this shape:",
    '{"answer":"","findings":[{"candidateId":"","criterionId":"","note":""}]}',
    "",
    "answer is your prose reply. findings lists the entries you relied on, with",
    "note being one short sentence on what that entry shows. Return an empty",
    "findings array when nothing in the evidence is relevant.",
  ].join("\n");
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

  const question = (body.question ?? "").trim();
  if (!question) return json({ error: "question is required" }, 400);

  const corpus = Array.isArray(body.evidence)
    ? body.evidence.filter(
        (item) =>
          typeof item?.quotedText === "string" &&
          item.quotedText.trim().length > 0,
      )
    : [];

  if (corpus.length === 0) {
    return json({
      answer:
        "There is no verified evidence in this role yet, so there is nothing to search. Generate evidence for the candidates first.",
      findings: [],
      searched: 0,
    });
  }

  const trimmed = corpus.slice(0, MAX_CORPUS_ITEMS);
  const prompt = buildSearchPrompt(
    question,
    body.roleTitle ?? "this role",
    trimmed,
  );

  let parsed: {
    answer?: unknown;
    findings?: { candidateId?: unknown; criterionId?: unknown; note?: unknown }[];
  };
  try {
    const result = await callModel(prompt);
    parsed = result.parsed as typeof parsed;
  } catch (error) {
    return json(
      { error: `model call failed: ${(error as Error).message}` },
      502,
    );
  }

  const answer =
    typeof parsed.answer === "string" && parsed.answer.trim().length > 0
      ? parsed.answer.trim()
      : "The verified evidence does not answer that question.";

  // Only findings that point at an entry actually supplied are kept, so the
  // reply can never cite evidence that was not in the corpus.
  const allowed = new Set(
    trimmed.map((item) => `${item.candidateId}|${item.criterionId}`),
  );
  const findings = (Array.isArray(parsed.findings) ? parsed.findings : [])
    .map((entry) => ({
      candidateId: typeof entry?.candidateId === "string" ? entry.candidateId : "",
      criterionId: typeof entry?.criterionId === "string" ? entry.criterionId : "",
      note: typeof entry?.note === "string" ? entry.note : "",
    }))
    .filter((entry) => allowed.has(`${entry.candidateId}|${entry.criterionId}`));

  return json({ answer, findings, searched: trimmed.length });
});
