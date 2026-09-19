export interface RoleCriterion {
  id: string;
  label: string;
  description: string;
  /**
   * True when the role cannot be filled without this. A candidate missing an
   * essential criterion is a materially different situation from one missing a
   * desirable one, which is why coverage is never reduced to a single score.
   */
  required: boolean;
}

export interface Role {
  id: string;
  title: string;
  /** The source job description the criteria were derived from. */
  jobDescription: string;
  criteria: RoleCriterion[];
}

export interface DocumentLine {
  lineNumber: number;
  text: string;
}

export interface Candidate {
  id: string;
  name: string;
  roleId: string;
  documentTitle: string;
  documentLines: DocumentLine[];
}

export type EvidenceStatus = "supported" | "uncertain" | "conflicting";

export interface EvidenceItem {
  criterionId: string;
  status: EvidenceStatus;
  quotedText: string;
  sourceStartLine: number;
  sourceEndLine: number;
  explanation: string;
  /**
   * True only when the quoted text was confirmed to exist within the cited
   * line range. Set by server-side verification, never by the model.
   */
  citationVerified: boolean;
  /**
   * True when the quote is the candidate's own words from an interview rather
   * than a line from the source document. Interview-sourced items can never be
   * citation-verified, because there is no document to check them against.
   */
  recordedAtInterview?: boolean;
  /**
   * The hiring stage this answer was captured in, for example "Round 1".
   * Present on interview-sourced items only.
   */
  stage?: string;
  /** Who captured the answer and when. Present on interview-sourced items. */
  recordedBy?: string;
  recordedAt?: string;
}

/**
 * What the model claimed before the server checked it.
 *
 * Deliberately a separate type from EvidenceItem, with no citationVerified
 * field, so a proposal can never be mistaken for verified evidence anywhere in
 * the app.
 */
export interface ProposedEvidence {
  criterionId: string;
  status: EvidenceStatus;
  quotedText: string;
  sourceStartLine: number;
  sourceEndLine: number;
  explanation: string;
}

/** One criterion's before and after status in a masked rerun. */
export interface SensitivityComparison {
  criterionId: string;
  unmaskedStatus: EvidenceStatus | "missing";
  maskedStatus: EvidenceStatus | "missing";
  changed: boolean;
}

/**
 * The result of rerunning extraction with identity signals removed.
 *
 * This is a review trigger, not a fairness result. It masks the candidate's name
 * and pronouns only, so it cannot detect every proxy, and a changed status means
 * "a human should look at this", nothing more.
 */
export interface SensitivityDiagnostic {
  runTimestamp: string;
  /** Plain description of what was masked, so the UI never overclaims. */
  maskedFields: string;
  comparisons: SensitivityComparison[];
  changedCount: number;
}

export interface InterviewQuestion {
  criterionId: string;
  question: string;
}

export interface ReviewerEdit {
  field: string;
  previousValue: string;
  newValue: string;
  reason: string;
  reviewer: string;
  timestamp: string;
  /** The hiring stage the edit happened in, when the action was stage-aware. */
  stage?: string;
}

export interface HumanDecision {
  disposition: string;
  reason: string;
  reviewerName: string;
  timestamp: string;
}

/** A human decision recorded for a specific hiring stage. */
export interface StageDecision extends HumanDecision {
  stage: string;
}

export interface ReplayMetadata {
  modelName: string;
  promptVersion: string;
  schemaVersion: string;
  inputHash: string;
  runTimestamp: string;
}

export interface EvidenceRecord {
  id: string;
  candidateId: string;
  roleId: string;
  evidence: EvidenceItem[];
  interviewQuestions: InterviewQuestion[];
  reviewerEdits: ReviewerEdit[];
  humanDecision: HumanDecision | null;
  replayMetadata: ReplayMetadata;
  /**
   * The hiring stage the candidate is in now. Missing means Screening.
   */
  currentStage?: string;
  /**
   * One decision per stage, most recent last. Missing means none recorded.
   * When a decision exists, humanDecision mirrors the last entry.
   */
  decisions?: StageDecision[];
  /**
   * What the model proposed before server-side verification ran. Kept so a
   * reviewer can see exactly what verification changed. Never verified.
   */
  modelProposal?: ProposedEvidence[];
  /** The most recent masked rerun diagnostic, when one has been run. */
  sensitivityDiagnostic?: SensitivityDiagnostic | null;
}
