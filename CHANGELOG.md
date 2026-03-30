## 0.37.0 - 2026-03-30

### Added

- Added a dedicated Studio settings route with runtime-path visibility for exports, project packages, recovery logs, LPC asset roots, history mode, and Gemini availability.
- Added client-side Studio preferences for theme, AI panel visibility, history/project navigation visibility, default export preset, and default naming style.

### Changed

- Extended the Dart bootstrap contract with a typed runtime summary so Studio can show backend-owned settings without duplicating runtime logic in the frontend.
- Applied Studio theme preference globally and made the AI/history toggles affect the active Studio surface immediately.

## 0.36.0 - 2026-03-30

### Added

- Added a first-run onboarding checklist on the Studio home page so new local installs can verify LPC content, local `.env` setup, and optional Gemini availability before a longer builder session.
- Added a typed onboarding payload to the Dart bootstrap response so setup guidance now comes from backend-owned runtime state instead of duplicated client heuristics.

### Changed

- Extended runtime config to distinguish missing `.env` files from parsing warnings, which makes setup guidance clearer for both repo-based and packaged runs.

## 0.35.0 - 2026-03-30

### Added

- Added a Windows-first packaging workflow for SpriteCraft with a portable bundle builder, launcher scripts, and documented release layout around the Dart backend plus standalone `studio` app.
- Added support for packaged LPC runtime assets through `SPRITECRAFT_LPC_ROOT`, so release bundles can run from bundled asset directories without requiring a git submodule checkout at runtime.

### Changed

- Switched `studio` to Next.js standalone output so packaged builds can ship a tighter runtime layout for release bundles.
- Updated Phase 8 packaging docs to define the primary product shape, Windows distribution target, and bundled-runtime asset behavior.

## 0.34.0 - 2026-03-30

### Added

- Added asynchronous LPC export jobs with polling so heavier batch and bundle exports can run off the main request path instead of holding one long-lived backend request open.
- Updated Studio export flow to start a background export job and wait on job status updates before showing the final bundle result.

## 0.33.2 - 2026-03-30

### Added

- Added a disk-backed decoded asset cache for LPC renders under `build/cache/render-assets`, so repeated previews can survive renderer restarts without re-decoding unchanged source PNGs.
- Added a cross-instance renderer test that proves SpriteCraft can reuse cached decoded assets even after the original source file is gone.

## 0.33.1 - 2026-03-30

### Added

- Added an LRU-style decoded asset cache and resolved-path cache to the LPC renderer so repeated preview and export renders avoid unnecessary disk reads.
- Added a renderer regression test that verifies repeated renders can still succeed after the original LPC asset file is removed, proving the hot-path cache is being used.

## 0.33.0 - 2026-03-30

### Added

- Added a non-LPC spritesheet import workflow with a dedicated backend endpoint, Studio-side import panel, PNG preview, optional metadata JSON parsing, and manual tile/grid fallback fields.
- Added normalized non-LPC import summaries so SpriteCraft can inspect frame counts, grid dimensions, inferred values, and detected frame names for broader sprite pipelines beyond LPC assets.

## 0.32.0 - 2026-03-30

### Added

- Added support for custom external PNG overlay layers in the Studio builder, including local path entry, label editing, z-order control, and workspace persistence.
- Extended the Dart renderer and export pipeline so external overlays render alongside LPC layers, appear in the resolved layer stack, and carry through preview, save, restore, and export flows.

## 0.31.0 - 2026-03-30

### Added

- Added snapshot sheet diffing in the Studio compare flow, including per-frame playback, blend mode, difference mode, and changed-pixel summary.
- Turned version comparison into a more practical creator tool by letting users inspect what actually changed across animation frames instead of relying on side-by-side previews alone.

## 0.30.0 - 2026-03-30

### Added

- Added animation strip previews with direct frame picking, play/pause controls, and adjustable FPS in the Studio frame preview.
- Made both workspace and comparison previews more animation-friendly by turning frame stepping into a lightweight playback workflow.

## 0.29.0 - 2026-03-30

### Added

