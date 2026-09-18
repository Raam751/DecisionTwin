# Decisions screen for the active role

## Context
Add a `/decisions` view that groups every candidate in the active role by the human decision recorded on their evidence record. This page is a factual record of decisions humans made, never a shortlist, ranking, or tool-produced selection. It reuses the existing `useRoleRecords` hook and existing dispositions, adds no backend work, and appears in the main navigation.

Branch state: the current branch is already `main` and includes everything from `github/main` unchanged. Git mutations (pull, reset, merge) are framework-managed and rejected here, so no reset is performed and nothing on main that I did not write is reverted.

## Approach

### New page `src/pages/Decisions.tsx`
- Read `activeRole` and `activeCandidates` from `useRoles`; load records with the existing `useRoleRecords(activeCandidates)`.
- Group candidates by their record's `humanDecision.disposition`, in candidate insertion order within each group. Groups are the three existing dispositions plus `No decision recorded` for candidates with no record or a record without `humanDecision`. An unknown stored disposition (defensive) gets its own group appended after the four, so a real decision is never hidden or mislabelled.
- Header: title `Decisions`, role name, and a fixed framing line making explicit that these are human decisions, each with a named reviewer and a recorded reason, and that the tool did not select anyone.
- One section per group with a count and an empty state when the group has no candidates (muted box, no ranking language).
- Each entry shows candidate name, reviewer, the written reason, when it was recorded (same `toLocaleString` format as the decision panel), a coverage line (e.g. "N of M essential criteria covered by cited evidence", from the record, facts only), and a link to that candidate's review screen. The `No decision recorded` entries show an explanatory line and a link to the review screen where the decision can be recorded.
- No model call, no new backend function, no new table, no scores, percentages, stars, medals, or ordering by quality.

### Navigation and route
- Add `Decisions` (`/decisions`, `Scale` icon) to `src/components/main-nav.tsx` alongside Candidates and Roles.
- Add the `/decisions` route in `src/router.tsx` wrapped in `AppShell`, before the catch-all.

### Reused patterns
- `useRoleRecords`, `EvidenceRecord.humanDecision` (`disposition`, `reviewerName`, `reason`, `timestamp`), the three dispositions from `decision-panel.tsx`, the `toLocaleString` timestamp format, the app shell/page heading, card and eyebrow styles, and the status/canvas colour tokens. No new dependencies.

### Protected and unchanged
`scripts/`, `src/data/seed.ts`, `src/types.ts`, and `supabase/functions/` are untouched. Reason minimums, citation verification, deep links, and workspace scoping are untouched.

### Copy rule
No em dashes or en dashes in code, copy, comments, or placeholders.

## Implementation checklist
- [ ] Create `src/pages/Decisions.tsx` grouping by disposition with counts, entries, empty states, framing line, and review links.
- [ ] Add `Decisions` to `src/components/main-nav.tsx` with a `Scale` icon.
- [ ] Add the `/decisions` route to `src/router.tsx` inside `AppShell`.
- [ ] Confirm no em/en dashes in the new page and navigation.
- [ ] Keep protected files untouched.

## Verification checklist
- [ ] Run `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm run build`, and `pnpm run build:prod --manifest`.
- [ ] Browser-verify `/decisions`: all four groups render with counts; candidates appear in insertion order inside each group; entries show name, reviewer, reason, recorded time, coverage line, and review link; empty groups show an empty state; the framing line is present.
- [ ] Verify the navigation shows Candidates, Roles, and Decisions, and each link routes correctly.
- [ ] Verify the page loads records without any model call and without writes.
- [ ] Confirm no ranking, score, or selection marks anywhere in the rendered page.
- [ ] State clearly which items were verified by execution and which only by reading code.
