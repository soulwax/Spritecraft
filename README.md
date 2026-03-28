# SpriteCraft

Pure Dart tooling for building spritesheets, now with a browser-based Studio that borrows the strongest ideas from LPC while keeping the actual LPC project as a git submodule dependency.

## What is in here

- A pure Dart CLI for packing arbitrary image frames into spritesheets
- A local Studio server with a modern GUI
- LPC catalog loading and layered sprite composition from `./lpc-spritesheet-creator`
- Gemini-assisted sprite briefs and local recommendation search
- Neon/Postgres-backed history for saved sprite projects
- Structured metadata JSON for every spritesheet export and Studio render

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

## Run the Studio

```powershell
dart run bin/spritecraft.dart studio
```

Options:

```powershell
dart run bin/spritecraft.dart studio --host 127.0.0.1 --port 8080 --no-open
```

What the Studio does:

- searches LPC layer definitions from the submodule
- composes layered sprite previews from LPC spritesheet assets
- asks Gemini for a structured sprite brief
- saves project history to Neon so a look can be reconstructed later
- returns render metadata JSON that describes image size, layout mode, selections, layers, and credits
- exports a matched PNG and JSON pair to `build/exports`
- builds a zip bundle for every Studio export
- can emit Godot and Unity companion preset files during export

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
- `--port`: port to serve the Studio on, default `8080`
- `--open`: open the Studio in the default browser after startup
- `--no-open`: keep the server running without opening a browser

Useful examples:

```powershell
# Show CLI version
dart run bin/spritecraft.dart --version

# Start Studio without opening a browser tab
dart run bin/spritecraft.dart studio --no-open

# Start Studio on another port
dart run bin/spritecraft.dart studio --port 9090

# Pack a folder with fixed tile sizing
dart run bin/spritecraft.dart pack `
  --input .\frames\walk `
  --output .\build\walk.png `
  --metadata .\build\walk.json `
  --tile-width 64 `
  --tile-height 64 `
  --padding 2

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
- per-frame source path, grid position, tile bounds, actual content bounds, and offsets

Studio export naming is now project-friendly by default:

- prefers the explicit project name from the UI
- otherwise falls back to the prompt
- appends a timestamp so exports stay unique

## Ask Gemini for a sprite plan

```powershell
dart run bin/spritecraft.dart plan `
  --prompt "8-frame pixel-art slime idle animation for a forest biome" `
  --frame-count 8 `
  --style "pixel art, readable silhouette, game-ready"
```

## Current scope

The Studio intentionally takes the best reusable parts from the LPC project first:

- the layer definition corpus
- the spritesheet asset library
- the credit metadata model

It does not attempt to port the full upstream UI one-to-one. The goal here is a cleaner Dart-first toolchain with a smarter workflow and room for our own product direction.
