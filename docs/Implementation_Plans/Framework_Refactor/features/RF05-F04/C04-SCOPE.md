# RF05-F04 C04 — GM Narrative public-guidance import

## Objective

Adopt the Narrative public API for the existing `WORLD_DIRECTOR_OPPORTUNITY_GUIDANCE` value consumed by `gm.js`; the root re-export remains only for existing in-repository test compatibility.

## Behavioral contract

The prompt receives the exact pre-existing value, unchanged. It remains soft narrative guidance with no authority to create a mechanical result, choose a PC action, or override audience evidence. This is an ownership/import change only; do not change writer output or add a new narrative restriction.

Only exact transition `2b47b1791f56a173edcc96b4b833d6797ed7c82ad05fb49a0060cfd85027eb1c` (the `gm.js` private import) is eligible for retirement in this slice. The Narrative root module-location record remains active under RF05-F03 C02. No other feature or transition may be included.

## Verification

Use the fresh feature-specific test authored for RF05-F03 C02 to import the actual `GMService`, verify the public and compatibility values match, and confirm `gm.js` imports from the Narrative public API. Run changed-file syntax and one RF05 architecture ratchet after both exact transition removals.
