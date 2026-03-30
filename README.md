# SpriteCraft

Pure Dart tooling for building spritesheets, now with a Next.js-based SpriteCraft Studio app in `studio` and a Dart backend API, while keeping the actual LPC project as a git submodule dependency.

## What is in here

- A pure Dart CLI for packing arbitrary image frames into spritesheets
- A Dart backend API used by `studio`
- A modern TypeScript web frontend in `studio`
- LPC catalog loading and layered sprite composition from `./lpc-spritesheet-creator`
- Gemini-assisted sprite briefs with coherent build paths, category suggestions, candidate builds, prompt memory, naming suggestions, build checks, style helpers, and local recommendation search
- Neon/Postgres-backed history for saved sprite projects
- Structured metadata JSON for every spritesheet export and web-rendered preview/export

## LPC dependency

`lpc-spritesheet-creator` is treated as a submodule, not copied into the app.

Fresh clone setup:

```powershell
git clone <your-repo-url>
cd SpriteCraft
git submodule update --init --recursive
dart pub get
```

If the submodule is already present but not initialized on another machine:

```powershell
git submodule sync --recursive
git submodule update --init --recursive
```

## Runtime config

The app reads runtime secrets from environment variables and also supports a local `.env` file.

Example:

```powershell
Copy-Item .env.example .env
```

Supported keys:

- `GEMINI_API_KEY`
- `DATABASE_URL`

## Run SpriteCraft

Start the full app from Dart:

```powershell
dart run bin/spritecraft.dart app
```

Or start just the backend:

```powershell
dart run bin/spritecraft.dart studio
```

Combined app options:

```powershell
dart run bin/spritecraft.dart app --host 127.0.0.1 --port 8080 --web-port 3000
```

Backend-only options:

```powershell
dart run bin/spritecraft.dart studio --host 127.0.0.1 --port 8080 --no-open
```

What the backend + web app do together:

- searches LPC layer definitions from the submodule
- composes layered sprite previews from LPC spritesheet assets
- asks Gemini for a structured sprite brief with ordered build steps, category-level picks, candidate builds, prompt-memory consistency cues, naming suggestions, build checks, style helpers, and matched layer recommendations
- saves project history to Neon so a look can be reconstructed later
- returns render metadata JSON that describes image size, layout mode, selections, layers, and credits
- gives the Studio builder frame-aware preview tools such as background switching, zoom, onion-skin stepping, crop guides, visual pivot placement, non-destructive mute/solo layer control, animation strip playback with FPS control, per-frame snapshot diffing, and custom local PNG overlays above the LPC stack
- exports matched PNG, JSON, zip bundles, and engine companion files such as native Godot `SpriteFrames` `.tres` resources, Unity importer-ready slicing metadata, and Aseprite/generic JSON companions
- powers the full `studio` builder workflow

## Command reference

General:

```powershell
dart run bin/spritecraft.dart --help
dart run bin/spritecraft.dart --version
```

`pack`:

```powershell
dart run bin/spritecraft.dart pack `
  --input <frames-directory> `
  --output <sheet-png-path> `
  --metadata <metadata-json-path> `
  [--columns <count>] `
  [--padding <pixels>] `
  [--tile-width <pixels>] `
  [--tile-height <pixels>] `
  [--animation-name <name>] `
  [--frame-duration-ms <ms>] `
  [--pivot-x <pixels>] `
  [--pivot-y <pixels>] `
  [--layout <uniform-grid|atlas>] `
  [--trim-transparent] `
  [--power-of-two]
```

`pack` options:

- `--input`, `-i`: directory containing source frames
- `--output`, `-o`: output PNG path for the packed sheet
- `--metadata`, `-m`: output JSON path for metadata
- `--columns`: fixed number of columns to use
- `--padding`: pixels between frames
- `--tile-width`: force every tile to this width
- `--tile-height`: force every tile to this height
- `--animation-name`: animation sequence name to write into metadata
- `--frame-duration-ms`: per-frame duration in milliseconds for metadata
- `--pivot-x`: per-frame pivot X in pixels for metadata
- `--pivot-y`: per-frame pivot Y in pixels for metadata
- `--layout`: output layout mode, either `uniform-grid` or `atlas`
- `--trim-transparent`: trim transparent bounds before packing, especially useful with `atlas`
- `--power-of-two`: expand the sheet dimensions to the next power of two

`plan`:

```powershell
dart run bin/spritecraft.dart plan `
  --prompt "<describe the sprite or animation>" `
  [--frame-count <count>] `
  [--style "<style hint>"] `
  [--model <gemini-model>]
```

`plan` options:

- `--prompt`, `-p`: sprite or animation prompt
- `--frame-count`: optional animation frame target
- `--style`: optional style hint
- `--model`: Gemini model to use, default `gemini-2.5-flash`

