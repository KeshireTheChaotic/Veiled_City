# RF05-F04 C25 — World NPC action proposal schema

## Objective

Move the World-only `npcActionSchema` into World ownership and publish it through World public. Keep the combined NPC Director schema in the historical compatibility module because it also contains an Intent-owned proposal contract.

## Behavioral contract

Preserve exact fields, required-field ordering, enum identity, and bounds. Do not change action eligibility, NPC autonomy, costs, mechanics, resolution, or receipts. Do not route `simulation-schema.js` through a pair adapter or add new cross-framework imports.

## Ownership and verification

- World owns `frameworks/world/npc-action-schema.js` and its public export.
- `simulation-schema.js` keeps the historical `npcActionSchema` and `npcDirectorSchema` exports by re-exporting the World schema and composing the existing Intent schema exactly as before.
- Fresh test: `bot/tests/ai-gm-2026-10/rf05-f04-c25.test.mjs`.
- Run that targeted test once, syntax-check changed JS/MJS, and run the RF05 architecture ratchet.

No inherited tests, provider, network, production data, CI, or services.
