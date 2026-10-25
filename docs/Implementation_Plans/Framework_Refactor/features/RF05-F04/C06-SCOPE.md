# RF05-F04 C06 — Narrative schema public API

## Objective

Move the self-contained, data-only `gm-fiction-schema.js` implementation into the Narrative framework, expose its existing named contracts from Narrative's public API, and change `gm.js` to import `nativeOutcomeSchema` and `narrativeRequestSchema` through that API. Retain the old root path as an explicit compatibility re-export for all other consumers.

## Behavioral and ownership contract

Preserve every schema object, enum, array, and exported identity. This is only an ownership/import change. These schemas describe model proposals; they do not select audience, authorize PC action, determine a Daggerheart outcome, or apply an effect. Do not change prompts, validation rules, native authority, saved readers, or other consumers.

Retire only transition `eba1e3e1be87a71d8f22b88a6c02da7e495f5ce53f41f75c699bab80934481b1` after confirming the GM no longer imports the compatibility path. Keep the original record in the C06 retired-transition evidence and preserve the baseline and all other records.

## Verification

Create a fresh test at `bot/tests/ai-gm-2026-10/rf05-f04-c06.test.mjs`. Import the real `GMService`, compare all 19 public exports with the compatibility re-exports by identity, verify the actual GM source imports only its two schema names from Narrative public API, and check representative closed schema constraints. Syntax-check only changed JavaScript and run this regression once in a frozen blocking affected-GM test union, including previously passing fresh tests whose `GMService` production dependency changes. Run the RF05 architecture ratchet once after source and exact-transition updates. Do not invoke legacy tests, providers, network, production databases, broad validation, or polling.

## Exit evidence

Record exact source/test hashes, immutable move hash, fresh-test and syntax terminal outcomes, architecture outcome, remaining RF05-F04 entries, costs, limits, rollback, and release status. This slice does not complete RF05-F04 or the RF05 phase.
