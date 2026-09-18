import { useCallback, useEffect, useState } from "react";

import type { EvidenceRecord, EvidenceStatus } from "@/types";

/** Reviewers available in the demo. A real deployment would use auth identity. */
export const REVIEWERS = ["Meera Iyer", "Rohan Desai", "Sana Qureshi"];

/**
 * Holds the working copy of one evidence record for the session.
 *
 * Every reviewer action is recorded as a ReviewerEdit so the replay panel can
 * show what a human changed and why. Each action also returns the updated
 * record, or null when nothing changed, so the caller can persist exactly the
 * state the reviewer now sees.
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
    ): EvidenceRecord | null => {
      const target = record?.evidence.find((e) => e.criterionId === criterionId);
      if (!record || !target || target.status === nextStatus) return null;

      const next: EvidenceRecord = {
        ...record,
        evidence: record.evidence.map((e) =>
          e.criterionId === criterionId ? { ...e, status: nextStatus } : e,
        ),
        reviewerEdits: [
          ...record.reviewerEdits,
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

      setRecord(next);
      return next;
    },
    [record],
  );

  const saveDecision = useCallback(
    (
      disposition: string,
      reason: string,
      reviewer: string,
    ): EvidenceRecord | null => {
      if (!record) return null;

      const next: EvidenceRecord = {
        ...record,
        humanDecision: {
          disposition,
          reason,
          reviewerName: reviewer,
          timestamp: new Date().toISOString(),
        },
      };

      setRecord(next);
      return next;
    },
    [record],
  );

  const clearDecision = useCallback((): EvidenceRecord | null => {
    if (!record?.humanDecision) return null;

    const next: EvidenceRecord = { ...record, humanDecision: null };
    setRecord(next);
    return next;
  }, [record]);

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
