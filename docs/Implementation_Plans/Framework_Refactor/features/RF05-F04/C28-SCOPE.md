# RF05-F04 C28 — World proposal schemas public contract

## Objective

Move the three existing ordinary World proposal schemas into a small World-owned module and publish them through World public. Keep `autonomous-world.js` runtime authority, identity validation, and persistence code in place.

## Behavioral contract

Preserve exact schema shapes, enums, field order, and object identity through compatibility exports. Do not change entity creation, player source evidence, movement, audience privacy, native receipts, or GM creativity.

## Ownership and verification

- World owns `frameworks/world/world-proposal-schema.js`.
- `autonomous-world.js` re-exports the same schemas while retaining runtime functions.
- GM imports the schemas from World public and the native/context functions from the compatibility module.
- Fresh test: `bot/tests/ai-gm-2026-10/rf05-f04-c28.test.mjs`.
- Run the frozen current shared-GM union, changed-file syntax, and RF05 architecture ratchet.

No inherited tests, provider, network, production data, CI, or services.
