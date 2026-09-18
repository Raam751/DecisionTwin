import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, Mic } from "lucide-react";

import { CoverageSummary } from "@/components/coverage-summary";
import { DecisionPanel } from "@/components/decision-panel";
import { InterviewAnswerControl } from "@/components/interview-answer-control";
import { OverrideControl } from "@/components/override-control";
import { ReplayPanel } from "@/components/replay-panel";
import { SaveStatus, type SaveState } from "@/components/save-status";
import SourceDocument from "@/components/source-document";
import { StatusBadge } from "@/components/status-badge";
import { SummaryForCandidate } from "@/components/summary-for-candidate";
import { REVIEWERS, useEvidenceRecord } from "@/hooks/use-evidence-record";
import { fetchStoredRecord, generateEvidence } from "@/services/evidence-api";
import { saveReview } from "@/services/review-api";
import { cn } from "@/lib/utils";
import { evidenceRecords } from "@/data/seed";
import { useRoles } from "@/state/roles-store";
import type { EvidenceItem, EvidenceRecord, RoleCriterion } from "@/types";

interface CriterionRow {
  criterion: RoleCriterion;
  item?: EvidenceItem;
  interviewQuestion?: string;
}

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const Review = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();

  const { activeRole, activeCandidates } = useRoles();
  const candidate = activeCandidates.find((c) => c.id === candidateId);
  const role = activeRole;
  const seededRecord = useMemo(
    () => evidenceRecords.find((r) => r.candidateId === candidate?.id),
    [candidate?.id],
  );

  const {
    record,
    overrideStatus,
    recordInterviewAnswer,
    saveDecision,
    clearDecision,
    resetRecord,
    replaceRecord,
  } = useEvidenceRecord(seededRecord);

  // The compare matrix links here with one criterion already chosen.
  const [searchParams] = useSearchParams();
  const requestedCriterionId = searchParams.get("criterion");

  const [reviewer, setReviewer] = useState(REVIEWERS[0]);
  const [activeCriterionId, setActiveCriterionId] = useState<string | null>(
    requestedCriterionId,
  );
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [rejectedCitations, setRejectedCitations] = useState<string[]>([]);
  const [source, setSource] = useState<"seed" | "stored" | "fresh">("seed");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load a stored record if one exists, so a record generated earlier reloads
  // instantly instead of calling the model again. Falls back to the seeded
  // example silently if the table is empty or unreachable.
  const candidateKey = candidate?.id;

  useEffect(() => {
    if (!candidateKey) return;
    let cancelled = false;
    setSource("seed");
    setRejectedCitations([]);
    setGenerateError(null);
    setSaveState("idle");
    setSaveMessage(null);

    fetchStoredRecord(candidateKey).then((stored) => {
      if (cancelled || !stored || stored.evidence.length === 0) return;
      replaceRecord(stored);
      setSource("stored");
    });

    return () => {
      cancelled = true;
    };
  }, [candidateKey, replaceRecord]);

  const runGeneration = async () => {
    if (!candidate) return;
    setGenerating(true);
    setGenerateError(null);
    setRejectedCitations([]);
    try {
      const result = await generateEvidence(role, candidate);
      replaceRecord(result.record);
      setRejectedCitations(result.rejectedCitations);
      setSource("fresh");
    } catch (error) {
      setGenerateError((error as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Writes the reviewer's working copy to the store.
   *
   * Local state is never rolled back on failure, so nothing the reviewer typed
   * is lost: the message says plainly what did not reach the store, and the
   * save can be retried.
   */
  const persist = useCallback(async (next: EvidenceRecord | null) => {
    if (!next) return;
    setSaveState("saving");
    setSaveMessage(null);
    try {
      const result = await saveReview(next);
      // The store is authoritative on citations, so adopt what it returned
      // rather than keeping a local view it disagrees with.
      if (result.evidence) {
        replaceRecord({ ...next, evidence: result.evidence });
      }
      setSaveState("saved");
      setSaveMessage(
        result.auditWarning ??
          (result.events > 0
            ? `${result.events} audit ${
                result.events === 1 ? "event" : "events"
              } appended.`
            : "Your overrides and the decision are on the record."),
      );
    } catch (error) {
      setSaveState("error");
      setSaveMessage((error as Error).message);
    }
  }, [replaceRecord]);

  const retrySave = useCallback(() => {
    if (record) void persist(record);
  }, [persist, record]);

  // A criterion named in the URL wins, so the compare matrix opens on the
  // column the reviewer clicked. Otherwise the first cited row is selected.
  useEffect(() => {
    if (requestedCriterionId) {
      setActiveCriterionId(requestedCriterionId);
      return;
    }
    const firstCitable = seededRecord?.evidence.find(
      (e) => e.sourceStartLine > 0,
    );
    setActiveCriterionId(firstCitable?.criterionId ?? null);
  }, [seededRecord, requestedCriterionId]);

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

  const unresolvedCount =
    record?.evidence.filter((e) => e.status !== "supported").length ?? 0;

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
        </header>

        {record && (
          <CoverageSummary
            criteria={role.criteria}
            evidence={record.evidence}
          />
        )}

        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
          <section className="space-y-8">
            <div className="rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {source === "fresh"
                      ? "Evidence drafted by the model"
                      : source === "stored"
                        ? "Evidence record loaded from store"
                        : "Reference evidence record"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {source === "seed"
                      ? "Showing a reference record. Run the model to draft evidence from the document."
                      : "Every citation below was checked against the source document on the server."}
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
                    : source === "seed"
                      ? "Generate evidence"
                      : "Regenerate"}
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
                  {source !== "seed" && (
                    <button
                      type="button"
                      onClick={() => {
                        resetRecord();
                        setSource("seed");
                        setGenerateError(null);
                        setRejectedCitations([]);
                      }}
                      className="mt-2 text-xs font-medium text-primary hover:underline"
                    >
                      Fall back to the reference record
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
                                !item.recordedAtInterview &&
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
                          {item?.recordedAtInterview
                            ? "Recorded at interview"
                            : clickable && item
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
                            isActive &&
                              "border-primary/60 ring-2 ring-primary/40",
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
                                <InterviewAnswerControl
                                  question={interviewQuestion}
                                  reviewer={reviewer}
                                  onRecord={(answer, status, capturedBy) =>
                                    void persist(
                                      recordInterviewAnswer(
                                        criterion.id,
                                        answer,
                                        status,
                                        capturedBy,
                                      ),
                                    )
                                  }
                                />
                              )}

                            {item?.recordedAtInterview && (
                              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                                <div className="flex items-center gap-2">
                                  <Mic className="h-4 w-4 shrink-0 text-sky-700" />
                                  <p className="text-xs font-semibold uppercase tracking-wider text-sky-800">
                                    Recorded at interview
                                  </p>
                                </div>
                                <blockquote className="mt-2 border-l-2 border-sky-300 pl-3 text-sm leading-relaxed text-sky-950">
                                  “{item.quotedText}”
                                </blockquote>
                                <p className="mt-2 text-xs text-sky-700">
                                  {item.recordedBy}
                                  {item.recordedAt
                                    ? `, ${formatWhen(item.recordedAt)}`
                                    : ""}
                                </p>
                              </div>
                            )}

                            {item && (
                              <OverrideControl
                                currentStatus={item.status}
                                onOverride={(next, reason) =>
                                  void persist(
                                    overrideStatus(
                                      criterion.id,
                                      next,
                                      reason,
                                      reviewer,
                                    ),
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
                  void persist(saveDecision(disposition, reason, reviewer))
                }
                onClear={() => void persist(clearDecision())}
              />
            )}

            {record && (
              <SummaryForCandidate
                candidateName={candidate.name}
                roleTitle={role.title}
                criteria={role.criteria}
                record={record}
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

      <SaveStatus
        state={saveState}
        message={saveMessage}
        onRetry={retrySave}
        onDismiss={() => {
          setSaveState("idle");
          setSaveMessage(null);
        }}
      />
    </div>
  );
};

export default Review;
