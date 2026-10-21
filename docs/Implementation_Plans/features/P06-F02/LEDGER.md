# P06-F02 — Daggerheart and hidden character data: ledger

**Status:** TARGETED DELTA PASS. Static source anchor `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

| Field | Evidence / result |
|---|---|
| Actual checkout & dirty-tree fingerprint | Intake 0834f299ccff1738e9b3dd753a5fc616d3965370; 22 modified plan files (56 insertions/4 deletions) plus untracked no-poll policy. Final source 8e01519b6511bc90af6a1c675e4a9950f12b703c; owner docs retained unstaged. |
| Changed production code | See execution entries and final source manifest below |
| Existing-doc/code delta verified | Current-source crosswalk and owner specification reconciled; no full behavior certification |
| New test location | bot/tests/ai-gm-2026-10/p06-f02.test.mjs |
| Tests actually executed & outcomes | Final frozen union: 47/47, exit 0; feature-specific evidence below |
| Runtime/mock measurements | Only the fresh scenarios documented below; no live measurement |
| Provider calls/tokens/expense | 0 real provider calls/tokens; $0 provider-test spend; Codex usage unavailable |
| Cache and invalidation evidence | P05-F02 has measured warm/cold/source/audience invalidation; no other cache claim |
| New narrative/autonomy restrictions or owner question | None proposed |
| Noncritical holds | See explicit local holds/unverified work in execution entries |
| Critical blocker | None established |
| Rollback / next step | Reverse only feature diff; retain historical readers/state and all owner edits. Resolve listed local holds separately. |

## Execution 2026-10-21 — TARGETED PASS

HEAD: `0834f299ccff1738e9b3dd753a5fc616d3965370`; branch: `codex/clean-ai-gm-2026-10`. Changes are working-tree deltas; input/test hashes below identify tested content.

Player export recursively excludes GM-only hook/canon infrastructure and explicitly GM-private nested records, preserving player background, mechanics and unknown player fields. GM hook export remains available; saved data is not mutated. No Daggerheart rule changed.

Changed paths: bot/src/character-export.js.

Provider tests: 0 calls, 0 provider tokens, $0 provider test spend. Codex token/cost totals unavailable; no invented savings. Cache: no claim unless measured below. Owner restrictions proposed: none. Local holds/unverified: Full import lifecycle and rule reconciliation beyond affected export contract are unverified. Critical blockers: none established. Release: NOT AUTHORIZED / NOT CERTIFIED. Rollback: reverse only this feature diff, preserving intake edits and saved records.

```json
{
  "run_id": "p06-1792598757560",
  "sha": "0834f299ccff1738e9b3dd753a5fc616d3965370",
  "start": "2026-10-21T16:05:57.601Z",
  "hashes": {
    "bot/src/native-feature-catalog.js": "74aa95f8cd6c2e2f35ce4bc035937ec39404cd4682e7785031131aec49b8cc9b",
    "bot/src/character-export.js": "ea979f6f8a449169b5cfe60a174ad735aae5232a22057d7a594045f95feb6735",
    "bot/tests/ai-gm-2026-10/p06-f01.test.mjs": "a6bf8d22a80a7eae3c6d42f93c7574d2b1ca7ef57a53663fee3f87280f96e37d",
    "bot/tests/ai-gm-2026-10/p06-f02.test.mjs": "8d5934e13d17b843841c6aa75928132d1180e4e10ffde244ae47e8b6ed7ab96f"
  },
  "tests": [
    "bot/tests/ai-gm-2026-10/p06-f01.test.mjs",
    "bot/tests/ai-gm-2026-10/p06-f02.test.mjs"
  ],
  "syntax": [
    {
      "path": "bot/src/native-feature-catalog.js",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/src/character-export.js",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/tests/ai-gm-2026-10/p06-f01.test.mjs",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/tests/ai-gm-2026-10/p06-f02.test.mjs",
      "exit": 0,
      "error": ""
    }
  ],
  "command": "node --test --test-reporter=tap bot/tests/ai-gm-2026-10/p06-f01.test.mjs bot/tests/ai-gm-2026-10/p06-f02.test.mjs",
  "end": "2026-10-21T16:05:58.132Z",
  "exit": 0,
  "error": null,
  "summary": [
    "# tests 5",
    "# pass 5",
    "# fail 0",
    "# cancelled 0",
    "# skipped 0",
    "# duration_ms 322.997"
  ]
}
```

## Final source freeze

SHA: `8e01519b6511bc90af6a1c675e4a9950f12b703c`; branch: `codex/clean-ai-gm-2026-10`. Run: `fresh-delta-1792599054739`, 2026-10-21T16:10:54.739Z to 2026-10-21T16:10:58.308Z.

[Final command, exact input/test hashes and results](../../evidence/FINAL_DELTA.json): 47/47 fresh tests across 20 files, exit 0; 43 syntax checks pass. This feature participates only through its affected tests, except P00-F01 which is documentation-only. No inherited test, fixture, registry, broad validator, model-as-judge or paid provider run.

No new narrative restriction awaits owner. No critical blocker. Local unsupported adapters and unverified integration remain explicit above. Release is **NOT AUTHORIZED / NOT CERTIFIED**. Earlier PLANNED/NOT RUN wording in retained intake notes is historical, superseded by these execution entries.
