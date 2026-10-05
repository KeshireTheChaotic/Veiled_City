# Veiled City Multiplayer Discord v3.1.3 — Validation Report

**Build date:** 2026-10-05

## Result
**PASS**

## v3.1.3 encounter validation
- Daggerheart Battle Point base formula implemented as `(3 × active PCs) + 2`.
- Difficulty adjustments: easy/shorter `-1`, standard `0`, hard/longer `+2`.
- Role costs implemented: Minion group/Social/Support 1; Horde/Ranged/Skulk/Standard 2; Leader 3; Bruiser 4; Solo 5.
- Derived modifiers tested: 2+ Solos `-2`, global damage boost `-2`, lower-tier opposition `+1`, no heavy role `+1`.
- Active PC count is sourced from Present/Guest/Late session assignments only; NPC proxies do not count.
- Minion groups scale to the live party size.
- Auto-builder matrix exercised across Tiers 1–4, 2–6 PCs, all three difficulty modes, and all five composition styles with repeated randomized runs; no generated plan exceeded its BP budget.
- Tier 4 role coverage expanded to avoid Solo-only encounter composition.
- Encounter lifecycle persistence tested: planned → active → ended.
- Session end automatically closes unfinished encounter records.

## Compatibility / migration
- v3.1.2 SQLite → v3.1.3 migration test: PASS.
- Existing characters, sessions, party state, NPC proxies, private knowledge, and campaign data remain intact.
- New encounter storage is additive.

## Code / package checks
- `npm run check`: PASS.
- `npm run test:offline`: PASS.
- Content validator: PASS.
- Adversaries: 41.
- Markdown files: 51.
- JSON files: 10.
- Legacy one-PC encounter files removed and references replaced with multiplayer guides.

## Not exercised without user credentials
- Live Discord command registration and interaction delivery.
- Live OpenAI GM calls.

Those require the user's Discord/OpenAI credentials and are intentionally not part of offline validation.
