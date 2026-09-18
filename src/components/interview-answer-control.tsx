import { useState } from "react";
import { MessageCircleQuestionMark, Mic } from "lucide-react";

import { REVIEWERS } from "@/hooks/use-evidence-record";
import { cn } from "@/lib/utils";
import type { EvidenceStatus } from "@/types";

const STATUS_OPTIONS: { value: EvidenceStatus; label: string }[] = [
  { value: "supported", label: "Supported" },
  { value: "uncertain", label: "Uncertain" },
  { value: "conflicting", label: "Conflicting" },
];

interface InterviewAnswerControlProps {
  question: string;
  reviewer: string;
  onRecord: (answer: string, status: EvidenceStatus, reviewer: string) => void;
}

/**
 * Lets the reviewer capture what the candidate said in the interview.
 *
 * The answer becomes an interview-sourced evidence item: the candidate's words
 * are the quote, the status is the reviewer's choice, and who captured it and
 * when is recorded alongside. Because there is no document to check it against,
 * it can never be citation-verified and never carries line numbers.
 */
export function InterviewAnswerControl({
  question,
  reviewer,
  onRecord,
}: InterviewAnswerControlProps) {
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<EvidenceStatus>("supported");
  const [capturedBy, setCapturedBy] = useState(reviewer);

  const canSave = answer.trim().length > 0;
  const inputId = `interview-answer-${question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 32)}`;

  const save = () => {
    if (!canSave) return;
    onRecord(answer, status, capturedBy);
    setAnswer("");
    setStatus("supported");
  };

  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex gap-3">
        <MessageCircleQuestionMark className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Interview question
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900">
            {question}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-sky-200 bg-background p-3">
        <div className="flex gap-2.5">
          <Mic className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
          <div className="min-w-0 flex-1">
            <label
              htmlFor={inputId}
              className="block text-xs font-medium text-muted-foreground"
            >
              What did the candidate answer?
            </label>
            <textarea
              id={inputId}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              rows={2}
              placeholder="Quote the answer as given."
              className="mt-1.5 w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70"
            />

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Status
              </span>
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    status === option.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:border-primary/40",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Captured by
                <select
                  value={capturedBy}
                  onChange={(event) => setCapturedBy(event.target.value)}
                  className="rounded-lg border bg-background px-2 py-1 text-xs text-foreground"
                >
                  {REVIEWERS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={save}
                disabled={!canSave}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  canSave
                    ? "bg-sky-700 text-primary-foreground hover:opacity-90"
                    : "cursor-not-allowed bg-muted text-muted-foreground",
                )}
              >
                Record answer
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-amber-900">
        The answer is recorded as evidence from the interview. It is never shown
        as citation-verified, because it cannot be checked against the source
        document.
      </p>
    </div>
  );
}
