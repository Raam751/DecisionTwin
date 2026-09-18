import { useState } from "react";
import { CheckCircle2, Gavel, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { REVIEWERS } from "@/hooks/use-evidence-record";
import { cn } from "@/lib/utils";
import type { HumanDecision, StageDecision } from "@/types";

const DISPOSITIONS = [
  "Advance to interview",
  "Hold for verification",
  "Decline",
];

const MIN_REASON = 10;

interface DecisionPanelProps {
  /** The decision for the current stage only, or null when none is recorded. */
  decision: HumanDecision | null;
  /** Decisions recorded in earlier stages, shown read only, in stage order. */
  history: StageDecision[];
  reviewer: string;
  unresolvedCount: number;
  stage: string;
  onReviewerChange: (name: string) => void;
  onSave: (disposition: string, reason: string) => void;
  onClear: () => void;
}

/** Earlier stages' decisions, read only. They cannot be edited from here. */
function StageHistory({ history }: { history: StageDecision[] }) {
  if (history.length === 0) return null;

  return (
    <div className="mt-5 border-t border-line pt-4">
      <p className="eyebrow">Earlier stages</p>
      <ul className="mt-3 space-y-3">
        {history.map((entry) => (
          <li
            key={`${entry.stage}-${entry.timestamp}`}
            className="rounded-xl border border-line bg-surface px-3.5 py-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-xs font-semibold text-ink">
                {entry.stage}: {entry.disposition}
              </p>
              <span className="font-mono text-2xs text-muted-foreground">
                {formatWhen(entry.timestamp)}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-ink/80">
              {entry.reason}
            </p>
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-2xs text-muted-foreground">
              <UserRound aria-hidden className="h-3 w-3" />
              {entry.reviewerName}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function DecisionPanel({
  decision,
  history,
  reviewer,
  unresolvedCount,
  stage,
  onReviewerChange,
  onSave,
  onClear,
}: DecisionPanelProps) {
  const [disposition, setDisposition] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const reasonLength = reason.trim().length;
  const canSave = !!disposition && reasonLength >= MIN_REASON;

  if (decision) {
    return (
      <div className="card-surface overflow-hidden border-supported/30">
        <div className="flex items-center gap-2.5 border-b border-line bg-supported-soft px-5 py-3.5">
          <CheckCircle2 aria-hidden className="h-4 w-4 shrink-0 text-supported" />
          <p className="eyebrow text-supported">
            Decision recorded for {stage} by a human reviewer
          </p>
        </div>

        <div className="p-5 md:p-6">
          <p className="font-serif text-2xl font-semibold leading-tight tracking-tight text-ink md:text-[28px]">
            {decision.disposition}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink/85">
            {decision.reason}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <UserRound aria-hidden className="h-3.5 w-3.5" />
              {decision.reviewerName}
            </span>
            <span className="font-mono text-2xs">
              {formatWhen(decision.timestamp)}
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-5"
            onClick={() => {
              setDisposition(null);
              setReason("");
              onClear();
            }}
          >
            Change the {stage} decision
          </Button>

          <StageHistory history={history} />
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface p-5 md:p-6">
      <div className="flex items-center gap-2.5">
        <Gavel aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="eyebrow">Human decision for {stage}</p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        The model drafts evidence. A named reviewer makes the call, and owns it
        afterwards.
      </p>

      <label className="mt-5 block text-xs font-semibold text-ink">
        Reviewer
        <select
          value={reviewer}
          onChange={(event) => onReviewerChange(event.target.value)}
          className="focus-ring mt-1.5 w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm font-normal text-ink"
        >
          {REVIEWERS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="mt-5">
        <legend className="text-xs font-semibold text-ink">Disposition</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {DISPOSITIONS.map((option) => {
            const selected = disposition === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => setDisposition(option)}
                className={cn(
                  "focus-ring rounded-xl border px-3 py-3 text-left text-xs font-semibold leading-snug transition-all duration-200",
                  selected
                    ? "border-brand bg-peach text-peach-foreground shadow-card"
                    : "border-line bg-card text-ink hover:border-brand/40 hover:bg-surface",
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      </fieldset>

      {unresolvedCount > 0 && (
        <p className="mt-4 rounded-xl border border-uncertain/25 bg-uncertain-soft px-3.5 py-3 text-xs leading-relaxed text-ink">
          {unresolvedCount} {unresolvedCount === 1 ? "criterion is" : "criteria are"}{" "}
          still unresolved. Say how you handled that in your reason.
        </p>
      )}

      <label className="mt-5 block text-xs font-semibold text-ink">
        Reason (required)
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          placeholder="Why this decision, given the cited evidence and what is still unknown."
          className="focus-ring mt-1.5 w-full resize-none rounded-xl border border-line bg-card px-3 py-2.5 text-sm font-normal leading-relaxed text-ink placeholder:text-muted-foreground/70"
        />
      </label>

      <div className="mt-5">
        <Button
          type="button"
          disabled={!canSave}
          onClick={() => {
            if (!disposition) return;
            onSave(disposition, reason.trim());
          }}
        >
          Save decision
        </Button>
        <p
          className={cn(
            "mt-2.5 font-mono text-2xs",
            canSave ? "text-muted-foreground" : "text-uncertain",
          )}
        >
          {!disposition
            ? "pick a disposition, then write at least 10 characters"
            : reasonLength === 0
              ? "the reason is required: at least 10 characters"
              : canSave
                ? "ready to record"
                : `${reasonLength} of 10 characters`}
        </p>
      </div>

      <StageHistory history={history} />
    </div>
  );
}
