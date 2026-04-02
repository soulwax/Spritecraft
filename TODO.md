# SpriteCraft Action Plan

Last assessed: 2026-04-02

This file is now a live execution plan based on the current codebase, not an aspirational feature dump.

## Current state summary

SpriteCraft is already a substantial product at `0.41.0`, not an early prototype.

What is present in the repository today:

- Dart CLI for deterministic frame-folder packing with `uniform-grid` and `atlas` layout support
- Dart backend API with health, bootstrap, LPC catalog, render, export, AI, history, non-LPC import, recovery, and support bundle routes
- Next.js Studio frontend in `studio` with builder, project browser, onboarding, settings, previews, export controls, and non-LPC inspection UI
- LPC submodule checked out at `lpc-spritesheet-creator`
- Stable metadata documentation under `docs/metadata-schema.md`
- Windows packaging scripts and release notes through `0.41.0`
- A meaningful Dart test suite covering packer, exports, render flows, history, recovery, support bundles, and schema behavior

## Initialization status

Verified in this workspace:

- [x] `git submodule status` shows `lpc-spritesheet-creator` initialized
- [x] `dart pub get` succeeds
- [x] `studio/node_modules` already exists
- [ ] Node.js toolchain is available in this shell
- [ ] `pnpm install --frozen-lockfile` can be re-run locally from this shell

Notes:

- `pnpm`, `node`, `npm`, and `corepack` are not available in the current shell environment, so web validation is currently blocked here even though `studio/node_modules` is present.

## Validation snapshot

Commands run during this assessment:

- [x] `dart pub get`
- [ ] `dart test`
- [ ] `dart analyze`
- [ ] Studio typecheck / lint / build

Observed results:

- `dart pub get` passed
- `dart test` failed
- `dart analyze` failed
- Web validation could not be run because the shell cannot find Node.js tooling

## Confirmed issues

### 1. Schema contract drift between implementation, docs, and tests

The code defines:

- `spritecraft.spritesheet` v1
- `spritecraft.render` v4
- `spritecraft.project` v2

But the test suite is partially stale:

- tests still expect render schema version `3` in at least one place
- several tests reference missing names instead of the exported constants that exist today

Impact:

- breaks `dart test`
- breaks `dart analyze`
- weakens confidence in the documented metadata contract

### 2. Startup behavior and startup test no longer agree

`StudioServer.create()` now refuses to start when required LPC runtime assets are missing, which is a sensible production default.

One startup test still expects the server to boot with no LPC assets at all.

Impact:

- test suite no longer reflects actual production behavior
- startup guarantees are ambiguous unless the contract is documented and enforced consistently

### 3. Web app cannot be validated in the current shell

The repository contains a real Studio app, but this environment does not expose:

- `node`
- `npm`
- `pnpm`
- `corepack`

Impact:

- cannot verify `studio` build health from this shell
- cannot confirm Next.js app status against the current backend contract
- cannot trust the old roadmap items that claim frontend polish work is fully done

### 4. Roadmap drift

The previous `TODO.md` marked almost every phase complete, but the repository state shows that some essential health work is still open:

- failing Dart test suite
- failing Dart analyzer
- no current web validation in this environment
- accessibility, keyboard shortcut, and responsive polish work still open
- contributor and compatibility documentation still incomplete

Impact:

- the old roadmap is not useful for execution
- priority needs to shift from feature accumulation back to contract alignment and system verification

## Recommended course of action

Execution order matters. We should stabilize the repository before adding more product surface.

## Phase A - Restore green quality gates

Goal: make the current product trustworthy again.

- [ ] Fix schema-version drift across [lib/src/models/metadata_schema.dart](/d:/Workspace/Dart/Spritesheet-Creator/lib/src/models/metadata_schema.dart), [docs/metadata-schema.md](/d:/Workspace/Dart/Spritesheet-Creator/docs/metadata-schema.md), and schema-related tests
- [ ] Update stale tests to use the exported schema constants instead of missing identifiers
- [ ] Decide and document whether missing LPC assets are a hard startup failure or a degraded-but-bootable mode
- [ ] Align [test/studio_server_startup_test.dart](/d:/Workspace/Dart/Spritesheet-Creator/test/studio_server_startup_test.dart) with the intended startup contract
- [ ] Re-run `dart analyze`
- [ ] Re-run `dart test`

