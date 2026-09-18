import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DocumentLine } from "@/types";

interface SourceDocumentProps {
  title: string;
  lines: DocumentLine[];
  activeRange: { start: number; end: number } | null;
}

const SourceDocument = ({ title, lines, activeRange }: SourceDocumentProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState(false);

  const start = activeRange?.start ?? null;
  const end = activeRange?.end ?? null;

  // Keyed on the numbers rather than the object, so a re-render with the same
  // citation does not scroll or flash again.
  useEffect(() => {
    if (start === null) return;

    const element = scrollRef.current?.querySelector(
      `[data-src-line="${start}"]`,
    );
    element?.scrollIntoView({ behavior: "smooth", block: "center" });

    setFlash(true);
    const timer = window.setTimeout(() => setFlash(false), 950);
    return () => window.clearTimeout(timer);
  }, [start, end]);

  return (
    <div className="card-surface overflow-hidden">
      <header className="flex items-center gap-3 border-b border-line bg-surface px-5 py-3.5">
        <FileText aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Exhibit</p>
          <p className="truncate text-sm font-semibold text-ink">{title}</p>
        </div>
        {activeRange ? (
          <span className="shrink-0 rounded-full border border-brand/25 bg-peach px-2.5 py-1 font-mono text-2xs font-semibold uppercase tracking-[0.08em] text-peach-foreground">
            {activeRange.start === activeRange.end
              ? `line ${activeRange.start}`
              : `lines ${activeRange.start} to ${activeRange.end}`}
          </span>
        ) : (
          <span className="shrink-0 font-mono text-2xs uppercase tracking-[0.08em] text-muted-foreground">
            no line selected
          </span>
        )}
      </header>

      <div ref={scrollRef} className="max-h-[600px] overflow-y-auto py-3">
        {lines.map((line) => {
          const inRange =
            start !== null &&
            line.lineNumber >= start &&
            line.lineNumber <= (end ?? start);

          return (
            <div
              key={line.lineNumber}
              data-src-line={line.lineNumber}
              className={cn(
                "flex items-start gap-4 border-l-[3px] px-5 py-1.5 transition-colors duration-300",
                inRange
                  ? "border-brand bg-peach"
                  : "border-transparent hover:bg-surface",
                inRange && flash && "cite-flash",
              )}
            >
              <span
                className={cn(
                  "w-6 shrink-0 select-none pt-0.5 text-right font-mono text-2xs leading-6 tnum",
                  inRange
                    ? "font-semibold text-peach-foreground"
                    : "text-muted-foreground/80",
                )}
              >
                {line.lineNumber}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 text-[13.5px] leading-6",
                  inRange ? "font-medium text-ink" : "text-ink/75",
                )}
              >
                {line.text || "\u00A0"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SourceDocument;
