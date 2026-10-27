# RF05-F04 C27 — Intent authored-candidate schema contract

## Objective

Move the existing authored-candidate proposal schemas and prompt into an Intent-owned module and publish them through Intent public. Keep candidate persistence and evidence validation in the current compatibility module.

## Behavioral contract

Preserve exact schema shape, field order, prompt text, and object identity through compatibility exports. This does not alter what player text counts as source evidence, who controls PC actions, or how candidate persistence works.

## Ownership and verification

- Intent owns `frameworks/intent/authored-candidate-schema.js` and public exports.
- `authored-candidates.js` retains its runtime functions and re-exports the identical contract values.
- GM imports the three contract values through Intent public.
- Fresh test: `bot/tests/ai-gm-2026-10/rf05-f04-c27.test.mjs`.
- Run the frozen current shared-GM fresh-test union, syntax-check changed JS/MJS, and run the RF05 architecture ratchet.

No inherited tests, provider, network, production data, CI, or services.
