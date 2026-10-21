# P06-F19 — Support source-bound No Consensus scene cue

Status: FROZEN. Audit anchor: `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `0d4e8840d14e2778f8881c829612913c7d19eb0b`.

Exact occurrence: `environment:rupture-district:no-consensus`; source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#rupture-district/features/0`; source hash `eb519776111e21296b929fce849eacca297cc8af88618545658c20beff2c5ab6`; template hash `1543b06bf42f7e35dff152f5ca8ba26e9bfbadd944f41b38ce1d7cbf991da7f7`.

The adapter sends the exact passive instruction in current audience-scoped scene context. It does not author a supernatural rule, choose which rule applies, or declare what a PC perceives. GM creativity and player agency remain intact; native code changes no Daggerheart mechanics.

Fresh tests: `p06-f19.test.mjs` and all fresh tests mapped to the changed shared catalog/capability/scene modules. No legacy tests, fixtures, goldens, paid providers, or broad validation. Changed JS/MJS syntax and changed JSON parse checks only. One frozen blocking batch; never poll. No owner restriction/question; no critical blocker.
