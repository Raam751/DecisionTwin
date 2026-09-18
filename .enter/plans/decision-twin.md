# Hiring stages, Stage 1: data model, persistence, review screen

## Context
Candidates currently have one record per role with no notion of rounds. Stage 1 adds a fixed, non-editable stage list (Screening, Round 1, Round 2, Final), lets each candidate sit in one current stage (default Screening), records one decision per stage plus history, and captures interview answers per stage without overwriting the document evidence or earlier rounds. All new fields are optional so nothing existing breaks, and `humanDecision` stays the most recent decision, kept in sync with the last `decisions` entry.

Branch state: current branch is already `main` and includes `github/main` unchanged. Git mutations are framework-managed and rejected here; no reset is performed and nothing on main that I did not write is reverted.

After Stage 1 implementation I will stop and report before doing Stage 2.

## Changes

### Types `src/types.ts`
- `EvidenceItem`: add `stage?: string` (set only on interview-sourced items).
- `ReviewerEdit`: add `stage?: string`.
- Add `export interface StageDecision extends HumanDecision { stage: string }`.
- `EvidenceRecord`: add `currentStage?: string` and `decisions?: StageDecision[]`.
- Missing `currentStage` means Screening; missing `decisions` means `[]`. `src/data/seed.ts` untouched.

### Shared constants `src/lib/stages.ts`
- `STAGES = ["Screening", "Round 1", "Round 2", "Final"]`.
- Helpers: `currentStageOf(record)` (default Screening), `nextStage(current)` (null when none).

### Migration (evidence_records)
- Add `current_stage text` and `decisions jsonb not null default '[]'::jsonb`. Additive and tolerant of existing rows. No new RLS policy (writes stay service-role only). This is compatible same-business maintenance of the established evidence_records table.

### save-review `supabase/functions/save-review/index.ts`
- Accept `currentStage` and `decisions`; keep requiring `workspaceId` and keep scoping the select and update by `workspace_id`.
- Evidence merge key becomes `criterionId + "|" + (recordedAtInterview ? "interview:" + (stage ?? "") : "document")` so there is exactly one document item per criterion and one interview item per criterion per stage.
- Re-verify invariants: document citation fields always from the stored record; interview items always forced to `citationVerified false`, lines 0, no `stage` lost; an item with no stored counterpart forced to `citationVerified false`.
- Persist `current_stage` and `decisions`.
- When the stored `current_stage` differs from the incoming one, append one `reviewer_events` row with `event_type "decision"`, `field "currentStage"`, previous and new stage, reason from the latest decision, reviewer from the latest decision. Confirm the events CHECK allows "decision".

### Client services
- `src/services/evidence-api.ts`: read `current_stage` and `decisions` in `fetchStoredRecord` and map them into the returned record.
- `src/services/review-api.ts`: send `currentStage` and `decisions` in the save-review body.

### Hook `src/hooks/use-evidence-record.ts`
- `saveDecision`: build a `StageDecision` with the current stage; replace any same-stage entry, append at the end, and set `humanDecision` to it (last entry stays in sync).
- `clearDecision`: set `humanDecision` null and remove the matching last `decisions` entry.
- `recordInterviewAnswer`: append/replace the interview item for `(criterion, currentStage)` only; never replace the document item or other stages' answers; tag the item and its reviewer edit with the stage.
- `advanceStage`: return an updated record with the next `currentStage`, allowed only when the current stage has a decision of `Advance to interview` and a later stage exists; never alters evidence.
- `overrideStatus`: unchanged behavior, but tags the edit with the current stage.

### Review screen `src/pages/Review.tsx` and small components
- Show the current stage prominently in the candidate header.
- Per criterion: keep the document item visible; render interview answers one per stage, newest first, each labelled with stage, reviewer and date; recording an answer no longer replaces the document item or other rounds.
- `InterviewAnswerControl` gains a stage label ("Asked at interview · {stage}").
- `DecisionPanel` gains a stage label; the page records the decision for the current stage.
- Below the panel, show previous stages' decisions as history (stage, disposition, reviewer, reason, date).
- "Advance to next stage" action, enabled only when the current stage has an `Advance to interview` decision and a later stage exists; advancing does not clear or alter evidence.
- `?criterion=` deep link, reason minimums, no Verified mark on interview evidence: unchanged.

### Protected and unchanged
`scripts/`, `src/data/seed.ts`, `generate-evidence`, `save-workspace`, `generate-criteria`, `condense-resume`, `extract-candidate-name`, and generated integrations are untouched. No model call on load or mount.

### Copy rule
No em dashes or en dashes in code, copy, comments, or placeholders.

## Implementation checklist
- [ ] Add the optional stage types to `src/types.ts`.
- [ ] Create `src/lib/stages.ts` with the fixed stage list and helpers.
- [ ] Run the additive migration on `evidence_records`.
- [ ] Update `save-review` for stage fields, the composite evidence key, and the stage-advance event; redeploy.
- [ ] Update `evidence-api.ts` and `review-api.ts` for `currentStage` and `decisions`.
- [ ] Update the `useEvidenceRecord` hook: staged decisions, per-stage interview answers, and `advanceStage`.
- [ ] Update the review screen: current stage, per-stage interview answers, decision history, advance action; label updates in `InterviewAnswerControl` and `DecisionPanel`.
- [ ] Confirm no em/en dashes in changed copy and code.

## Verification checklist
- [ ] Run `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm run build`, `pnpm run build:prod --manifest`, and `node scripts/verify-citations.mjs` (must report 15 passed, 0 failures).
- [ ] Confirm the migration applied and the columns tolerate existing rows; confirm the events CHECK allows "decision".
- [ ] Browser-verify the review screen with intercepted stored records: current stage shown; a document item stays beside one interview answer per stage, newest first, labelled; recording an answer in Round 2 keeps the Round 1 answer; decisions history shows prior stages; advance is disabled without an `Advance to interview` decision for the current stage and enabled after it; advancing changes the stage without touching evidence; no model call on load.
- [ ] Confirm `humanDecision` stays the last `decisions` entry after save and clear.
- [ ] Confirm no `save-workspace`/record writes happened as a test, and no page errors.
- [ ] State clearly which items were verified by execution and which only by reading code.
