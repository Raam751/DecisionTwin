import { useRef } from "react";
import { ArrowUp, Scissors, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DocumentLine } from "@/types";

interface LineEditorProps {
  lines: DocumentLine[];
  onChange: (lines: DocumentLine[]) => void;
  /** Accessible prefix such as the candidate name. */
  labelPrefix: string;
}

/**
 * The numbered line editor for extracted documents. Every citation in the app
 * points at a line number, so the reviewer confirms the lines before anything
 * is saved: edit text inline, merge a line into the one above it, split a line
 * at the cursor, or delete a line. Empty rows are kept visible while editing
 * and are dropped when the confirmed lines are saved, matching the paste path.
 */
export function LineEditor({ lines, onChange, labelPrefix }: LineEditorProps) {
  // Remembers the caret position per row so "split" breaks where the reviewer
  // is looking; a stale or missing position falls back to splitting in half.
  const caretRef = useRef<Record<number, number>>({});

  const update = (texts: string[]) =>
    onChange(texts.map((text, index) => ({ lineNumber: index + 1, text })));

  const setText = (index: number, text: string) => {
    const next = lines.map((line) => line.text);
    next[index] = text;
    update(next);
  };

  const mergeUp = (index: number) => {
    if (index <= 0) return;
    const next = lines.map((line) => line.text);
    const merged = [next[index - 1], next[index]]
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .join(" ");
    if (!merged.trim()) return;
    next.splice(index - 1, 2, merged);
    update(next);
  };

  const splitAt = (index: number) => {
    const next = lines.map((line) => line.text);
    const text = next[index] ?? "";
    const caret = caretRef.current[index];
    let position =
      typeof caret === "number" ? caret : Math.floor(text.length / 2);
    if (position <= 0 || position >= text.length) {
      position = Math.floor(text.length / 2);
    }
    const before = text.slice(0, position);
    const after = text.slice(position);
    if (!before.trim() || !after.trim()) return;
    next.splice(index, 1, before, after);
    update(next);
  };

  const removeAt = (index: number) => {
    const next = lines.map((line) => line.text);
    next.splice(index, 1);
    update(next);
  };

  return (
    <ol className="line-editor-list divide-y divide-line border-t border-line">
      {lines.map((line, index) => {
        const empty = line.text.trim().length === 0;
        return (
          <li
            key={line.lineNumber}
            className={cn(
              "group flex items-start gap-2 px-3 py-2 transition-colors hover:bg-surface/70",
              empty && "bg-canvas-deep/40",
            )}
          >
            <span className="w-8 shrink-0 select-none pt-2 text-right font-mono text-2xs tabular-nums text-muted-foreground">
              {line.lineNumber}
            </span>
            <textarea
              value={line.text}
              rows={2}
              aria-label={`${labelPrefix}, line ${line.lineNumber}`}
              placeholder={empty ? "Empty line, dropped on save" : undefined}
              onChange={(event) => setText(index, event.target.value)}
              onSelect={(event) => {
                caretRef.current[index] = event.currentTarget.selectionStart;
              }}
              onKeyUp={(event) => {
                caretRef.current[index] = event.currentTarget.selectionStart;
              }}
              className={cn(
                "min-w-0 flex-1 resize-y rounded-md border bg-background px-3 py-2 text-sm leading-6 text-ink focus-ring",
                empty && "border-dashed text-muted-foreground",
              )}
            />
            <span className="flex shrink-0 flex-col items-center gap-1 pt-1 sm:flex-row sm:gap-1.5">
              <button
                type="button"
                onClick={() => mergeUp(index)}
                disabled={index === 0}
                aria-label={`Merge line ${line.lineNumber} into the line above`}
                title="Merge into the line above"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface hover:text-ink disabled:opacity-30"
              >
                <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => splitAt(index)}
                aria-label={`Split line ${line.lineNumber} at the cursor`}
                title="Split at the cursor"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface hover:text-ink"
              >
                <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label={`Delete line ${line.lineNumber}`}
                title="Delete line"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface hover:text-conflicting"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
