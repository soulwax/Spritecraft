## 0.3.0 - 2026-03-28

### Added

- `GET /health` runtime endpoint for quickly checking Studio assets, LPC submodule paths, Gemini availability, database availability, and export directory readiness.
- Runtime configuration diagnostics for malformed `.env` lines so startup issues are surfaced instead of silently ignored.
- A Studio runtime health panel with refresh support so startup problems are visible in the UI instead of only surfacing as failed requests later.
- Server-side render result caching for repeated preview and export requests using the same layer selection.
- Focused export helper coverage for bundle naming, engine preset files, and zip archive contents.
- Catalog browsing improvements in Studio with category filter chips and grouped result sections for faster asset discovery.

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
