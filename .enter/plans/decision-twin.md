# DecisionTwin — The theatre of deliberation

## Context
The existing evidence animation feels too much like a UI demo. Turn the landing hero into a cinematic, classical sculpture scene: Greek-inspired wisdom and deliberation, with Rodin’s **The Thinker** as the monumental backdrop. (The Thinker is not a Greek god; the composition combines these references deliberately.)

Replace the problem headline exactly with: **“A hiring score tells you the answer, not the evidence.”**

Current GitHub main was fetched successfully and inspected at `bbfde74`. Keep main’s fixes and all subsequent workspace changes; no branch reset or overwrite.

## Recommended direction
**An illuminated museum installation, not a cartoon or another glowing dashboard.** Warm ivory canvas, monumental bronze sculpture, architectural framing, oversized editorial type, and evidence suspended in depth. Keep the existing Fraunces/Instrument Sans fonts.

Use a rights-verified public-domain/open-license photograph of The Thinker, locally optimized, with a secondary classical Athena-inspired sculptural motif. Animate their lighting, layered depth, and surrounding evidence—not talking faces or an automated god picking the “best” candidate. Source/license must be confirmed before use; if suitable artwork cannot be sourced, ask before substituting generated artwork.

### Choreography — approximately 19 seconds, retaining 0.5× pace
1. **Contemplate:** The Thinker anchors the scene immediately. A bronze halo turns behind the sculpture; a slow light sweep and shallow parallax establish depth. Headline and CTA are visible immediately.
2. **Examine:** Source excerpts lift into the foreground. Luminous curved ribbons carry line 4 to API ownership, then line 5 to Incident response. Citation seals resolve at the destination, rather than generic sparkles everywhere.
3. **Question:** The Kubernetes search fails to find support. Its incomplete arc becomes an amber question; “Which production Kubernetes workloads have you operated?” appears. Do not present line 6’s database text as Kubernetes evidence.
4. **Deliberate:** Evidence gathers around the sculptural figure; a restrained balance/decision motif settles as a human-authored decision appears. End with **“Evidence informs. You decide.”** No score, ranking, winner, or automatic hiring outcome.

The scene is explicitly labelled an **illustrative walkthrough**. Preserve play/pause, scrubbing, and criterion replay; every decorative effect follows the same pause state. Reduced-motion renders a composed, legible end state.

## Scope and layout
- Change only landing UI, its animation components, artwork, and scoped design-system recipes.
- At 1280×720, keep the header, headline, CTA, stage, and controls within one desktop screen. At 390px, use a readable vertical composition with the CTA before the scene; scrolling is preferable to shrinking labels.
- Keep one primary **Get started** action to `/dashboard`.
- Do not change dashboard, candidate/review flows, backend, fixtures, `src/types.ts`, `src/data/seed.ts`, or project `scripts/`.
- No new AI service, runtime generation, video, WebGL, or animation dependency. Reuse existing React, CSS/SVG, and installed motion utilities only where needed.

## Implementation checklist
- [x] Update `src/pages/Landing.tsx` with the exact headline and compact stage-led composition, retaining `/dashboard` navigation.
- [x] Add rights-verified, optimized sculpture artwork under `public/` with source attribution available in the UI; reserve explicit image dimensions.
- [x] Refactor `src/components/hero-mechanism.tsx` into a small orchestrator plus focused sculpture-stage/evidence components under `src/components/hero/`; reuse the existing timeline windows, evidence mappings, `cn`, and semantic status labels.
- [x] Add landing-scoped HSL tokens, lighting/layering recipes, and motion rules in `src/index.css`; expose new tokens in `tailwind.config.ts` if needed without changing existing app colors.
- [x] Synchronize sculpture lighting, evidence ribbons, seals, missing-evidence question, and human-decision phase to one controllable timeline.
- [x] Keep pause/play, keyboard scrubbing, and criterion replay functional on mouse, touch, and keyboard; prevent stuck interaction/pause state.
- [x] Stop animation work while paused, offscreen, or in a hidden tab; clean up listeners/observers and avoid per-frame whole-page React renders.
- [x] Preserve reduced-motion, visible first-paint content, a clear illustrative label, and no backend/model calls on landing mount.

