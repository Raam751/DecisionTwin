import { Mic } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Marks evidence that came from the candidate's own words at interview rather
 * than from the source document. It is deliberately a different family from the
 * assessment states: an interview answer has a status too, but it can never be
 * citation-verified, because there is no document to check it against.
 */
export function InterviewTag({ className }: { className?: string }) {
  return (
    <span
      title="Recorded from the candidate's answer at interview. It cannot be verified against the source document."
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-interview/25 bg-interview-soft px-2.5 py-1 text-2xs font-semibold uppercase tracking-[0.1em] text-interview",
        className,
      )}
    >
      <Mic className="h-3.5 w-3.5" aria-hidden />
      Recorded at interview
    </span>
  );
}
