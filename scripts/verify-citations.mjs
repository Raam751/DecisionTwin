#!/usr/bin/env node
/**
 * Citation integrity checker for DecisionTwin seed data.
 *
 * Run: node scripts/verify-citations.mjs
 *
 * Checks, for every seeded evidence record:
 *   1. QUOTE MATCH      supported quotes really appear in the cited line range
 *   2. JOIN CONVENTION  multi-line quotes use a single space, never a newline
 *   3. RANGE SANITY     cited line numbers exist in the document
 *   4. CONTRADICTION    "uncertain" criteria are not contradicted by the source
 *   5. EMPTY DOCS       every candidate actually has resume text
 *
 * Exits non-zero if anything fails, so it can gate a commit or a demo.
 */

import { createServer } from "vite";

/**
 * Words that show a criterion is actually discussed in a document. Used to
 * catch a false "no evidence found" claim. Update when criteria change.
 */
const CRITERION_KEYWORDS = {
  "api-ownership": ["api", "endpoint", "endpoints"],
  "incident-response": [
    "incident", "incidents", "on-call", "on call", "outage", "outages",
    "sev-1", "postmortem", "post-incident", "runbook",
  ],
  "production-kubernetes": [
    "kubernetes", "k8s", "eks", "gke", "aks", "cluster", "clusters", "helm",
  ],
  "data-modelling": [
    "schema", "schemas", "data model", "data modelling", "data modeling",
    "modelled", "modeled", "normalised", "normalized",
  ],
};

const norm = (s) => String(s).replace(/\s+/g, " ").trim().toLowerCase();

/** Word-boundary match, so "data" does not match "database". */
function mentions(doc, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(doc);
}

async function loadSeed() {
  const server = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });
  try {
    return await server.ssrLoadModule("/src/data/seed.ts");
  } finally {
    await server.close();
  }
}

function keywordsFor(criterionId, labelText) {
  return (
    CRITERION_KEYWORDS[criterionId] ??
    norm(labelText)
      .split(" ")
      .filter((w) => w.length > 4)
  );
}

const failures = [];
const warnings = [];
const passes = [];

function fail(msg) {
  failures.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}
function pass(msg) {
  passes.push(msg);
}

const mod = await loadSeed();

const role =
  mod.platformEngineerRole ??
  Object.values(mod).find((v) => v && Array.isArray(v?.criteria));
const candidates =
  mod.candidates ??
  Object.values(mod).find((v) => Array.isArray(v) && v[0]?.documentLines);

const records = Object.values(mod).filter(
  (v) => v && Array.isArray(v?.evidence) && v?.candidateId,
);

if (!role || !candidates) {
  console.error("Could not find role or candidates exports in src/data/seed.ts");
  process.exit(2);
}

// Check 5: empty documents
for (const c of candidates) {
  const filled = c.documentLines.filter((l) => norm(l.text).length > 0).length;
  if (filled === 0) {
    fail(`${c.name}: resume is completely empty (${c.documentLines.length} blank lines)`);
  } else if (filled < c.documentLines.length) {
    warn(`${c.name}: ${c.documentLines.length - filled} blank resume line(s)`);
  } else {
    pass(`${c.name}: resume has ${filled} lines of text`);
  }
}

if (records.length === 0) {
  warn("No seeded evidence records found");
}

for (const record of records) {
  const candidate = candidates.find((c) => c.id === record.candidateId);
  if (!candidate) {
    fail(`record ${record.id}: candidateId "${record.candidateId}" matches no candidate`);
    continue;
  }

  const lineText = new Map(candidate.documentLines.map((l) => [l.lineNumber, l.text]));
  const wholeDoc = norm(candidate.documentLines.map((l) => l.text).join(" "));
  const label = (id) => role.criteria.find((c) => c.id === id)?.label ?? id;

  for (const item of record.evidence) {
    const name = `${candidate.name} / ${label(item.criterionId)}`;

    if (item.status === "supported" || item.status === "conflicting") {
      // Check 3: range sanity
      if (
        !Number.isInteger(item.sourceStartLine) ||
        item.sourceStartLine < 1 ||
        item.sourceEndLine < item.sourceStartLine
      ) {
        fail(`${name}: invalid line range ${item.sourceStartLine} to ${item.sourceEndLine}`);
        continue;
      }
      const missing = [];
      for (let n = item.sourceStartLine; n <= item.sourceEndLine; n++) {
        if (!lineText.has(n)) missing.push(n);
      }
      if (missing.length) {
        fail(`${name}: cites line(s) ${missing.join(", ")} which do not exist`);
        continue;
      }

      // Check 2: join convention
      if (/[\r\n]/.test(item.quotedText)) {
        fail(
          `${name}: quotedText contains a newline. Multi-line quotes must join with a single space, or server-side verification will reject it.`,
        );
      }

      // Check 1: quote match
      const rangeText = [];
      for (let n = item.sourceStartLine; n <= item.sourceEndLine; n++) {
        rangeText.push(lineText.get(n));
      }
      const haystack = norm(rangeText.join(" "));
      const needle = norm(item.quotedText);
      if (!needle) {
        fail(`${name}: status is ${item.status} but quotedText is empty`);
      } else if (!haystack.includes(needle)) {
        fail(
          `${name}: quotedText does not appear in lines ${item.sourceStartLine} to ${item.sourceEndLine}`,
        );
      } else {
        pass(`${name}: quote verified at lines ${item.sourceStartLine} to ${item.sourceEndLine}`);
      }

      if (item.citationVerified === undefined) {
        warn(`${name}: citationVerified field is missing`);
      }
    }

    if (item.status === "uncertain") {
      if (norm(item.quotedText).length > 0) {
        fail(`${name}: status is uncertain but quotedText is not empty`);
      }
      if (item.sourceStartLine !== 0 || item.sourceEndLine !== 0) {
        fail(`${name}: status is uncertain but line numbers are not 0`);
      }

      // Check 4: contradiction. This is the one that catches a false
      // "no evidence found" claim while the source clearly mentions it.
      const hits = keywordsFor(item.criterionId, label(item.criterionId)).filter(
        (kw) => mentions(wholeDoc, kw),
      );
      if (hits.length) {
        fail(
          `${name}: marked uncertain with "no evidence", but the resume mentions ${hits
            .map((h) => `"${h}"`)
            .join(", ")}. A judge reading the source panel will see this.`,
        );
      } else {
        pass(`${name}: uncertain status is truthful, source mentions nothing relevant`);
      }

      const q = record.interviewQuestions?.find(
        (x) => x.criterionId === item.criterionId,
      );
      if (!q) warn(`${name}: uncertain but has no interview question`);
    }
  }

  const covered = new Set(record.evidence.map((e) => e.criterionId));
  for (const c of role.criteria) {
    if (!covered.has(c.id)) {
      warn(`${candidate.name}: no evidence item for criterion "${c.label}"`);
    }
  }
}

const line = "-".repeat(72);
console.log(line);
console.log("DecisionTwin citation integrity check");
console.log(line);
for (const p of passes) console.log(`  PASS  ${p}`);
for (const w of warnings) console.log(`  WARN  ${w}`);
for (const f of failures) console.log(`  FAIL  ${f}`);
console.log(line);
console.log(
  `${passes.length} passed, ${warnings.length} warning(s), ${failures.length} failure(s)`,
);
console.log(line);

process.exit(failures.length > 0 ? 1 : 0);
