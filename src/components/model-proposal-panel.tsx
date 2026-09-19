import { useState } from "react";
import { ChevronDown, ShieldAlert, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import type { EvidenceItem, ProposedEvidence } from "@/types";

interface ModelProposalPanelProps {
  proposal: ProposedEvidence[];
  evidence: EvidenceItem[];
  criterionLabel: (criterionId: string) => string;
}

const rangeLabel = (start: number, end: number) => {
  if (!start) return "no citation";
  if (start === end) return `line ${start}`;
  return `lines ${start} to ${end}`;
};

/**
 * What the model claimed, beside what survived server-side verification.
 *
 * Nothing here is ever shown as verified. These are the model's raw claims, kept
 * so a reviewer can see exactly what the server changed and why.
 */
export function ModelProposalPanel({
  proposal,
  evidence,
  criterionLabel,
}: ModelProposalPanelProps) {
  const [open, setOpen] = useState(false);

  if (proposal.length === 0) return null;

  // Compare against document-sourced evidence only. An interview answer has no
  // counterpart in the model's proposal.
  const finalByCriterion = new Map(
    evidence
      .filter((item) => !item.recordedAtInterview)
      .map((item) => [item.criterionId, item]),
  );

  const rows = proposal.map((proposed) => {
    const final = finalByCriterion.get(proposed.criterionId);
    const changed =
      !final ||
      final.status !== proposed.status ||
      final.sourceStartLine !== proposed.sourceStartLine ||
      final.sourceEndLine !== proposed.sourceEndLine;
    return { proposed, final, changed };
  });

  const changedCount = rows.filter((row) => row.changed).length;

  return (
    <div className="card-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="focus-ring flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        {changedCount > 0 ? (
          <ShieldAlert aria-hidden className="h-4 w-4 shrink-0 text-uncertain" />
        ) : (
          <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-supported" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">
            What the model proposed
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {changedCount === 0
              ? "Verification kept every claim as the model made it."
              : `Verification changed ${changedCount} of ${rows.length} claims.`}
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="border-t border-line px-5 pb-5 pt-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            These are the model's raw claims, before the server checked them.
            Nothing in this panel is verified. Where the two columns differ, the
            quote was not found at the lines the model cited, so the claim was
            downgraded.
          </p>

          <ul className="mt-4 space-y-2.5">
            {rows.map(({ proposed, final, changed }) => (
              <li
                key={proposed.criterionId}
                className={cn(
                  "rounded-xl border px-3.5 py-3",
                  changed
                    ? "border-uncertain/30 bg-uncertain-soft"
                    : "border-line bg-surface",
                )}
              >
                <p className="text-xs font-semibold text-ink">
                  {criterionLabel(proposed.criterionId)}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="font-mono text-2xs uppercase tracking-wide text-muted-foreground">
                      model claimed
                    </p>
                    <p className="mt-1 text-xs text-ink">
                      {proposed.status},{" "}
                      {rangeLabel(
                        proposed.sourceStartLine,
                        proposed.sourceEndLine,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-2xs uppercase tracking-wide text-muted-foreground">
                      after verification
                    </p>
                    <p className="mt-1 text-xs text-ink">
                      {final
                        ? `${final.status}, ${rangeLabel(final.sourceStartLine, final.sourceEndLine)}`
                        : "replaced by an interview answer"}
                    </p>
                  </div>
                </div>
                {changed && (
                  <p className="mt-2 text-xs leading-relaxed text-ink/80">
                    {final?.status === "uncertain" && proposed.quotedText
                      ? "The server could not find that quote at those lines, so the claim was rejected."
                      : "The stored record differs from what the model proposed."}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