- Added layer visibility controls in the Studio builder so staged layers can be muted or soloed without removing them from the working stack.
- Made preview, build checks, and export respect the current visible layer set while still preserving the full staged project state for later refinement.

## 0.28.0 - 2026-03-30

### Added

- Added editable preview guides in Studio with crop bounds, click-to-place pivot markers, and quick anchor presets for common LPC attachment points.
- Turned the main workspace preview into a lightweight sprite-editing surface so export pivot placement can be adjusted visually before save or export.

## 0.27.0 - 2026-03-30

### Added

- Added frame-aware preview tools with zoom levels, background modes, onion-skin display, and frame stepping for the current workspace and compare view.
- Improved layered render metadata so preview consumers can infer practical frame layout for LPC animation strips when the sheet dimensions support it.

## 0.26.0 - 2026-03-30

### Added

- Added controlled recolor workflows with semantic palette groups for body, cloth, leather, metal, and accent layers.
- Added Studio recolor controls that affect live preview, saved workspace state, and export output through the Dart renderer.

### Changed

- Bumped `spritecraft.render` metadata to v4 so layered render/export payloads now record active recolor groups.

## 0.25.0 - 2026-03-30

### Added

- Added AI-assisted style helpers with palette directions, reusable style tags, build guidance, and focused catalog queries for the current LPC workspace.
- Added Studio apply actions so palette directions can be saved into notes, style tags can be merged into the workspace, and focused catalog searches can be launched directly from the helper panel.

## 0.24.0 - 2026-03-30

### Added

- Added a typed LPC consistency checker that flags missing body-color anchors, incomplete animation support, duplicate layer types, and likely silhouette clutter.
- Added a Studio build-check panel that evaluates the current staged workspace automatically and surfaces actionable warnings before save or export.

## 0.23.0 - 2026-03-30

### Added

- Added AI-assisted naming suggestions for project names, animation/frame labels, and export stems in the Studio builder.
- Added a dedicated naming suggestion endpoint with Gemini-backed suggestions and a practical local fallback so naming stays useful even without AI availability.

## 0.22.0 - 2026-03-30

### Added

- Added prompt memory to the AI brief flow so saved prompts, workspace tags, and notes now reinforce style consistency across projects.
- Exposed prompt-memory feedback inside the Studio builder so creators can see which saved direction is influencing the current brief.

## 0.21.1 - 2026-03-30

### Changed

- Reoriented the Studio routes toward a tool-first LPC character creator flow, reducing overview-style copy and making the overview, projects, and builder pages feel more like working surfaces.

## 0.21.0 - 2026-03-30

### Changed

- Split the Studio into dedicated overview, projects, and builder routes while keeping a shared app shell and in-app navigation.
- Updated launch, restore, and builder-state URLs to target `/builder` directly so the multi-page app still behaves like one continuous workspace.

## 0.20.1 - 2026-03-30

### Fixed

- Fixed `dart run bin/spritecraft.dart app` shutdown on Windows so stopping the app now terminates the full Studio dev-server process tree instead of leaving port `3000` occupied.

## 0.20.0 - 2026-03-30

### Changed

- Redesigned the Studio home shell around a creator-first workflow with a stronger launchpad, clearer builder handoff, calmer project context, and much less dashboard-style clutter.
- Refined the Kanagawa-inspired visual system with a stronger hero surface, softer supporting panels, updated global atmosphere, and more deliberate button and card styling.

## 0.19.4 - 2026-03-30

### Fixed

- Fixed Studio dev-origin handling so the app now opens on `localhost` and allows both `localhost` and `127.0.0.1` during Next.js development.
- Added lightweight dev-only builder launch logs to help diagnose launch and restore interactions in the browser.

## 0.19.3 - 2026-03-30

### Fixed

- Fixed backend status links in `studio` so they now use the configured SpriteCraft API base URL instead of a hardcoded local origin.
- Added backend aliases for `/api/health` and `/bootstrap` alongside `/health` and `/api/bootstrap` to make health and bootstrap entry points more resilient.

## 0.19.2 - 2026-03-30

### Fixed

- Fixed in-page builder launch so `Open In Builder` and launch-template flows now actively load the builder workspace instead of only updating the URL.
- Made builder launch parsing honor `catalogSearch` as well as prompt text so same-page workspace relaunches keep their intended scoped search context.

