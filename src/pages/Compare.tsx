import { useNavigate } from "react-router-dom";
import { BadgeCheck, ChevronLeft, LoaderCircle, Mic, Table2 } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { useRoleRecords } from "@/hooks/use-role-records";
import { useRoles } from "@/state/roles-store";
import { cn } from "@/lib/utils";

/**
 * One row per candidate, one column per criterion, each cell the status of the
 * evidence for that pair. Essential criteria are marked in both the header and
 * the column body so the two kinds of gap never look alike.
 *
 * This is a coverage view. It does not score, rank or shortlist anyone, and the
 * rows stay in the order the candidates were added.
 */
const Compare = () => {
  const navigate = useNavigate();
  const { activeRole, activeCandidates } = useRoles();
  const { records, loading } = useRoleRecords(activeCandidates);

  const criteria = activeRole.criteria;
  const essentialCount = criteria.filter((criterion) => criterion.required).length;

  return (
    <div className="min-h-full bg-background">
      <div className="workspace-container">
        <button
          onClick={() => navigate("/dashboard")}
          className="group inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to candidates
        </button>

        <header className="mt-8">
          <div className="flex items-center gap-2.5">
            <Table2 className="h-5 w-5 text-primary" />
            <h1 className="workspace-title">
              Compare candidates
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {activeRole.title}, {activeCandidates.length}{" "}
            {activeCandidates.length === 1 ? "candidate" : "candidates"} against{" "}
            {criteria.length} criteria, {essentialCount} of them essential.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Read across a row to see where one candidate's cited evidence stands.
            Essential and desirable criteria are marked separately. This view
            states coverage only: it never scores, ranks or shortlists anyone.
          </p>
        </header>

        {activeCandidates.length === 0 ? (
          <div className="mt-10 rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
            No candidates for this role yet. Add one by pasting resume text, then
            generate its evidence record.
          </div>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="rounded-full bg-peach px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-peach-foreground">
                  Essential
                </span>
                the role cannot be met without it
              </span>
              <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
                  Desirable
                </span>
                useful, but not required
              </span>
              {loading && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  Loading stored evidence records
                </span>
              )}
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <caption className="sr-only">
                  Evidence status for every candidate and criterion in this role.
                  Selecting a cell opens that candidate's review screen on that
                  criterion.
                </caption>
                <thead>
                  <tr className="border-b">
                    <th
                      scope="col"
                      className="sticky left-0 z-10 w-56 bg-card px-5 py-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                    >
                      Candidate
                    </th>
                    {criteria.map((criterion) => (
                      <th
                        key={criterion.id}
                        scope="col"
                        className={cn(
                          "px-4 py-4 align-bottom",
                          criterion.required && "bg-peach/25",
                        )}
                      >
                        <div className="flex flex-col items-start gap-2">
                          <span
                            className={cn(
                              "text-sm font-semibold leading-snug",
                              criterion.required
                                ? "text-peach-foreground"
                                : "text-foreground/80",
                            )}
                          >
                            {criterion.label}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
                              criterion.required
                                ? "bg-primary text-primary-foreground"
                                : "border text-muted-foreground",
                            )}
                          >
                            {criterion.required ? "Essential" : "Desirable"}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeCandidates.map((candidate) => {
                    const record = records[candidate.id];

                    return (
                      <tr
                        key={candidate.id}
                        className="border-b last:border-b-0"
                      >
                        <th
                          scope="row"
                          className="sticky left-0 z-10 bg-card px-5 py-4 text-left align-top"
                        >
                          <span className="text-sm font-semibold">
                            {candidate.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => navigate(`/review/${candidate.id}`)}
                            className="mt-1 block text-xs font-medium text-primary hover:underline"
                          >
                            Full review
                          </button>
                        </th>

                        {criteria.map((criterion) => {
                          const item = record?.evidence.find(
                            (entry) => entry.criterionId === criterion.id,
                          );

                          return (
                            <td
                              key={criterion.id}
                              className={cn(
                                "p-1.5 align-top",
                                criterion.required && "bg-peach/15",
                              )}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/review/${candidate.id}?criterion=${criterion.id}`,
                                  )
                                }
                                title={`Open ${candidate.name} on ${criterion.label}`}
                                className="flex h-full w-full flex-col items-start gap-2 rounded-xl border border-transparent px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-background"
                              >
                                {item ? (
                                  <>
                                    <StatusBadge status={item.status} />
                                    {item.status === "supported" &&
                                      item.citationVerified && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-supported">
                                          <BadgeCheck className="h-3.5 w-3.5" />
                                          Verified
                                        </span>
                                      )}
                                    {item.recordedAtInterview ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-interview">
                                        <Mic className="h-3.5 w-3.5" />
                                        Recorded at interview
                                      </span>
                                    ) : (
                                      <span className="text-[11px] tabular-nums text-muted-foreground">
                                        {item.sourceStartLine === 0
                                          ? "Not cited"
                                          : item.sourceStartLine ===
                                              item.sourceEndLine
                                            ? `Line ${item.sourceStartLine}`
                                            : `Lines ${item.sourceStartLine} to ${item.sourceEndLine}`}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    {loading
                                      ? "Loading"
                                      : "No evidence record yet"}
                                  </span>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Select any cell to open that candidate's review screen with the
              criterion already selected. The reviewer records overrides and the
              decision there.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Compare;
