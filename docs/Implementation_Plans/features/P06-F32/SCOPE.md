# P06-F32 — Support the source-bound Everyone Is Watching rule cue

Status: SUPPORTED / TARGETED PASS. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `d03e886b34ae27fa9cc884a3f0bd68438755ba59`; implementation/tested source SHA `0c1ddc97a1c69135cdba66a1c3ea0c7db775d48a`.

Exact occurrence: `environment:glass-market-grand-concourse:everyone-is-watching`; source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#glass-market-grand-concourse/features/2`; source SHA-256 `9534b8e9ffe24475e950741dc3250e0c7e26fde064674f260b00b369636e757d`; template SHA-256 `78cd4c8e38a0bfd156d1c2e1d8793ce1cc88c78d744725b6c88e1847571ef947`.

The exact reaction cue reaches the scoped GM when a PC makes public words; the PC owns those words and the GM authors the faction witness in fiction. This adapter creates no durable witness receipt. No Daggerheart mechanic changes.

Changed modules: `bot/src/native-feature-definitions.json`, `native-feature-catalog.js`, `native-environment-capabilities.js`, `native-environment-scene.js`, new `native-environment-everyone-is-watching.js`, coverage map, fresh F01/F32 tests. Full input/test SHA-256 values: [targeted evidence](../../evidence/P06_F32_TARGETED.json).

Run `p06-f32-20261021-a`: 108/108 fresh tests passed across 30 mapped files, no repairs/reruns, 2568.48 ms. Changed JS/MJS syntax 6/6 and JSON parse 2/2 passed. Code commit: `0c1ddc97a1c69135cdba66a1c3ea0c7db775d48a`. Provider calls/tokens/spend 0/0/$0; no cache savings claimed; Codex usage unavailable.

No new creative restriction or owner question; no critical blocker. Local holds: durable faction-witness persistence, 108 other review-only occurrences, live delivery/provider behavior and whole-release qualification. Roll back only this occurrence adapter/catalog change while preserving saved readers and native receipts. Release authorization: false.
