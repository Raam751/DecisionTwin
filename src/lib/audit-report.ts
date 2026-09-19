import { currentStageOf, STAGES } from "@/lib/stages";
import type {
  Candidate,
  EvidenceRecord,
  Role,
  StageDecision,
} from "@/types";

/**
 * Builds the auditable hiring report.
 *
 * This is a pure projection of what is already on the record. It adds no
 * judgement, no score, no ranking, and no new claims. Everything here can be
 * traced back to either a verified citation, an interview answer captured by a
 * named reviewer, or a decision a named reviewer recorded with a reason.
 */

export interface ReportEvidence {
  criterion: string;
  essential: boolean;
  status: string;
  source: "source document" | "interview";
  citationVerified: boolean;
  citedLines: string;
  quote: string;
  explanation: string;
  recordedBy?: string;
  recordedAt?: string;
  stage?: string;
}

export interface ReportCandidate {
  candidateId: string;
  name: string;
  currentStage: string;
  documentTitle: string;
  documentLineCount: number;
  essentialCovered: number;
  essentialTotal: number;
  desirableCovered: number;
  desirableTotal: number;
  unmetEssential: string[];
  evidence: ReportEvidence[];
  interviewQuestions: { criterion: string; question: string }[];
  decisions: StageDecision[];
  overrides: {
    criterion: string;
    previousValue: string;
    newValue: string;
    reason: string;
    reviewer: string;
    timestamp: string;
    stage?: string;
  }[];
  replay: {
    recordId: string;
    modelName: string;
    promptVersion: string;
    schemaVersion: string;
    inputHash: string;
    runTimestamp: string;
  } | null;
  sensitivity: {
    runTimestamp: string;
    maskedFields: string;
    changedCount: number;
    changed: string[];
  } | null;
  hasRecord: boolean;
}

export interface AuditReport {
  generatedAt: string;
  workspaceRef: string;
  role: {
    title: string;
    essentialCriteria: string[];
    desirableCriteria: string[];
    jobDescription: string;
  };
  candidates: ReportCandidate[];
  statements: string[];
}

/** Fixed statements about what this report is and is not. */
export const REPORT_STATEMENTS = [
  "Every supported citation in this report was checked by the server against the source document at the line numbers shown. Anything that could not be confirmed was recorded as uncertain.",
  "Evidence recorded at interview is the candidate's own words as captured by a named reviewer. It is never citation verified, because there is no document to check it against.",
  "This system does not score candidates, rank them, shortlist them, or reject anyone. Every disposition in this report was recorded by a named human reviewer with a written reason.",
  "Where an identity sensitivity check was run, it masked the candidate's name and pronouns only. It is a trigger for human review and does not establish that a decision was fair.",
];

const lineRange = (start: number, end: number): string => {
  if (!start) return "not cited";
  if (start === end) return `line ${start}`;
  return `lines ${start} to ${end}`;
};

export function buildAuditReport(
  role: Role,
  candidates: Candidate[],
  records: Record<string, EvidenceRecord | null>,
  workspaceId: string,
): AuditReport {
  const labelOf = (criterionId: string) =>
    role.criteria.find((criterion) => criterion.id === criterionId)?.label ??
    criterionId;
  const isEssential = (criterionId: string) =>
    role.criteria.find((criterion) => criterion.id === criterionId)?.required ??
    false;

  const reportCandidates: ReportCandidate[] = candidates.map((candidate) => {
    const record = records[candidate.id] ?? null;

    const evidence: ReportEvidence[] = (record?.evidence ?? []).map((item) => ({
      criterion: labelOf(item.criterionId),
      essential: isEssential(item.criterionId),
      status: item.status,
      source: item.recordedAtInterview ? "interview" : "source document",
      citationVerified: !!item.citationVerified,
      citedLines: item.recordedAtInterview
        ? "recorded at interview"
        : lineRange(item.sourceStartLine, item.sourceEndLine),
      quote: item.quotedText,
      explanation: item.explanation,
      recordedBy: item.recordedBy,
      recordedAt: item.recordedAt,
      stage: item.stage,
    }));

    // A criterion counts as covered when any item for it is supported.
    const supported = new Set(
      (record?.evidence ?? [])
        .filter((item) => item.status === "supported")
        .map((item) => item.criterionId),
    );
    const essentials = role.criteria.filter((criterion) => criterion.required);
    const desirables = role.criteria.filter((criterion) => !criterion.required);

    return {
      candidateId: candidate.id,
      name: candidate.name,
      currentStage: record ? currentStageOf(record) : STAGES[0],
      documentTitle: candidate.documentTitle,
      documentLineCount: candidate.documentLines.length,
      essentialCovered: essentials.filter((c) => supported.has(c.id)).length,
      essentialTotal: essentials.length,
      desirableCovered: desirables.filter((c) => supported.has(c.id)).length,
      desirableTotal: desirables.length,
      unmetEssential: essentials
        .filter((criterion) => !supported.has(criterion.id))
        .map((criterion) => criterion.label),
      evidence,
      interviewQuestions: (record?.interviewQuestions ?? []).map((entry) => ({
        criterion: labelOf(entry.criterionId),
        question: entry.question,
      })),
      decisions: [...(record?.decisions ?? [])].sort(
        (a, b) =>
          STAGES.indexOf(a.stage as (typeof STAGES)[number]) -
          STAGES.indexOf(b.stage as (typeof STAGES)[number]),
      ),
      overrides: (record?.reviewerEdits ?? []).map((edit) => ({
        criterion: labelOf(edit.field.split(".")[1] ?? ""),
        previousValue: edit.previousValue,
        newValue: edit.newValue,
        reason: edit.reason,
        reviewer: edit.reviewer,
        timestamp: edit.timestamp,
        stage: edit.stage,
      })),
      replay: record
        ? {
            recordId: record.id,
            modelName: record.replayMetadata.modelName,
            promptVersion: record.replayMetadata.promptVersion,
            schemaVersion: record.replayMetadata.schemaVersion,
            inputHash: record.replayMetadata.inputHash,
            runTimestamp: record.replayMetadata.runTimestamp,
          }
        : null,
      sensitivity: record?.sensitivityDiagnostic
        ? {
            runTimestamp: record.sensitivityDiagnostic.runTimestamp,
            maskedFields: record.sensitivityDiagnostic.maskedFields,
            changedCount: record.sensitivityDiagnostic.changedCount,
            changed: record.sensitivityDiagnostic.comparisons
              .filter((comparison) => comparison.changed)
              .map((comparison) => labelOf(comparison.criterionId)),
          }
        : null,
      hasRecord: !!record,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    workspaceRef: workspaceId.slice(0, 8),
    role: {
      title: role.title,
      essentialCriteria: role.criteria
        .filter((criterion) => criterion.required)
        .map((criterion) => criterion.label),
      desirableCriteria: role.criteria
        .filter((criterion) => !criterion.required)
        .map((criterion) => criterion.label),
      jobDescription: role.jobDescription,
    },
    candidates: reportCandidates,
    statements: REPORT_STATEMENTS,
  };
}

/** Triggers a download of the report as JSON, for a compliance file. */
export function downloadReportJson(report: AuditReport): void {
  const safeRole = report.role.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const stamp = report.generatedAt.slice(0, 10);
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `decisiontwin-audit-${safeRole}-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
