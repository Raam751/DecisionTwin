import { useState } from "react";
import { MessageCircleQuestionMark, Mic } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  stage: string;
  onRecord: (answer: string, status: EvidenceStatus, reviewer: string) => void;
}

/**
 * Lets the reviewer capture what the candidate said in the interview for the
 * current hiring stage.
 *
 * The answer becomes interview-sourced evidence for that stage: the candidate's
 * words are the quote, the status is the reviewer's choice, and who captured
 * it, when and in which stage is recorded alongside. Because there is no
 * document to check it against, it can never be citation-verified and never
 * carries line numbers.
 */
export function InterviewAnswerControl({
  question,
  reviewer,
  stage,
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
    <div className="space-y-3">
      <div className="rounded-xl border border-uncertain/25 bg-uncertain-soft p-4">
        <div className="flex items-start gap-3">
          <MessageCircleQuestionMark
            aria-hidden
            className="mt-0.5 h-4 w-4 shrink-0 text-uncertain"
          />
          <div className="min-w-0">
            <p className="eyebrow text-uncertain">Asked at interview · {stage}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink">
              {question}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-interview/25 bg-interview-soft p-4">
        <label
          htmlFor={inputId}
          className="flex items-center gap-2 text-xs font-semibold text-interview"
        >
          <Mic aria-hidden className="h-3.5 w-3.5" />
          What did the candidate answer?
        </label>
        <textarea
          id={inputId}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          rows={2}
          placeholder="Quote the answer as given."
          className="focus-ring mt-2 w-full resize-none rounded-lg border border-line bg-card px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-muted-foreground/70"
        />

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-2xs font-semibold uppercase tracking-[0.1em] text-interview">
            Status
          </span>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((option) => {
              const selected = status === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setStatus(option.value)}
                  className={cn(
                    "focus-ring rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    selected
                      ? "border-brand bg-primary text-primary-foreground"
                      : "border-line bg-card text-ink hover:border-brand/40",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            Captured by
            <select
              value={capturedBy}
              onChange={(event) => setCapturedBy(event.target.value)}
              className="focus-ring rounded-lg border border-line bg-card px-2 py-1.5 text-xs text-ink"
            >
              {REVIEWERS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" size="sm" onClick={save} disabled={!canSave}>
            Record answer
          </Button>
        </div>

        <p className="mt-3 border-t border-interview/20 pt-3 text-xs leading-relaxed text-muted-foreground">
          Recorded as evidence from the interview. It is never shown as
          citation-verified, because it cannot be checked against the source
          document.
        </p>
      </div>
    </div>
  );
}
