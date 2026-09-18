import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  CircleAlert,
  CircleDashed,
  HelpCircle,
  LoaderCircle,
  Sparkles,
} from "lucide-react";

import { CoverageSummary } from "@/components/coverage-summary";
import { DecisionPanel } from "@/components/decision-panel";
import { InterviewAnswerControl } from "@/components/interview-answer-control";
import { InterviewTag } from "@/components/interview-tag";
import { OverrideControl } from "@/components/override-control";
import { PriorityChip } from "@/components/priority-chip";
import { ReplayPanel } from "@/components/replay-panel";
import { SaveStatus, type SaveState } from "@/components/save-status";
import SourceDocument from "@/components/source-document";
import { StatusBadge } from "@/components/status-badge";
import { SummaryForCandidate } from "@/components/summary-for-candidate";
import { Button } from "@/components/ui/button";
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

/** The stages the model runs through, named so the wait has a shape. */
const GENERATION_STEPS = [
  "Reading the source document",
  "Linking criteria to lines",
  "Verifying every citation",
];

const SectionHeading = ({
  number,
  title,
  hint,
  id,
}: {
  number: string;
  title: string;
  hint?: string;
  id?: string;
}) => (
  <div
    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line pb-3"
    id={id}
  >
    <span className="font-mono text-2xs text-muted-foreground/70">
      {number}
    </span>
    <h2 className="font-serif text-xl font-semibold tracking-tight text-ink md:text-[22px]">
      {title}
    </h2>
    {hint && (
      <p className="ml-auto hidden max-w-[20rem] text-right text-2xs leading-relaxed text-muted-foreground lg:block">
        {hint}
      </p>
    )}
  </div>
);

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
        <div className="card-surface max-w-md p-8 text-center">
          <h1 className="font-serif text-2xl font-semibold text-ink">
            Candidate not found
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            That candidate is not part of the active role in this session.
          </p>
          <Button className="mt-6" onClick={() => navigate("/")}>
            Back to candidates
          </Button>
        </div>
      </div>
    );
  }

  const sourceLabel =
    source === "fresh"
      ? "Drafted by the model"
      : source === "stored"
        ? "Loaded from the record"
        : "Reference record";

  const sourceHint =
    source === "seed"
      ? "A reference record is shown. Generate to draft evidence from this document. Overrides and decisions can only be saved against a generated record."
      : source === "stored"
        ? "Every citation was checked against the source on the server."
        : "Drafted just now, with every citation checked on the server.";

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-[1180px] px-5 py-8 md:px-10 md:py-12">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="focus-ring group inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          <ChevronLeft
            aria-hidden
            className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
          />
          Back to candidates
        </button>

        <header className="mt-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div className="min-w-0">
            <p className="eyebrow">Evidence review · {role.title}</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-ink md:text-[52px]">
              {candidate.name}
            </h1>
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>
                {candidate.documentTitle}, {candidate.documentLines.length} lines
              </span>
              {record && (
                <>
                  <span aria-hidden className="h-1 w-1 rounded-full bg-line" />
                  <span className="font-mono text-2xs">{record.id}</span>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-muted-foreground shadow-card">
              <span
                aria-hidden
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  source === "seed" ? "bg-muted-foreground/60" : "bg-supported",
                )}
              />
              {sourceLabel}
            </span>
            <Button onClick={runGeneration} disabled={generating}>
              {generating ? (
                <>
                  <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
                  Generating evidence
                </>
              ) : (
                <>
                  <Sparkles aria-hidden className="h-4 w-4" />
                  {source === "seed" ? "Generate evidence" : "Regenerate"}
                </>
              )}
            </Button>
            <p className="max-w-[17rem] text-2xs leading-relaxed text-muted-foreground sm:text-right">
              {sourceHint}
            </p>
          </div>
        </header>

        {record && (
          <CoverageSummary
            criteria={role.criteria}
            evidence={record.evidence}
          />
        )}

        {/* Generation in flight: the named stages, not an anonymous spinner. */}
        {generating && (
          <section className="card-surface rise-in mt-6 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-6">
              <p className="text-sm font-semibold text-ink">
                Drafting evidence for {candidate.name}
              </p>
              <p className="font-mono text-2xs text-muted-foreground">
                this usually takes 10–13 seconds
              </p>
            </div>
            <div className="h-1 w-full overflow-hidden bg-canvas-deep">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
            </div>
            <ol className="divide-y divide-line border-t border-line">
              {GENERATION_STEPS.map((step, index) => (
                <li
                  key={step}
                  className="flex items-center gap-3 px-5 py-3 md:px-6"
                >
                  <span className="font-mono text-2xs text-muted-foreground/70">
                    0{index + 1}
                  </span>
                  <span className="text-sm text-ink/85">{step}</span>
                  <LoaderCircle
                    aria-hidden
                    className="ml-auto h-3.5 w-3.5 animate-spin text-primary"
                  />
                </li>
              ))}
            </ol>
          </section>
        )}

        {rejectedCitations.length > 0 && (
          <section className="rise-in mt-6 flex gap-3 rounded-2xl border border-uncertain/30 bg-uncertain-soft p-4 md:p-5">
            <CircleAlert
              aria-hidden
              className="mt-0.5 h-4 w-4 shrink-0 text-uncertain"
            />
            <div>
              <p className="text-sm font-semibold text-ink">
                Verification rejected {rejectedCitations.length} citation
                {rejectedCitations.length === 1 ? "" : "s"}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/85">
                The model claimed support for{" "}
                {rejectedCitations.map(criterionLabel).join(", ")}, but the
                quoted text was not found at the cited lines. Those items were
                downgraded to uncertain.
              </p>
            </div>
          </section>
        )}

        {generateError && (
          <section className="rise-in mt-6 flex gap-3 rounded-2xl border border-conflicting/30 bg-conflicting-soft p-4 md:p-5">
            <CircleAlert
              aria-hidden
              className="mt-0.5 h-4 w-4 shrink-0 text-conflicting"
            />
            <div>
              <p className="text-sm font-semibold text-ink">
                Generation failed
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/85">
                {generateError}
              </p>
              {source !== "seed" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    resetRecord();
                    setSource("seed");
                    setGenerateError(null);
                    setRejectedCitations([]);
                  }}
                >
                  Fall back to the reference record
                </Button>
              )}
            </div>
          </section>
        )}

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,470px)] lg:gap-10">
          <section aria-labelledby="found-heading">
            <SectionHeading
              id="found-heading"
              number="01"
              title="What the model found"
              hint="Click a row to locate its cited lines in the exhibit"
            />

            {record ? (
              <ul className="mt-5 space-y-3">
                {rows.map(({ criterion, item, interviewQuestion }) => {
                  const isUncertain = item?.status === "uncertain";
                  const isConflicting = item?.status === "conflicting";
                  const isInterview = !!item?.recordedAtInterview;
                  const clickable =
                    !!item && item.sourceStartLine > 0 && !isUncertain;
                  const isActive = item?.criterionId === activeCriterionId;

                  const rail = isInterview
                    ? "bg-interview"
                    : isConflicting
                      ? "bg-conflicting"
                      : isUncertain
                        ? "bg-uncertain"
                        : "bg-supported";

                  const lineRef = isInterview
                    ? null
                    : clickable && item
                      ? item.sourceStartLine === item.sourceEndLine
                        ? `line ${item.sourceStartLine}`
                        : `lines ${item.sourceStartLine}–${item.sourceEndLine}`
                      : isUncertain
                        ? "no cited lines"
                        : "not cited";

                  const header = (
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-2">
                        {item ? (
                          <StatusBadge
                            status={item.status}
                            verified={
                              !isInterview &&
                              item.status === "supported" &&
                              item.citationVerified
                            }
                          />
                        ) : (
                          <span className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                            No assessment
                          </span>
                        )}
                        <h3 className="font-serif text-[19px] font-semibold leading-snug text-ink">
                          {criterion.label}
                        </h3>
                        <PriorityChip required={criterion.required} />
                      </div>
                      <span className="shrink-0 pt-1">
                        {isInterview ? (
                          <InterviewTag />
                        ) : (
                          <span className="font-mono text-2xs text-muted-foreground">
                            {lineRef}
                          </span>
                        )}
                      </span>
                    </div>
                  );

                  return (
                    <li key={criterion.id}>
                      <article
                        className={cn(
                          "relative overflow-hidden rounded-2xl border border-line bg-card shadow-card transition-all duration-200",
                          isActive && "border-brand/45 ring-2 ring-brand/25",
                          clickable && "hover:-translate-y-px hover:shadow-lift",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "absolute inset-y-0 left-0 w-[3px]",
                            rail,
                          )}
                        />

                        {clickable ? (
                          <button
                            type="button"
                            onClick={() => setActiveCriterionId(criterion.id)}
                            aria-expanded={isActive}
                            className="focus-ring block w-full px-5 pb-3 pt-4 text-left md:px-6"
                          >
                            {header}
                          </button>
                        ) : (
                          <div className="px-5 pb-3 pt-4 md:px-6">{header}</div>
                        )}

                        <div className="space-y-3 px-5 pb-5 md:px-6">
                          {item &&
                            (isConflicting || isUncertain) &&
                            !isInterview && (
                              <p
                                className={cn(
                                  "flex gap-2.5 rounded-xl border p-3.5 text-sm leading-relaxed text-ink/90",
                                  isConflicting
                                    ? "border-conflicting/25 bg-conflicting-soft"
                                    : "border-uncertain/25 bg-uncertain-soft",
                                )}
                              >
                                {isConflicting ? (
                                  <CircleAlert
                                    aria-hidden
                                    className="mt-0.5 h-4 w-4 shrink-0 text-conflicting"
                                  />
                                ) : (
                                  <HelpCircle
                                    aria-hidden
                                    className="mt-0.5 h-4 w-4 shrink-0 text-uncertain"
                                  />
                                )}
                                <span>{item.explanation}</span>
                              </p>
                            )}

                          {item?.recordedAtInterview && (
                            <div className="rounded-xl border border-interview/25 bg-interview-soft p-4">
                              <p className="eyebrow text-interview">
                                Interview answer
                              </p>
                              <blockquote className="mt-2 border-l-2 border-interview/40 pl-3.5 text-sm leading-relaxed text-ink">
                                “{item.quotedText}”
                              </blockquote>
                              <p className="mt-2.5 font-mono text-2xs text-muted-foreground">
                                {item.recordedBy}
                                {item.recordedAt
                                  ? ` · ${formatWhen(item.recordedAt)}`
                                  : ""}{" "}
                                · never citation-verified
                              </p>
                            </div>
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
                      </article>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="card-surface mt-5 p-8 text-center">
                <CircleDashed
                  aria-hidden
                  className="mx-auto h-6 w-6 text-muted-foreground/70"
                />
                <p className="mt-3 font-serif text-lg font-semibold text-ink">
                  No evidence record yet
                </p>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Generate evidence to draft an assessment for every criterion
                  against this document. Nothing is generated until you ask.
                </p>
              </div>
            )}
          </section>

          <section
            aria-labelledby="where-heading"
            className="space-y-6 lg:sticky lg:top-8"
          >
            <SectionHeading
              id="where-heading"
              number="02"
              title="Where it is"
              hint="The exhibit, line by line"
            />
            <SourceDocument
              title={`${candidate.name}, ${candidate.documentTitle}`}
              lines={candidate.documentLines}
              activeRange={activeRange}
            />
          </section>
        </div>

        <div className="mt-16 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,470px)] lg:gap-10">
          <section aria-labelledby="decided-heading">
            <SectionHeading
              id="decided-heading"
              number="03"
              title="What the human decided"
              hint="A named reviewer owns the call"
            />
            <div className="mt-5">
              {record ? (
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
              ) : (
                <div className="card-surface p-6 text-sm text-muted-foreground">
                  A decision can be recorded once there is an evidence record to
                  decide on.
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="retained-heading">
            <SectionHeading
              id="retained-heading"
              number="04"
              title="What is retained"
              hint="The record a later reviewer can replay"
            />
            <div className="mt-5">
              {record ? (
                <ReplayPanel
                  record={record}
                  criterionLabel={criterionLabel}
                />
              ) : (
                <div className="card-surface p-6 text-sm text-muted-foreground">
                  Nothing is retained yet.
                </div>
              )}
            </div>
          </section>
        </div>

        {record && (
          <section aria-labelledby="summary-heading" className="mt-16">
            <SectionHeading
              id="summary-heading"
              number="05"
              title="Summary for candidate"
              hint="A projection of the record, ready to copy"
            />
            <div className="mt-5">
              <SummaryForCandidate
                candidateName={candidate.name}
                roleTitle={role.title}
                criteria={role.criteria}
                record={record}
              />
            </div>
          </section>
        )}
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
