import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  FileText,
  LoaderCircle,
  Scale,
  UserRound,
} from "lucide-react";

import { useRoleRecords } from "@/hooks/use-role-records";
import { currentStageOf } from "@/lib/stages";
import { useRoles } from "@/state/roles-store";
import { cn } from "@/lib/utils";
import type { Candidate, EvidenceItem, RoleCriterion } from "@/types";

/** The three dispositions a reviewer can record, in a fixed display order. */
const DISPOSITIONS = [
  "Advance to interview",
  "Hold for verification",
  "Decline",
] as const;

const NO_DECISION = "No decision recorded";

const GROUP_TONE: Record<
  string,
  { chip: string; rail: string; icon: typeof CheckCircle2 }
> = {
  [DISPOSITIONS[0]]: {
    chip: "border-supported/30 bg-supported-soft text-supported",
    rail: "bg-supported",
    icon: CheckCircle2,
  },
  [DISPOSITIONS[1]]: {
    chip: "border-uncertain/30 bg-uncertain-soft text-uncertain",
    rail: "bg-uncertain",
    icon: CircleDashed,
  },
  [DISPOSITIONS[2]]: {
    chip: "border-conflicting/30 bg-conflicting-soft text-conflicting",
    rail: "bg-conflicting",
    icon: CircleAlert,
  },
  [NO_DECISION]: {
    chip: "border-line bg-surface text-muted-foreground",
    rail: "bg-line",
    icon: CircleDashed,
  },
};

const EMPTY_TEXT: Record<string, string> = {
  [DISPOSITIONS[0]]: "No candidates have been advanced to interview yet.",
  [DISPOSITIONS[1]]: "No candidates are being held for verification yet.",
  [DISPOSITIONS[2]]: "No candidates have been declined yet.",
  [NO_DECISION]: "Every candidate in this role has a recorded decision.",
};

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * A single factual coverage line for one candidate, matching the wording used
 * across the app. Facts only: how many criteria have cited evidence behind
 * them. It is never used to rank or select anyone.
 */
function coverageLine(
  criteria: RoleCriterion[],
  evidence: EvidenceItem[],
): string {
  const supported = new Set(
    evidence
      .filter((item) => item.status === "supported")
      .map((item) => item.criterionId),
  );
  const essential = criteria.filter((criterion) => criterion.required);
  const desirable = criteria.filter((criterion) => !criterion.required);

  const parts: string[] = [];
  if (essential.length > 0) {
    const covered = essential.filter((criterion) =>
      supported.has(criterion.id),
    ).length;
    parts.push(
      `${covered} of ${essential.length} essential criteria covered by cited evidence`,
    );
  }
  if (desirable.length > 0) {
    const covered = desirable.filter((criterion) =>
      supported.has(criterion.id),
    ).length;
    parts.push(
      `${covered} of ${desirable.length} desirable criteria covered by cited evidence`,
    );
  }
  return parts.length > 0 ? parts.join(", ") : "No criteria in this role";
}

/**
 * A record of the decisions humans recorded for the active role.
 *
 * This is NOT a shortlist, a ranking, or a selection the tool produced. Every
 * entry carries a named reviewer and their written reason, and the candidates
 * stay in the order they were added.
 */
