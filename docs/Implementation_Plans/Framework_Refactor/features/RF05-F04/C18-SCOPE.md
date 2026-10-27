# RF05-F04 C18 — Narrative integrity instruction public API

## Objective

Publish the existing `NARRATIVE_CONTRACT` instruction string through Narrative public, and have the application GM consume it there. Keep the mixed narrative-integrity implementation and its material-claim schema/validators in place for now.

## Behavioral and ownership contract

Extract only the existing immutable instruction value. Preserve its exact text and behavior. It includes existing guidance about player choice, open questions, ordinary world invention, native evidence, claims, and effects; do not add, remove, strengthen, or reinterpret any clause. The root module continues exporting the exact same string identity and retains claim schema/validation logic. GM's schema and validator imports remain on the compatibility path.

## Verification

Add a fresh regression at `bot/tests/ai-gm-2026-10/rf05-f04-c18.test.mjs` verifying Narrative public and compatibility value identity and the GM public import. After the `gm.js` change, run the frozen fresh GM-dependent test union: C16, C17, C18, P10-F08, and RF05-F02, RF05-F03-C02, and RF05-F04 C02, C03, C05-C13, C15. This includes only current fresh feature tests; no inherited suite. Run changed-file syntax and the RF05 architecture ratchet. Use a blocking invocation and no polling.

## Exit evidence

Record hashes, test/syntax/architecture terminal results, known failed attempts and repairs, exact changed paths and ownership, remaining transition assignments, rollback, costs, and release status. Do not retire a transition unless the exact edge is absent and the manifest supports retirement. This is a scoped contract slice only; RF05-F04 and RF05 remain incomplete.
