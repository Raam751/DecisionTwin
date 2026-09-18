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
- [x] Replace the landing slider/control bar with compact accessible pause/resume/replay actions and retain chapter selection.
- [x] Extract `BrandLogo`; render the same fingerprint/wordmark at the top left on landing and all app routes.
- [x] Add the shared app shell/header, underline-style navigation, and consistent workspace content widths; remove duplicated page navigation/brand headings.
- [x] Promote the approved ivory/ink/bronze palette and small-radius editorial recipes into the shared HSL token system, including matching dark tokens.
- [x] Align dashboard cards, role panels, form sections, review/source panels and comparison surfaces to the shared system without changing event handlers, data transformations or conditional states.
- [x] Replace remaining hard-coded status/error colors in affected UI with existing semantic tokens; preserve all evidence meanings and labels.
- [x] Preserve responsive layouts, visible keyboard focus, touch targets, table scrolling, and reduced-motion behavior.
- [x] Leave backend, generated integrations, state/services/hooks, fixtures, `src/types.ts`, and project `scripts/` untouched; preserve workspace-scoped saves and reason-length rules.

## Verification checklist
- [x] Run `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm run build`, and `pnpm run build:prod --manifest`.
- [x] Check every route via browser DOM/navigation for one top-left logo and a working logo home link; include unknown route and missing candidate.
- [x] Verify landing has no slider/percentage bar; pause/resume freezes all layers, replay restarts, chapters select the correct state, and reduced motion stays still.
- [x] Exercise dashboard-to-review, roles navigation, compare criterion deep links, form entry/numbered preview, empty/disabled form states, and contextual back links. Do not generate evidence or save/delete real records as a styling test.
- [x] Capture the representative workspace route `/dashboard` at `desktop_1280` and `mobile_390`; verify the separately changed landing controls at those viewports. Do not sweep unchanged routes with screenshots.
- [x] Check browser/runtime errors and keyboard/touch behavior; distinguish executed tests from code inspection.
- [x] Run baseline/final production artifact audits and controlled browser checks where available. Report existing bundle/public-HTML/font issues rather than expanding into an unrelated performance or rendering rewrite; deployment HTTP remains unverified without a published-site check.
- [x] Review the final diff to confirm no protected data/backend behavior changed.

## Verification results
- **Implementation and builds passed:** shared logo/header on every route, editorial tokens/components, and compact animation controls delivered. Lint, TypeScript, development build, production manifest build, and diff whitespace checks passed.
- **Functional regression passed:** production Chromium tested nine routes including both error states, logo home links, unique shared navigation, pause/resume/replay/chapter selection, reduced motion, touch controls, candidate-review/back navigation, role candidate/compare navigation, criterion deep links, form disabled/valid states and numbered preview. Decision reason minimum tested without submitting. No page exceptions and no generate/save backend calls occurred.
- **Responsive checks passed at assumed targets:** screenshots of `/dashboard` and `/` at 1280px and 390px; additionally DOM checks found no page-level horizontal overflow on all app routes at both widths. Comparison retains its internal horizontal scroll. Landing remains one desktop screen; workspace pages may scroll normally.
- **Contrast tested:** light body/primary-button ratios 12.85/13.85; dark 15.13/14.90. Existing semantic status colors preserved. No theme toggle introduced.
- **Strict build audit failed on existing warnings/budgets (not waived):** hybrid public/app route audit has no missing-artifact errors. Landing JS 832,665 raw bytes / 211,589 Brotli-estimated bytes, versus prior 832,013 / 211,307. Existing public CSR HTML lacks static content/canonical/JSON-LD; conditional browser ponyfill remains unclassified; platform-injected remote font stylesheet remains externally unverified; three active font families exceed the default count budget. No unrelated SSG, route-loading or SDK rewrite.
- **Browser performance measured, fails target:** five cold local-production samples per version, 390×844/DPR2, CPU4×, RTT150ms, 1.6Mbps, uncompressed local HTTP artifacts. Median FCP/LCP 5.820s before and 5.888s after; final worst 5.936s. Final CLS 0.01510 (below 0.1), 2–3 initial long tasks, longest 248–284ms. App routes had functional checks, not full per-route throttled performance profiles. Interaction latency/field INP not measured.
- **Deployment HTTP unverified:** published HTML, CDN caching/encoding and delivery were not inspected. Platform font injection and public-rendering follow-up remain separate from completed visual changes.
- QA artifacts outside app runtime: `/workspace/decision-unified-regression-results.json`, `/workspace/decision-unified-before-results.json`, `/workspace/decision-unified-after-results.json`, `/workspace/decision-unified-audit.json`.
- Backend, generated integrations, services/state/hooks, fixture/type files and project scripts are unchanged. Existing workspace review scoping is preserved.
