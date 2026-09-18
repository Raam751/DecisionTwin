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
- [ ] Update `src/pages/Landing.tsx` with the exact headline and compact stage-led composition, retaining `/dashboard` navigation.
- [ ] Add rights-verified, optimized sculpture artwork under `public/` with source attribution available in the UI; reserve explicit image dimensions.
- [ ] Refactor `src/components/hero-mechanism.tsx` into a small orchestrator plus focused sculpture-stage/evidence components under `src/components/hero/`; reuse the existing timeline windows, evidence mappings, `cn`, and semantic status labels.
- [ ] Add landing-scoped HSL tokens, lighting/layering recipes, and motion rules in `src/index.css`; expose new tokens in `tailwind.config.ts` if needed without changing existing app colors.
- [ ] Synchronize sculpture lighting, evidence ribbons, seals, missing-evidence question, and human-decision phase to one controllable timeline.
- [ ] Keep pause/play, keyboard scrubbing, and criterion replay functional on mouse, touch, and keyboard; prevent stuck interaction/pause state.
- [ ] Stop animation work while paused, offscreen, or in a hidden tab; clean up listeners/observers and avoid per-frame whole-page React renders.
- [ ] Preserve reduced-motion, visible first-paint content, a clear illustrative label, and no backend/model calls on landing mount.

## Verification checklist
- [ ] Run `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm run build`.
- [ ] Inspect entry/build configuration; run production baseline and final `pnpm run build:prod` plus the frontend-performance manifest audit. Report pre-existing warnings/exemptions separately; no unrelated architecture rewrite.
- [ ] Inspect `/` at `desktop_1280` and `mobile_390`: exact headline, readable contrast, sculpture visibility, CTA placement, no horizontal overflow, desktop one-screen fit.
- [ ] Exercise a full timeline: line 4/API and line 5/Incident response connect correctly; Kubernetes never gets a verified seal; interview evidence remains unverified; only a human records the final decision.
- [ ] Exercise pause/resume, scrub to start/end, criterion replay, touch release, keyboard focus, reduced-motion, and navigation to `/dashboard`; confirm no data mutations from the illustrative hero.
- [ ] Check browser logs and, where browser tooling permits, capture full-cycle playback and runtime performance. Distinguish actual interaction tests from code inspection; report browser performance and deployment HTTP as unverified if measurement is unavailable.
- [ ] Review final diff to confirm protected files and main’s workspace-review fixes are untouched.
