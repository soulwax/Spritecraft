# SpriteCraft Web

This app is the parallel Next.js frontend for SpriteCraft.

It lives alongside the existing Dart Studio and talks to the Dart backend instead
of replacing it all at once.

## Current role

- Next.js + TypeScript frontend shell
- Kanagawa Wave themed UI
- Live backend health dashboard
- Project browser for SpriteCraft history, duplication, deletion, and package import/export
- Uses the Dart backend at `NEXT_PUBLIC_SPRITECRAFT_API_BASE`

The actual sprite rendering, exports, LPC catalog loading, AI brief endpoint, and
history persistence still live in the Dart app.

## Environment

Create `spritecraft-web/.env` with at least:

```env
NEXT_PUBLIC_SPRITECRAFT_API_BASE="http://127.0.0.1:8080"
```

Optional:

- `DATABASE_URL` if we later reintroduce web-owned persistence features
- `GEMINI_API_KEY` for future web-side AI helpers
- old Better Auth variables can remain, but auth is intentionally not part of the
  current product flow

## Running

1. Start the Dart backend:
   `dart run bin/spritecraft.dart studio`
2. Start this web app:
   `pnpm dev`

## Notes

- This app is intentionally migration-first, not feature-complete yet.
- Auth has been removed from the active app surface for now.
- The shared Neon database can be the same one used by the Dart backend.
