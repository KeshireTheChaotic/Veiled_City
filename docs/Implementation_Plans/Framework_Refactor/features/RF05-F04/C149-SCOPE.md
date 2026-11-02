# RF05-F04 C149 — Character export serializer ownership

## Objective

Move the existing Character export projection, formatting, and file generation
implementation into the Character framework. Export the same functions through
Character's current public entrypoint and retain the root module as a
compatibility re-export for its current consumers.

## Frozen behavior

Preserve every function signature, field allowlist, player and GM-private
audience boundary, database read and argument, export schema, Markdown content,
file naming rule, format selection, DOCX packaging, return shape, and exception.
Keep databases injected by callers. Add no database service, write, migration,
Discord request, or provider call.

## Frozen paths

- `bot/src/character-export.js` (compatibility re-export)
- `bot/src/frameworks/character/character-export.js` (moved implementation)
- `bot/src/frameworks/character/public.js`
- `bot/tests/ai-gm-2026-10/rf05-f04-c149-character-export.test.mjs`
- `C149-SCOPE.md`, `C149-LEDGER.md`, `C149-HASHES.json`,
  `C149-TEST.log`, `C149-SYNTAX.log`, and `C149-ARCHITECTURE.log`
- The exact Character ownership/crosswalk record after shared registry
  coordination; current root compatibility transitions remain active.

## Qualification

The fresh focused regression checks public/root export identity, player-safe
projection and generated JSON/Markdown/DOCX outputs, source database arguments,
input immutability, and the separate GM-private hooks projection. Changed-file
syntax and the RF05 ratchet are recorded once after the source and metadata are
frozen. This move does not migrate the existing root-module callers.
