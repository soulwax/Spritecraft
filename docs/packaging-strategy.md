# Packaging Strategy

SpriteCraft's primary product shape is a Windows-first local app built around the existing Dart-first backend and the `studio` web UI.

## Product shape decision

Primary shape:

- a local Windows app experience that launches and manages the existing Dart backend plus the prebuilt `studio` frontend on the user's machine
- delivered first as a packaged local web app workflow, not as a full rewrite into a separate desktop-native UI stack

Secondary shape:

- the same backend and frontend should remain runnable in plain developer mode from the repository
- a browser-based local workflow remains supported for contributors and advanced users

Not the primary shape right now:

- a second independently-owned desktop UI codebase
- a rewrite of backend behavior into Next.js server routes
- a mandatory cloud-hosted SpriteCraft service

## Why this fits SpriteCraft

- Dart already owns rendering, export generation, LPC catalog loading, AI orchestration, and persistence behavior.
- `studio` already acts as the main user-facing surface.
- The current architecture is already close to a desktop-grade local app: a local backend process, a local UI, local exports, optional local `.env`, and optional Postgres/Gemini integration.
- Packaging the existing split is much lower risk than introducing a second app runtime before Phase 8 is complete.

## Windows-first distribution target

Phase 8 should optimize for this install/run story on Windows:

1. User installs SpriteCraft.
2. SpriteCraft launches a local packaged `studio` build and starts the Dart backend automatically.
3. The app stores exports, cache, recovery logs, and user settings in app-owned local directories.
4. Missing optional integrations such as Gemini or Postgres are surfaced as capability warnings, not startup blockers.

## Implementation direction

Preferred near-term packaging path:

- ship the Dart backend as the authoritative local runtime
- ship a production build of `studio`
- add a Windows launcher that starts the backend and serves or opens the prebuilt web UI locally
- keep CLI workflows available alongside the packaged app

This means the next distribution work should focus on:

- bundling a prebuilt `studio` app with the Dart runtime entrypoint
- defining app-local directories for settings, logs, cache, exports, and recovery
- adding first-run checks for submodule-derived runtime assets and optional env configuration
- producing a Windows installer or zip-based release layout around the existing runtime split

## Non-goals for the current phase

- no Electron/Tauri migration by default
- no duplication of LPC/render/export logic into the frontend
- no removal of the existing CLI and local-dev workflow
- no assumption that Postgres or Gemini must exist in packaged installs

## Follow-on Phase 8 items

With this decision made, the remaining Phase 8 work should build on it in order:

1. Add a proper Windows distribution layout around the Dart backend plus prebuilt `studio`.
2. Bundle runtime assets and directories cleanly for installed use while preserving repo/submodule workflows for development.
3. Add first-run onboarding and settings for local directories, AI, and persistence options.
4. Add crash-safe support logging and user-facing release packaging.
