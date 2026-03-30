# SpriteCraft Backup And Recovery

SpriteCraft now defines backup and recovery behavior around two durable outputs:

- export bundles and companion files
- project history package exports/imports

## Recovery directory

SpriteCraft writes recovery logs under:

`build/recovery`

Current log files:

- `build/recovery/export-recovery-log.json`
- `build/recovery/history-recovery-log.json`

These files are append-only recovery indexes capped to the most recent 200 records each.

## Export recovery behavior

Whenever SpriteCraft completes an export bundle, it records:

- when the export was written
- the project name when available
- the base export name
- the engine preset used
- primary image path
- primary metadata path
- bundle zip path
- extra companion paths
- batch job details when the export was multi-animation or multi-variant

Use `export-recovery-log.json` to recover the latest known good bundle and its companion files if the UI state was lost after export.

## History package recovery behavior

Whenever SpriteCraft exports or imports a `.spritecraft-project.json` package, it records:

- when the operation happened
- whether it was an `export` or `import`
- the resulting history ID when available
- the project name when available
- the package file path

Use `history-recovery-log.json` to find the latest package path for a saved project and re-import it through the history package workflow.

## Database-off behavior

If `DATABASE_URL` is not configured:

- live history persistence remains unavailable
- export recovery logs still work
- project package recovery logs only exist for package operations that actually run

SpriteCraft should still be recoverable through export artifacts and package files on disk even without Postgres.

## Recommended restore flow

1. Check `build/recovery/export-recovery-log.json` for the latest export bundle and companion metadata.
2. Check `build/recovery/history-recovery-log.json` for the latest project package path if you need to restore a saved project.
3. Re-import the `.spritecraft-project.json` package through the history import flow when project state needs to be reconstructed.
4. If only the final art is needed, use the bundle zip plus the primary metadata JSON from the export recovery log.
