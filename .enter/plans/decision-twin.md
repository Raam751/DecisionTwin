# Condense extracted resume lines

## Context
PDF and text extraction can produce a very long numbered list (many bullet lines, achievements, education details). The reviewer wants a shorter, factual list covering roles, responsibilities, notable achievements, and an education summary, condensed automatically right after extraction, with the mandatory confirmation step still in place.

The condense call runs only inside the existing upload flow (a user action), so the invariant that no model call runs on page load or mount stays intact.

## Approach
Reuse the established pattern from `extract-candidate-name`: a self-contained edge function copying `generate-criteria` protocol handling exactly, a thin client service, and wiring inside the existing processing effect in `NewCandidate.tsx`.

### New edge function `supabase/functions/condense-resume/index.ts`
- Copy `generate-criteria` structure verbatim for CORS, JSON helpers, protocol resolution, URL normalisation, auth ladder, `postModel`, `readContent`, `callModel`, and the `Deno.serve` handler.
- Request body: `{ resumeText: string }`.
- Prompt rules: keep factual, short, standalone lines covering job titles, companies, responsibilities, notable achievements, and a short education summary. Drop contact details, dates lists, verbose bullets, repeated content. Return 8 to 15 lines, name on the first line.
- Output JSON: `{"lines": string[]}`.
- Shaping: trim each line, drop empty lines, cap at 15, reject fewer than 2 usable lines.
- Deploy with `supabase_deploy_edge_function`.

### Client service `src/services/condense-api.ts`
Mirror `candidate-name-api.ts`: `condenseResume(resumeText): Promise<string[]>` with defensive shape checks.

### Page wiring `src/pages/NewCandidate.tsx`
- After extraction produces raw lines inside the processing effect, if `rawLines.length > 15`, set the per-file progress label to "Condensing with AI" and call `condenseResume`. Use the condensed lines when returned and usable.
- On condense failure (error or unusable reply), fall back to the raw extracted lines and set a soft note on the file ("Could not condense this file. The raw lines are shown; edit them before saving."). The file still reaches the ready state and the mandatory confirmation editor, so an upload is never blocked by the model.
- Add `condenseNote: string | null` to `IntakeFile`; render it in the confirmation panel.
- Short files (15 lines or fewer) skip the model call and keep the raw lines unchanged.
- The reviewer still edits, merges, splits, deletes, and confirms before anything is saved.

### Copy rule
No em dashes or en dashes in any new code, copy, or comments.

### Protected and unchanged
`scripts/`, `src/data/seed.ts`, `src/types.ts`, `generate-evidence`, `save-review`, `save-workspace` remain untouched. Reason minimums, citation verification, deep links, and workspace scoping are untouched.

## Implementation checklist
- [x] Create and deploy `supabase/functions/condense-resume/index.ts` copying `generate-criteria` protocol handling exactly.
- [x] Create `src/services/condense-api.ts` mirroring `candidate-name-api.ts`.
- [x] Wire auto-condensing into the `NewCandidate.tsx` processing effect with progress label, fallback to raw lines, and a soft warning note.
- [x] Add the condense note to the confirmation panel UI.
- [x] Confirm no em/en dashes in new code and copy.

## Verification checklist
- [x] Run `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm run build`, and `pnpm run build:prod --manifest`.
- [x] Browser-test a long PDF (more than 15 lines) with a stubbed condense reply: fewer condensed lines appear, numbered from 1, confirmation still required.
- [x] Browser-test condense failure: raw lines shown, warning note visible, file still ready for confirmation.
- [x] Browser-test a short file (15 lines or fewer): no condense call fires, raw lines kept.
- [x] Confirm no page errors and no `save-workspace` call without explicit confirmation.
- [x] Exercise the deployed function with one real call and report the outcome; redeploy after any fix.
- [x] Run the strict production audit and classify the new dynamic module; retain known pre-existing warnings.
- [x] State clearly which items were verified by execution and which only by reading code.
