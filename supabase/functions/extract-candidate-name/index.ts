/**
 * extract-candidate-name
 *
 * Takes a pasted or extracted candidate resume and asks the model for the full
 * name of the person it belongs to. The name is a suggestion the reviewer can
 * always correct; an empty string is returned when the text contains no name.
 *
 * Required secrets, shared with generate-evidence and generate-criteria:
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
 *
 * The protocol handling, auth scheme ladder, URL normalisation and JSON
 * extraction below are deliberately identical to generate-criteria. Kept
 * inline in one file because the deploy platform bundles this file alone.
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

interface RequestBody {
  resumeText: string;
}

function buildPrompt(body: RequestBody): string {
  return [
    "You read a candidate resume and return the full name of the person it belongs to.",
    "",
    "RESUME TEXT",
    body.resumeText.trim(),
    "",
    "RULES",
    "1. The name is usually on the first line or the first few lines, often before a job title or contact details.",
    "2. Return the full name as written, for example Priya Menon.",
    "3. Return null when the text contains no person name, for example when it is a job description or an empty block.",
    "4. Never invent a name and never return a company, role title or email address instead of a person name.",
    "",
    "Return only JSON in this shape:",
    '{"name": "Priya Menon"}',
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
  "You return only valid JSON. You read a candidate resume and return the name of the person it belongs to, and you never invent a name.";

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

// ---------------------------------------------------------------------------
// Name shaping
// ---------------------------------------------------------------------------

/**
 * Keeps only a usable name: a trimmed, collapsed string. The reviewer sees the
 * suggestion in an editable field and can always correct it.
 */
function shapeName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const name = raw.trim().replace(/\s+/g, " ").slice(0, 120);
  return name;
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

  const resumeText =
    typeof body?.resumeText === "string" ? body.resumeText.trim() : "";
  if (!resumeText) {
    return json({ error: "resumeText is required" }, 400);
  }

  const prompt = buildPrompt({ resumeText });

  let parsed: { name?: unknown };
  try {
    const result = await callModel(prompt);
    parsed = result.parsed as { name?: unknown };
  } catch (error) {
    return json({ error: `model call failed: ${(error as Error).message}` }, 502);
  }

  const name = shapeName(parsed?.name);
  return json({ name });
});
