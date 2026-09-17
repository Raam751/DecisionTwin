import { useCallback, useEffect, useState } from "react";

import type { EvidenceRecord, EvidenceStatus } from "@/types";

/** Reviewers available in the demo. A real deployment would use auth identity. */
export const REVIEWERS = ["Meera Iyer", "Rohan Desai", "Sana Qureshi"];

/**
 * Holds the working copy of one evidence record for the session.
 *
 * Every reviewer action is recorded as a ReviewerEdit so the replay panel can
 * show what a human changed and why. Nothing here is persisted yet; wiring this
 * to Supabase is the backend task.
 */
export function useEvidenceRecord(initial: EvidenceRecord | undefined) {
  const [record, setRecord] = useState<EvidenceRecord | undefined>(initial);

  useEffect(() => {
    setRecord(initial);
  }, [initial]);

  const overrideStatus = useCallback(
    (
      criterionId: string,
      nextStatus: EvidenceStatus,
      reason: string,
      reviewer: string,
    ) => {
      setRecord((current) => {
        if (!current) return current;
        const target = current.evidence.find(
          (e) => e.criterionId === criterionId,
        );
        if (!target || target.status === nextStatus) return current;

        return {
          ...current,
          evidence: current.evidence.map((e) =>
            e.criterionId === criterionId ? { ...e, status: nextStatus } : e,
          ),
          reviewerEdits: [
            ...current.reviewerEdits,
            {
              field: `evidence.${criterionId}.status`,
              previousValue: target.status,
              newValue: nextStatus,
              reason,
              reviewer,
              timestamp: new Date().toISOString(),
            },
          ],
        };
      });
    },
    [],
  );

  const saveDecision = useCallback(
    (disposition: string, reason: string, reviewer: string) => {
      setRecord((current) =>
        current
          ? {
              ...current,
              humanDecision: {
                disposition,
                reason,
                reviewerName: reviewer,
                timestamp: new Date().toISOString(),
              },
            }
          : current,
      );
    },
    [],
  );

  const clearDecision = useCallback(() => {
    setRecord((current) =>
      current ? { ...current, humanDecision: null } : current,
    );
  }, []);

  const resetRecord = useCallback(() => setRecord(initial), [initial]);

  /** Replaces the working copy, for example with a freshly generated record. */
  const replaceRecord = useCallback((next: EvidenceRecord) => {
    setRecord(next);
  }, []);

  return {
    record,
    overrideStatus,
    saveDecision,
    clearDecision,
    resetRecord,
    replaceRecord,
  };
}