`studio`:

```powershell
dart run bin/spritecraft.dart studio `
  [--host <host>] `
  [--port <port>] `
  [--open]
  [--no-open]
```

`studio` options:

- `--host`: host interface to bind, default `127.0.0.1`
- `--port`: port to serve the backend API on, default `8080`
- `--open`: open the backend URL after startup
- `--no-open`: keep the backend running without opening a browser

`app`:

```powershell
dart run bin/spritecraft.dart app `
  [--host <host>] `
  [--port <port>] `
  [--web-port <port>] `
  [--web-dir <path>] `
  [--package-manager <auto|pnpm|npm|yarn|bun>] `
  [--open]
  [--no-open]
```

`app` options:

- `--host`: backend host interface, default `127.0.0.1`
- `--port`: backend API port, default `8080`
- `--web-port`: `studio` dev port, default `3000`
- `--web-dir`: path to the web app, default `studio`
- `--package-manager`: package manager to use for the web app, default `auto`
- `--open`: open the web app after both services are ready
- `--no-open`: keep both services running without opening a browser

Useful examples:

```powershell
# Show CLI version
dart run bin/spritecraft.dart --version

# Start the full app with backend + web together
dart run bin/spritecraft.dart app

# Start the full app on custom ports without opening the browser
dart run bin/spritecraft.dart app --port 9090 --web-port 3100 --no-open

# Start the backend without opening a browser tab
dart run bin/spritecraft.dart studio --no-open

# Start the backend on another port
dart run bin/spritecraft.dart studio --port 9090

# Pack a folder with fixed tile sizing
dart run bin/spritecraft.dart pack `
  --input .\frames\walk `
  --output .\build\walk.png `
  --metadata .\build\walk.json `
  --tile-width 64 `
  --tile-height 64 `
  --animation-name walk `
  --frame-duration-ms 80 `
  --pivot-x 32 `
  --pivot-y 48 `
  --padding 2

# Pack a tighter atlas with transparent trimming
dart run bin/spritecraft.dart pack `
  --input .\frames\slash `
  --output .\build\slash-atlas.png `
  --metadata .\build\slash-atlas.json `
  --layout atlas `
  --trim-transparent `
  --padding 2 `
  --animation-name slash `
  --frame-duration-ms 80

# Ask Gemini for a production-style plan
dart run bin/spritecraft.dart plan `
  --prompt "6-frame rogue attack animation" `
  --frame-count 6 `
  --style "pixel art, top-down RPG, readable silhouette"
```

## Pack a normal frame folder

```powershell
dart run bin/spritecraft.dart pack `
  --input assets\frames\hero_idle `
  --output build\hero_idle.png `
  --metadata build\hero_idle.json `
  --columns 4 `
  --padding 2 `
  --power-of-two
```

The generated JSON is meant to be reconstruction-grade metadata:

- image path and exact output dimensions
- layout mode, tile size, columns, rows, and frame count
- atlas mode for tighter packed output when requested
- explicit animation sequences with total timing
- per-frame source path, grid position, tile bounds, actual content bounds, offsets, timing, pivots, and tags

Export naming is now project-friendly by default:

- prefers the explicit project name from the UI
- otherwise falls back to the prompt
- appends a timestamp so exports stay unique

SpriteCraft Studio exports also support:

- filename styles like `kebab-case`, `snake_case`, `camelCase`, and `PascalCase`
- optional custom export stems and frame-name prefixes
- transparent-bound trimming and margin padding
- spacing and pivot overrides for engine companion metadata
- batch export across multiple animations and saved workspace variants in one bundle
- automatic `credits.json`, `CREDITS.md`, and `LICENSES.txt` companions for shipping and internal tracking

## Ask Gemini for a sprite plan

```powershell
dart run bin/spritecraft.dart plan `
  --prompt "8-frame pixel-art slime idle animation for a forest biome" `
  --frame-count 8 `
  --style "pixel art, readable silhouette, game-ready"
```

## Current scope

SpriteCraft Studio intentionally takes the best reusable parts from the LPC project first:

- the layer definition corpus
- the spritesheet asset library
- the credit metadata model

It does not attempt to port the full upstream UI one-to-one. The goal here is a cleaner Dart-first backend plus a smarter web workflow with room for our own product direction.

## Metadata Contract

SpriteCraft now treats its emitted metadata schemas as stable, documented contracts.

See [metadata-schema.md](/d:/Workspace/Dart/Spritesheet-Creator/docs/metadata-schema.md) for:

- `spritecraft.spritesheet` v1
- `spritecraft.render` v4
- `spritecraft.project` v2

If a consumer depends on SpriteCraft JSON output, it should branch on `schema.name` and `schema.version` rather than assuming an undocumented payload shape.


