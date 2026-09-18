# DecisionTwin — One editorial design system

## Context
You confirmed that the **new Thinker landing page** should set the style for the whole app: ivory, bronze, editorial typography, and the fingerprint + DecisionTwin logo. The existing animation’s native playback bar looks out of place.

Main was fetched at the start and inspected (`bbfde74`); current workspace changes remain intact. This is a frontend presentation/navigation consistency pass, not a change to hiring logic or stored data.

## Recommended changes
### 1. Quiet animation controls
Remove the native slider, percentage readout, speed label, and circular button row. Replace them with compact **Pause motion / Resume motion** and **Replay** text-and-icon actions aligned with the scene caption. Keep the five chapter selectors as the direct way to revisit a step. Retain the 0.5× loop, synchronized pause, reduced-motion state, and evidence mappings. Do not change the sculpture art or animation sequence.

### 2. One recognizable header
Extract the existing fingerprint + serif wordmark into a reusable `BrandLogo`. Use it in the landing header and in a shared workspace header on every app route—including new-role/candidate forms, evidence review, comparison, and missing-page/candidate states.

The logo links home (`/`). Workspace navigation remains **Candidates** and **Roles**, with a bronze underline rather than orange pills. Preserve existing contextual back links; do not duplicate navigation on individual pages.

### 3. Carry the landing design through the app
- Warm ivory surfaces, deep ink primary buttons, bronze accents and hairline dividers.
- Fraunces page/candidate headings, Instrument Sans controls and body copy, monospace only for source/audit details.
- Consistent page gutters, heading spacing, flatter cards, small corner radii, and clearer form groups.
- Update candidate dashboard, roles, both forms, review panels, comparison table and not-found state through shared tokens/components, not isolated CSS overrides.
- Keep green/amber/red/blue evidence statuses distinct, labelled and accessible. Preserve dark-mode legibility without adding a theme toggle.
- Keep working screens quiet: no statues or decorative continuous animation outside the landing.

## Critical files and reuse
- New: `src/components/brand-logo.tsx`, `src/components/app-shell.tsx`.
- Header/navigation: `src/components/main-nav.tsx`, `src/router.tsx`, `src/pages/Landing.tsx`.
- Controls: `src/components/hero-mechanism.tsx`; reuse `useHeroTimeline` and existing chapter actions.
- System: `src/index.css`, `tailwind.config.ts`, shared `ui/button.tsx` and `ui/card.tsx`; adapt existing status/form components where required.
- Pages: `Index.tsx`, `Roles.tsx`, `NewRole.tsx`, `NewCandidate.tsx`, `Compare.tsx`, `Review.tsx`, `NotFound.tsx`.

## Implementation checklist
- [ ] Replace the landing slider/control bar with compact accessible pause/resume/replay actions and retain chapter selection.
- [ ] Extract `BrandLogo`; render the same fingerprint/wordmark at the top left on landing and all app routes.
- [ ] Add the shared app shell/header, underline-style navigation, and consistent workspace content widths; remove duplicated page navigation/brand headings.
- [ ] Promote the approved ivory/ink/bronze palette and small-radius editorial recipes into the shared HSL token system, including matching dark tokens.
- [ ] Align dashboard cards, role panels, form sections, review/source panels and comparison surfaces to the shared system without changing event handlers, data transformations or conditional states.
- [ ] Replace remaining hard-coded status/error colors in affected UI with existing semantic tokens; preserve all evidence meanings and labels.
- [ ] Preserve responsive layouts, visible keyboard focus, touch targets, table scrolling, and reduced-motion behavior.
- [ ] Leave backend, generated integrations, state/services/hooks, fixtures, `src/types.ts`, and project `scripts/` untouched; preserve workspace-scoped saves and reason-length rules.

## Verification checklist
- [ ] Run `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm run build`, and `pnpm run build:prod --manifest`.
- [ ] Check every route via browser DOM/navigation for one top-left logo and a working logo home link; include unknown route and missing candidate.
- [ ] Verify landing has no slider/percentage bar; pause/resume freezes all layers, replay restarts, chapters select the correct state, and reduced motion stays still.
- [ ] Exercise dashboard-to-review, roles navigation, compare criterion deep links, form entry/numbered preview, empty/disabled form states, and contextual back links. Do not generate evidence or save/delete real records as a styling test.
- [ ] Capture the representative workspace route `/dashboard` at `desktop_1280` and `mobile_390`; verify the separately changed landing controls at those viewports. Do not sweep unchanged routes with screenshots.
- [ ] Check browser/runtime errors and keyboard/touch behavior; distinguish executed tests from code inspection.
- [ ] Run baseline/final production artifact audits and controlled browser checks where available. Report existing bundle/public-HTML/font issues rather than expanding into an unrelated performance or rendering rewrite; deployment HTTP remains unverified without a published-site check.
- [ ] Review the final diff to confirm no protected data/backend behavior changed.
