import { useMemo, useState } from "react";
import { Check, Copy, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { EvidenceItem, EvidenceRecord, RoleCriterion } from "@/types";

interface SummaryForCandidateProps {
  candidateName: string;
  roleTitle: string;
  criteria: RoleCriterion[];
  record: EvidenceRecord;
}

interface SummarySection {
  title: string;
  items: string[];
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
 * One plain-language account of a candidate's evidence record, meant for the
 * candidate to read.
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

  const sections = useMemo<SummarySection[]>(() => {
    const labelOf = (criterionId: string): string =>
      criteria.find((criterion) => criterion.id === criterionId)?.label ??
      criterionId;

    const evidence = record.evidence.map((item) => {
      const quote = item.quotedText ? ` “${item.quotedText}”` : "";
      return `${labelOf(item.criterionId)} — ${titleCase(item.status)}.${quote} ${titleCase(whereOf(item))}.`;
    });

    const unverified = record.evidence
      .filter((item) => item.status !== "supported")
      .map(
        (item) =>
          `${labelOf(item.criterionId)} (${item.status}): ${item.explanation || "no explanation recorded."}`,
      );

    const interview =
      record.interviewQuestions.length === 0
        ? ["No interview questions were recorded."]
        : record.interviewQuestions.map((question) => {
            const answer = record.evidence.find(
              (item) =>
                item.criterionId === question.criterionId &&
                item.recordedAtInterview,
            );
            return (
              question.question +
              (answer
                ? ` Answered: “${answer.quotedText}” (recorded by ${answer.recordedBy} on ${formatWhen(answer.recordedAt)}).`
                : " No answer recorded.")
            );
          });

    const decision = record.humanDecision
      ? [
          `${record.humanDecision.disposition}${
            record.humanDecision.reason
              ? ` — ${record.humanDecision.reason}`
              : ""
          }${
            record.humanDecision.reviewerName
              ? ` Recorded by ${record.humanDecision.reviewerName} on ${formatWhen(record.humanDecision.timestamp)}.`
              : ""
          }`,
        ]
      : ["No decision recorded yet."];

    return [
      {
        title: "What the evidence shows",
        items: evidence.length > 0 ? evidence : ["Nothing in the record yet."],
      },
      {
        title: "What is still unverified",
        items:
          unverified.length > 0
            ? unverified
            : ["Nothing in the record is unverified."],
      },
      { title: "Asked at interview", items: interview },
      { title: "Decision", items: decision },
    ];
  }, [criteria, record]);

  const text = useMemo(() => {
    const body = sections
      .map(
        (section) =>
          `${section.title.toUpperCase()}\n${section.items
            .map((item) => `- ${item}`)
            .join("\n")}`,
      )
      .join("\n\n");

    return [
      `Summary for ${candidateName}`,
      `Role: ${roleTitle}`,
      "Compiled from the evidence record. It contains only what the record holds.",
      "",
      body,
    ].join("\n");
  }, [candidateName, roleTitle, sections]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard access can be denied; the panel stays readable either way.
    }
  };

  return (
    <section className="card-surface p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <FileText aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="eyebrow">Summary for candidate</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copy}
          aria-live="polite"
          className={copied ? "border-supported/40 text-supported" : undefined}
        >
          {copied ? (
            <>
              <Check aria-hidden className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy aria-hidden className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </Button>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        What the record evidences, where, what is still open, and how the
        decision was reached. A view of the record only — nothing is added here.
      </p>

      <div className="mt-5 space-y-5 divide-y divide-line [&>*+*]:pt-5">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="eyebrow">{section.title}</p>
            <ul className="mt-2.5 space-y-2">
              {section.items.map((item, index) => (
                <li
                  key={index}
                  className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink/85"
                >
                  <span
                    aria-hidden
                    className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-brand/70"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
