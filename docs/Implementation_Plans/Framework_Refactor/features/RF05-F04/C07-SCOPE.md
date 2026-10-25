# RF05-F04 C07 — Narrative GM-world contract public API

## Objective

Separate the existing closed `gmWorldPartsSchema` and `GM_WORLD_NARRATIVE_PROMPT` from the mixed GM-world renderer module. Put the data-only contract in the Narrative framework, publish these two existing values through Narrative's public API, and switch `gm.js` to that API. The root module remains the native renderer and compatibility reader for existing callers.

## Behavioral and authority contract

Preserve the schema object, nested schema identities, prompt bytes, dialogue/atmosphere catalogs, and renderer behavior. This change does not alter the authorized GM-owned fiction scope, player agency, audience selection, native world receipts, narrative freedom, or any Daggerheart rule. Keep renderer validation, source checks, writes, and receipt behavior in their current location.

Retire only transition `cc8076bdca29df6585e651bdf86e712bcfbf8fbf7bbc52f37b0a30f248a87f7d` after the GM import uses the Narrative public API. Preserve its exact record and leave publication's renderer imports unchanged.

## Verification

Create a fresh regression at `bot/tests/ai-gm-2026-10/rf05-f04-c07.test.mjs`. Import the real `GMService`, assert the public and compatibility contract values retain identity, verify the original prompt and closed schema shape, and check the GM uses only the Narrative public API. Run syntax checks for changed JavaScript. Freeze one blocking affected-GM regression batch that includes previously passing fresh tests whose associated `gm.js` module changes; run it once. Then run the RF05 architecture ratchet. No legacy tests, broad validation, providers, network, production data, or polling.

## Exit evidence

Record exact source/test hashes, actual terminal outcomes, architecture results and changed-path findings, remaining RF05-F04 entries, costs, rollback, and release status. This does not complete RF05-F04 or RF05.
