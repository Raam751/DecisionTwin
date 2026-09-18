import type { EvidenceRecord } from "@/types";

/**
 * The fixed order of hiring stages. Not user-editable: a candidate sits in
 * exactly one current stage, starting at Screening, and can only move forward.
 */
export const STAGES = ["Screening", "Round 1", "Round 2", "Final"] as const;

export type HiringStage = (typeof STAGES)[number];

export const FIRST_STAGE = STAGES[0];

/** The stage a record is in now; a missing value means Screening. */
export const currentStageOf = (record: Pick<EvidenceRecord, "currentStage">): string =>
  record.currentStage ?? FIRST_STAGE;

/** The stage after the given one, or null when it is the final stage. */
export const nextStage = (current: string): string | null => {
  const index = STAGES.indexOf(current as HiringStage);
  if (index === -1 || index === STAGES.length - 1) return null;
  return STAGES[index + 1];
};
