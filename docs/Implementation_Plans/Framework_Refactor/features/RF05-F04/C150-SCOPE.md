# RF05-F04 C150 — Character creation vocabulary ownership

## Objective

Move the existing Character creation vocabulary and concept-draft validation
adapter into the Character framework. Keep the existing
`characterCreationConsumer` port, expose the current functions through
Character public, and preserve the root module as a compatibility re-export
for existing callers.

## Frozen behavior

Preserve the exact class/domain tables, custom-domain set, trait and advancement
lists, class normalization, validation order, native consumer calls, hook
classification rule, result keys, and exceptions. Do not change Native
validation policy or Application composition. No database, write, migration,
Discord, or provider behavior is added.

## Frozen paths

- `bot/src/character-system.js` (compatibility re-export)
- `bot/src/frameworks/character/character-system.js` (moved implementation)
- `bot/src/frameworks/character/public.js`
- `bot/tests/ai-gm-2026-10/rf05-f04-c150-character-system.test.mjs`
- `C150-SCOPE.md`, `C150-LEDGER.md`, `C150-HASHES.json`,
  `C150-TEST.log`, `C150-SYNTAX.log`, and `C150-ARCHITECTURE.log`
- The exact Character ownership row after shared registry coordination; the
  crosswalk's existing RF06-F07 Native-source adoption deferral remains
  unchanged, as do the root/import compatibility transitions.

## Qualification

The fresh test checks public/root export identity, vocabulary values and source
capability identity, then uses a stub Native service to verify the existing
validation call order and invalid hook-classification result. It does not
qualify Daggerheart's production creation policy. Changed-file syntax and the
RF05 ratchet are recorded once after source and metadata are frozen.
