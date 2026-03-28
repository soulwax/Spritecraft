## 0.4.19 - 2026-03-29

### Changed

- Added related-history context to the `spritecraft-web` workspace so restored projects now bring nearby versions and snapshots into the web-side iteration view.
- Updated the web workspace load contract to carry richer browser context, making saved-project restoration feel more connected to ongoing versioned work instead of loading in isolation.

## 0.4.18 - 2026-03-29

### Changed

- Added web-side version saving in the `spritecraft-web` workspace so a restored project can now save forward as a new version directly from the web builder staging surface.
- Kept the web workspace save flow flexible by supporting both fresh project saves and versioned follow-up saves from the same restored context.

## 0.4.17 - 2026-03-29

### Changed

- Expanded the `spritecraft-web` workspace restore flow so loading a saved project into the web app now carries notes, tags, prompt history, and source-project context instead of only layer selections.
- Added editable workspace context and prompt-memory controls in the web scout, making the new frontend feel more like a real builder session surface instead of a temporary staging tray.

## 0.4.16 - 2026-03-29

### Changed

- Removed unused auth and Drizzle scaffolding from `spritecraft-web` so the web app now reflects its actual role as a frontend over the Dart backend instead of an inactive full-stack T3 setup.
- Simplified the web app environment contract to only require `NEXT_PUBLIC_SPRITECRAFT_API_BASE`, with database ownership remaining on the Dart side.

## 0.4.15 - 2026-03-29

### Changed

- Added a direct bridge from the `spritecraft-web` project browser back into the web selection workspace, so saved projects can now repopulate the web builder staging area without first opening the Dart Studio.
- Continued closing the builder-session loop in `spritecraft-web`, making the new frontend responsible for more of the save, restore, and iterate cycle before full Studio migration.

## 0.4.14 - 2026-03-29

### Changed

- Added direct project creation from the `spritecraft-web` selection workspace so web-side builder intent can now be saved into SpriteCraft history before launching Studio.
- Continued moving early project/session creation into the web app, making `spritecraft-web` participate in actual project authoring instead of only staging and handoff.

## 0.4.13 - 2026-03-29

### Changed

- Added named local workspace presets to the `spritecraft-web` selection workspace so multiple reusable builder setups can now be saved, loaded, and deleted.
- Continued shifting early builder-session management into the web app, making the workspace feel more like a real pre-builder environment instead of a single transient draft.

## 0.4.12 - 2026-03-29

### Changed

- Added a comprehensive CLI command reference to the README covering `pack`, `plan`, `studio`, common options, and practical examples.
- Upgraded the `spritecraft-web` selection workspace so staged layers can now be edited, reordered, and removed more intentionally before handing off into Studio.

## 0.4.11 - 2026-03-29

### Changed

- Added a lightweight web-side workspace preview in `spritecraft-web` using the existing Dart render pipeline, including rendered image feedback and resolved layer-stack details.
- Improved the `pack` CLI error for missing input directories so it now reports the resolved absolute path and current working directory instead of only echoing the raw relative path.

## 0.4.10 - 2026-03-29

### Changed

- Turned the `spritecraft-web` catalog scout into a persistent web-side selection workspace with local draft storage, workspace naming, and clear/reset controls.
- Kept the Studio handoff aligned with that workspace so the web app now preserves real builder intent across reloads instead of only across a single launch.

## 0.4.9 - 2026-03-28

### Changed

- Extended the `spritecraft-web` catalog scout into the first real builder slice by allowing staged layer picks with variant choices before launching into Studio.
- Added deep-link transfer of staged layer selections from `spritecraft-web` into the Dart Studio so handoff now carries real builder state, not only launch/search intent.

## 0.4.8 - 2026-03-28

### Changed

- Added a `spritecraft-web` catalog scout that can search the LPC catalog, filter by body type and animation, and hand that discovery context off into the Dart Studio.
- Added a shared web-side catalog bridge route so the new frontend can query the existing Dart backend without collapsing the migration boundary.
- Expanded Studio deep-link handling so `catalogSearch` now survives web-to-builder handoff for scouting flows.

## 0.4.7 - 2026-03-28

### Changed

- Added a dedicated `spritecraft-web` project launcher with template cards and a configurable launch form so new project framing now has a proper home in the web app.
- Removed the duplicated template-launch section from the web project browser, making the launcher the clearer start surface and the browser the clearer saved-work surface.

## 0.4.6 - 2026-03-28

### Changed

- Promoted `spritecraft-web` further into the role of launch dashboard by sharpening its entry-point messaging around starting, continuing, and directly opening SpriteCraft work.
- Removed the duplicate runtime-health panel from the Dart Studio so runtime status now lives in the web dashboard while the Studio stays focused on live composition, preview, save, and export.

## 0.4.5 - 2026-03-28

### Added

- Added template-driven project starts in `spritecraft-web`, with direct deep-link handoff into the Dart Studio builder.

### Changed

- The Dart Studio can now accept builder setup via URL parameters for project name, prompt, body type, animation, engine preset, preview mode, and filter defaults.
- This makes `spritecraft-web` a more natural place to begin a project while keeping the Dart Studio focused on composition and rendering.

## 0.4.4 - 2026-03-28

### Changed

