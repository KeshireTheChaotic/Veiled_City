# P06-F21 — Support source-bound No Ordinary Signal passive context

Status: FROZEN. Audit anchor: `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `7aa3f7e1654ad43d0ddf95ca52fc23857afbea0a`.

Exact occurrence: `environment:district-blackout:no-ordinary-signal`; source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#district-blackout/features/0`; source hash `be9b0f432352c363016518707e054930436af6dc7123a0e606a87dc711c1231f`; template hash `24bcd46f4a3a205a6bc8f48768c751d453d8de8beb0e6839ee68081e54cd980c`.

The adapter gives the exact passive network-reliability cue to the current audience-scoped environment context. It creates no connection attempt or failure and preserves alternate approaches and player choices. No Daggerheart mechanic is changed.

Fresh tests: `p06-f21.test.mjs` plus fresh tests mapped to changed shared catalog/capability/scene code. No legacy tests/fixtures/goldens, paid model calls or broad validation. Changed JS/MJS syntax and JSON parsing only. Freeze and run one blocking batch; never poll. No owner restriction/question; no critical blocker.
