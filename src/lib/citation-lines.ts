import type { DocumentLine, EvidenceItem } from "@/types";

/**
 * Whitespace is collapsed on both sides, exactly as the server verifies a
 * citation, so passage matching here agrees with the stored record.
 */
const normalise = (value: string): string =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/**
 * The line numbers whose text actually covers one quoted segment.
 *
 * Mirrors how the server verifies a citation: the cited lines are joined with
 * spaces, whitespace is collapsed, and the segment is located inside that
 * joined text. Each matched character is mapped back to the line it came from,
 * so the returned numbers are exactly the lines that carry the quote. Returns
 * an empty array when the segment cannot be located inside the range.
 */
function coveringLines(
  lines: DocumentLine[],
  segment: string,
): number[] {
  const ordered = [...lines].sort((a, b) => a.lineNumber - b.lineNumber);
  const pieces = ordered.map((line) => line.text);
  const raw = pieces.join(" ");

  // Which piece each raw character belongs to. Separators (the single space
  // between pieces) map to -1; every other character maps to its line number.
  const rawPiece: number[] = new Array(raw.length).fill(-1);
  let piece = 0;
  let consumed = 0;
  for (let index = 0; index < raw.length; index++) {
    if (consumed < pieces[piece].length) {
      rawPiece[index] = piece;
      consumed += 1;
    } else if (piece < pieces.length - 1) {
      piece += 1;
      consumed = 0;
    }
  }

  // Build the normalised haystack while tracking, per output character, which
  // line it belongs to. Collapsed whitespace maps to -1; the surrounding
  // characters still point at the real lines, so a segment that crosses a line
  // boundary keeps both lines.
  let haystack = "";
  const lineOf: number[] = [];
  for (let index = 0; index < raw.length; index++) {
    const char = raw[index];
    if (/\s/.test(char)) {
      if (haystack.length > 0 && !/\s/.test(haystack[haystack.length - 1])) {
        haystack += " ";
        lineOf.push(-1);
      }
      continue;
    }
    haystack += char.toLowerCase();
    const sourceLine = ordered[rawPiece[index]];
    lineOf.push(sourceLine ? sourceLine.lineNumber : -1);
  }

  const at = haystack.indexOf(segment);
  if (at === -1) return [];

  const covered = new Set<number>();
  for (let index = at; index < at + segment.length; index++) {
    const lineNumber = lineOf[index];
    if (typeof lineNumber === "number" && lineNumber > 0) covered.add(lineNumber);
  }
  return [...covered].sort((a, b) => a - b);
}

/**
 * The specific lines that carry a conflicting item's clashing passages.
 *
 * A conflicting citation is two or more passages joined by " ... ". This finds
 * the exact lines each passage appears on, so the exhibit can highlight only
 * the lines that actually contradict each other instead of the whole span
 * between the first and last. Returns null when the passages cannot be pinned
 * to lines, in which case the caller falls back to the full cited range.
 */
export function clashingLinesForItem(
  item: EvidenceItem,
  documentLines: DocumentLine[],
): number[] | null {
  if (item.status !== "conflicting") return null;

  const segments = normalise(item.quotedText)
    .split(/\s*\.\.\.\s*/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  if (segments.length === 0) return null;

  const rangeLines = documentLines.filter(
    (line) =>
      line.lineNumber >= item.sourceStartLine &&
      line.lineNumber <= item.sourceEndLine,
  );

  const clashing = new Set<number>();
  for (const segment of segments) {
    const covered = coveringLines(rangeLines, segment);
    if (covered.length === 0) return null;
    covered.forEach((lineNumber) => clashing.add(lineNumber));
  }

  return [...clashing].sort((a, b) => a - b);
}