- Removed the remaining editable project metadata controls from the Dart Studio so notes, tags, and snapshot-oriented project management now live in `spritecraft-web`.
- Kept the Studio focused on live composition, preview, save, and export while the web app becomes the clearer home for saved-project administration.

## 0.4.3 - 2026-03-28

### Changed

- Moved named snapshot creation out of the Dart Studio and into `spritecraft-web`, where snapshots can now be created directly from saved projects.
- Added web-side saved-project versioning so edited project metadata can be saved as a new history version from the new project browser.
- Clarified the Studio role as the live builder while the web app now owns more of the project-management workflow surface.

## 0.4.2 - 2026-03-28

### Changed

- Removed the legacy history panel from the Dart Studio now that project browsing has moved to `spritecraft-web`.
- Added a restore handoff flow from `spritecraft-web` into the Dart Studio using `?restore=<id>` deep links, so the web app can launch saved projects directly into the active builder.

## 0.4.1 - 2026-03-28

### Changed

- Reduced the legacy Dart Studio history panel to quick restore only now that project browsing, duplication, deletion, and project package transfer have moved into `spritecraft-web`.
- Added explicit messaging in the Studio UI so the migration boundary between the old Studio and the new web app is visible during Phase 3.5 work.

## 0.4.0 - 2026-03-28

### Added

- Introduced `spritecraft-web`, a parallel Next.js/TypeScript frontend shell for the ongoing Studio migration.
- Added a Kanagawa Wave visual theme for the new web shell, including SpriteCraft branding and favicon support.
- Added live project-browser actions in the web app for history refresh, duplication, deletion, package export, and package import through the existing Dart backend.
- Added dedicated Next.js API bridge routes so the web shell can talk to the Dart backend cleanly through one frontend surface.

### Changed

- Reframed the web migration around the existing Dart backend as the source of truth for SpriteCraft project, history, and render flows.
- Removed auth and local web-backend scaffolding from the active `spritecraft-web` product path so the migration can stay focused on SpriteCraft features instead of unused platform overhead.
- Made the web app environment model backend-first by treating `NEXT_PUBLIC_SPRITECRAFT_API_BASE` as the primary required integration and making local auth/database variables optional.

## 0.3.0 - 2026-03-28

### Added

- `GET /health` runtime endpoint for quickly checking Studio assets, LPC submodule paths, Gemini availability, database availability, and export directory readiness.
- Runtime configuration diagnostics for malformed `.env` lines so startup issues are surfaced instead of silently ignored.
- A Studio runtime health panel with refresh support so startup problems are visible in the UI instead of only surfacing as failed requests later.
- Server-side render result caching for repeated preview and export requests using the same layer selection.
- Focused export helper coverage for bundle naming, engine preset files, and zip archive contents.
- Catalog browsing improvements in Studio with category filter chips and grouped result sections for faster asset discovery.
- Builder workflow controls for undo, redo, restore-last-render, and keyboard shortcuts to make experimentation safer.
- Preview mode controls for side-by-side idle, walk, and combat comparisons using the existing Studio render pipeline.
- Persistent local favorites and pinned quick-access items in Studio for faster repeated character-building workflows.
- Layer stack reordering controls in the selected-items panel so override-sensitive looks can be adjusted without rebuilding selections.
- Expanded Studio catalog filtering with category chips plus animation-compatibility and tag filters for faster narrowing of LPC assets.
- Intent-aware Studio catalog ranking that boosts prompt-aligned, search-aligned, favorited, pinned, and animation-compatible items.
- Project browser controls in Studio history with search, sorting, and quick preview metadata for saved looks.
- Saved project history now persists project names, chosen export preset, render/export settings, and prompt history for richer restores and browsing.
- Formalized SpriteCraft project records with notes, tags, updated timestamps, and export history carried through persistence and the Studio browser.
- Automatic local draft saving plus explicit named snapshot saves in Studio for safer project iteration.
- Built-in Studio project templates for NPC base, player character, enemy, portrait, and animation study starting points.
- Centralized schema migration handling for older saved projects, drafts, and render metadata to keep evolving SpriteCraft data backward-compatible.
- Project duplication plus import/export of `.spritecraft-project.json` packages for sharing and cloning saved work.
- Studio startup now fails fast with explicit timeout diagnostics instead of hanging silently during configuration, asset, DB, or server setup.
- Added metadata snapshot coverage and a self-describing export bundle manifest to harden SpriteCraft’s current export contract.
- Selected layers now consistently render as human-friendly cards in Studio, matching the rest of the builder UX.
- Added a current-project export activity panel in Studio so recent exports stay visible while iterating on a project.

## 0.2.0 - 2026-03-28

### Added

- Local Studio server with a modern browser GUI for composing and exporting LPC-inspired spritesheets.
- LPC catalog loading and layered PNG composition from the bundled `lpc-spritesheet-creator` asset library.
- Neon-backed history persistence for saved sprite projects and render metadata.
- AI-assisted studio brief endpoint that combines Gemini sprite planning with local catalog recommendations.

## 0.1.0 - 2026-03-28

### Added

- Pure Dart CLI bootstrap for creating spritesheets from a folder of source frames.
- Core library API for packing images and writing JSON metadata manifests.
- Gemini-ready AI planning client for turning a prompt into a structured sprite brief.
- Initial tests and project documentation for local usage and environment setup.
