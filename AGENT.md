# SpriteCraft Agent Guide

This repository is `SpriteCraft`, a Dart-first spritesheet generator with:

- a CLI for packing frame folders into spritesheets
- a Dart backend API served by Shelf
- a TypeScript web frontend in `studio`
- Gemini-powered sprite planning and recommendation assistance
- Neon/Postgres-backed history storage
- an LPC asset/definition submodule at `lpc-spritesheet-creator`

Use this file as the primary AI navigation guide for the repo.

## Fast Start

1. Initialize the submodule:
   `git submodule update --init --recursive`
2. Install Dart packages:
   `dart pub get`
3. Optional local env:
   `Copy-Item .env.example .env`
4. Run the full app:
   `dart run bin/spritecraft.dart app`
6. Run tests:
   `dart test`

Important env vars:

- `GEMINI_API_KEY` enables AI planning and web brief generation
- `DATABASE_URL` enables history persistence endpoints

The app also reads a local `.env` file via `RuntimeConfig.load()`.

## Repo Map

- `bin/spritecraft.dart`
  CLI entrypoint. Commands: `pack`, `plan`, `studio`, `app`.
- `lib/spritesheet_creator.dart`
  Public library exports.
- `lib/src/spritesheet_packer.dart`
  Core packer for arbitrary frame folders.
- `lib/src/server/studio_server.dart`
  Shelf server, backend API routes, export bundle generation, and bootstrap.
- `lib/src/config/runtime_config.dart`
  Resolves project paths, `.env`, env vars, submodule directories, export dir.
- `lib/src/ai/gemini_sprite_planner.dart`
  Gemini HTTP integration and response parsing.
- `lib/src/lpc/lpc_catalog.dart`
  Loads LPC JSON definitions from the submodule.
- `lib/src/lpc/lpc_renderer.dart`
  Composes layered LPC sprites from the submodule spritesheets.
- `lib/src/persistence/history_repository.dart`
  Postgres persistence for saved SpriteCraft projects/history.
- `lib/src/models/`
  Shared request/result/domain models.
- `studio/src/app/page.tsx`
  Main web app shell.
- `studio/src/app/_components/`
  Studio builder, project browser, launcher, and workspace UI slices.
- `studio/src/server/spritecraft-backend.ts`
  Web-side typed bridge to the Dart backend API.
- `test/`
  Coverage for packer, catalog loading, renderer behavior, and Gemini parsing.
- `lpc-spritesheet-creator/`
  Git submodule containing LPC source assets, definitions, credits, and upstream tooling.

## Architecture Notes

### 1. CLI vs Web App

There are two main product surfaces:

- `pack`: build a spritesheet from a normal folder of frame PNGs
- `studio`: the primary browser UI for LPC-style layered composition

The Dart server now provides backend APIs only. The primary frontend lives in `studio`.

### 2. LPC Integration

SpriteCraft does not copy LPC assets into `lib/`.

It reads them from the git submodule:

- definitions: `lpc-spritesheet-creator/sheet_definitions`
- image assets: `lpc-spritesheet-creator/spritesheets`

`LpcCatalogLoader` indexes the JSON definitions.
`LpcRenderer` resolves selected layers into a composed PNG and credits list.

### 3. AI Flow

Gemini is used in two places:

- CLI `plan` command
- Backend `POST /api/ai/brief`

If Gemini is unavailable, the web app still works and falls back to local catalog recommendations.

### 4. Persistence

History is optional.

If `DATABASE_URL` is absent:

- Backend still boots
- history endpoints return `503`
- no database connection is created

If present, `HistoryRepository` creates `sprite_history` if needed.

## API Surface

Main backend routes in `lib/src/server/studio_server.dart`:

- `GET /api/bootstrap`
- `GET /api/lpc/catalog`
- `POST /api/lpc/render`
- `POST /api/lpc/export`
- `POST /api/ai/brief`
- `GET /api/history`
- `POST /api/history/save`
- `POST /api/history/restore`
- `GET /api/history/<id>`
- `DELETE /api/history/<id>`

When changing frontend behavior, check the matching `studio` component and the server route.

## Common Change Map

If the task is about:

- CLI arguments or command behavior:
  edit `bin/spritecraft.dart`
- frame packing layout/metadata:
  edit `lib/src/spritesheet_packer.dart`
- Backend API behavior:
  edit `lib/src/server/studio_server.dart`
- env/config/path resolution:
  edit `lib/src/config/runtime_config.dart`
- Gemini prompt/JSON parsing:
  edit `lib/src/ai/gemini_sprite_planner.dart`
- LPC search/indexing:
  edit `lib/src/lpc/lpc_catalog.dart`
- LPC layer composition or credits:
  edit `lib/src/lpc/lpc_renderer.dart`
- saved history schema/queries:
  edit `lib/src/persistence/history_repository.dart`
- web UI:
  edit files in `studio/src/app/` and `studio/src/components/`
- behavior verification:
  add or update tests in `test/`

## Safe Boundaries

- Treat `lpc-spritesheet-creator/` as an upstream dependency first, not the default place to make app changes.
- Do not edit the submodule unless the task explicitly requires modifying upstream LPC assets or metadata.
- Prefer adapting SpriteCraft code to the submodule rather than forking large upstream changes into it.
- Keep generated exports in `build/exports`; do not commit them unless explicitly asked.

## Working Assumptions

- This is a pure Dart project, not Flutter.
- The primary frontend now lives in `studio`.
- The source of truth for current behavior is code, not always `TODO.md`.
- `TODO.md` may lag behind implementation. Verify actual behavior before planning edits.

## Known Project Realities

- `TODO.md` currently references `v0.3.0`, while `pubspec.yaml`, `CHANGELOG.md`, and `bin/spritecraft.dart` still show `0.2.0`.
- The retired Studio HTML used to include items that `TODO.md` still listed, such as favicon wiring, a clear-all control, a selection badge, and a toast container.

Check the code before assuming a TODO item is unfinished.

## Testing and Validation

Preferred validation after changes:

1. `dart test`
2. If Dart files changed: `dart analyze`
3. If web/backend behavior changed: run `dart run bin/spritecraft.dart app` and verify the relevant flow manually

## Production Build and PM2

Use this workflow only in environments that actually require a `pnpm` install/build plus PM2-managed production restarts. Do not apply it by default in Dart-only or non-PM2 environments.

- Run `pnpm i`
- Run `pnpm build`
- If no PM2 process exists with the required app name, run `pnpm pm2:start`
- Otherwise run `pnpm pm2:restart`

Do not guess the PM2 process name. Read the project scripts or deployment config first and use the explicitly configured name for that environment.
If the environment does not define `pnpm` production scripts or PM2 process management, skip this section and use the repo's normal validation and run instructions instead.

The existing tests are small but useful:

- `test/spritesheet_packer_test.dart`
- `test/lpc_catalog_test.dart`
- `test/lpc_renderer_test.dart`
- `test/gemini_sprite_planner_test.dart`

## Notes For Future Agents

- Start by checking whether the submodule is initialized before debugging missing LPC data.
- For missing catalog or render results, inspect `RuntimeConfig` paths first.
- For web UI issues, follow this path:
  `studio` component -> web API route -> `spritecraft-backend.ts` -> `studio_server.dart` -> underlying service/module.
- For export issues, inspect `POST /api/lpc/export` and the `build/exports` output files.
- For history bugs, confirm whether `DATABASE_URL` is present before assuming the route is broken.

