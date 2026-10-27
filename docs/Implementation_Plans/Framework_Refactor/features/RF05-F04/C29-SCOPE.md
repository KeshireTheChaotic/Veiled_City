# RF05-F04 C29 — Private world-seed proposal contract

## Objective

Separate the existing data-only private-world-seed proposal schema and instruction text from the mixed native capability module. Publish these values through World public so the GM service consumes the World-owned proposal contract while private seed verification, per-turn capability binding, and native entity establishment remain in their current compatibility/runtime modules.

## Behavioral contract

Preserve exact schema and instruction values and their object/string identities through the compatibility module. The proposal contract grants no execution, disclosure, publication, PC-action, or mechanical authority. The GM request continues to obtain source references only through the existing native `privateSeedPrompt` capability; raw GM hook text and premise content are not added to the writer packet.

## Ownership and files

- Add `bot/src/frameworks/world/private-world-seed-contract.js` for the existing schema and instruction constant.
- Export those values through `bot/src/frameworks/world/public.js`.
- Keep source verification, capability minting, validation, persistence, and entity creation in `bot/src/world-private-seeds.js`; re-export exact contract identities there for compatibility.
- Update `bot/src/gm.js` to import only the schema/instructions through World public and retain runtime capability imports from the compatibility module.
- Add a fresh focused test at `bot/tests/ai-gm-2026-10/rf05-f04-c29.test.mjs`.

## Verification

Test exact compatibility identity and representative closed schema fields, verify the GM's split imports, and confirm the prompt contract contains no raw seed premise. Run the fresh test in the frozen affected-GM union, syntax-check changed JavaScript, and run the RF05 phase-aware architecture checker. No legacy tests, provider, database, network, CI, or production service.

## Exit evidence

Record current SHA, changed modules, framework ownership, exact test/syntax/architecture outcomes and hashes, remaining RF05-F04 assignments, rollback, cost, and release status. This slice does not close RF05-F04 or RF05.
