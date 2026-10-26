# RF05-F04 C23 — World and Intent NPC Director schema bridge

## Objective

Place the existing NPC Director proposal schema at the `intent--world` framework integration boundary. Publish the World action catalogs needed by the adapter, and keep the old simulation schema path as a compatibility re-export.

**2026-10-26 audit amendment:** the old-path re-export requirement is superseded after source verification found only one runtime consumer (`gm.js`) and no executable/configuration reference. This is a static proposal schema, not a saved-state or historical receipt reader. Switch that sole caller, then retire `simulation-schema.js` instead of making a World framework import its integration adapter. Existing World-only schema/prompt exports remain at their already published World API. Four earlier fresh tests that assert the retired source path become historical extraction evidence; they are not rerun or counted as current-path qualification. A new replacement regression must exercise the actual GM packet and all moved schema reference identities. No test files are copied, deleted or modified.

## Behavioral contract

Preserve the exact schema fields, order, required fields, enum values, and object identity. Do not change NPC autonomy, action eligibility, resources, mechanics, or effect resolution. The adapter composes existing World and Intent contracts only; it makes no decisions.

## Ownership

- World owns `action-catalog.js` and publishes the existing action and major-impact lists.
- The `intent--world` adapter owns `npcDirectorSchema` and imports only the two framework public APIs.
- `simulation.js` imports and re-exports the unchanged World catalog values.
- Retire `simulation-schema.js` after its sole live caller switches; preserve all actual saved-receipt readers and the World public contracts.
- `gm.js` imports the integration schema from the bridge.
- Fresh test: `bot/tests/ai-gm-2026-10/rf05-f04-c23.test.mjs`.

## Verification

Freeze only the new C23 changed-code tests for actual schema composition, GM structured request, identical in-flight request sharing, refusal/error request multiplicity and no native mutation. Syntax-check changed JS/MJS and run RF04/RF05 architecture ratchets. Preserve prior tests at their recorded bytes; a final initiative union must select source-valid current regressions and record replaced obsolete-reader cases. No inherited suites, live provider, network, production data, CI, or services.

## Exit evidence

Record exact hashes, test and syntax results, architecture output, transition accounting, rollback, cost, and release status. This does not complete RF05-F04 or RF05.