## Verification checklist
- [x] Run `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm run build`.
- [x] Inspect entry/build configuration; run production baseline and final `pnpm run build:prod` plus the frontend-performance manifest audit. Report pre-existing warnings/exemptions separately; no unrelated architecture rewrite.
- [x] Inspect `/` at `desktop_1280` and `mobile_390`: exact headline, readable contrast, sculpture visibility, CTA placement, no horizontal overflow, desktop one-screen fit.
- [x] Exercise a full timeline: line 4/API and line 5/Incident response connect correctly; Kubernetes never gets a verified seal; interview evidence remains unverified; only a human records the final decision.
- [x] Exercise pause/resume, scrub to start/end, criterion replay, touch release, keyboard focus, reduced-motion, and navigation to `/dashboard`; confirm no data mutations from the illustrative hero.
- [x] Check browser logs and, where browser tooling permits, capture full-cycle playback and runtime performance. Distinguish actual interaction tests from code inspection; report browser performance and deployment HTTP as unverified if measurement is unavailable.
- [x] Review final diff to confirm protected files and main’s workspace-review fixes are untouched.

## Delivery evidence and limits
- Implementation complete. Additional narrowly scoped files: `src/components/ui/button.tsx` adds a museum-only variant; `index.html` preloads the 37,298-byte Thinker asset. Athena adds 9,464 bytes. No application dependencies added.
- **Builds: passed.** `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm run build`, and `pnpm run build:prod --manifest` passed on final source. Existing dependency directive and large-chunk warnings remain.
- **Functional regression: passed.** Chromium production tests covered all five phases, source mappings, no Kubernetes verification, pause of every animated layer, start/end scrubbing, keyboard seeking, criterion inspection, complete approximately 19-second loop, reduced-motion including clicks, `/dashboard` navigation, touch input, and offscreen suspension. No page errors. Hidden-tab logic inspected, not independently execution-tested.
- **Visual verification: passed at assumed targets.** `/` at 1280×720 is exactly one screen (document 1280×720); 390px has no horizontal overflow, readable stacked layout and CTA preceding the stage. Full-cycle video inspected: no wrong criterion connections, overlapping text, flashing, or blank frames. Sculpture is a composited 2D photograph, not a 3D model.
- **Strict build audit: failed budgets / existing warnings, not waived.** Hybrid route manifest audit ran with default budgets. Landing JS is 832,013 raw bytes / 211,307 Brotli-estimated bytes (baseline 831,700 / 211,073); CSS 103,078 raw bytes. Existing synchronous app/SDK graph, public CSR HTML without static content/canonical/JSON-LD, conditional browser ponyfill classification, platform-injected remote font stylesheet, and three active font families remain outside this visual-change scope. No claims of SSG or public SEO completion.
- **Browser performance: measured, fails target.** Five cold local-production loads each at 390×844/DPR2, CPU4×, RTT150ms and 1.6Mbps; local server delivers uncompressed artifacts, not deployed CDN transfer. Median FCP/LCP changed from 5.492s/5.492s to 5.852s/5.852s; final worst LCP 5.856s. CLS is 0.0151 (baseline 0.000064), below 0.1. Final loads each had two long tasks, longest 240–257ms. Thus no first-paint/performance improvement claimed; the new visual adds approximately 0.36s under this controlled test. Interaction latency/field INP not measured.
- **Deployment HTTP: unverified.** No published-site cache/encoding/HTML checks. Platform-injected font and public-rendering behavior need separate follow-up, not a broad rewrite in this request.
- Evidence is in `/workspace/decision-final-results.json`, `/workspace/decision-final-audit.json`, and `/workspace/decision-hero-video/`; these are local QA artifacts, not app runtime files. Main’s workspace-review fixes, protected fixtures/types/scripts, and backend paths have no changes.
