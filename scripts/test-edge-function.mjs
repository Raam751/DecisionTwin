#!/usr/bin/env node
/**
 * Calls the deployed generate-evidence edge function with real seed data.
 *
 * Run: node scripts/test-edge-function.mjs [candidate-a|candidate-b|candidate-c]
 *
 * Use this to test the backend on its own, without the browser. If this works
 * and the app does not, the problem is in the frontend. If this fails, the
 * problem is the function, its secrets, or the model endpoint.
 */

import { readFileSync } from "node:fs";
import { createServer } from "vite";

const candidateId = process.argv[2] ?? "candidate-a";

// Read the Supabase URL and publishable key without importing the browser
// client, which touches localStorage and cannot run in Node.
const clientSource = readFileSync("src/integrations/supabase/client.ts", "utf8");
const urlMatch = clientSource.match(/SUPABASE_URL\s*=\s*"([^"]+)"/);
const keyMatch = clientSource.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*"([^"]+)"/);

if (!urlMatch || !keyMatch) {
  console.error("Could not read Supabase URL or key from client.ts");
  process.exit(2);
}

const supabaseUrl = urlMatch[1];
const anonKey = keyMatch[1];
const endpoint = `${supabaseUrl}/functions/v1/generate-evidence`;

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent",
});
const seed = await server.ssrLoadModule("/src/data/seed.ts");
await server.close();

const role = seed.platformEngineerRole;
const candidate = seed.candidates.find((c) => c.id === candidateId);

if (!candidate) {
  console.error(`No candidate with id "${candidateId}"`);
  process.exit(2);
}

console.log(`POST ${endpoint}`);
console.log(`candidate: ${candidate.name} (${candidate.documentLines.length} lines)\n`);

const started = Date.now();
let response;
try {
  response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify({
      candidateId: candidate.id,
      roleId: role.id,
      criteria: role.criteria,
      documentLines: candidate.documentLines,
    }),
  });
} catch (error) {
  console.error(`Request failed: ${error.message}`);
  console.error("The function is probably not deployed yet.");
  process.exit(1);
}

const elapsed = Date.now() - started;
const text = await response.text();
console.log(`HTTP ${response.status} in ${elapsed}ms\n`);

let payload;
try {
  payload = JSON.parse(text);
} catch {
  console.log(text.slice(0, 1200));
  process.exit(response.ok ? 0 : 1);
}

if (!response.ok || payload.error) {
  console.error("FAILED");
  console.error(JSON.stringify(payload, null, 2).slice(0, 1500));
  process.exit(1);
}

const record = payload.record;
console.log(`persisted: ${payload.persisted}`);
console.log(`model: ${record.replayMetadata?.modelName}`);
console.log(`input hash: ${record.replayMetadata?.inputHash}`);
if (payload.rejectedCitations?.length) {
  console.log(`rejected citations: ${payload.rejectedCitations.join(", ")}`);
}
console.log("");

const labelOf = (id) =>
  role.criteria.find((c) => c.id === id)?.label ?? id;

for (const item of record.evidence ?? []) {
  const range =
    item.sourceStartLine > 0
      ? `lines ${item.sourceStartLine} to ${item.sourceEndLine}`
      : "no citation";
  console.log(
    `${item.status.toUpperCase().padEnd(12)} ${labelOf(item.criterionId).padEnd(22)} ${range}${item.citationVerified ? "  [verified]" : ""}`,
  );
  if (item.quotedText) console.log(`             "${item.quotedText.slice(0, 110)}"`);
}

for (const q of record.interviewQuestions ?? []) {
  console.log(`\nQUESTION     ${labelOf(q.criterionId)}: ${q.question}`);
}

console.log("\nOK");
