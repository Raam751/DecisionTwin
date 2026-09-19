import { useCallback, useRef, useState } from "react";
import { CircleDashed, Loader2, TriangleAlert, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchStoredRecord, generateEvidence } from "@/services/evidence-api";
import type { Candidate, Role } from "@/types";

type RowState = "queued" | "skipped" | "running" | "done" | "failed";

interface Row {
  candidateId: string;
  name: string;
  state: RowState;
  detail?: string;
  rejected?: number;
}

const STEP_LABELS = [
  "reading the document",
  "linking evidence to source lines",
  "verifying citations",
];

/**
 * Generates evidence for every candidate in the active role, one at a time.
 *
 * Sequential on purpose: it keeps the gateway happy, makes progress legible, and
 * means a single failure does not take the rest of the queue with it. Nothing
 * starts without a click, because every run costs credits.
 */
export function BatchGenerate({
  role,
  candidates,
}: {
  role: Role;
  candidates: Candidate[];
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [summary, setSummary] = useState<string | null>(null);
  const stopRequested = useRef(false);

  const patch = (candidateId: string, next: Partial<Row>) =>
    setRows((current) =>
      (current ?? []).map((row) =>
        row.candidateId === candidateId ? { ...row, ...next } : row,
      ),
    );

  const run = useCallback(
    async (regenerateAll: boolean) => {
      if (candidates.length === 0) return;
      stopRequested.current = false;
      setRunning(true);
      setSummary(null);
      setRows(
        candidates.map((candidate) => ({
          candidateId: candidate.id,
          name: candidate.name,
          state: "queued" as RowState,
        })),
      );

      let generated = 0;
      let skipped = 0;
      let failed = 0;
      let rejectedTotal = 0;

      const ticker = window.setInterval(
        () => setStep((current) => (current + 1) % STEP_LABELS.length),
        2600,
      );

      for (const candidate of candidates) {
        if (stopRequested.current) {
          patch(candidate.id, { state: "skipped", detail: "stopped" });
          skipped += 1;
          continue;
        }

        if (!regenerateAll) {
          const existing = await fetchStoredRecord(candidate.id);
          if (existing && existing.evidence.length > 0) {
            patch(candidate.id, {
              state: "skipped",
              detail: "already has a record",
            });
            skipped += 1;
            continue;
          }
        }

        patch(candidate.id, { state: "running" });
        try {
          const result = await generateEvidence(role, candidate);
          rejectedTotal += result.rejectedCitations.length;
          generated += 1;
          patch(candidate.id, {
            state: "done",
            rejected: result.rejectedCitations.length,
            detail:
              result.rejectedCitations.length > 0
                ? `${result.rejectedCitations.length} citation${result.rejectedCitations.length === 1 ? "" : "s"} rejected`
                : "all citations verified",
          });
        } catch (error) {
          failed += 1;
          patch(candidate.id, {
            state: "failed",
            detail: (error as Error).message,
          });
        }
      }

      window.clearInterval(ticker);
      setRunning(false);
      setSummary(
        [
          `${generated} generated`,
          `${skipped} skipped`,
          `${failed} failed`,
          `${rejectedTotal} citation${rejectedTotal === 1 ? "" : "s"} rejected by verification`,
        ].join(", "),
      );
    },
    [candidates, role],
  );

  return (
    <div className="card-surface p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Generate for the whole role</p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Runs the model for every candidate in {role.title}, one at a time.
            Candidates that already have a record are skipped unless you choose to
            regenerate.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" size="sm" disabled={running} onClick={() => run(false)}>
            {running ? "Generating" : "Generate all"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={running}
            onClick={() => run(true)}
          >
            Regenerate all
          </Button>
          {running && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                stopRequested.current = true;
              }}
            >
              Stop after current
            </Button>
          )}
        </div>
      </div>

      {running && (
        <p className="mt-4 font-mono text-2xs text-muted-foreground">
          {STEP_LABELS[step]}
        </p>
      )}

      {rows && (
        <ul className="mt-4 space-y-2">
          {rows.map((row) => (
            <li
              key={row.candidateId}
              className={cn(
                "flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border px-3.5 py-2.5",
                row.state === "failed"
                  ? "border-conflicting/30 bg-conflicting-soft"
                  : row.state === "done"
                    ? "border-supported/30 bg-supported-soft"
                    : "border-line bg-surface",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                {row.state === "running" ? (
                  <Loader2 aria-hidden className="h-3.5 w-3.5 shrink-0 animate-spin text-brand" />
                ) : row.state === "done" ? (
                  <Check aria-hidden className="h-3.5 w-3.5 shrink-0 text-supported" />
                ) : row.state === "failed" ? (
                  <TriangleAlert aria-hidden className="h-3.5 w-3.5 shrink-0 text-conflicting" />
                ) : (
                  <CircleDashed aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate text-xs font-semibold text-ink">
                  {row.name}
                </span>
              </span>
              <span className="font-mono text-2xs text-muted-foreground">
                {row.detail ?? row.state}
              </span>
            </li>
          ))}
        </ul>
      )}

      {summary && (
        <p className="mt-4 rounded-xl border border-line bg-surface px-3.5 py-3 text-xs text-ink">
          {summary}
        </p>
      )}
    </div>
  );
}
