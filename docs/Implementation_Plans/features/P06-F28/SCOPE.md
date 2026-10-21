# P06-F28 — Support the source-bound Sealed Docket prompt

Status: SUPPORTED / TARGETED PASS. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `13a532ae94eadacb1f22eba537accad248b441ff`; implementation SHA `79d31b673d695256dfc3d00bb36a8102f8a3886e`.

Exact occurrence: `environment:archive-beneath-the-courthouse:sealed-docket`; source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#archive-beneath-the-courthouse/features/1`; source SHA-256 `c60d1051c7bd9e995e42fe1aa2e285ea6eda4984c5bbc85de8c6602de87fb97b`; template SHA-256 `57b075db846e45a01accbc9022b4a062451525c8a898a8d142f5fab4320004c5`.

The adapter exposes the exact current-scene docket premise to the scoped GM. The GM authors the document and its legal or supernatural interpretation; the GM states an access cost involving time, secrecy or favor before acceptance; the PC owns their response. Context alone records no document, cost or agreement. No Daggerheart mechanic changes.

Changed modules: `bot/src/native-feature-definitions.json`, `bot/src/native-feature-catalog.js`, `bot/src/native-environment-capabilities.js`, `bot/src/native-environment-scene.js`, new `bot/src/native-environment-sealed-docket.js`, and fresh coverage/test files. Exact changed/input/test hashes are in [targeted evidence](../../evidence/P06_F28_TARGETED.json).

Run `p06-f28-20261021-a`: 92/92 passed across 26 mapped fresh test files; no failures, skips or repairs; duration 2108.08 ms. Changed JS/MJS syntax 6/6 and changed JSON parse 2/2 passed. Code commit: `79d31b673d695256dfc3d00bb36a8102f8a3886e`. Provider calls/tokens/spend 0/0/$0; no cache savings claimed; Codex usage unavailable.

No creative/autonomy restriction or owner question introduced; no critical blocker. Local holds: 112 other review-only catalog occurrences, the actual docket/access-cost fiction, live delivery/provider behavior and complete release qualification. Roll back only the occurrence-specific adapter/catalog change while preserving saved readers and native receipts. Release authorization: false.
