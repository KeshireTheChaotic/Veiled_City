# P06-F18 — Support source-bound Chain of Title passive context

Status: FROZEN. Audit anchor: `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `0b06b19495da035f7cb9fa5d87abd16c079d1c38`.

Exact occurrence: `environment:archive-beneath-the-courthouse:chain-of-title`; source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#archive-beneath-the-courthouse/features/0`; source hash `06f32d43d4165ff47accab1eb92ff2c278ed310b4d813ecde6e635f22cb7ef47`; template hash `57b075db846e45a01accbc9022b4a062451525c8a898a8d142f5fab4320004c5`.

The native adapter provides the exact passive cue in the current audience-scoped environment context. “Can often be traced” does not create a record, prove ownership, resolve pact magic, or decide a PC action. GM creativity and player agency remain intact; native Daggerheart mechanics are unchanged.

Fresh tests: `p06-f18.test.mjs` plus affected catalog and shared P06 environment tests. No legacy suites, fixtures, goldens, provider tests or broad validation. Changed JS/MJS syntax and changed JSON parsing only. One frozen blocking batch; never poll. No owner question/restriction. No critical blocker.
