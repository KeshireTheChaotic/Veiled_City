# P05-F01 — Minimal model orchestration: ledger

**Status:** TARGETED DELTA PASS. Static source anchor `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

| Field | Evidence / result |
|---|---|
| Actual checkout & dirty-tree fingerprint | Intake 0834f299ccff1738e9b3dd753a5fc616d3965370; 22 modified plan files (56 insertions/4 deletions) plus untracked no-poll policy. Final source 8e01519b6511bc90af6a1c675e4a9950f12b703c; owner docs retained unstaged. |
| Changed production code | See execution entries and final source manifest below |
| Existing-doc/code delta verified | Current-source crosswalk and owner specification reconciled; no full behavior certification |
| New test location | bot/tests/ai-gm-2026-10/p05-f01.test.mjs |
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

Explicit provider refusal is terminal for that structured request instead of causing a pointless malformed-JSON retry. Stub counts: complete=1, malformed then repaired=2, refusal=1, pre-aborted=0. Complete narration retained; no model downgrade or new creative cap. Frozen phase batch: 7/7 pass.

Changed paths: bot/src/gm.js.

Provider tests: 0 calls, 0 provider tokens, $0 provider test spend. Codex token/cost totals unavailable; no invented savings. Cache: no claim unless measured below. Owner restrictions proposed: none. Local holds/unverified: Real provider performance and quality unmeasured. Critical blockers: none established. Release: NOT AUTHORIZED / NOT CERTIFIED. Rollback: reverse only this feature diff, preserving intake edits and saved records.

```json
{
  "run_id": "p05-1792598572133",
  "sha": "0834f299ccff1738e9b3dd753a5fc616d3965370",
  "start": "2026-10-21T16:02:52.181Z",
  "hashes": {
    "bot/src/gm.js": "b862d435e4f9da35b16a8300ca653e481abbb65c9afbe65dcf6288242b994acb",
    "bot/src/content.js": "86875dc9ae71e3ac43fba93e9b6eba597d5ff41a9d1e2c4f843294b964e12855",
    "bot/src/generation-feedback.js": "44cc1fa24c19cb4c76475ea812304f17e217f885861f5919f298e5b4edecab2e",
    "bot/src/config.js": "3d5e472d9a2997b30f24233608cff77a8e4ceb7edf0194f40ad5c162a5c86a74",
    "bot/tests/ai-gm-2026-10/p05-f01.test.mjs": "cb37b2b0d659e575f14a930d107498d01300b0410a75dd9da9238995e5b875ba",
    "bot/tests/ai-gm-2026-10/p05-f02.test.mjs": "54e9f6d410fe36b876f1c2c1f5f4c92d22566bd16d246a9131a81a040cf614d4",
    "bot/tests/ai-gm-2026-10/p05-f03.test.mjs": "3c98d24aca8b44e80fb26c4d4eb05641cdfcc1bf43a138d2181e6386b549b50f"
  },
  "tests": [
    "bot/tests/ai-gm-2026-10/p05-f01.test.mjs",
    "bot/tests/ai-gm-2026-10/p05-f02.test.mjs",
    "bot/tests/ai-gm-2026-10/p05-f03.test.mjs"
  ],
  "syntax": [
    {
      "path": "bot/src/gm.js",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/src/content.js",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/src/generation-feedback.js",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/src/config.js",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/tests/ai-gm-2026-10/p05-f01.test.mjs",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/tests/ai-gm-2026-10/p05-f02.test.mjs",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/tests/ai-gm-2026-10/p05-f03.test.mjs",
      "exit": 0,
      "error": ""
    }
  ],
  "command": "node --test --test-reporter=tap bot/tests/ai-gm-2026-10/p05-f01.test.mjs bot/tests/ai-gm-2026-10/p05-f02.test.mjs bot/tests/ai-gm-2026-10/p05-f03.test.mjs",
  "end": "2026-10-21T16:02:53.249Z",
  "exit": 0,
  "error": null,
  "summary": [
    "# tests 7",
    "# pass 7",
    "# fail 0",
    "# cancelled 0",
    "# skipped 0",
    "# duration_ms 702.2053"
  ]
}
```

## Final source freeze

SHA: `8e01519b6511bc90af6a1c675e4a9950f12b703c`; branch: `codex/clean-ai-gm-2026-10`. Run: `fresh-delta-1792599054739`, 2026-10-21T16:10:54.739Z to 2026-10-21T16:10:58.308Z.

[Final command, exact input/test hashes and results](../../evidence/FINAL_DELTA.json): 47/47 fresh tests across 20 files, exit 0; 43 syntax checks pass. This feature participates only through its affected tests, except P00-F01 which is documentation-only. No inherited test, fixture, registry, broad validator, model-as-judge or paid provider run.

No new narrative restriction awaits owner. No critical blocker. Local unsupported adapters and unverified integration remain explicit above. Release is **NOT AUTHORIZED / NOT CERTIFIED**. Earlier PLANNED/NOT RUN wording in retained intake notes is historical, superseded by these execution entries.
