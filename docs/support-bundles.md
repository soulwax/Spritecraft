# Support Bundles

SpriteCraft can now export a support bundle for debugging local user issues.

The support bundle is a zip archive written under:

`build/support`

## What it includes

- `manifest.json`
- `bootstrap.json`
- `health.json`
- recent structured log files from `build/logs`
- recovery indexes from `build/recovery`

## What it is for

Use a support bundle when:

- export jobs fail on a user machine
- the backend starts with warnings or partial capability loss
- AI or history behavior works differently across environments
- you need a stable snapshot of local runtime diagnostics without screen sharing

## What it does not include

The bundle is intentionally scoped to diagnostics artifacts.

It does not automatically include:

- full project history contents
- database dumps
- `.env` secrets
- raw LPC source assets

## Studio flow

Open the Settings page and use the support bundle export action.

Optionally add a short note describing what the user saw before exporting.

The resulting zip path is shown directly in Studio after export.
