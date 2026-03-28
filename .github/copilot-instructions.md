# SpriteCraft Copilot Instructions

Use `AGENT.md` at the repo root as the primary project guide.

Repository facts:

- SpriteCraft is a pure Dart spritesheet tool and local web Studio.
- The Studio is static `studio/*` files served by Shelf, not a JS build pipeline.
- LPC data comes from the `lpc-spritesheet-creator` git submodule.
- `GEMINI_API_KEY` enables AI features.
- `DATABASE_URL` enables saved history.

Preferred commands:

- `git submodule update --init --recursive`
- `dart pub get`
- `dart analyze`
- `dart test`
- `dart run bin/spritecraft.dart studio`

Change map:

- CLI: `bin/spritecraft.dart`
- Studio API: `lib/src/server/studio_server.dart`
- Runtime/env paths: `lib/src/config/runtime_config.dart`
- Gemini logic: `lib/src/ai/gemini_sprite_planner.dart`
- LPC catalog/rendering: `lib/src/lpc/`
- Persistence: `lib/src/persistence/history_repository.dart`
- Frontend: `studio/`

Do not edit `lpc-spritesheet-creator/` unless the task explicitly requires upstream asset or definition changes.