const Decisions = () => {
  const { activeRole, activeCandidates } = useRoles();
  const { records, loading } = useRoleRecords(activeCandidates);

  const groups = useMemo(() => {
    const map: Record<string, Candidate[]> = {};
    const order: string[] = [];

    for (const candidate of activeCandidates) {
      // Group by the most recent decision actually recorded against a stage.
      // humanDecision alone is not enough: a reviewer who reopens the current
      // stage's call clears it, and that must not drop the candidate out of the
      // group their last real decision put them in.
      const stored = records[candidate.id] ?? null;
      const stageDecisions = stored?.decisions ?? [];
      const latestStageDecision =
        stageDecisions.length > 0
          ? stageDecisions[stageDecisions.length - 1]
          : null;
      const decision = latestStageDecision ?? stored?.humanDecision ?? null;
      const key =
        decision?.disposition && decision.reviewerName && decision.reason
          ? decision.disposition
          : NO_DECISION;

      if (!(key in map)) {
        map[key] = [];
        order.push(key);
      }
      map[key].push(candidate);
    }

    // Fixed groups first, then any extra stored disposition, so nothing is hidden.
    const fixed = [DISPOSITIONS[0], DISPOSITIONS[1], DISPOSITIONS[2], NO_DECISION];
    const orderedKeys = [
      ...fixed,
      ...order.filter((key) => !fixed.includes(key)),
    ];
    return orderedKeys.map((key) => ({ key, candidates: map[key] ?? [] }));
  }, [activeCandidates, records]);

  return (
    <div className="min-h-full bg-background">
      <div className="workspace-container">
        <header className="workspace-page-heading">
          <div className="flex items-center gap-2.5">
            <Scale className="h-5 w-5 text-brand-deep" aria-hidden="true" />
            <h1 className="workspace-title">Decisions</h1>
          </div>
          <p className="workspace-description">
            Recorded decisions for {activeRole.title}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Every entry below is a decision a human made, with a named reviewer
            and a written reason. Nothing here was selected, ranked or
            shortlisted by the tool: it is a record, in the order the candidates
            were added.
          </p>
          <div className="mt-5">
            <Link
              to="/report"
              className="focus-ring inline-flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand/40 hover:bg-surface"
            >
              <FileText className="h-4 w-4" aria-hidden />
              Export auditable hiring report
            </Link>
          </div>
        </header>

        {loading && (
          <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Gathering stored evidence records
          </p>
        )}

        {groups.map(({ key, candidates }) => {
          const tone = GROUP_TONE[key] ?? GROUP_TONE[NO_DECISION];
          const GroupIcon = tone.icon;
          return (
            <section key={key} className="mt-8">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                    tone.chip,
                  )}
                >
                  <GroupIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {key}
                </span>
                <span className="tnum text-xs text-muted-foreground">
                  {candidates.length}{" "}
                  {candidates.length === 1 ? "candidate" : "candidates"}
                </span>
              </div>

              {candidates.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-line bg-card/60 p-6 text-sm text-muted-foreground">
                  {EMPTY_TEXT[key] ?? "No candidates in this group yet."}
                </div>
              ) : (
                <ol className="mt-3 space-y-3">
                  {candidates.map((candidate) => {
                    const decision =
                      (records[candidate.id]?.decisions ?? []).slice(-1)[0] ??
                      records[candidate.id]?.humanDecision ??
                      null;
                    const coverage = coverageLine(
                      activeRole.criteria,
                      records[candidate.id]?.evidence ?? [],
                    );

                    return (
                      <li key={candidate.id}>
                        <article className="relative overflow-hidden rounded-2xl border border-line bg-card shadow-card transition-colors hover:border-brand/40">
                          <span
                            aria-hidden
                            className={cn(
                              "absolute inset-y-0 left-0 w-[3px]",
                              tone.rail,
                            )}
                          />
                          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 px-5 py-4 md:px-6">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                <Link
                                  to={`/review/${candidate.id}`}
                                  className="font-serif text-xl font-medium tracking-tight text-ink underline-offset-4 hover:underline"
                                >
                                  {candidate.name}
                                </Link>
                                <span className="rounded-full border border-brand/25 bg-peach px-2.5 py-0.5 font-mono text-2xs font-semibold uppercase tracking-[0.08em] text-peach-foreground">
                                  Stage:{" "}
                                  {currentStageOf({
                                    currentStage: records[candidate.id]?.currentStage,
                                  })}
                                </span>
                              </div>

                              {decision ? (
                                <div className="mt-3 space-y-2.5">
                                  <p className="flex items-start gap-2 text-sm leading-relaxed text-ink/85">
                                    <span className="font-medium text-ink">
                                      Reason:
                                    </span>{" "}
                                    {decision.reason}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1.5 font-medium">
                                      <UserRound
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                      />
                                      {decision.reviewerName}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                      <CalendarClock
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                      />
                                      <span className="font-mono text-2xs">
                                        {formatWhen(decision.timestamp)}
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                                  No decision has been recorded yet. Open the
                                  review to record one with a named reviewer and
                                  a reason.
                                </p>
                              )}
                            </div>

                            <div className="flex shrink-0 flex-col items-start gap-2">
                              <p className="max-w-[15rem] text-right text-2xs leading-relaxed text-muted-foreground">
                                {coverage}
                              </p>
                              <Link
                                to={`/review/${candidate.id}`}
                                className="focus-ring text-xs font-medium text-brand-deep underline-offset-4 hover:text-ink hover:underline"
                              >
                                Open review
                              </Link>
                            </div>
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default Decisions;
