# RF05-F03 C02 — Narrative opportunity guidance ownership

## Objective

Move the existing `WORLD_DIRECTOR_OPPORTUNITY_GUIDANCE` constant from its root module into the Narrative framework and expose it through the Narrative public API. The application GM imports that public API. Retain the root module as a thin re-export because three pre-existing in-repository feature tests still import it and those tests must not be modified.

## Behavioral and ownership contract

The existing string is an already-used soft narrative preference with no effect authority. Preserve every character and clause exactly. Do not author, strengthen, remove, or reinterpret narrative guidance. Narrative owns the value; application `gm.js` consumes it through the public API. The root re-export contains no duplicate policy. No saved data or external package API is changed.

The root module-location transition `1887dafd7dc5c08aa05252ec6e558c14344f2605f22f6de2a42a13aa6e061303` remains active while this compatibility reader is retained. The source edge to `gm.js` is handled by its RF05-F04 scope. No baseline, counts, or other transition records may change.

## Verification

Create `bot/tests/ai-gm-2026-10/rf05-f03-c02.test.mjs` to import the actual GM service and assert public/compatibility value equality and the GM prompt's public import. Run only this fresh test, changed-file syntax, and the RF05 architecture ratchet. No provider, network, production data, or inherited tests.
