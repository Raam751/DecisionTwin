import { useState } from "react";
import { PenLine } from "lucide-react";

import { cn } from "@/lib/utils";
import type { EvidenceStatus } from "@/types";

const OPTIONS: { value: EvidenceStatus; label: string }[] = [
  { value: "supported", label: "Supported" },
  { value: "uncertain", label: "Uncertain" },
  { value: "conflicting", label: "Conflicting" },
];

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

  const canSave = !!next && next !== currentStatus && reason.trim().length >= 5;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <PenLine className="h-3.5 w-3.5" />
        Challenge this evidence
      </button>
    );
  }

  return (
    <div className="rounded-xl border bg-background p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Challenge evidence
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={option.value === currentStatus}
            onClick={() => setNext(option.value)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              option.value === currentStatus &&
                "cursor-not-allowed opacity-40",
              next === option.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:border-primary/40",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for the change"
        className="mt-2 w-full rounded-lg border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/70"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={!canSave}
          onClick={() => {
            if (!next) return;
            onOverride(next, reason.trim());
            setOpen(false);
            setNext(null);
            setReason("");
          }}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            canSave
              ? "bg-primary text-primary-foreground hover:opacity-90"
              : "cursor-not-allowed bg-muted text-muted-foreground",
          )}
        >
          Save override
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setNext(null);
            setReason("");
          }}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
