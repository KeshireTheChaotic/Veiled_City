# RF05-F04 C148 — Character narrative package ownership

## Objective

Move the implementation of the Character narrative reader, context projection,
and export package into the Character framework. Publish the existing helpers
through Character's current public entrypoint and preserve the legacy root path
as a compatibility re-export for current callers.

## Frozen behavior

Keep the existing database calls and arguments, player and GM-private scopes,
scaffold text, filename and archive paths, ZIP bytes' contents, archive name,
context filtering and truncation, return shapes, and exceptions unchanged. The
database remains injected by callers; no persistence service, write, migration,
Discord interaction, or provider call is added.

## Frozen paths

- `bot/src/character-narrative.js` (compatibility re-export)
- `bot/src/frameworks/character/character-narrative.js` (moved implementation)
- `bot/src/frameworks/character/public.js`
- `bot/tests/ai-gm-2026-10/rf05-f04-c148-character-narrative.test.mjs`
- `C148-SCOPE.md`, `C148-LEDGER.md`, `C148-HASHES.json`,
  `C148-TEST.log`, `C148-SYNTAX.log`, and `C148-ARCHITECTURE.log`
- The exact Character ownership/crosswalk record after shared manifest
  coordination; existing compatibility transitions remain active.

## Qualification

The focused regression checks public and compatibility export identity,
player/GM-private archive paths and contents, scaffold behavior, empty reads,
context filtering, and truncation. Changed-file syntax checks and the RF05
ratchet are recorded once after the source and metadata are frozen. The root
path remains a compatibility facade for existing callers; this slice does not
claim that those callers have migrated away from it.
