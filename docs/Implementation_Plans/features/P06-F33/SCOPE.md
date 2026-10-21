# P06-F33 — Support the source-bound Wrong Offering reaction cue

Status: SUPPORTED / TARGETED PASS. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `2c8654ba01ab94e5dcaa4ef93b858dc0f7515b01`; implementation/tested source SHA `08bc7e2d06cb1487f5f9293f29f2dc2ca3548dfd`.

Exact occurrence: `environment:storm-drain-shrine:wrong-offering`; source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#storm-drain-shrine/features/2`; source SHA-256 `b1a7ab918217f2a1c58d84c5f80add651948689a892cef32803a63c9c40fbd64`; template SHA-256 `f3b4ece93c32b4b29adaf83ffb16653c7acb0b27af5c9b3e6d70b5c0e2b15953`.

The scoped GM receives the exact reaction trigger and hostility-until-restitution rule. The GM authors any response and restitution path; context itself records no PC action or consequence. No Daggerheart mechanic changes.

Changed modules: `bot/src/native-feature-definitions.json`, `native-feature-catalog.js`, `native-environment-capabilities.js`, `native-environment-scene.js`, new `native-environment-wrong-offering.js`, coverage map and fresh F01/F33 tests. Full input/test SHA-256 values: [targeted evidence](../../evidence/P06_F33_TARGETED.json).

Run `p06-f33-20261021-a`: 112/112 fresh tests passed across 31 mapped files, no repairs/reruns, 2612.31 ms. Changed JS/MJS syntax 6/6 and JSON parse 2/2 passed. Code commit: `08bc7e2d06cb1487f5f9293f29f2dc2ca3548dfd`. Provider calls/tokens/spend 0/0/$0; no cache savings claimed; Codex usage unavailable.

No new creative restriction or owner question; no critical blocker. Local holds: actual in-play trigger/consequence, 107 other review-only occurrences, live delivery/provider behavior and whole-release qualification. Roll back only this occurrence adapter/catalog change while preserving saved readers and native receipts. Release authorization: false.
