# RF05-F04 C13 — Knowledge authority projection public import

## Objective

Switch the application GM's `projectAuthorityRecords` dependency from the temporary root compatibility reader to the already published Knowledge public API. Preserve the root compatibility reader for historical and other current consumers.

## Behavioral contract

The same Knowledge implementation must remain loaded; projected authority indexes retain their existing fields, redaction, hashes, and pagination behavior. This is import routing only and does not change disclosure, narrative, mechanics, player control, persistence, or receipts.

## Exact transition

Retire only `44030eadc4099d258170c650827e85d01ff58bf128ca62652198f53ada5bbb06` after the exact `gm.js` import disappears. Preserve the complete record in `C13-RETIRED.json`.

## Changed files and verification

- `bot/src/gm.js`: import through `frameworks/knowledge/public.js`.
- `bot/tests/ai-gm-2026-10/rf05-f04-c13.test.mjs`: fresh test loads the changed GM module and checks its import plus both existing public/compatibility export routes.
- `RF01/TRANSITIONS.json`: remove only the retired exact transition.

Run this test once in a frozen blocking batch, syntax-check changed JavaScript/MJS, and run the RF05 phase-aware architecture checker. Do not run inherited tests, broad validation, providers, production data, network services, or polling workflows.

## Exit limits

This qualifies one public-import edge only. It does not clear the remaining RF05-F04 assignments, the RF05 architecture gate, RF04 holds, or release authorization. Rollback restores the GM import and exact transition and removes only this feature's evidence; preserve the compatibility reader and all existing work.
