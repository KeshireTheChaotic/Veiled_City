# P06-F57 — Support Morrowline Echo Bad Future

Status: SUPPORTED; TARGETED DELTA PASS. Audit anchor `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `6cc40f717fb0f8ff283fec640a4f326acfda1b14`; implementation commit `1b2ffc1a54c40ef283eae4fd7cec735400be74db`.

Exact occurrence: `adversary:morrowline-echo:bad-future`; source `content/GM_PRIVATE/ADVERSARIES/adversaries.json#morrowline-echo/features/2`; source SHA-256 `f7442d36f1d96101f28f0ea39f9fe2718fd2e3669f1dbe6d3e93741c72d8ddc9`; template SHA-256 `0488f9de16410d11fb9a095e4951045a323d3eea51ad8a8e425ae4e96d47e8fa`.

Owner answered: “Authorize exact source behavior.” Implement the authored trigger cue: when reduced to 3 HP or fewer, truthfully state one danger, one opportunity, and one uncertainty in the current scene. Preserve GM creative latitude within those three items. This adds no new restriction. The adapter supplies source-bound GM context only; native HP and outcome authority stay native, and no PC action, feeling, roll or resource choice is inferred.

Changed production modules: `bot/src/native-feature-definitions.json`, `bot/src/native-feature-catalog.js`, `bot/src/native-adversary-context.js`, and new `bot/src/native-adversary-bad-future.js`. Fresh feature test: `bot/tests/ai-gm-2026-10/p06-f57.test.mjs`; changed shared-module coverage selected from `bot/tests/ai-gm-2026-10/coverage.json`. Frozen run `p06-f57-20261022-a` passed 209/209 across 55 fresh files; changed JS/MJS syntax 5/5 and JSON parse 2/2. Provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable. No legacy tests, fixtures, registries or broad validation.

Local limit: no separate native HP-trigger executor, effect or replay receipt was added; this support exposes the exact source cue on a currently bound, GM-owned Echo. Roll back only this occurrence's adapter/descriptor/test/docs. Preserve saved state, historic readers and privacy. Release authorization remains false.
