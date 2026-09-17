import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, MessageCircleQuestionMark } from "lucide-react";

import { DecisionPanel } from "@/components/decision-panel";
import { OverrideControl } from "@/components/override-control";
import { ReplayPanel } from "@/components/replay-panel";
import SourceDocument from "@/components/source-document";
import { StatusBadge } from "@/components/status-badge";
import { REVIEWERS, useEvidenceRecord } from "@/hooks/use-evidence-record";
import { generateEvidence } from "@/services/evidence-api";
import { cn } from "@/lib/utils";
import {
  candidates,
  evidenceRecords,
  platformEngineerRole,
} from "@/data/seed";
import type { EvidenceItem, RoleCriterion } from "@/types";

interface CriterionRow {
  criterion: RoleCriterion;
  item?: EvidenceItem;
  interviewQuestion?: string;
}

const Review = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();

  const candidate = candidates.find((c) => c.id === candidateId);
  const role = platformEngineerRole;
  const seededRecord = useMemo(
    () => evidenceRecords.find((r) => r.candidateId === candidate?.id),
    [candidate?.id],
  );

  const {
    record,
    overrideStatus,
    saveDecision,
    clearDecision,
    resetRecord,
    replaceRecord,
  } = useEvidenceRecord(seededRecord);

  const [reviewer, setReviewer] = useState(REVIEWERS[0]);
  const [activeCriterionId, setActiveCriterionId] = useState<string | null>(
    null,
  );
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [rejectedCitations, setRejectedCitations] = useState<string[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);

  const runGeneration = async () => {
    if (!candidate) return;
    setGenerating(true);
    setGenerateError(null);
    setRejectedCitations([]);
    try {
      const result = await generateEvidence(role, candidate);
      replaceRecord(result.record);
      setRejectedCitations(result.rejectedCitations);
      setIsGenerated(true);
    } catch (error) {
      setGenerateError((error as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    const firstCitable = seededRecord?.evidence.find(
      (e) => e.sourceStartLine > 0,
    );
    setActiveCriterionId(firstCitable?.criterionId ?? null);
  }, [seededRecord]);

  const rows = useMemo<CriterionRow[]>(() => {
    if (!record) return [];
    return role.criteria.map((criterion) => ({
      criterion,
      item: record.evidence.find((e) => e.criterionId === criterion.id),
      interviewQuestion: record.interviewQuestions.find(
        (q) => q.criterionId === criterion.id,
      )?.question,
    }));
  }, [record, role]);

  const criterionLabel = (criterionId: string) =>
    role.criteria.find((c) => c.id === criterionId)?.label ?? criterionId;

  const activeItem = record?.evidence.find(
    (e) => e.criterionId === activeCriterionId && e.sourceStartLine > 0,
  );
  const activeRange = activeItem
    ? { start: activeItem.sourceStartLine, end: activeItem.sourceEndLine }
    : null;

  const supportedCount =
    record?.evidence.filter((e) => e.status === "supported").length ?? 0;
  const unresolvedCount =
    record?.evidence.filter((e) => e.status !== "supported").length ?? 0;
  const total = role.criteria.length;

  if (!candidate) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Candidate not found</h1>
          <button
            onClick={() => navigate("/")}
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            Back to candidates
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <button
          onClick={() => navigate("/")}
          className="group inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to candidates
        </button>

        <header className="mt-8">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-4xl font-bold tracking-tight">
              {candidate.name}
            </h1>
            <p className="text-lg text-muted-foreground">{role.title}</p>
          </div>
          <div className="mt-4 inline-flex items-center gap-2.5 rounded-full border bg-card px-4 py-1.5">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                supportedCount === total ? "bg-emerald-500" : "bg-amber-500",
              )}
            />
            <span className="text-sm font-medium">
              {supportedCount} of {total} criteria supported
            </span>
          </div>
        </header>

        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
          <section className="space-y-8">
            <div className="rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {isGenerated
                      ? "Evidence drafted by the model"
                      : "Evidence source"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isGenerated
                      ? "Every citation below was checked against the source document on the server."
                      : "Showing a stored record. Run the model to draft evidence from the document."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={runGeneration}
                  disabled={generating}
                  className={cn(
                    "shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                    generating
                      ? "cursor-wait bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground hover:opacity-90",
                  )}
                >
                  {generating
                    ? "Reading document, linking evidence, verifying citations"
                    : isGenerated
                      ? "Regenerate"
                      : "Generate evidence"}
                </button>
              </div>

              {rejectedCitations.length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                    Verification rejected {rejectedCitations.length} citation
                    {rejectedCitations.length === 1 ? "" : "s"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-900">
                    The model claimed support for{" "}
                    {rejectedCitations.map(criterionLabel).join(", ")}, but the
                    quoted text was not found at the cited lines. Those items
                    were downgraded to uncertain.
                  </p>
                </div>
              )}

              {generateError && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-800">
                    Generation failed
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-rose-900">
                    {generateError}
                  </p>
                  {isGenerated && (
                    <button
                      type="button"
                      onClick={() => {
                        resetRecord();
                        setIsGenerated(false);
                        setGenerateError(null);
                        setRejectedCitations([]);
                      }}
                      className="mt-2 text-xs font-medium text-primary hover:underline"
                    >
                      Fall back to the stored record
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Evidence
              </p>
              {record ? (
                <ul className="mt-4 space-y-3">
                  {rows.map(({ criterion, item, interviewQuestion }) => {
                    const isUncertain = item?.status === "uncertain";
                    const isConflicting = item?.status === "conflicting";
                    const clickable =
                      !!item && item.sourceStartLine > 0 && !isUncertain;
                    const isActive = item?.criterionId === activeCriterionId;

                    const header = (
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          {item ? (
                            <StatusBadge
                              status={item.status}
                              verified={
                                item.status === "supported" &&
                                item.citationVerified
                              }
                            />
                          ) : (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              No assessment
                            </span>
                          )}
                          <span className="min-w-0 flex-1 font-semibold leading-snug">
                            {criterion.label}
                          </span>
                        </div>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {clickable && item
                            ? item.sourceStartLine === item.sourceEndLine
                              ? `Line ${item.sourceStartLine}`
                              : `Lines ${item.sourceStartLine} to ${item.sourceEndLine}`
                            : isUncertain
                              ? "No cited lines"
                              : "not cited"}
                        </span>
                      </div>
                    );

                    return (
                      <li key={criterion.id}>
                        <div
                          className={cn(
                            "rounded-2xl border transition-all duration-200",
                            isUncertain
                              ? "border-amber-200 bg-amber-50/60"
                              : isConflicting
                                ? "border-rose-200 bg-rose-50/60"
                                : "border-border bg-card",
                            clickable &&
                              isActive &&
                              "border-primary/50 ring-2 ring-primary/15",
                          )}
                        >
                          {clickable ? (
                            <button
                              type="button"
                              onClick={() => setActiveCriterionId(criterion.id)}
                              className="w-full cursor-pointer px-5 pb-3 pt-4 text-left"
                            >
                              {header}
                            </button>
                          ) : (
                            <div className="px-5 pb-3 pt-4">{header}</div>
                          )}

                          <div className="space-y-3 px-5 pb-4">
                            {item && (isConflicting || isUncertain) && (
                              <p
                                className={cn(
                                  "text-sm leading-relaxed",
                                  isConflicting
                                    ? "text-rose-900"
                                    : "text-amber-900",
                                )}
                              >
                                {item.explanation}
                              </p>
                            )}

                            {(isUncertain || isConflicting) &&
                              interviewQuestion && (
                                <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                  <MessageCircleQuestionMark className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                                      Interview question
                                    </p>
                                    <p className="mt-1 text-sm leading-relaxed text-amber-900">
                                      {interviewQuestion}
                                    </p>
                                  </div>
                                </div>
                              )}

                            {item && (
                              <OverrideControl
                                currentStatus={item.status}
                                onOverride={(next, reason) =>
                                  overrideStatus(
                                    criterion.id,
                                    next,
                                    reason,
                                    reviewer,
                                  )
                                }
                              />
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mt-4 rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
                  No evidence record has been generated for this candidate yet.
                </div>
              )}
            </div>

            {record && (
              <DecisionPanel
                decision={record.humanDecision}
                reviewer={reviewer}
                unresolvedCount={unresolvedCount}
                onReviewerChange={setReviewer}
                onSave={(disposition, reason) =>
                  saveDecision(disposition, reason, reviewer)
                }
                onClear={clearDecision}
              />
            )}
          </section>

          <section className="space-y-6 lg:sticky lg:top-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Source, {candidate.documentTitle}
              </p>
              <div className="mt-4">
                <SourceDocument
                  title={`${candidate.name}, ${candidate.documentTitle}`}
                  lines={candidate.documentLines}
                  activeRange={activeRange}
                />
              </div>
            </div>

            {record && (
              <ReplayPanel record={record} criterionLabel={criterionLabel} />
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Review;
