# P03-F01 — Ordinary world invention: ledger

**Status:** TARGETED DELTA PASS. Static source anchor `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

| Field | Evidence / result |
|---|---|
| Actual checkout & dirty-tree fingerprint | Intake 0834f299ccff1738e9b3dd753a5fc616d3965370; 22 modified plan files (56 insertions/4 deletions) plus untracked no-poll policy. Final source 8e01519b6511bc90af6a1c675e4a9950f12b703c; owner docs retained unstaged. |
| Changed production code | See execution entries and final source manifest below |
| Existing-doc/code delta verified | Current-source crosswalk and owner specification reconciled; no full behavior certification |
| New test location | bot/tests/ai-gm-2026-10/p03-f01.test.mjs |
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

Empty optional aliases no longer falsely collide with absent protected names; real PC/proxy names and player naming claims retain native boundaries. Frozen phase batch: 7/7 pass.

Changed paths: bot/src/world-authorship.js.

Provider tests: 0 calls, 0 provider tokens, $0 provider test spend. Codex token/cost totals unavailable; no invented savings. Cache: no claim unless measured below. Owner restrictions proposed: none. Local holds/unverified: Creation/promotion/reuse workflow integration remains unverified. Critical blockers: none established. Release: NOT AUTHORIZED / NOT CERTIFIED. Rollback: reverse only this feature diff, preserving intake edits and saved records.

```json
{
  "run_id": "p03-1792598342235",
  "sha": "0834f299ccff1738e9b3dd753a5fc616d3965370",
  "start": "2026-10-21T15:59:02.274Z",
  "hashes": {
    "bot/src/world-authorship.js": "c8ce0e4f24e69e2f9fdc44a8016783e0a921a8c140173aa693ebef8351358c32",
    "bot/src/narrative-salience.js": "9b88e472ed4cb96dcb49ccc0772cc345b68308e33f277d7916214cf6480aacd5",
    "bot/src/npc-cognition.js": "5a897276ed0ae4197e56cb7943d7b3040a1e727ab37b34d3f94e4844bb734700",
    "bot/src/world-narrative-bridge.js": "812d4a3d9a8013d9599b4c223cf36a0611b8f9ca3d3548783bd56e41034640f9",
    "bot/tests/ai-gm-2026-10/p03-f01.test.mjs": "f9d0bf27f6cfc8af31c90ee73fdca7f58dfcb5f06861a34d89c06ced62a8eb7a",
    "bot/tests/ai-gm-2026-10/p03-f02.test.mjs": "b0ef1dad83afba23e6a12d13016526a7a44f32091af447acfa8b254cc1f4dffa",
    "bot/tests/ai-gm-2026-10/p03-f03.test.mjs": "e8095d1ba82867e9b7770132bb625061eb0325f4e397ba1f92bb6d8158d0d728",
    "bot/tests/ai-gm-2026-10/p03-f04.test.mjs": "bc978b13940017ec4eedab96e35bf1ce777945b3d4275a9eebabc9679a078117"
  },
  "tests": [
    "bot/tests/ai-gm-2026-10/p03-f01.test.mjs",
    "bot/tests/ai-gm-2026-10/p03-f02.test.mjs",
    "bot/tests/ai-gm-2026-10/p03-f03.test.mjs",
    "bot/tests/ai-gm-2026-10/p03-f04.test.mjs"
  ],
  "syntax": [
    {
      "path": "bot/src/world-authorship.js",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/src/narrative-salience.js",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/src/npc-cognition.js",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/src/world-narrative-bridge.js",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/tests/ai-gm-2026-10/p03-f01.test.mjs",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/tests/ai-gm-2026-10/p03-f02.test.mjs",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/tests/ai-gm-2026-10/p03-f03.test.mjs",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/tests/ai-gm-2026-10/p03-f04.test.mjs",
      "exit": 0,
      "error": ""
    }
  ],
  "command": "node --test --test-reporter=tap bot/tests/ai-gm-2026-10/p03-f01.test.mjs bot/tests/ai-gm-2026-10/p03-f02.test.mjs bot/tests/ai-gm-2026-10/p03-f03.test.mjs bot/tests/ai-gm-2026-10/p03-f04.test.mjs",
  "end": "2026-10-21T15:59:03.030Z",
  "exit": 0,
  "error": null,
  "summary": [
    "# tests 7",
    "# pass 7",
    "# fail 0",
    "# cancelled 0",
    "# skipped 0",
    "# duration_ms 388.4991"
  ]
}
```

## Final source freeze

SHA: `8e01519b6511bc90af6a1c675e4a9950f12b703c`; branch: `codex/clean-ai-gm-2026-10`. Run: `fresh-delta-1792599054739`, 2026-10-21T16:10:54.739Z to 2026-10-21T16:10:58.308Z.

[Final command, exact input/test hashes and results](../../evidence/FINAL_DELTA.json): 47/47 fresh tests across 20 files, exit 0; 43 syntax checks pass. This feature participates only through its affected tests, except P00-F01 which is documentation-only. No inherited test, fixture, registry, broad validator, model-as-judge or paid provider run.

No new narrative restriction awaits owner. No critical blocker. Local unsupported adapters and unverified integration remain explicit above. Release is **NOT AUTHORIZED / NOT CERTIFIED**. Earlier PLANNED/NOT RUN wording in retained intake notes is historical, superseded by these execution entries.
