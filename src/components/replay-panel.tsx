import { History } from "lucide-react";

import { InterviewTag } from "@/components/interview-tag";
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
  <div className="py-2.5">
    <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
      {label}
    </p>
    <p className="mt-1 break-all font-mono text-xs leading-relaxed text-ink">
      {value}
    </p>
  </div>
);

export function ReplayPanel({ record, criterionLabel }: ReplayPanelProps) {
  const { replayMetadata: meta, reviewerEdits, humanDecision } = record;
  const interviewAnswers = record.evidence.filter(
    (item) => item.recordedAtInterview,
  );

  return (
    <div className="card-surface p-5 md:p-6">
      <div className="flex items-center gap-2.5">
        <History aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="eyebrow">Replay record</p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        What is retained, so this decision can be reconstructed months from now.
      </p>

      <div className="mt-4 divide-y divide-line border-y border-line">
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
          label="Interview answers"
          value={
            interviewAnswers.length === 0
              ? "none"
              : `${interviewAnswers.length} recorded`
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
        <div className="mt-5">
          <p className="eyebrow">Human overrides</p>
          <ul className="mt-3 space-y-2">
            {reviewerEdits.map((edit, index) => (
              <li
                key={`${edit.field}-${edit.timestamp}-${index}`}
                className="card-inset p-3.5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-xs font-semibold text-ink">
                    {criterionLabel(edit.field.split(".")[1] ?? "")}
                  </p>
                  <p className="font-mono text-2xs text-muted-foreground">
                    {edit.previousValue} → {edit.newValue}
                  </p>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-ink/85">
                  {edit.reason}
                </p>
                <p className="mt-1.5 font-mono text-2xs text-muted-foreground">
                  {edit.reviewer} · {formatWhen(edit.timestamp)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {interviewAnswers.length > 0 && (
        <div className="mt-5">
          <p className="eyebrow">Interview answers</p>
          <ul className="mt-3 space-y-2">
            {interviewAnswers.map((item) => (
              <li key={item.criterionId} className="card-inset p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-ink">
                    {criterionLabel(item.criterionId)}
                  </p>
                  <InterviewTag />
                </div>
                <blockquote className="mt-2 border-l-2 border-interview/40 pl-3 text-xs leading-relaxed text-ink/85">
                  “{item.quotedText}”
                </blockquote>
                <p className="mt-2 font-mono text-2xs text-muted-foreground">
                  {item.recordedBy} · {formatWhen(item.recordedAt ?? "")} · not
                  citation-verified
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
