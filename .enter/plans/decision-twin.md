# Safari rendering and role-action cleanup

## Context
Safari on the user’s Mac looks almost completely unstyled; Chrome looks correct. Safari version and the exact affected URL are not yet known. The dashboard also has a redundant New role button inside the Platform Engineer panel; role creation should be offered only in Roles. Headline alternatives were requested, not a headline replacement.

Main was fetched at task start and inspected at `bbfde74`. Existing user changes remain intact.

## Findings so far
- Production CSS exists and includes both landing and workspace selectors.
- The built stylesheet contains no remaining cascade-layer wrappers, imports or supports gates that could by themselves explain wholesale loss of styling.
- PostCSS already includes Autoprefixer. Existing available console errors refer to an older, replaced animation implementation—not evidence for this Safari issue.
- Do not assume caching, unsupported CSS, or fonts are the cause without browser evidence.

## Approach
1. Run the existing production build in Chromium and Playwright WebKit at 1280×720. Inspect stylesheet requests/status/MIME, parsed stylesheets, computed palette/layout/font styles, and runtime failures. Test the current preview URL as well if browser access permits.
2. Fix only a demonstrated code/build compatibility problem. Preserve the current design. If local WebKit is correct or the preview is inaccessible, report that limit and request the exact Safari version/affected URL rather than claiming Safari is fixed. Playwright WebKit is a useful engine test, not a guarantee for every macOS Safari release.
3. Remove the New role button and unused Plus import from `src/pages/Index.tsx`. Keep the Roles page’s creation actions and `/roles/new` route intact.
4. Keep the existing headline until a replacement is selected. Suggested alternatives: **Hiring decisions deserve evidence.**; **See the evidence. Own the decision.**; **Less instinct. More evidence.**; **Know why. Not just who.**

## Implementation checklist
- [ ] Reproduce or bound the Safari symptom with stylesheet/network/computed-style evidence in WebKit and Chromium.
- [ ] Apply only the compatibility fix supported by the investigation, or explicitly document why the Safari issue remains unverified.
- [ ] Remove the dashboard New role action and unused icon import; preserve role creation in Roles.
- [ ] Leave slogan copy, backend/data, fixtures/types, generated integrations, state/services/hooks, and protected scripts unchanged.

## Verification checklist
- [ ] Run `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm run build`, and `pnpm run build:prod --manifest`.
- [ ] Confirm `/dashboard` has no New role action and `/roles` still opens `/roles/new`.
- [ ] Compare current Chrome/WebKit CSS loading and computed styles; check `/` and the representative `/dashboard` only, not an unrelated route sweep.
- [ ] Recheck compact animation controls and the shared logo/navigation if affected by a compatibility fix.
- [ ] Verify the affected desktop layout at 1280×720; only claim compatibility actually tested, and distinguish WebKit from the user’s Mac Safari.
- [ ] Run the production artifact audit; retain known bundle/font/public-HTML warnings without an unrelated performance rewrite. Browser loading-performance and deployed HTTP conclusions stay limited to evidence obtained.
- [ ] Review the final diff for unintended behavior or data changes.
