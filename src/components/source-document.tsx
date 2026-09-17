import { useEffect, useRef } from "react";
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

  useEffect(() => {
    if (!activeRange) return;
    const el = scrollRef.current?.querySelector(
      `[data-src-line="${activeRange.start}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeRange]);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b bg-accent/50 px-5 py-3">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-semibold">{title}</span>
        {activeRange && (
          <span className="ml-auto shrink-0 rounded-full bg-peach px-2.5 py-0.5 text-xs font-medium tabular-nums text-peach-foreground">
            {activeRange.start === activeRange.end
              ? `Line ${activeRange.start}`
              : `Lines ${activeRange.start} to ${activeRange.end}`}
          </span>
        )}
      </div>
      <div ref={scrollRef} className="max-h-[540px] overflow-y-auto py-4">
        {lines.map((line) => {
          const inRange =
            activeRange &&
            line.lineNumber >= activeRange.start &&
            line.lineNumber <= activeRange.end;
          return (
            <div
              key={line.lineNumber}
              data-src-line={line.lineNumber}
              className={cn(
                "flex items-center gap-4 border-l-2 px-5 py-1.5 transition-colors duration-200",
                inRange
                  ? "border-primary bg-peach/60"
                  : "border-transparent",
              )}
            >
              <span
                className={cn(
                  "w-8 shrink-0 select-none text-right text-xs tabular-nums leading-6",
                  inRange
                    ? "font-semibold text-peach-foreground"
                    : "text-muted-foreground",
                )}
              >
                {line.lineNumber}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 text-sm leading-6",
                  inRange ? "font-medium text-foreground" : "text-foreground/80",
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
