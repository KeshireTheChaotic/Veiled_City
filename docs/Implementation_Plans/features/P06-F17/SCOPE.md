# P06-F17 — Support source-bound Thin Walls passive context

Status: FROZEN. Audit anchor: `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `f00e9fb051ae28ecb3d34f7a3f7f20ee63373037`.

Exact occurrence: `environment:apartment-veil-breach:thin-walls`; source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#apartment-veil-breach/features/0`; source hash `b0c12b9baebbe3d2cb98f7543159d14df5434f5e7902c60ed8fa164237a6a2f2`; template hash `7907b02aa1aabb205de4b7ee6a37ac09ff6c6f2f047daf555190b45734d99653`.

Support is limited to exact passive source context for the current scoped environment profile. “Risk adding witnesses” remains a risk; no witness, roll, PC action, Fear spend, persistent record, or outcome is automatic. This preserves GM creativity and player agency. Native code owns only source qualification and the audience-context route; Daggerheart mechanics are unchanged.

Fresh changed-code tests: `p06-f17.test.mjs` plus affected catalog and P06 scene tests. No legacy suites, fixtures, golden results, provider calls or broad validation. Changed JS/MJS syntax and changed JSON parsing only. Freeze before one blocking targeted batch; never poll. No owner question or restriction. No global/critical blocker.
