import { useCallback, useEffect, useState } from "react";

import { currentStageOf, nextStage } from "@/lib/stages";
import type { EvidenceRecord, EvidenceStatus, StageDecision } from "@/types";

/** Reviewers available in the demo. A real deployment would use auth identity. */
export const REVIEWERS = ["Meera Iyer", "Rohan Desai", "Sana Qureshi"];

/**
 * Holds the working copy of one evidence record for the session.
 *
 * Every reviewer action is recorded as a ReviewerEdit so the replay panel can
 * show what a human changed and why. Each action also returns the updated
 * record, or null when nothing changed, so the caller can persist exactly the
 * state the reviewer now sees.
 *
 * The record carries a hiring stage. A missing currentStage means Screening and
 * a missing decisions list means none recorded. humanDecision always mirrors
 * the last entry of decisions, so existing components keep reading it unchanged.
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
      const target = record?.evidence.find(
        (e) => e.criterionId === criterionId && !e.recordedAtInterview,
      );
      if (!record || !target || target.status === nextStatus) return null;

      const next: EvidenceRecord = {
        ...record,
        evidence: record.evidence.map((e) =>
          e.criterionId === criterionId && !e.recordedAtInterview
            ? { ...e, status: nextStatus }
            : e,
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
            stage: currentStageOf(record),
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

      const stage = currentStageOf(record);
      const now = new Date().toISOString();
      const entry: StageDecision = {
        stage,
        disposition,
        reason,
        reviewerName: reviewer,
        timestamp: now,
      };
      const decisions = record.decisions ?? [];

      const next: EvidenceRecord = {
        ...record,
        humanDecision: {
          disposition,
          reason,
          reviewerName: reviewer,
          timestamp: now,
        },
        // One entry per stage, most recent last, so humanDecision stays the
        // last entry while each stage keeps its own decision.
        decisions: [
          ...decisions.filter((decision) => decision.stage !== stage),
          entry,
        ],
      };

      setRecord(next);
      return next;
    },
    [record],
  );

  const clearDecision = useCallback((): EvidenceRecord | null => {
    if (!record?.humanDecision) return null;

    const cleared = record.humanDecision;
    const next: EvidenceRecord = {
      ...record,
      humanDecision: null,
      decisions: (record.decisions ?? []).filter(
        (decision) => decision.timestamp !== cleared.timestamp,
      ),
    };
    setRecord(next);
    return next;
  }, [record]);

  /**
   * Records what the candidate answered for one criterion in the current
   * stage.
   *
   * The answer becomes an interview-sourced item tagged with the stage. It
   * replaces a previous answer for the same criterion in the same stage only,
   * never the document-sourced item and never an answer from another stage, so
   * a Round 2 answer keeps the Round 1 answer. The save-review function keeps
   * every citation field server-enforced: no line numbers and citationVerified
   * always false, because an interview answer has no document to check it
   * against. The capture itself is also appended to the reviewer's edits so
   * the audit trail and replay record can show who heard it, when, and in
   * which stage.
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

      const stage = currentStageOf(record);
      const now = new Date().toISOString();
      const sameStageItem = record.evidence.find(
        (e) =>
          e.recordedAtInterview &&
          e.criterionId === criterionId &&
          (e.stage ?? "Screening") === stage,
      );

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
        stage,
      };

      const next: EvidenceRecord = {
        ...record,
        evidence: [
          ...record.evidence.filter(
            (e) =>
              !(
                e.recordedAtInterview &&
                e.criterionId === criterionId &&
                (e.stage ?? "Screening") === stage
              ),
          ),
          interviewItem,
        ],
        reviewerEdits: [
          ...record.reviewerEdits,
          {
            field: `evidence.${criterionId}.source`,
            previousValue: sameStageItem ? `interview:${stage}` : "none",
            newValue: `interview:${stage}`,
            reason: trimmed,
            reviewer,
            timestamp: now,
            stage,
          },
        ],
      };

      setRecord(next);
      return next;
    },
    [record],
  );

  /**
   * Moves the candidate to the next hiring stage.
   *
   * Allowed only when the current stage already has a recorded decision of
   * "Advance to interview" and a later stage exists. Advancing never clears or
   * alters any evidence; the stage change itself is persisted, and the backend
   * records the move in the audit trail.
   */
  const advanceStage = useCallback((): EvidenceRecord | null => {
    if (!record) return null;

    const stage = currentStageOf(record);
    const stageDecision = [...(record.decisions ?? [])]
      .reverse()
      .find((decision) => decision.stage === stage);
    if (stageDecision?.disposition !== "Advance to interview") return null;

    const nextStageName = nextStage(stage);
    if (!nextStageName) return null;

    const next: EvidenceRecord = { ...record, currentStage: nextStageName };
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
    recordInterviewAnswer,
    saveDecision,
    clearDecision,
    advanceStage,
    resetRecord,
    replaceRecord,
  };
}
