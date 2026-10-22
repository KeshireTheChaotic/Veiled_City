# P06-F59 — Support Cicada Runner Exit Clause

Status: SUPPORTED; TARGETED DELTA PASS. Audit anchor `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `3a153f9439594de9e7bf7412eecb11abf5f44f50`; implementation commit `cfec6994c71f63b7423782bb15f3e8650f28dcae`.

Exact occurrence: `adversary:cicada-runner:exit-clause`; source `content/GM_PRIVATE/ADVERSARIES/adversaries.json#cicada-runner/features/1`; source SHA-256 `4c3f3878c6ac2b60868a9e8329e7f36526b435bb3470b45aaad0481fb111e7eb`; template SHA-256 `9759b3c37f837a063c0c013eaff57ab1e9c63045b34d3b46e657a63cc9cbdebc`.

Implement the exact source-bound Reaction cue for a Runner threatened with violence. Record one optional NPC Fear cost and the printed route/protection and pursuit-social-consequence terms. The adapter does not spend Fear, choose the Runner's response, reveal an unverified route, commit consequences or remove the PC's choice to pursue. No new narrative/autonomy restriction is proposed.

Changed production modules: native feature definitions/catalog, Exit Clause projector and adversary context. Fresh test: `bot/tests/ai-gm-2026-10/p06-f59.test.mjs`, plus changed-shared-module paths from `bot/tests/ai-gm-2026-10/coverage.json`. Frozen `p06-f59-20261022-a` passed 213/213 across 56 fresh files; changed JS/MJS syntax 5/5 and JSON parse 2/2. Provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable. No legacy tests, fixtures, registries or broad validation.

Local hold: no native Fear spend, escape-route/protection effect or social-consequence receipt is added. Roll back only this occurrence adapter/descriptor/test/docs; preserve history and saved state. Release authorization remains false.
