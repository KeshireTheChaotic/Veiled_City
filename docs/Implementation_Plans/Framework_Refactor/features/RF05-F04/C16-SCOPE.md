# RF05-F04 C16 — Narrative interpretation contract public API

## Objective

Move the existing read-only narrative interpretation JSON schema and its unchanged instruction contract into Narrative-owned contract modules, publish them through Narrative public, and have the application GM obtain those two values through that public API. Keep source capture, visibility checks, entity resolution, persistence, and validation in the existing compatibility module for this slice.

## Behavioral and ownership contract

Preserve every schema field, limit, enum, instruction character, and object identity exposed by the root compatibility module. This is a source-ownership/API change only. Interpretation remains read-only meaning; it does not authorize PC movement, consent, knowledge, access, or canon. Do not alter privacy, audience, mechanics, validation, prompts, or narrative freedom. The root `narrative-context.js` remains available and re-exports the same values while retaining the existing runtime functions.

## Files and verification

Add Narrative-owned `interpretation-schema.js` and `interpretation-contract.js`; export both values from `frameworks/narrative/public.js`; route the GM imports for `interpretationSchema` and `CONTEXT_CONTRACT` through that public API while retaining imports of runtime validators/context from the root compatibility module. Add a new fresh test at `bot/tests/ai-gm-2026-10/rf05-f04-c16.test.mjs` covering value identity, exact schema/contract preservation, and GM public import wiring. Run only this fresh test, syntax checks for changed JS/MJS files, and the RF05 phase-aware architecture ratchet in one blocking invocation per test batch. No inherited tests, providers, network, production data, CI, or services.

## Exit evidence

Record exact base/result SHA, file and test hashes, test/syntax/architecture outcomes, changed-path findings, remaining transition assignments, rollback, external effects/cost, and release qualification. Because the root compatibility module remains for runtime functions, do not retire a transition unless the checker proves the exact source edge is gone and the frozen transition record matches it. This slice does not complete RF05-F04 or RF05.
