import { useCallback, useEffect, useState } from "react";

import type { EvidenceRecord, EvidenceStatus } from "@/types";

/** Reviewers available in the demo. A real deployment would use auth identity. */
export const REVIEWERS = ["Meera Iyer", "Rohan Desai", "Sana Qureshi"];/**
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

  /**
   * Records what the candidate answered for one criterion.
   *
   * The answer becomes the item's quote, marked as interview-sourced with the
   * reviewer and time, and the status is the reviewer's choice. The save-review
   * function keeps every citation field server-enforced: no line numbers and
   * citationVerified always false, because an interview answer has no document
   * to check it against. The capture itself is also appended to the reviewer's
   * edits so the audit trail and replay record can show who heard it and when.
   */
  const recordInterviewAnswer = useCallback(
    (
      criterionId: string,
      answer: string,
      status: EvidenceStatus,
      reviewer: string,
    ): EvidenceRecord | null => {
      if (!record) return null;

      const trimmed = answer.trim();
      if (!trimmed) return null;

      const now = new Date().toISOString();
      const prior = record.evidence.find((e) => e.criterionId === criterionId);

      const interviewItem: EvidenceRecord["evidence"][number] = {
        criterionId,
        status,
        quotedText: trimmed,
        sourceStartLine: 0,
        sourceEndLine: 0,
        explanation: `Candidate's answer, recorded at interview by ${reviewer}.`,
        citationVerified: false,
        recordedAtInterview: true,
        recordedBy: reviewer,
        recordedAt: now,
      };

      const next: EvidenceRecord = {
        ...record,
        evidence: prior
          ? record.evidence.map((e) =>
              e.criterionId === criterionId ? { ...e, ...interviewItem } : e,
            )
          : [...record.evidence, interviewItem],
        reviewerEdits: [
          ...record.reviewerEdits,
          {
            field: `evidence.${criterionId}.source`,
            previousValue: prior ? "document" : "none",
            newValue: "interview",
            reason: trimmed,
            reviewer,
            timestamp: now,
          },
        ],
      };

      setRecord(next);
      return next;
    },
    [record],
  );

  const resetRecord = useCallback(() => setRecord(initial), [initial]);

  /** Replaces the working copy, for example with a freshly generated record. */
  const replaceRecord = useCallback((next: EvidenceRecord) => {
    setRecord(next);
  }, []);

  return {
    record,
    overrideStatus,
    recordInterviewAnswer,
    saveDecision,
    clearDecision,
    resetRecord,
    replaceRecord,
  };
}