## 0.19.1 - 2026-03-30

### Fixed

- Fixed the `app` launcher so it now detects missing `studio/node_modules`, runs the appropriate package-manager install step automatically, and only then starts the Next.js dev server.

## 0.19.0 - 2026-03-30

### Changed

- Renamed the first-party Next.js app directory from `spritecraft-web` to `studio` and updated the Dart launcher, docs, and repo guidance to use the new path.
- Removed stale assumptions that the frontend app was external or submodule-like; only `lpc-spritesheet-creator` remains a git submodule.
- Updated SpriteCraft Studio package metadata and launcher defaults to treat `studio` as the canonical in-repo app directory.

## 0.18.0 - 2026-03-30

### Added

- Added AI-powered category suggestions in SpriteCraft Studio so the brief can recommend concrete layer picks by role and slot.
- Added candidate-build recommendations that can prefill a staged character setup from the current prompt in one click.

### Changed

- Extended the structured AI brief response so build paths, category suggestions, and candidate builds share the same backend composition logic.
- Marked the next two Phase 5 AI roadmap items complete.

## 0.17.0 - 2026-03-30

### Added

- Added structured AI brief build paths with ordered steps, focused search queries, and per-step layer recommendations in SpriteCraft Studio.
- Added a reusable `SpriteBriefComposer` so Gemini output and local fallback guidance now produce the same actionable brief shape.

### Changed

- Improved the Gemini brief flow so it returns coherent builder guidance instead of only free-text prompt support.
- Marked the first Phase 5 roadmap item complete.

## 0.16.0 - 2026-03-30

### Added

- Added automatic credits and licensing companions for exports: `.credits.json`, `CREDITS.md`, and `LICENSES.txt`.

### Changed

- Export bundles now include shipping-friendly credit and license artifacts derived from SpriteCraft metadata.
- Marked the credits/license export roadmap item complete.

## 0.15.0 - 2026-03-30

### Added

- Added batch export support for multiple animations and workspace variants in a single job and bundle.

### Changed

- Exposed batch animation and preset-variant export controls in SpriteCraft Studio.
- Marked the batch export roadmap item complete.

## 0.14.0 - 2026-03-30

### Added

- Added export-control options for SpriteCraft Studio and the Dart backend, including filename style selection, custom stems, frame-name prefixes, transparent trimming, margin padding, spacing metadata, and pivot overrides.

### Changed

- Upgraded `spritecraft.render` to schema version `3` to document the new export-options block in render/export metadata.
- Marked the export-controls roadmap item complete.
- Exposed the new export controls in `studio`.

## 0.13.0 - 2026-03-30

### Added

- Added Aseprite-friendly `.aseprite.json` export companions with frame timing, trim data, and frame tags.
- Added generic engine `.generic.json` companions that preserve SpriteCraft frames and animations in a simpler portable JSON shape.

### Changed

- Exposed the new Aseprite, generic, and all-presets export choices in SpriteCraft Studio.
- Marked the Aseprite/generic export roadmap item complete.

## 0.12.0 - 2026-03-30

### Added

- Added importer-ready Unity companion export metadata with sprite rects, normalized pivots, and animation clip frame ordering in `.unity.json`.

### Changed

- Marked the Unity export roadmap item complete and documented the richer engine companion output.

## 0.11.1 - 2026-03-30

### Fixed

- Fixed the `app` launcher readiness probe so early dropped HTTP connections from `studio` are retried instead of crashing the Dart process during startup.

## 0.11.0 - 2026-03-30

### Added

- Added native Godot `SpriteFrames` `.tres` companion export generation for engine preset bundles, derived directly from SpriteCraft frame metadata.

### Changed

- Kept the existing `.godot.json` preset as a compatibility artifact while promoting the Godot export path toward engine-native resources.
- Marked the Godot `SpriteFrames` export roadmap item complete.

## 0.10.0 - 2026-03-29

### Added

