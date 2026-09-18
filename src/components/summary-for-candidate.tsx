import { useMemo, useState } from "react";
import { Check, Copy, FileText } from "lucide-react";

import { cn } from "@/lib/utils";
import type { EvidenceItem, EvidenceRecord, RoleCriterion } from "@/types";

interface SummaryForCandidateProps {
  candidateName: string;
  roleTitle: string;
  criteria: RoleCriterion[];
  record: EvidenceRecord;
}

const formatWhen = (iso?: string): string => {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const titleCase = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

const whereOf = (item: EvidenceItem): string => {
  if (item.recordedAtInterview) {
    const by = item.recordedBy
      ? ` by ${item.recordedBy}${item.recordedAt ? ` on ${formatWhen(item.recordedAt)}` : ""}`
      : "";
    return `recorded at interview${by}`;
  }
  if (item.sourceStartLine > 0) {
    const lines =
      item.sourceStartLine === item.sourceEndLine
        ? `line ${item.sourceStartLine}`
        : `lines ${item.sourceStartLine} to ${item.sourceEndLine}`;
    return item.citationVerified
      ? `cited on ${lines}, verified against the source document`
      : `cited on ${lines}, not verified`;
  }
  return "no citation";
};

/**
 * One plain-language paragraph about a candidate's evidence record, meant for
 * the candidate to read.
 *
 * Strictly a projection of the record: what was evidenced and where, what
 * remained unverified, what was asked at interview (and any recorded answer),
 * and the final disposition with its reason. No model call, no new claims.
 */
export function SummaryForCandidate({
  candidateName,
  roleTitle,
  criteria,
  record,
}: SummaryForCandidateProps) {
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => {
    const labelOf = (criterionId: string): string =>
      criteria.find((criterion) => criterion.id === criterionId)?.label ??
      criterionId;

    const lines: string[] = [];
    lines.push(`Summary for ${candidateName}`);
    lines.push(`Role: ${roleTitle}`);
    lines.push(
      "Compiled from the evidence record. It contains only what the record holds.\n",
    );

    lines.push("WHAT THE EVIDENCE SHOWS");
    if (record.evidence.length === 0) {
      lines.push("- Nothing in the record yet.");
    } else {
      for (const item of record.evidence) {
        const quote = item.quotedText ? ` "${item.quotedText}"` : "";
        lines.push(
          `- ${labelOf(item.criterionId)}: ${titleCase(item.status)}.${quote} ${titleCase(whereOf(item))}.`,
        );
      }
    }
    lines.push("");

    lines.push("WHAT IS STILL UNVERIFIED");
    const unverified = record.evidence.filter(
      (item) => item.status !== "supported",
    );
    if (unverified.length === 0) {
      lines.push("- Nothing in the record is unverified.");
    } else {
      for (const item of unverified) {
        lines.push(
          `- ${labelOf(item.criterionId)} (${item.status}): ${item.explanation || "no explanation recorded."}`,
        );
      }
    }
    lines.push("");

    lines.push("ASKED AT INTERVIEW");
    if (record.interviewQuestions.length === 0) {
      lines.push("- No interview questions were recorded.");
    } else {
      for (const question of record.interviewQuestions) {
        const answer = record.evidence.find(
          (item) =>
            item.criterionId === question.criterionId &&
            item.recordedAtInterview,
        );
        lines.push(
          `- ${question.question}` +
            (answer
              ? ` Answered: "${answer.quotedText}" (recorded by ${answer.recordedBy} on ${formatWhen(answer.recordedAt)}).`
              : " No answer recorded."),
        );
      }
    }
    lines.push("");

    lines.push("DECISION");
    if (record.humanDecision) {
      const { humanDecision } = record;
      lines.push(
        `- ${humanDecision.disposition}${humanDecision.reason ? ` — ${humanDecision.reason}` : ""}${humanDecision.reviewerName ? ` Recorded by ${humanDecision.reviewerName} on ${formatWhen(humanDecision.timestamp)}.` : ""}`,
      );
    } else {
      lines.push("- No decision recorded yet.");
    }

    return lines.join("\n");
  }, [candidateName, roleTitle, criteria, record]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the panel stays readable either way.
    }
  };

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Summary for candidate
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          aria-live="polite"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
            copied
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-border bg-background text-muted-foreground hover:text-foreground",
          )}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        What the record evidences, where, what is still open, and how the
        decision was reached. A view of the record only — nothing is added here.
      </p>

      <div className="mt-4 whitespace-pre-wrap rounded-xl border bg-background p-4 text-[13px] leading-relaxed text-foreground/85">
        {text}
      </div>
    </section>
  );
}
