# P06-F60 — Support Pale Court Knight Predatory Grace

Status: SUPPORTED; TARGETED DELTA PASS. Audit anchor `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `8dcb4b1fdeb6e4cd711b0554e08ccb957550412c`; implementation commit `20a6a13e83cc3b6a17187aaf195c5b16a71c421c`.

Exact occurrence: `adversary:pale-court-knight:predatory-grace`; source `content/GM_PRIVATE/ADVERSARIES/adversaries.json#pale-court-knight/features/0`; source SHA-256 `316bee8e6ca7f3d943c1a3382ada3b9af1cf323fc3000db609db52a073f854cb`; template SHA-256 `9a8b967e26660e29f8070f8490d7a9515f63b294b875b181ff716a8b95fda305`.

Expose the exact source-bound Passive cue in current GM-owned Pale Court Knight context. Do not create a forced-movement event or once-per-scene prevention receipt. This adds no new narrative or agency restriction.

Changed modules: native descriptor/catalog, exact Knight cue projector and adversary context. Fresh test `bot/tests/ai-gm-2026-10/p06-f60.test.mjs`; shared changed-module coverage selected through `bot/tests/ai-gm-2026-10/coverage.json`. Final repaired mapped run `p06-f60-20261022-repair` passed 217/217 across 57 fresh files; syntax 5/5 and JSON 2/2. The initial run passed 215/217 with two descriptor mismatches; one descriptor repair was followed by the complete mapped rerun. Provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable. No legacy tests/fixtures/registries or broad validation.

Local hold: forced-movement event matching, prevention, per-scene state and replay are not executed by this context cue. Roll back only the occurrence-scoped change; preserve history and state. Release authorization remains false.
