# DecisionTwin — Evidence Review Tool (Screen 1 + Placeholder)

## Context

Build a new web app called **DecisionTwin**: an evidence review tool for hiring. A reviewer opens a candidate, sees which role criteria are backed by resume evidence, sees what is uncertain, and records a final human decision. The model drafts evidence; the human decides.

This iteration builds **only Screen 1** ("/" — Evidence review) plus a placeholder route (`/review/:candidateId`), the full data model as TypeScript types, and the specified seed data. No backend, auth, AI calls, analytics, dashboard, or extra screens.

The codebase is a fresh Vite + React + TS + Tailwind + shadcn/ui template with `react-router-dom` v7 (routes defined in `src/router.tsx`), i18n preinstalled (not needed here — English hardcoded strings per spec), and existing `Button`, `Card`, and `Badge` shadcn components.

## Changes

### 1. Design tokens — `src/index.css` + `tailwind.config.ts`
- Set the brand palette to warm orange/peach per the visual system (light background, rounded corners, borders, minimal shadow).
  - `--primary: 24 95% 45%` (orange button), `--primary-foreground: 0 0% 100%` — light mode; matching brighter orange in `.dark` for consistency.
  - New tokens `--peach: 32 100% 90%` and `--peach-foreground: 20 90% 35%` (dark orange) for the criterion pills.
- Add `peach` / `peach-foreground` to `tailwind.config.ts` colors.
- Set `fontFamily.sans` to Arial-first stack (Arial, Helvetica, ui-sans-serif, system-ui, sans-serif).

### 2. Data model — new file `src/types.ts`
Export exact types matching the spec:
- `RoleCriterion { id, label, description }`
- `Role { id, title, criteria: RoleCriterion[] }`
- `DocumentLine { lineNumber, text }`
- `Candidate { id, name, roleId, documentTitle, documentLines: DocumentLine[] }`
- `EvidenceStatus = "supported" | "uncertain" | "conflicting"`
- `EvidenceItem { criterionId, status, quotedText, sourceStartLine, sourceEndLine, explanation }`
- `InterviewQuestion { criterionId, question }`
- `ReviewerEdit { field, previousValue, newValue, reason, timestamp }`
- `HumanDecision { disposition, reason, reviewerName, timestamp }`
- `ReplayMetadata { modelName, promptVersion, schemaVersion, inputHash, runTimestamp }`
- `EvidenceRecord { id, candidateId, roleId, evidence: EvidenceItem[], interviewQuestions: InterviewQuestion[], reviewerEdits: ReviewerEdit[], humanDecision: HumanDecision | null, replayMetadata: ReplayMetadata }`

### 3. Seed data — new file `src/data/seed.ts`
- `platformEngineerRole`: id `role-platform-engineer`, title `"Platform Engineer"`, four criteria with ids/labels: `api-ownership` (API ownership), `incident-response` (Incident response), `production-kubernetes` (Production Kubernetes), `data-modelling` (Data modelling), each with a short one-line description.
- `candidates`: three candidates — `candidate-a`/`candidate-b`/`candidate-c`, names `"Candidate A"`/`"Candidate B"`/`"Candidate C"`, `roleId` pointing to the role, `documentTitle: "Resume"`, and `documentLines` = 12 entries `{ lineNumber: i+1, text: "" }` (placeholder text kept empty for the user to replace later).
- **No** seeded `EvidenceRecord` (spec allows type only; "no sample data other than what I specified").

### 4. Screen 1 — rewrite `src/pages/Index.tsx`
Warm light background, generous whitespace, rounded borders. Uses `Button`, `Card` from shadcn; pills use `bg-peach text-peach-foreground rounded-full` tokens.
- Header bar: **DecisionTwin** (bold) left, tagline **The auditable hiring decision twin** in muted secondary text beside it.
- "ROLE" small uppercase muted label → role title **Platform Engineer** large bold → four criteria as small peach pills (dark orange text), stacked/flex-wrap.
- "CANDIDATES" section label → grid of three cards (`grid-cols-1 md:grid-cols-3` so they stack on narrow screens). Each card: candidate name bold, document title in muted text, and a primary orange **Start evidence review** button (`Button`, default variant — now orange) that `navigate(`/review/${candidate.id}`)`.

### 5. Placeholder page — new file `src/pages/Review.tsx`
Reads `:candidateId` via `useParams`, looks up the candidate from seed data, renders the candidate name and the text "Evidence review coming next".

### 6. Routing — edit `src/router.tsx`
Add `/review/:candidateId` route (before the `*` catch-all) pointing to `Review`.

## Out of scope (explicitly not built)
No auth/login, no file upload, no dashboard/analytics/charts/settings, no sidebar, no dark-mode toggle, no AI/model calls, no extra routes/pages, no additional seed data.

## Implementation checklist
- [ ] Add peach design tokens + orange primary to `src/index.css` (light and dark) and `peach` colors + Arial font stack to `tailwind.config.ts`.
- [ ] Create `src/types.ts` with all 10 spec types (EvidenceRecord uses `humanDecision: HumanDecision | null`).
- [ ] Create `src/data/seed.ts` with `platformEngineerRole` (4 criteria) and 3 candidates, each with `documentTitle: "Resume"` and exactly 12 `documentLines` (`lineNumber` 1–12, empty `text`).
- [ ] Rewrite `src/pages/Index.tsx` with header (name + tagline), ROLE section (label, title, 4 peach pills), CANDIDATES grid (3 cards, responsive `grid-cols-1 md:grid-cols-3`), orange "Start evidence review" buttons.
- [ ] Create `src/pages/Review.tsx` placeholder rendering candidate name + "Evidence review coming next".
- [ ] Add `/review/:candidateId` route in `src/router.tsx` above the `*` catch-all.

## Verification checklist
- [ ] `pnpm lint` and `pnpm exec tsc --noEmit` pass.
- [ ] `pnpm run build` succeeds.
- [ ] `/` shows header, tagline, ROLE label + "Platform Engineer" title, exactly 4 peach pills, and 3 candidate cards.
- [ ] Clicking each "Start evidence review" navigates to `/review/candidate-a|b|c` and shows the candidate name + "Evidence review coming next".
- [ ] `/review/<unknown-id>` does not crash (safe lookup fallback).
- [ ] Screenshot `/` at `mobile_390` and `desktop_1280`: cards stack on mobile, sit in a row on desktop.
