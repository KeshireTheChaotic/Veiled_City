# RF05-F04 C22 — Narrative material-claim schema public contract

## Objective

Publish the existing data-only `materialClaimSchema` from Narrative public and route the GM's schema use through that API.

## Boundaries

Move only the schema declaration and its pure field-building helpers. Keep `validateNarrativeClaims`, `validateCanonAnnotations`, and all evidence, audience, disclosure, and mutation checks in `narrative-integrity.js`. Preserve exact schema shape, field order, and compatibility object identity. No gameplay behavior or narrative-output policy may change.

## Files and ownership

- Narrative owns `frameworks/narrative/material-claim-schema.js` and its public export.
- `narrative-integrity.js` retains validation and re-exports the schema for compatibility.
- `gm.js` imports the schema from Narrative public and continues importing validation from the compatibility module.
- Fresh regression: `bot/tests/ai-gm-2026-10/rf05-f04-c22.test.mjs`.

## Verification

Freeze C16-C22 and currently affected GM-dependent fresh tests in one blocking batch. Syntax-check changed JS/MJS and run the RF05 phase-aware architecture ratchet. Do not use inherited tests, live providers, network, production data, CI, or services.

## Exit evidence

Record exact HEAD, module/test hashes, terminal results, active transition count, architecture findings, rollback, cost, and release qualification. This slice does not complete RF05-F04 or RF05.
