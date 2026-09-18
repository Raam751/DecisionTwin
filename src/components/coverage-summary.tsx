import { CheckCircle2, CircleAlert, CircleDashed } from "lucide-react";

import { cn } from "@/lib/utils";
import type { EvidenceItem, RoleCriterion } from "@/types";

interface CoverageSummaryProps {
  criteria: RoleCriterion[];
  evidence: EvidenceItem[];
}

interface GroupCoverage {
  total: number;
  covered: number;
  missing: string[];
}

function summarise(
  criteria: RoleCriterion[],
  evidence: EvidenceItem[],
): GroupCoverage {
  const coveredIds = new Set(
    evidence
      .filter((item) => item.status === "supported")
      .map((item) => item.criterionId),
  );
  const missing = criteria
    .filter((criterion) => !coveredIds.has(criterion.id))
    .map((criterion) => criterion.label);

  return { total: criteria.length, covered: criteria.length - missing.length, missing };
}

function CoverageGroup({
  title,
  coverage,
  note,
  essential,
}: {
  title: string;
  coverage: GroupCoverage;
  note: string;
  essential: boolean;
}) {
  const hasGap = coverage.missing.length > 0;
  const Icon = !hasGap ? CheckCircle2 : essential ? CircleAlert : CircleDashed;

  return (
    <div
      className={cn(
        "rounded-xl border p-3.5",
        hasGap && essential
          ? "border-amber-200 bg-amber-50/70"
          : "border-border bg-background",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            hasGap
              ? essential
                ? "text-amber-700"
                : "text-muted-foreground"
              : "text-emerald-600",
          )}
        />
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            hasGap && essential ? "text-amber-800" : "text-muted-foreground",
          )}
        >
          {title}
        </p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {coverage.covered} of {coverage.total} covered
        </p>
      </div>
      <p
        className={cn(
          "mt-2 text-sm leading-relaxed",
          hasGap && essential ? "text-amber-900" : "text-foreground/80",
        )}
      >
        {hasGap ? `No supporting evidence for ${coverage.missing.join(", ")}. ${note}` : note}
      </p>
    </div>
  );
}

/**
 * States what the cited evidence covers, split by how much the role needs it.
 *
 * A candidate missing an essential criterion is a different situation from one
 * missing only a desirable criterion, so the two are never merged into a single
 * number. Nothing here scores, ranks or shortlists anyone: the reviewer decides.
 */
export function CoverageSummary({ criteria, evidence }: CoverageSummaryProps) {
  const essential = summarise(
    criteria.filter((criterion) => criterion.required),
    evidence,
  );
  const desirable = summarise(
    criteria.filter((criterion) => !criterion.required),
    evidence,
  );

  const total = criteria.length;
  const covered = essential.covered + desirable.covered;
  const allCovered = covered === total;

  return (
    <section className="mt-6 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="inline-flex items-center gap-2.5">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              allCovered ? "bg-emerald-500" : "bg-amber-500",
            )}
          />
          <p className="text-sm font-semibold">
            {covered} of {total} criteria covered
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Coverage only. No score, no ranking, no rejection.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {essential.total > 0 && (
          <CoverageGroup
            title="Essential"
            coverage={essential}
            essential
            note={
              essential.missing.length > 0
                ? "The role cannot be met without it."
                : "Covered by cited evidence."
            }
          />
        )}
        {desirable.total > 0 && (
          <CoverageGroup
            title="Desirable"
            coverage={desirable}
            essential={false}
            note={
              desirable.missing.length > 0
                ? "Useful, but not required for the role."
                : "Covered by cited evidence."
            }
          />
        )}
      </div>

      {essential.missing.length > 0 && (
        <p className="mt-3 text-sm leading-relaxed text-amber-900">
          An essential criterion is still open for this candidate. That is
          reported here, not decided here: the reviewer says what it means.
        </p>
      )}
    </section>
  );
}