Definition of done:

- `dart analyze` passes
- `dart test` passes
- startup behavior is explicit and documented

## Phase B - Re-establish local web reproducibility

Goal: make Studio validation repeatable on a fresh machine.

- [ ] Ensure Node.js and package manager setup is documented for Windows contributors, not just assumed
- [ ] Add a single authoritative web bootstrap path for `studio`
- [ ] Verify `pnpm install --frozen-lockfile`, `pnpm typecheck`, and `pnpm build`
- [ ] Confirm `dart run bin/spritecraft.dart app` works end to end with the web app and backend together
- [ ] Document the expected developer prerequisites in [README.md](/d:/Workspace/Dart/Spritesheet-Creator/README.md) and [AGENT.md](/d:/Workspace/Dart/Spritesheet-Creator/AGENT.md)

Definition of done:

- a clean Windows environment can bring up backend + Studio without guesswork
- the web app has at least one verified build path

## Phase C - Clarify product scope: LPC builder vs general spritesheet generator

Goal: stop mixing two product stories without an explicit boundary.

Current reality:

- general spritesheet packing is strong in the Dart CLI
- Studio is strongest for LPC composition and non-LPC inspection
- Studio does not yet appear to be the primary UI for a full arbitrary multi-image spritesheet assembly workflow

Next steps:

- [ ] Define the primary product promise in docs and UI copy
- [ ] Decide whether Studio should gain a first-class general spritesheet assembly workflow
- [ ] If yes, design a domain model for arbitrary uploaded source frames separate from LPC selections
- [ ] Add typed contracts for uploaded frames, ordering, trimming, padding, packing mode, scaling, and export presets
- [ ] Keep the deterministic packer as the engine and avoid duplicating packing rules in TypeScript

Definition of done:

- the app has a clear story for both LPC and non-LPC users
- architecture boundaries stay explicit between UI orchestration and Dart processing

## Phase D - Build the general spritesheet workflow in Studio

Only start this once Phases A-C are complete.

- [ ] Add multi-file image import into Studio
- [ ] Add deterministic frame ordering with rename and reorder controls
- [ ] Add validation for dimensions, duplicate names, unsupported files, and oversized inputs
- [ ] Add pack settings UI for padding, margin, trim, layout mode, power-of-two, pivot, and frame timing
- [ ] Add preview rendering of the generated atlas and frame metadata before download
- [ ] Add export/download flow for PNG + JSON + engine companions from the general workflow
- [ ] Add recoverable async job handling for large packs instead of tying everything to one request

Definition of done:

- Studio can act as a real spritesheet generator for arbitrary frame folders, not only an LPC composer

## Phase E - Product polish that still matters

These are still meaningful open items after the repo is healthy.

- [ ] Add keyboard shortcuts for common creator flows
- [ ] Improve smaller-screen and tablet behavior
- [ ] Run an accessibility pass for focus handling, labels, contrast, and keyboard-only operation
- [ ] Tighten information hierarchy and reduce dense control clusters where the builder feels overloaded
- [ ] Add explicit failure UX for long-running export jobs and missing runtime dependencies

## Phase F - Documentation and contributor sanity

- [ ] Write a contributor guide that explains the Dart backend, Studio frontend, LPC submodule, and runtime boundaries
- [ ] Document safe LPC submodule update workflow
- [ ] Publish compatibility policy for metadata schemas and project files
- [ ] Add issue templates for export bugs, asset mismatches, runtime setup problems, and regression reports
- [ ] Add a concise architecture document covering domain, application, infrastructure, and processing boundaries

## Immediate next three tasks

If work starts right away, the most leverage comes from this order:

1. [ ] Fix the schema/test drift and get `dart analyze` + `dart test` green
2. [ ] Restore local web validation by making the Node toolchain reproducible
3. [ ] Decide whether the next major feature investment is Studio-based general spritesheet assembly or continued LPC-centric depth

## Explicit non-goals until the repo is green

- [ ] Do not add more AI surface area yet
- [ ] Do not expand export formats further yet
- [ ] Do not add more packaging complexity yet
- [ ] Do not mark additional roadmap phases complete without validation evidence
