import { History } from "lucide-react";

import type { EvidenceRecord } from "@/types";

interface ReplayPanelProps {
  record: EvidenceRecord;
  criterionLabel: (criterionId: string) => string;
}

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4 py-1.5">
    <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
    <span className="min-w-0 break-words text-right text-xs font-medium tabular-nums">
      {value}
    </span>
  </div>
);

export function ReplayPanel({ record, criterionLabel }: ReplayPanelProps) {
  const { replayMetadata: meta, reviewerEdits, humanDecision } = record;

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Replay record
        </p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        What is retained so this decision can be reconstructed later.
      </p>

      <div className="mt-3 divide-y">
        <Row label="Record" value={record.id} />
        <Row label="Model" value={meta.modelName} />
        <Row label="Prompt version" value={meta.promptVersion} />
        <Row label="Schema version" value={meta.schemaVersion} />
        <Row label="Input hash" value={meta.inputHash} />
        <Row label="Run" value={formatWhen(meta.runTimestamp)} />
        <Row
          label="Evidence edits"
          value={
            reviewerEdits.length === 0
              ? "none"
              : `${reviewerEdits.length} saved`
          }
        />
        <Row
          label="Decision event"
          value={
            humanDecision
              ? `${humanDecision.disposition} by ${humanDecision.reviewerName}`
              : "not recorded"
          }
        />
      </div>

      {reviewerEdits.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Human overrides
          </p>
          <ul className="mt-2 space-y-2">
            {reviewerEdits.map((edit, index) => (
              <li
                key={`${edit.field}-${edit.timestamp}-${index}`}
                className="rounded-xl border bg-background p-3"
              >
                <p className="text-xs font-semibold">
                  {criterionLabel(edit.field.split(".")[1] ?? "")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {edit.previousValue} to {edit.newValue}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">
                  {edit.reason}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {edit.reviewer}, {formatWhen(edit.timestamp)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
