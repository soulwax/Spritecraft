# SpriteCraft Studio

This app is the parallel Next.js frontend for SpriteCraft.

It is the primary SpriteCraft UI and talks to the Dart backend API
of replacing it all at once.

## Current role

- Next.js + TypeScript frontend shell
- Kanagawa Wave themed UI
- SpriteCraft icon and wordmark system shared with the Studio shell and favicon
- Live backend health dashboard
- Project browser for SpriteCraft history, duplication, deletion, and package import/export
- Uses the Dart backend at `NEXT_PUBLIC_SPRITECRAFT_API_BASE`

The actual sprite rendering, exports, LPC catalog loading, AI brief endpoint, and
history persistence still live in the Dart app.

## Environment

Create `studio/.env` with:

```env
NEXT_PUBLIC_SPRITECRAFT_API_BASE="http://127.0.0.1:8080"
```

## Running

1. Start the Dart backend:
   `dart run bin/spritecraft.dart studio`
2. Start this web app:
   `pnpm dev`

## Notes

- This app is intentionally migration-first, not feature-complete yet.
- Auth is not part of the active app surface.
- The web app does not need its own database right now; project/history data comes from the Dart backend.


