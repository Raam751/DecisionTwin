import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, MessageCircleQuestionMark } from "lucide-react";

import SourceDocument from "@/components/source-document";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import {
  candidateAEvidenceRecord,
  candidates,
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
  const record = [candidateAEvidenceRecord].find(
    (r) => r.candidateId === candidate?.id,
  );

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

  const [activeCriterionId, setActiveCriterionId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const firstSupported = record?.evidence.find(
      (e) => e.status === "supported",
    );
    setActiveCriterionId(firstSupported?.criterionId ?? null);
  }, [record]);

  const activeItem = record?.evidence.find(
    (e) => e.criterionId === activeCriterionId && e.sourceStartLine > 0,
  );
  const activeRange =
    activeItem && activeItem.sourceStartLine > 0
      ? { start: activeItem.sourceStartLine, end: activeItem.sourceEndLine }
      : null;

  const supportedCount =
    record?.evidence.filter((e) => e.status === "supported").length ?? 0;
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
                supportedCount === total
                  ? "bg-emerald-500"
                  : "bg-amber-500",
              )}
            />
            <span className="text-sm font-medium">
              {supportedCount} of {total} criteria supported
            </span>
          </div>
        </header>

        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Evidence
            </p>
            {record ? (
              <ul className="mt-4 space-y-3">
                {rows.map(({ criterion, item, interviewQuestion }) => {
                  const isUncertain = item?.status === "uncertain";
                  const clickable =
                    !!item && !isUncertain && item.sourceStartLine > 0;
                  const isActive = item?.criterionId === activeCriterionId;

                  const rowInner = (
                    <>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          {item ? (
                            <StatusBadge status={item.status} />
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
                            ? `Lines ${item.sourceStartLine}–${item.sourceEndLine}`
                            : isUncertain
                              ? "No cited lines"
                              : "—"}
                        </span>
                      </div>
                      {isUncertain && interviewQuestion && (
                        <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
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
                    </>
                  );

                  const rowClasses = cn(
                    "rounded-2xl border transition-all duration-200",
                    isUncertain
                      ? "border-amber-200 bg-amber-50/60"
                      : "border-border bg-card",
                    clickable &&
                      "cursor-pointer hover:border-primary/40 hover:shadow-sm",
                    clickable &&
                      isActive &&
                      "border-primary/50 ring-2 ring-primary/15",
                  );

                  return (
                    <li key={criterion.id}>
                      {clickable ? (
                        <button
                          type="button"
                          onClick={() => setActiveCriterionId(criterion.id)}
                          className={cn(rowClasses, "w-full px-5 py-4 text-left")}
                        >
                          {rowInner}
                        </button>
                      ) : (
                        <div className={cn(rowClasses, "px-5 py-4")}>
                          {rowInner}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-4 rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
                No evidence record has been generated for this candidate yet.
              </div>
            )}
          </section>

          <section className="lg:sticky lg:top-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Source · {candidate.documentTitle}
            </p>
            <div className="mt-4">
              <SourceDocument
                title="Source document"
                lines={candidate.documentLines}
                activeRange={activeRange}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Review;
