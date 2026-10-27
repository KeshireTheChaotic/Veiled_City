# RF05-F04 C26 — World Director review-category contract

## Objective

Publish the existing World Director post-turn review category list from World public while keeping review validation in the compatibility module.

## Behavioral contract

Preserve the exact ordered category list and object identity. Keep `validatePostTurnStateReview` and its mutation-derived checks unchanged. No mechanical outcome, player action, or narrative restriction changes.

## Ownership and verification

- World owns the review-category constant in `frameworks/world/director-cadence.js` and exposes it through World public.
- `director.js` re-exports the identical value and retains validation/cadence compatibility.
- GM imports the category contract publicly and the validator through the existing compatibility module.
- Fresh test: `bot/tests/ai-gm-2026-10/rf05-f04-c26.test.mjs`.
- Run a frozen current shared-GM fresh-test union, syntax-check changed JS/MJS, and run the RF05 architecture ratchet.

No inherited tests, provider, network, production data, CI, or services.
