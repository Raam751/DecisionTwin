import { Check, CircleAlert, CircleDashed } from "lucide-react";

import { PriorityChip } from "@/components/priority-chip";
import { cn } from "@/lib/utils";
import type { EvidenceItem, RoleCriterion } from "@/types";

interface CoverageSummaryProps {
  criteria: RoleCriterion[];
  evidence: EvidenceItem[];
}

interface GroupCoverage {
  total: number;
  covered: RoleCriterion[];
  missing: RoleCriterion[];
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

  return {
    total: criteria.length,
    covered: criteria.filter((criterion) => coveredIds.has(criterion.id)),
    missing: criteria.filter((criterion) => !coveredIds.has(criterion.id)),
  };
}

function CoverageGroup({
  required,
  coverage,
}: {
  required: boolean;
  coverage: GroupCoverage;
}) {
  const hasGap = coverage.missing.length > 0;
  const label = required ? "Essential" : "Desirable";
  const names = coverage.missing.map((criterion) => criterion.label).join(", ");

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        hasGap && required
          ? "border-essential/25 bg-essential-soft"
          : "border-line bg-surface",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <PriorityChip required={required} />
        <span className="tnum text-xs font-semibold text-muted-foreground">
          {coverage.covered.length} of {coverage.total} covered
        </span>
      </div>

      <p
        className={cn(
          "mt-3 flex items-start gap-2 text-sm leading-relaxed",
          hasGap && required ? "text-ink" : "text-muted-foreground",
        )}
      >
        {hasGap ? (
          <CircleAlert
            aria-hidden
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              required ? "text-essential" : "text-muted-foreground",
            )}
          />
        ) : (
          <Check
            aria-hidden
            className="mt-0.5 h-4 w-4 shrink-0 text-supported"
          />
        )}
        <span>
          {hasGap ? (
            <>
              No supporting evidence for{" "}
              <span className="font-semibold text-ink">{names}</span>.{" "}
              {required
                ? "The role cannot be met without it."
                : "Useful, but the role does not depend on it."}
            </>
          ) : (
            <>Every {label.toLowerCase()} criterion is covered by cited evidence.</>
          )}
        </span>
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
  const covered = essential.covered.length + desirable.covered.length;
  const allCovered = covered === total;

  return (
    <section className="card-surface mt-8 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
        <div>
          <p className="eyebrow">Coverage</p>
          <p className="mt-2 font-serif text-2xl font-semibold tracking-tight text-ink md:text-[26px]">
            {covered} of {total} criteria covered
          </p>
        </div>
        <p className="max-w-[19rem] text-xs leading-relaxed text-muted-foreground">
          This is coverage of the cited evidence, not a score. Nothing is ranked,
          rejected or shortlisted here.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {essential.total > 0 && (
          <CoverageGroup required coverage={essential} />
        )}
        {desirable.total > 0 && (
          <CoverageGroup required={false} coverage={desirable} />
        )}
      </div>

      {essential.missing.length > 0 && (
        <p className="mt-4 flex items-start gap-2 border-t border-line pt-4 text-sm leading-relaxed text-ink">
          <CircleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-essential" />
          <span>
            An essential criterion is still open
            {allCovered ? "" : " for this candidate"}. That is reported here, not
            decided here: the reviewer says what it means.
          </span>
        </p>
      )}
    </section>
  );
}
