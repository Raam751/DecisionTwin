/**
 * Server-side citation verification.
 *
 * This is the core trust mechanism of DecisionTwin. The model proposes a quote
 * and a line range. This module independently checks that the quote really
 * exists at those lines in the source document. The model never sets
 * citationVerified; only this code does.
 *
 * Whitespace is normalised on both sides before comparison, so a quote spanning
 * several lines matches whether the model joined them with a space or a newline.
 */

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
