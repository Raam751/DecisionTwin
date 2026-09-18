import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { DocumentLine } from "@/types";

/**
 * Splits extracted or pasted text into the same numbered DocumentLine shape the
 * seeded candidates use: one line per newline, empty lines dropped, numbering
 * restarted at 1 so the citation line numbers are correct.
 */
export const toDocumentLines = (text: string): DocumentLine[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, index) => ({ lineNumber: index + 1, text: line }));

/** Called with a short human label as extraction advances, per page. */
export type ExtractProgress = (label: string) => void;

/**
 * Loads pdfjs-dist only when a PDF is actually being read. The module and its
 * worker asset never join the initial bundle; the worker URL is emitted as a
 * separate asset by Vite and fetched only when a PDF is opened.
 */
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

function loadPdfJs(): Promise<typeof import("pdfjs-dist")> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

/**
 * Extracts the visible text layer of a PDF, one page at a time, reporting
 * progress after each page. Text is joined per line using the layout hints the
 * PDF provides, so paragraphs arrive as separate rows the reviewer can then
 * merge, split or delete in the confirmation editor.
 */
export async function extractPdfText(
  file: File,
  onProgress: ExtractProgress,
): Promise<string> {
  const pdfjs = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: buffer });
  const document = await loadingTask.promise;

  const parts: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      onProgress(`Reading page ${pageNumber} of ${document.numPages}`);
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let lineText = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        lineText += item.str;
        if (item.hasEOL) {
          parts.push(lineText);
          lineText = "";
        } else {
          lineText += " ";
        }
      }
      if (lineText.trim()) parts.push(lineText);
    }
  } finally {
    await loadingTask.destroy();
  }

  return parts.join("\n");
}

/** Plain text files are read directly; nothing needs to be extracted. */
export async function readTextFile(file: File): Promise<string> {
  return await file.text();
}

/** True when the given file should be treated as a PDF. */
export const isPdfFile = (file: File): boolean =>
  file.type === "application/pdf" ||
  file.name.toLowerCase().endsWith(".pdf");

/** True when the given file should be treated as plain text. */
export const isTextFile = (file: File): boolean =>
  file.type === "text/plain" ||
  file.name.toLowerCase().endsWith(".txt");
