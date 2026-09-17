export interface RoleCriterion {
  id: string;
  label: string;
  description: string;
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
  timestamp: string;
}

export interface HumanDecision {
  disposition: string;
  reason: string;
  reviewerName: string;
  timestamp: string;
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
}