- Added animated spritesheet metadata to the generic `pack` flow, including explicit animation sequences, per-frame duration, pivots, and derived frame tags.
- Added new `pack` CLI options for animation name, frame duration, and pivot coordinates so exported metadata can be engine-ready without hand editing.
- Added atlas layout support to the generic `pack` flow, with optional transparent trimming for tighter packed spritesheet output and atlas-aware metadata.

### Changed

- Updated the metadata schema documentation and roadmap to treat SpriteCraft Studio as the primary product surface instead of describing it in migration terms.

## 0.8.1 - 2026-03-29

### Fixed

- Fixed the `app` launcher for `pnpm` so `dart run bin/spritecraft.dart app` now passes `--port` correctly to `next dev` instead of forwarding a stray `--` that made Next treat `--port` as a directory.

## 0.8.0 - 2026-03-29

### Added

- Added a formal metadata schema contract document for `spritecraft.spritesheet`, `spritecraft.render`, and `spritecraft.project` in `docs/metadata-schema.md`.

### Changed

- Centralized SpriteCraft metadata schema names and versions in shared model constants so emitted JSON contracts are locked to one canonical source.
- Updated the roadmap to treat the web migration as complete enough to skip the remaining old Phase 3.5 follow-up items and continue with Phase 4 work.

## 0.7.1 - 2026-03-29

### Fixed

- Made `dart run bin/spritecraft.dart app` visibly report startup progress instead of appearing idle while backend services initialize.
- Made backend history persistence startup fail soft when the configured database is unreachable, so the app can still boot and report database availability as a warning.

## 0.7.0 - 2026-03-29

### Added

- Added a new `dart run bin/spritecraft.dart app` command that starts the Dart backend API and `studio` together from one CLI entrypoint.
- Added web package-manager detection and startup helpers so the combined launcher can use `pnpm`, `npm`, `yarn`, or `bun` and wire `NEXT_PUBLIC_SPRITECRAFT_API_BASE` automatically.

### Changed

- Updated the CLI and docs so `studio` remains backend-only while `app` is now the recommended way to boot the full local SpriteCraft experience.

## 0.6.0 - 2026-03-29

### Changed

- Finalized the frontend cutover to `studio` by making the Dart server API-only and moving the primary creator surface fully to the web app.
- Added web-side AI brief and export flows so the last major `/studio`-only creator actions now run from the new frontend.
- Removed the legacy `/studio` frontend files from the repository.

## 0.5.0 - 2026-03-29

### Changed

- Added web-side AI brief generation and recommendation staging in `studio`, bringing another major creator workflow out of the legacy `/studio` surface.
- Added direct web-side export bundle generation with engine preset selection, so the new web builder can now produce PNG, metadata JSON, zip bundles, and preset companion files without relying on `/studio`.
- Continued consolidating the migration by moving more of the last clearly Studio-only creator actions into the new web workspace.

## 0.4.28 - 2026-03-29

### Changed

- Added active-layer compatibility warnings and focused recommendations to the `studio` selected-layer detail panel so the web builder now flags likely body-type, animation, and palette-fit concerns earlier.
- Continued shifting smart builder guidance into the web app by making the active staged layer surface practical next-step advice instead of only metadata and alternatives.

## 0.4.27 - 2026-03-29

### Changed

- Added a selected-layer detail workflow to `studio` so the active staged layer now surfaces its metadata and a set of same-type alternatives directly inside the web workspace.
- Improved web-side replacement decisions by connecting staged-layer focus, compatible alternatives, and same-type catalog browsing into one flow.

## 0.4.26 - 2026-03-29

### Changed

- Added staging-aware catalog ranking in `studio` so alternatives are now prioritized by focused type, current workspace tags, prompt terms, body type fit, and animation fit.
- Made web-side replacement browsing feel more intentional by combining the new type-focus flow with smarter result ordering instead of only static filtering.

## 0.4.25 - 2026-03-29

### Changed

- Added a type-focused alternative-browsing flow in `studio` so staged items can now jump the catalog directly into “show me alternatives for this layer type”.
- Improved the web-side builder feel by pairing same-type replacement mode with explicit alternative discovery instead of leaving replacement as a manual search task.

## 0.4.24 - 2026-03-29

### Changed

