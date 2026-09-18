import { useState } from "react";
import { PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EvidenceStatus } from "@/types";

const OPTIONS: { value: EvidenceStatus; label: string }[] = [
  { value: "supported", label: "Supported" },
  { value: "uncertain", label: "Uncertain" },
  { value: "conflicting", label: "Conflicting" },
];

const MIN_REASON = 5;

interface OverrideControlProps {
  currentStatus: EvidenceStatus;
  onOverride: (next: EvidenceStatus, reason: string) => void;
}

export function OverrideControl({
  currentStatus,
  onOverride,
}: OverrideControlProps) {
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState<EvidenceStatus | null>(null);
  const [reason, setReason] = useState("");

  const canSave = !!next && next !== currentStatus && reason.trim().length >= MIN_REASON;

  const close = () => {
    setOpen(false);
    setNext(null);
    setReason("");
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface hover:text-brand-deep"
      >
        <PenLine aria-hidden className="h-3.5 w-3.5" />
        Challenge this evidence
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="eyebrow">Challenge evidence</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {OPTIONS.map((option) => {
          const isCurrent = option.value === currentStatus;
          const selected = next === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={isCurrent}
              aria-pressed={selected}
              onClick={() => setNext(option.value)}
              className={cn(
                "focus-ring rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                isCurrent && "cursor-not-allowed border-line text-muted-foreground/60",
                !isCurrent && selected && "border-brand bg-primary text-primary-foreground",
                !isCurrent && !selected && "border-line bg-card text-ink hover:border-brand/40",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <label className="mt-3 block text-xs font-semibold text-ink">
        Reason for the change
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="What the evidence does not support, and why"
          className="focus-ring mt-1.5 w-full rounded-lg border border-line bg-card px-3 py-2 text-xs font-normal text-ink placeholder:text-muted-foreground/70"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          disabled={!canSave}
          onClick={() => {
            if (!next) return;
            onOverride(next, reason.trim());
            close();
          }}
        >
          Save override
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <span className="font-mono text-2xs text-muted-foreground">
          {reason.trim().length}/{MIN_REASON} characters
        </span>
      </div>
    </div>
  );
}
