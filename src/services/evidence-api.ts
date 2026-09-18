import { supabase } from "@/integrations/supabase/client";
import type {
  Candidate,
  EvidenceItem,
  EvidenceRecord,
  HumanDecision,
  InterviewQuestion,
  ReplayMetadata,
  ReviewerEdit,
  Role,
} from "@/types";

/**
 * The generated Database type predates the evidence_records table, so the table
 * is reached through a narrow structural type rather than a blanket any cast.
 */
type MinimalTable = {
  select: (columns: string) => {
    eq: (
      column: string,
      value: string,
    ) => {
      maybeSingle: () => Promise<{
        data: unknown;
        error: { message: string } | null;
      }>;
    };
  };
};

const table = (name: string): MinimalTable =>
  (supabase as unknown as { from: (n: string) => MinimalTable }).from(name);

interface StoredRow {
  id: string;
  candidate_id: string;
  role_id: string;
  evidence: EvidenceItem[] | null;
  interview_questions: InterviewQuestion[] | null;
  reviewer_edits: ReviewerEdit[] | null;
  human_decision: HumanDecision | null;
  replay_metadata: ReplayMetadata;
}

/**
 * Loads a previously generated record from the database.
 *
 * Returns null when nothing is stored, or when the table cannot be reached, so
 * the caller can fall back to the seeded example. A read failure must never
 * break the page.
 */
export async function fetchStoredRecord(
  candidateId: string,
): Promise<EvidenceRecord | null> {
  try {
    const { data, error } = await table("evidence_records")
      .select("*")
      .eq("candidate_id", candidateId)
      .maybeSingle();

    if (error || !data) return null;
    const row = data as StoredRow;
    if (!row?.id || !row?.replay_metadata) return null;

    return {
      id: row.id,
      candidateId: row.candidate_id,
      roleId: row.role_id,
      evidence: row.evidence ?? [],
      interviewQuestions: row.interview_questions ?? [],
      reviewerEdits: row.reviewer_edits ?? [],
      humanDecision: row.human_decision ?? null,
      replayMetadata: row.replay_metadata,
    };
  } catch {
    return null;
  }
}

export interface GenerateResult {
  record: EvidenceRecord;
  /** Criterion ids where the server rejected a citation the model proposed. */
  rejectedCitations: string[];
  persisted: boolean;
}

/**
 * Asks the generate-evidence edge function for a fresh evidence record.
 *
 * The edge function calls the model and then verifies every citation against the
 * source document before replying, so anything marked supported here has been
 * checked server-side.
 */
export async function generateEvidence(
  role: Role,
  candidate: Candidate,
): Promise<GenerateResult> {
  const { data, error } = await supabase.functions.invoke("generate-evidence", {
    body: {
      candidateId: candidate.id,
      roleId: role.id,
      criteria: role.criteria,
      documentLines: candidate.documentLines,
    },
  });

  if (error) {
    throw new Error(
      error.message ||
        "Could not reach the evidence service. The seeded record is still shown.",
    );
  }

  const result = data as GenerateResult & { error?: string };
  if (!result?.record) {
    throw new Error(
      result?.error ?? "The evidence service did not return a record.",
    );
  }

  return {
    record: result.record,
    rejectedCitations: result.rejectedCitations ?? [],
    persisted: !!result.persisted,
  };
}
