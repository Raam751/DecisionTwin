import { useState } from "react";
import { CheckCircle2, UserRound } from "lucide-react";

import { REVIEWERS } from "@/hooks/use-evidence-record";
import { cn } from "@/lib/utils";
import type { HumanDecision } from "@/types";

const DISPOSITIONS = [
  "Advance to interview",
  "Hold for verification",
  "Decline",
];

interface DecisionPanelProps {
  decision: HumanDecision | null;
  reviewer: string;
  unresolvedCount: number;
  onReviewerChange: (name: string) => void;
  onSave: (disposition: string, reason: string) => void;
  onClear: () => void;
}

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function DecisionPanel({
  decision,
  reviewer,
  unresolvedCount,
  onReviewerChange,
  onSave,
  onClear,
}: DecisionPanelProps) {
  const [disposition, setDisposition] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const canSave = !!disposition && reason.trim().length >= 10;

  if (decision) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
            Decision recorded by a human reviewer
          </p>
        </div>
        <p className="mt-3 text-xl font-bold leading-tight">
          {decision.disposition}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground/80">
          {decision.reason}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5" />
            {decision.reviewerName}
          </span>
          <span>{formatWhen(decision.timestamp)}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setDisposition(null);
            setReason("");
            onClear();
          }}
          className="mt-4 text-sm font-medium text-primary hover:underline"
        >
          Change decision
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Human decision
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        The model drafts evidence. A named reviewer makes the call and owns it.
      </p>

      <label className="mt-4 block text-xs font-medium text-muted-foreground">
        Reviewer
        <select
          value={reviewer}
          onChange={(e) => onReviewerChange(e.target.value)}
          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
        >
          {REVIEWERS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        {DISPOSITIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setDisposition(option)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              disposition === option
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:border-primary/40",
            )}
          >
            {option}
          </button>
        ))}
      </div>

      {unresolvedCount > 0 && (
        <p className="mt-3 text-xs text-amber-700">
          {unresolvedCount} {unresolvedCount === 1 ? "criterion" : "criteria"}{" "}
          still unresolved. Say how you handled that in your reason.
        </p>
      )}

      <label className="mt-4 block text-xs font-medium text-muted-foreground">
        Reason (required)
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Why this decision, given the cited evidence and what is still unknown."
          className="mt-1 w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70"
        />
      </label>

      <button
        type="button"
        disabled={!canSave}
        onClick={() => {
          if (!disposition) return;
          onSave(disposition, reason.trim());
        }}
        className={cn(
          "mt-3 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
          canSave
            ? "bg-primary text-primary-foreground hover:opacity-90"
            : "cursor-not-allowed bg-muted text-muted-foreground",
        )}
      >
        Save decision
      </button>
      {!canSave && (
        <p className="mt-2 text-xs text-muted-foreground">
          Pick a disposition and write at least a short reason.
        </p>
      )}
    </div>
  );
}
