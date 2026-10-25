# RF05-F04 C08 — World minor-NPC proposal schema public API

## Objective

Extract the existing data-only `minorNpcSchema` from the mixed World-owned `city-depth.js` module into `frameworks/world/minor-npc-schema.js`, expose it through the World public API, and change `gm.js` to import that public contract. Keep `city-depth.js` as the owner of its mutation and persistence behavior and preserve its old schema export as a compatibility path.

## Behavioral and authority contract

Preserve the exact schema fields, validation shape, and object identity across the World API and compatibility export. This is a proposal-shape contract only: it does not create NPCs, authorize knowledge or action, or change World simulation. Do not change any Daggerheart mechanic, player agency, privacy, continuity, creativity, database behavior, or receipts.

Retire only transition `41a184d8e346809f13aa4feaf6a4c65501a4b20b1c040844046b09f4f857e886` after the GM imports the World public API. Preserve its full original record.

## Verification

Create a new test at `bot/tests/ai-gm-2026-10/rf05-f04-c08.test.mjs`. Load the real `GMService`; verify public and compatibility exports are the same object, validate the unchanged closed schema fields, and confirm `gm.js` imports only through World public API. Because `gm.js` changes, rerun the affected fresh current-GM test union in one frozen, blocking launch. Syntax-check changed JavaScript and run the RF05 architecture ratchet. Never run inherited suites, broad validation, providers, network, production data, or poll a test process.

## Exit evidence

Record exact source/test hashes, actual terminal outcomes, transition integrity, architecture counts and changed-path findings, remaining F04 assignments, costs, rollback, and release status. This scoped slice does not complete RF05-F04 or RF05.
