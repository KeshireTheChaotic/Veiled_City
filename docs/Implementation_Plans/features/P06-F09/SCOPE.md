# P06-F09 — Enable source-qualified VIP Threshold admission

**Phase:** [P06](../../phases/P06/SCOPE.md). **Status:** TARGETED PASS; OCCURRENCE SUPPORTED. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Exact source and native route

Occurrence `environment:haunted-nightclub:vip-threshold`, source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#haunted-nightclub/features/1`: entry to the private floor requires invitation, status, leverage or deception.

`native-environment-access.js` already requires an actual local private floor, an owner-controlled current PC, an established source-backed invitation/status/leverage credential or an actual successful deception action, and creates a read-validated admission receipt. Admission alone neither moves a PC nor waives locks, hazards, ownership or encounter movement. This is the source-defined gate, with player choice and native outcome preserved.

## Frozen change

Production: `bot/src/native-feature-definitions.json`, `bot/src/native-feature-catalog.js`, `bot/src/native-environment-capabilities.js`. Fresh test: new `bot/tests/ai-gm-2026-10/p06-f09.test.mjs`; updated `p06-f01.test.mjs`; P06-F04 through F08 tests run because shared modules changed.

Only the exact Passive admission contract exposes the existing handler. Source drift and forged methods/protocol remain held. No new narrative restriction is introduced. The frozen batch passed 16 unique tests after one case-insensitive assertion repair; see the [feature ledger](LEDGER.md) and [targeted evidence](../../evidence/P06_F09_TARGETED.json). Implementation commit: `7b011f25c4cd6ad24aef92a74b3db49616e5b79e`.
