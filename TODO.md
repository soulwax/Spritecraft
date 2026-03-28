# SpriteCraft Roadmap

This roadmap is meant to take SpriteCraft from a promising prototype to a full-fledged, daily-usable desktop-grade sprite workflow tool.

## Guiding principle

- Build the app in layers: reliable core workflows first, then creator-quality editing, then export and ecosystem depth, then polish and distribution.
- Keep LPC support as a first-class submodule-backed source, while making SpriteCraft useful for non-LPC spritesheets too.
- Treat metadata, reproducibility, and export quality as product features, not implementation details.

## Phase 1 — Stable Core MVP

Goal: make the current app dependable enough for real early use.

- [ ] Make `dart run bin/spritecraft.dart studio` consistently start without hanging in local environments
- [x] Add startup diagnostics for missing submodule assets, bad `.env`, DB connection failures, and Gemini failures
- [x] Add `GET /health` and a simple app status panel in Studio
- [x] Normalize render/export error handling and show actionable messages in the UI
- [x] Add render caching so repeated preview refreshes are fast
- [x] Add stronger tests for export naming, zip bundles, and engine preset generation
- [ ] Add snapshot-style tests for metadata schema stability
- [ ] Finalize the current `build/exports` bundle flow and verify it end-to-end

## Phase 2 — Usable Character Builder

Goal: make the Studio genuinely comfortable for building sprites, not just technically capable.

- [ ] Replace raw item-id selection display with human-friendly selected item cards
- [x] Group catalog results by category such as body, head, hair, torso, weapons, and accessories
- [ ] Add filters for body type, animation compatibility, tags, and category
- [ ] Add search result ranking that favors likely creator intent, not only keyword hits
- [x] Add favorites and pinned items for repeated workflows
- [x] Add clear-all, undo, redo, and restore-last-render actions
- [x] Add layer reordering controls where override behavior makes sense
- [x] Add side-by-side preview modes for idle, walk, and combat animation comparisons

## Phase 3 — Project Workflow

Goal: turn one-off renders into reusable projects creators can come back to.

- [ ] Introduce a formal SpriteCraft project model with name, notes, tags, created/updated timestamps, and export history
- [ ] Add `findById()`, `delete()`, `restore()`, and `duplicate()` project actions in persistence and API
- [ ] Add project browser UI with search, sorting, and quick previews
- [ ] Store render settings, export settings, chosen presets, and prompt history per project
- [ ] Add import/export of a SpriteCraft project package for sharing between machines
- [ ] Add automatic draft saving and explicit named snapshots
- [ ] Support project templates such as NPC base, player character, enemy, portrait, and animation study

## Phase 4 — Metadata and Export Excellence

Goal: make SpriteCraft exports production-grade for engines and asset pipelines.

- [ ] Lock the metadata schema and document it as a stable contract
- [ ] Add schema version migration handling for older saved projects and exports
- [ ] Export animated spritesheets with explicit frame sequences, timing, pivots, and per-frame tags
- [ ] Add atlas export options beyond uniform fullsheet render output
- [ ] Improve Godot export toward native `SpriteFrames`-oriented output
- [ ] Improve Unity export toward importer-ready sprite slicing metadata
- [ ] Add Aseprite-friendly and generic game-engine JSON formats
- [ ] Add optional trim/crop, pivot editing, margins, spacing, and naming conventions per export
- [ ] Add batch export for multiple animations and variants in one job
- [ ] Add credits/license export formats suitable for shipping games and internal asset tracking

## Phase 5 — Smart Features and AI Assistance

Goal: make AI genuinely helpful instead of decorative.

- [ ] Improve the Gemini brief flow so it suggests coherent build paths, not just free-text prompts
- [ ] Add AI-powered category suggestions like "pick a ranger hood, leather torso, quiver, and short bow"
- [ ] Add prompt-to-build recommendations that can prefill a candidate character setup
- [ ] Add prompt memory so repeated art direction stays visually consistent across projects
- [ ] Add AI-assisted naming for projects, animations, and export bundles
- [ ] Add consistency checks such as missing matching body color, incompatible animation coverage, or likely clipping
- [ ] Add smart warnings when selected layers have incomplete animation support
- [ ] Explore AI-assisted palette/style helpers once the core builder flow is stable

## Phase 6 — Editing and Art Workflow Tools

Goal: support real iteration by artists and designers, not only selection and export.

- [ ] Add palette swapping and controlled recolor workflows
- [ ] Add preview backgrounds, zoom levels, onion-skin views, and frame stepping
- [ ] Add crop guides, anchor editing, and pivot placement tools
- [ ] Add layer visibility toggles and solo/mute controls
- [ ] Add animation strip preview with FPS controls
- [ ] Add sheet diffing between two project snapshots
- [ ] Add support for importing custom external layers on top of LPC assets
- [ ] Add non-LPC spritesheet import workflows so SpriteCraft can serve broader users

## Phase 7 — Performance and Reliability

Goal: make the app feel fast and trustworthy as projects grow.

- [ ] Profile render hotspots and reduce repeated disk reads during preview/export
- [ ] Add in-memory and on-disk caching for decoded image assets
- [ ] Move expensive export/render work off the main request path where needed
- [ ] Add structured logging for render, export, AI, and DB failures
- [ ] Add startup self-checks for submodule integrity and expected asset directories
- [ ] Add regression tests for representative LPC combinations and export presets
- [ ] Harden the app against malformed definitions and missing asset files
- [ ] Define backup/recovery behavior for project history and exports

## Phase 8 — Packaging and Distribution

Goal: make SpriteCraft easy to install and use outside the dev folder.

- [ ] Decide on the primary product shape: local web app, desktop shell, or both
- [ ] Add a proper desktop distribution strategy for Windows first
- [ ] Bundle required runtime assets cleanly while preserving submodule update workflows for development
- [ ] Create release builds with versioned changelogs and migration notes
- [ ] Add first-run onboarding for environment setup, submodule status, and optional Gemini configuration
- [ ] Add settings UI for export paths, DB usage, AI toggle, and theme/preferences
- [ ] Add crash-safe logging and a support bundle export for debugging user issues

## Phase 9 — Polish

Goal: make the app feel finished.

- [ ] Create a cohesive icon, favicon, and brand system for SpriteCraft
- [ ] Add loading states, progress indicators, and toasts everywhere they matter
- [ ] Improve empty states so new users always know the next useful action
- [ ] Add keyboard shortcuts for common creator flows
- [ ] Add better responsive layout behavior for smaller screens and tablets
- [ ] Improve typography, motion, and visual hierarchy across the Studio
- [ ] Add accessibility passes for contrast, focus handling, labels, and keyboard navigation

## Phase 10 — Ecosystem and Community

Goal: make SpriteCraft sustainable as a real project.

- [ ] Write formal metadata and export documentation
- [ ] Publish a clear contributor guide for SpriteCraft-specific architecture
- [ ] Document how LPC submodule updates should be handled safely
- [ ] Add issue templates for bug reports, asset mismatches, and export problems
- [ ] Define compatibility policy for metadata schema and project files
- [ ] Create example projects and demo exports for Godot and Unity

## Suggested execution order

- [ ] Finish Phase 1 before adding much more feature surface
- [ ] Prioritize Phase 2 and Phase 3 next so the app becomes truly usable
- [ ] Use Phase 4 and Phase 5 to turn usability into production value
- [ ] Treat Phase 8 and Phase 9 as the bridge from tool to product
