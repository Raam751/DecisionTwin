import { supabase } from "@/integrations/supabase/client";
import type { EvidenceRecord } from "@/types";

export interface SaveReviewResult {
  /** How many new audit events were appended for this save. */
  events: number;
  /** Set when the review was saved but the audit append failed. */
  auditWarning?: string;
}

/**
 * Reads the error message out of a failed function call. The function replies
 * with JSON, so the useful sentence is in the response body rather than in the
 * transport-level message.
 */
async function readErrorMessage(error: unknown): Promise<string> {
  const context = (error as { context?: Response } | null)?.context;
  if (context && typeof context.json === "function") {
    try {
      const payload = (await context.json()) as { error?: string };
      if (payload?.error) return payload.error;
    } catch {
      // Fall through to the generic message below.
    }
  }
  const message = (error as { message?: string } | null)?.message;
  return message || "Could not reach the review store. Your changes are still on this page.";
}

/**
 * Persists the reviewer's working copy of one evidence record.
 *
 * Only the backend function can write: the tables are read-only for the
 * browser, and the function uses the service role. It updates the record and
 * appends one audit event per genuinely new override or decision.
 */
export async function saveReview(
  record: EvidenceRecord,
): Promise<SaveReviewResult> {
  const { data, error } = await supabase.functions.invoke("save-review", {
    body: {
      recordId: record.id,
      evidence: record.evidence,
      reviewerEdits: record.reviewerEdits,
      humanDecision: record.humanDecision,
    },
  });

  if (error) throw new Error(await readErrorMessage(error));

  const result = data as
    | { saved?: boolean; events?: number; error?: string; auditWarning?: string }
    | null;

  if (!result?.saved) {
    throw new Error(result?.error ?? "The review could not be saved.");
  }

  return {
    events: result.events ?? 0,
    auditWarning: result.auditWarning,
  };
}
