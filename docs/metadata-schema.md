# SpriteCraft Metadata Schemas

SpriteCraft treats its emitted metadata as a stable contract.

Current stable schema identifiers:

- `spritecraft.spritesheet` version `1`
- `spritecraft.render` version `2`
- `spritecraft.project` version `2`

These identifiers and versions are defined in [metadata_schema.dart](/d:/Workspace/Dart/Spritesheet-Creator/lib/src/models/metadata_schema.dart). Version bumps should happen only when the emitted JSON contract changes in a way that consumers must understand explicitly.

## `spritecraft.spritesheet` v1

Used by the CLI `pack` flow for frame-folder spritesheets.

Top-level fields:

- `schema`
- `image`
- `layout`
- `metadataPath`
- `animations`
- `frames`

`schema`:

- `name`: `spritecraft.spritesheet`
- `version`: `1`

`image`:

- `path`
- `width`
- `height`

`layout`:

- `mode`
- `tileWidth`
- `tileHeight`
- `columns`
- `rows`
- `frameCount`

Each `animations[]` entry includes:

- `name`
- `loop`
- `frameIndices`
- `totalDurationMs`

Each `frames[]` entry includes:

- `name`
- `sourcePath`
- `index`
- `column`
- `row`
- `tileX`
- `tileY`
- `x`
- `y`
- `width`
- `height`
- `tileWidth`
- `tileHeight`
- `offsetX`
- `offsetY`
- `sourceWidth`
- `sourceHeight`
- `durationMs`
- `pivotX`
- `pivotY`
- `tags`

## `spritecraft.render` v2

Used by layered LPC render preview/export payloads.

Top-level fields:

- `schema`
- `image`
- `layout`
- `content`
- `layers`
- `credits`

`schema`:

- `name`: `spritecraft.render`
- `version`: `2`

`image`:

- `path`
- `width`
- `height`

`layout`:

- `mode`
- `frameCount`
- `columns`
- `rows`
- `tileWidth`
- `tileHeight`

`content`:

- `projectSchemaVersion`
- `bodyType`
- `animation`
- `prompt`
- `selections`

`layers[]` are the resolved used layers for the render result.

`credits[]` are the resolved LPC credit records for the render result.

## `spritecraft.project` v2

Used for saved project/history records and project package export/import.

Top-level fields:

- `schema`
- `id`
- `createdAt`
- `updatedAt`
- `bodyType`
- `animation`
- `prompt`
- `projectName`
- `notes`
- `enginePreset`
- `tags`
- `selections`
- `renderSettings`
- `exportSettings`
- `promptHistory`
- `exportHistory`
- `usedLayers`
- `credits`

`schema`:

- `name`: `spritecraft.project`
- `version`: `2`

## Stability Policy

- Adding a new schema name requires a new documented section here.
- Changing the meaning or required presence of an existing field requires a schema version bump.
- Older project/render payloads should continue going through migration helpers where practical.
- Consumers should always branch on `schema.name` and `schema.version` instead of assuming one fixed payload shape forever.
