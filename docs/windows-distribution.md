# Windows Distribution

SpriteCraft's first Windows distribution target is a portable local bundle.

This keeps the current architecture intact:

- the Dart backend remains the runtime owner
- the prebuilt `studio` app remains the primary UI
- the CLI stays available beside the packaged app

## First release target

Phase 8 should ship a portable zip bundle before attempting a full installer.

Why this comes first:

- SpriteCraft still resolves runtime assets relative to the working directory
- exports, cache, and recovery logs still default to `build/` under the runtime root
- a portable bundle lets us validate the packaging flow before adding app-data relocation and installer behavior

That means the first Windows package should be treated as:

- unzip to a writable location
- launch with the provided SpriteCraft Studio launcher
- keep runtime-generated data inside the extracted bundle for now

## Bundle layout

The Windows bundle produced by `tool/build_windows_portable_bundle.ps1` is expected to look like this:

```text
SpriteCraft-win-x64/
  SpriteCraft Studio.cmd
  SpriteCraft Studio.ps1
  spritecraft-release.json
  runtime/
    backend/
      spritecraft.exe
    assets/
      lpc-spritesheet-creator/
        sheet_definitions/
        spritesheets/
        CREDITS.csv
    node/
      node.exe
    web/
      server.js
      .next/
      public/
      package.json
  .env.example
  README.md
  docs/
```

## Build inputs

The portable bundle expects:

- a working Dart toolchain
- a local Node runtime directory containing `node.exe`
- a production `studio` build with Next standalone output
- the checked-out `lpc-spritesheet-creator` submodule as a build input

## Build command

```powershell
pwsh -File .\tool\build_windows_portable_bundle.ps1 `
  -NodeRuntimeDir C:\path\to\node-runtime
```

Optional parameters:

- `-OutputDir` to override the release destination
- `-Version` to stamp a specific release version
- `-PackageManager` to override the Studio package manager, default `pnpm`
- `-BackendPort` and `-WebPort` to change the packaged local ports

## Launch behavior

The packaged launcher:

1. starts the compiled Dart backend with `studio --no-open`
2. points the backend at `runtime/assets/lpc-spritesheet-creator` through `SPRITECRAFT_LPC_ROOT`
3. starts the packaged standalone Next server with the bundled `node.exe`
4. opens the local SpriteCraft Studio URL in the default browser

## Follow-on work

This portable strategy intentionally leaves a few installer-grade concerns for later Phase 8 items:

- move writable runtime data to `%LOCALAPPDATA%\SpriteCraft`
- add first-run onboarding and settings
- carry the shared SpriteCraft icon/brand assets into installer-grade shortcuts and launchers
- add installer-specific shortcuts and uninstall behavior
- add crash/support bundle capture outside the install directory
