/**
 * save-workspace
 *
 * Persists one role or candidate that a browser workspace created.
 *
 * The browser holds the public key and both tables are read-only under Row
 * Level Security, so a role or candidate can only be written from here, with
 * the service role. Every row is stamped with the workspace id the browser
 * sent, which is what keeps one browser's roles and candidates invisible to
 * every other browser: reads filter by the same id.
 *
 * The payload is validated and reshaped here so malformed input can never
 * corrupt a row — only the fields the screens actually use are stored.
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

interface RoleCriterion {
  id: string;
  label: string;
  description: string;
  required: boolean;
}

interface RoleRow {
  id: string;
  workspace_id: string;
  title: string;
  job_description: string;
  criteria: RoleCriterion[];
}

interface DocumentLine {
  lineNumber: number;
  text: string;
}

interface CandidateRow {
  id: string;
  workspace_id: string;
  role_id: string;
  name: string;
  document_title: string;
  document_lines: DocumentLine[];
}

const asText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const asLine = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;

/**
 * Only the fields the screens actually use are kept, so a stray key in the
 * payload can never end up in the stored row.
 */
function shapeCriteria(raw: unknown): RoleCriterion[] {
  if (!Array.isArray(raw)) return [];
  const out: RoleCriterion[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const id = asText(item.id);
    const label = asText(item.label);
    const description = asText(item.description);
    if (!id || !label) continue;

    out.push({
      id,
      label,
      description,
      required: item.required !== false,
    });
  }

  return out;
}

function shapeDocumentLines(raw: unknown): DocumentLine[] {
  if (!Array.isArray(raw)) return [];
  const out: DocumentLine[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const text = asText(item.text);
    if (!text) continue;

    out.push({ lineNumber: asLine(item.lineNumber), text });
  }

  return out.sort((a, b) => a.lineNumber - b.lineNumber);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: { kind?: unknown; workspaceId?: unknown; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const workspaceId = asText(body?.workspaceId);
  if (!workspaceId) {
    return json({ error: "workspaceId is required" }, 400);
  }

  const kind = asText(body?.kind);
  if (kind !== "role" && kind !== "candidate") {
    return json({ error: "kind must be \"role\" or \"candidate\"" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "the workspace store is not configured" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  if (kind === "role") {
    const payload = (body?.payload ?? {}) as Record<string, unknown>;
    const id = asText(payload.id);
    const title = asText(payload.title);
    if (!id || !title) {
      return json({ error: "role id and title are required" }, 400);
    }

    const criteria = shapeCriteria(payload.criteria);
    if (criteria.length === 0) {
      return json({ error: "role criteria must not be empty" }, 400);
    }

    const row: RoleRow = {
      id,
      workspace_id: workspaceId,
      title,
      job_description: asText(payload.jobDescription),
      criteria,
    };

    const { error } = await admin
      .from("roles")
      .upsert(row, { onConflict: "id" });
    if (error) {
      return json({ error: `could not save the role: ${error.message}` }, 502);
    }

    return json({ saved: true, id });
  }

  const payload = (body?.payload ?? {}) as Record<string, unknown>;
  const id = asText(payload.id);
  const name = asText(payload.name);
  const roleId = asText(payload.roleId);
  if (!id || !name || !roleId) {
    return json({ error: "candidate id, name and roleId are required" }, 400);
  }

  const documentLines = shapeDocumentLines(payload.documentLines);
  if (documentLines.length === 0) {
    return json({ error: "candidate documentLines must not be empty" }, 400);
  }

  const row: CandidateRow = {
    id,
    workspace_id: workspaceId,
    role_id: roleId,
    name,
    document_title: asText(payload.documentTitle) || "Resume",
    document_lines: documentLines,
  };

  const { error } = await admin
    .from("candidates")
    .upsert(row, { onConflict: "id" });
  if (error) {
    return json({ error: `could not save the candidate: ${error.message}` }, 502);
  }

  return json({ saved: true, id });
});
