import { AlertTriangle, Check, ScanSearch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SensitivityDiagnostic } from "@/types";

interface SensitivityPanelProps {
  diagnostic: SensitivityDiagnostic | null;
  running: boolean;
  error: string | null;
  criterionLabel: (criterionId: string) => string;
  onRun: () => void;
}

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * The masked rerun diagnostic.
 *
 * Wording here is deliberately careful. This is a trigger for human review, not
 * a fairness result, it masks a name and pronouns only, and it cannot detect
 * every proxy. Never let this panel imply otherwise.
 */
export function SensitivityPanel({
  diagnostic,
  running,
  error,
  criterionLabel,
  onRun,
}: SensitivityPanelProps) {
  return (
    <div className="card-surface p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <ScanSearch
              aria-hidden
              className="h-4 w-4 shrink-0 text-muted-foreground"
            />
            <p className="eyebrow">Identity sensitivity check</p>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Runs the same extraction again with the candidate's name and pronouns
            removed, then compares the result criterion by criterion. If anything
            changes, a human should look at it.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={running}
          onClick={onRun}
        >
          {running ? "Running the masked pass" : "Run masked rerun"}
        </Button>
      </div>

      <p className="mt-4 rounded-xl border border-line bg-surface px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
        This is a review signal, not a fairness result. It does not establish that
        a decision was fair, and it cannot detect every proxy for identity.
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-conflicting/30 bg-conflicting-soft px-3.5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-conflicting">
            Masked rerun failed
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink">{error}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Nothing on the record was changed.
          </p>
        </div>
      )}

      {diagnostic && (
        <div className="mt-4">
          <div
            className={cn(
              "flex items-start gap-2.5 rounded-xl border px-3.5 py-3",
              diagnostic.changedCount > 0
                ? "border-uncertain/30 bg-uncertain-soft"
                : "border-supported/30 bg-supported-soft",
            )}
          >
            {diagnostic.changedCount > 0 ? (
              <AlertTriangle
                aria-hidden
                className="mt-0.5 h-4 w-4 shrink-0 text-uncertain"
              />
            ) : (
              <Check
                aria-hidden
                className="mt-0.5 h-4 w-4 shrink-0 text-supported"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                {diagnostic.changedCount > 0
                  ? `${diagnostic.changedCount} ${diagnostic.changedCount === 1 ? "criterion" : "criteria"} changed when identity was masked`
                  : "Nothing changed when identity was masked"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink/80">
                {diagnostic.changedCount > 0
                  ? "Open these criteria and check the evidence yourself before deciding."
                  : "The same statuses came back on the masked pass."}
              </p>
            </div>
          </div>

          <ul className="mt-3 space-y-2">
            {diagnostic.comparisons.map((comparison) => (
              <li
                key={comparison.criterionId}
                className={cn(
                  "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl border px-3.5 py-2.5",
                  comparison.changed
                    ? "border-uncertain/30 bg-uncertain-soft"
                    : "border-line bg-surface",
                )}
              >
                <span className="text-xs font-semibold text-ink">
                  {criterionLabel(comparison.criterionId)}
                </span>
                <span className="font-mono text-2xs text-muted-foreground">
                  {comparison.unmaskedStatus} to {comparison.maskedStatus}
                  {comparison.changed ? ", review" : ", unchanged"}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-3 font-mono text-2xs text-muted-foreground">
            masked: {diagnostic.maskedFields} · run{" "}
            {formatWhen(diagnostic.runTimestamp)}
          </p>
        </div>
      )}
    </div>
  );
}