- Added a web-side staged-selection mode that can automatically replace existing staged items of the same layer type, making `studio` behave more like a practical builder instead of only a loose scouting tray.
- Persisted the new staging mode in the web workspace so creators can choose between stricter layer replacement and free stacking across sessions.

## 0.4.23 - 2026-03-29

### Changed

- Added side-by-side render comparison in the `studio` version-compare panel so creators can visually inspect the current workspace against a related saved version.
- Improved web-side version decisions by combining metadata comparison with actual rendered sprite feedback before branching or switching.

## 0.4.22 - 2026-03-29

### Changed

- Made the web-side version comparison flow actionable by allowing the current workspace to branch directly from a compared related version.
- Continued turning `studio` into a usable iteration surface by collapsing compare and continue into one workflow instead of separate navigation steps.

## 0.4.21 - 2026-03-29

### Changed

- Added a lightweight version-compare panel to the `studio` workspace so creators can inspect prompt, tag, and layer-set differences against a related saved version before switching.
- Continued reducing browser bounce during iteration by making related-version comparison part of the web-side workspace itself.

## 0.4.20 - 2026-03-29

### Changed

- Made the `studio` related-history panel actionable so nearby versions and snapshots can now be loaded directly back into the web workspace.
- Reduced project-browser bouncing during iteration by letting version-to-version workspace navigation happen from inside the web-side builder surface.

## 0.4.19 - 2026-03-29

### Changed

- Added related-history context to the `studio` workspace so restored projects now bring nearby versions and snapshots into the web-side iteration view.
- Updated the web workspace load contract to carry richer browser context, making saved-project restoration feel more connected to ongoing versioned work instead of loading in isolation.

## 0.4.18 - 2026-03-29

### Changed

- Added web-side version saving in the `studio` workspace so a restored project can now save forward as a new version directly from the web builder staging surface.
- Kept the web workspace save flow flexible by supporting both fresh project saves and versioned follow-up saves from the same restored context.

## 0.4.17 - 2026-03-29

### Changed

- Expanded the `studio` workspace restore flow so loading a saved project into the web app now carries notes, tags, prompt history, and source-project context instead of only layer selections.
- Added editable workspace context and prompt-memory controls in the web scout, making the new frontend feel more like a real builder session surface instead of a temporary staging tray.

## 0.4.16 - 2026-03-29

### Changed

- Removed unused auth and Drizzle scaffolding from `studio` so the web app now reflects its actual role as a frontend over the Dart backend instead of an inactive full-stack T3 setup.
- Simplified the web app environment contract to only require `NEXT_PUBLIC_SPRITECRAFT_API_BASE`, with database ownership remaining on the Dart side.

## 0.4.15 - 2026-03-29

### Changed

- Added a direct bridge from the `studio` project browser back into the web selection workspace, so saved projects can now repopulate the web builder staging area without first opening the Dart Studio.
- Continued closing the builder-session loop in `studio`, making the new frontend responsible for more of the save, restore, and iterate cycle before full Studio migration.

## 0.4.14 - 2026-03-29

### Changed

- Added direct project creation from the `studio` selection workspace so web-side builder intent can now be saved into SpriteCraft history before launching Studio.
- Continued moving early project/session creation into the web app, making `studio` participate in actual project authoring instead of only staging and handoff.

## 0.4.13 - 2026-03-29

### Changed

- Added named local workspace presets to the `studio` selection workspace so multiple reusable builder setups can now be saved, loaded, and deleted.
- Continued shifting early builder-session management into the web app, making the workspace feel more like a real pre-builder environment instead of a single transient draft.

## 0.4.12 - 2026-03-29

### Changed

- Added a comprehensive CLI command reference to the README covering `pack`, `plan`, `studio`, common options, and practical examples.
- Upgraded the `studio` selection workspace so staged layers can now be edited, reordered, and removed more intentionally before handing off into Studio.

## 0.4.11 - 2026-03-29

### Changed

- Added a lightweight web-side workspace preview in `studio` using the existing Dart render pipeline, including rendered image feedback and resolved layer-stack details.
- Improved the `pack` CLI error for missing input directories so it now reports the resolved absolute path and current working directory instead of only echoing the raw relative path.

