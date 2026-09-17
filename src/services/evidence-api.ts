import { supabase } from "@/integrations/supabase/client";
import type { Candidate, EvidenceRecord, Role } from "@/types";

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
