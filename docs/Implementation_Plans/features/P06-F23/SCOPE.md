# P06-F23 — Support source-bound Guest Right passive cue

Status: FROZEN. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `4428bda3adfb6fa6c768e313b7dc0f55d33314ef`.

Exact occurrence: `environment:pale-court-townhouse:guest-right`; source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#pale-court-townhouse/features/0`; source hash `844eb3ad20fdbab7ff45118afb147436ac969b8115c884312081b575fe750eb6`; template hash `24375b3fe2b4606ed929b808eb2924be4e848595b8c029f815a3fed8814e9c18`.

The adapter supplies the exact conditional hospitality cue in the current scoped GM context. It creates no acceptance, protection state, or agreement to unstated rules. Player choices and source-grounded fiction remain authoritative; Daggerheart mechanics are unchanged.

Fresh tests: `p06-f23.test.mjs` plus mapped fresh tests for shared catalog/capability/scene edits. No legacy tests/fixtures/goldens, provider spend or broad validation. Changed JS/MJS syntax and JSON parsing only. One frozen blocking batch; never poll. No owner question/new restriction or critical blocker.