## 0.4.10 - 2026-03-29

### Changed

- Turned the `studio` catalog scout into a persistent web-side selection workspace with local draft storage, workspace naming, and clear/reset controls.
- Kept the Studio handoff aligned with that workspace so the web app now preserves real builder intent across reloads instead of only across a single launch.

## 0.4.9 - 2026-03-28

### Changed

- Extended the `studio` catalog scout into the first real builder slice by allowing staged layer picks with variant choices before launching into Studio.
- Added deep-link transfer of staged layer selections from `studio` into the Dart Studio so handoff now carries real builder state, not only launch/search intent.

## 0.4.8 - 2026-03-28

### Changed

- Added a `studio` catalog scout that can search the LPC catalog, filter by body type and animation, and hand that discovery context off into the Dart Studio.
- Added a shared web-side catalog bridge route so the new frontend can query the existing Dart backend without collapsing the migration boundary.
- Expanded Studio deep-link handling so `catalogSearch` now survives web-to-builder handoff for scouting flows.

## 0.4.7 - 2026-03-28

### Changed

- Added a dedicated `studio` project launcher with template cards and a configurable launch form so new project framing now has a proper home in the web app.
- Removed the duplicated template-launch section from the web project browser, making the launcher the clearer start surface and the browser the clearer saved-work surface.

## 0.4.6 - 2026-03-28

### Changed

- Promoted `studio` further into the role of launch dashboard by sharpening its entry-point messaging around starting, continuing, and directly opening SpriteCraft work.
- Removed the duplicate runtime-health panel from the Dart Studio so runtime status now lives in the web dashboard while the Studio stays focused on live composition, preview, save, and export.

## 0.4.5 - 2026-03-28

### Added

- Added template-driven project starts in `studio`, with direct deep-link handoff into the Dart Studio builder.

### Changed

- The Dart Studio can now accept builder setup via URL parameters for project name, prompt, body type, animation, engine preset, preview mode, and filter defaults.
- This makes `studio` a more natural place to begin a project while keeping the Dart Studio focused on composition and rendering.

## 0.4.4 - 2026-03-28

### Changed

- Removed the remaining editable project metadata controls from the Dart Studio so notes, tags, and snapshot-oriented project management now live in `studio`.
- Kept the Studio focused on live composition, preview, save, and export while the web app becomes the clearer home for saved-project administration.

## 0.4.3 - 2026-03-28

### Changed

- Moved named snapshot creation out of the Dart Studio and into `studio`, where snapshots can now be created directly from saved projects.
- Added web-side saved-project versioning so edited project metadata can be saved as a new history version from the new project browser.
- Clarified the Studio role as the live builder while the web app now owns more of the project-management workflow surface.

## 0.4.2 - 2026-03-28

### Changed

- Removed the legacy history panel from the Dart Studio now that project browsing has moved to `studio`.
- Added a restore handoff flow from `studio` into the Dart Studio using `?restore=<id>` deep links, so the web app can launch saved projects directly into the active builder.

## 0.4.1 - 2026-03-28

### Changed

- Reduced the legacy Dart Studio history panel to quick restore only now that project browsing, duplication, deletion, and project package transfer have moved into `studio`.
- Added explicit messaging in the Studio UI so the migration boundary between the old Studio and the new web app is visible during Phase 3.5 work.

## 0.4.0 - 2026-03-28

### Added

- Introduced `studio`, a parallel Next.js/TypeScript frontend shell for the ongoing Studio migration.
- Added a Kanagawa Wave visual theme for the new web shell, including SpriteCraft branding and favicon support.
- Added live project-browser actions in the web app for history refresh, duplication, deletion, package export, and package import through the existing Dart backend.
- Added dedicated Next.js API bridge routes so the web shell can talk to the Dart backend cleanly through one frontend surface.

### Changed

- Reframed the web migration around the existing Dart backend as the source of truth for SpriteCraft project, history, and render flows.
- Removed auth and local web-backend scaffolding from the active `studio` product path so the migration can stay focused on SpriteCraft features instead of unused platform overhead.
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


