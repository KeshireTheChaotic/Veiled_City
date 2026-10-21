# P06-F25 — Support the source-bound Everything Has a Price prompt

Status: FROZEN for one targeted batch. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `670b76a476926901597c22142131b1f773accfc6`.

Exact occurrence: `environment:abandoned-mall-glass-market:everything-has-a-price`; source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#abandoned-mall-glass-market/features/1`; source SHA-256 `427506c41475d3b15adbe357154b21a0b21a7f5751da5f9c93d22864b983cd13`; template SHA-256 `9dd2d059a31f678bc584808a1519d2bab2622f51f614c0be63c1637493a4994f`.

The adapter exposes the exact scene-scoped creative prompt to the GM. The useful item or answer and tailored price remain GM-authored fiction; the price is stated before any acceptance, and the PC alone accepts or declines. No trade, new fact, or Daggerheart mechanic is committed by context alone.

Fresh tests only: new `p06-f25.test.mjs` and the mapped fresh tests for changed catalog, capability and scene-context modules. Run once after freeze; changed-file syntax checks and JSON parsing only. No provider tests or broad validation. No new narrative restriction or owner question proposed. No critical blocker established.
