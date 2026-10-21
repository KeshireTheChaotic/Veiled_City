# P04-F02 — Audience and knowledge firewall: ledger

**Status:** TARGETED DELTA PASS. Static source anchor `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

| Field | Evidence / result |
|---|---|
| Actual checkout & dirty-tree fingerprint | Intake 0834f299ccff1738e9b3dd753a5fc616d3965370; 22 modified plan files (56 insertions/4 deletions) plus untracked no-poll policy. Final source 8e01519b6511bc90af6a1c675e4a9950f12b703c; owner docs retained unstaged. |
| Changed production code | See execution entries and final source manifest below |
| Existing-doc/code delta verified | Current-source crosswalk and owner specification reconciled; no full behavior certification |
| New test location | bot/tests/ai-gm-2026-10/p04-f02.test.mjs |
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

Audience authority snapshots clone and recursively freeze native proofs; issuer/caller mutation cannot redirect nested scope or revision. JSON remains unable to mint grants. Frozen phase batch: 6/6 pass.

Changed paths: bot/src/audience-first-capability.js.

Provider tests: 0 calls, 0 provider tokens, $0 provider test spend. Codex token/cost totals unavailable; no invented savings. Cache: no claim unless measured below. Owner restrictions proposed: none. Local holds/unverified: Live queued publication stale-revision integration not freshly qualified. Critical blockers: none established. Release: NOT AUTHORIZED / NOT CERTIFIED. Rollback: reverse only this feature diff, preserving intake edits and saved records.

```json
{
  "run_id": "p04-1792598444779",
  "sha": "0834f299ccff1738e9b3dd753a5fc616d3965370",
  "start": "2026-10-21T16:00:44.824Z",
  "hashes": {
    "bot/src/scene-action-window.js": "754a0eaca6ba7800385e4a54e38bf927885842cd1a409c4b01868da51031915f",
    "bot/src/audience-first-capability.js": "14775ee06d3e120ea40eeba2745d0462d06e483b684e89686528a8bb2b6a853e",
    "bot/src/assembly-planning.js": "073e0876ae69bd586d9e37106ca6acaefea0664be9829976514e514f4de6918a",
    "bot/tests/ai-gm-2026-10/p04-f01.test.mjs": "68deb97acc66e9999b52c3921be9f044ba9e120a1eba6a858bf806bc039cdc39",
    "bot/tests/ai-gm-2026-10/p04-f02.test.mjs": "686d05ded003d599db1ff74f6df86d7fc7a494fb8f6b740c83d1811d30b7874a",
    "bot/tests/ai-gm-2026-10/p04-f03.test.mjs": "91dc7de0fe1ea855232341ab2cdc8f610ed14b999a13f79e1b5232459d975455"
  },
  "tests": [
    "bot/tests/ai-gm-2026-10/p04-f01.test.mjs",
    "bot/tests/ai-gm-2026-10/p04-f02.test.mjs",
    "bot/tests/ai-gm-2026-10/p04-f03.test.mjs"
  ],
  "syntax": [
    {
      "path": "bot/src/scene-action-window.js",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/src/audience-first-capability.js",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/src/assembly-planning.js",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/tests/ai-gm-2026-10/p04-f01.test.mjs",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/tests/ai-gm-2026-10/p04-f02.test.mjs",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/tests/ai-gm-2026-10/p04-f03.test.mjs",
      "exit": 0,
      "error": ""
    }
  ],
  "command": "node --test --test-reporter=tap bot/tests/ai-gm-2026-10/p04-f01.test.mjs bot/tests/ai-gm-2026-10/p04-f02.test.mjs bot/tests/ai-gm-2026-10/p04-f03.test.mjs",
  "end": "2026-10-21T16:00:45.541Z",
  "exit": 0,
  "error": null,
  "summary": [
    "# tests 6",
    "# pass 6",
    "# fail 0",
    "# cancelled 0",
    "# skipped 0",
    "# duration_ms 392.006"
  ]
}
```

## Final source freeze

SHA: `8e01519b6511bc90af6a1c675e4a9950f12b703c`; branch: `codex/clean-ai-gm-2026-10`. Run: `fresh-delta-1792599054739`, 2026-10-21T16:10:54.739Z to 2026-10-21T16:10:58.308Z.

[Final command, exact input/test hashes and results](../../evidence/FINAL_DELTA.json): 47/47 fresh tests across 20 files, exit 0; 43 syntax checks pass. This feature participates only through its affected tests, except P00-F01 which is documentation-only. No inherited test, fixture, registry, broad validator, model-as-judge or paid provider run.

No new narrative restriction awaits owner. No critical blocker. Local unsupported adapters and unverified integration remain explicit above. Release is **NOT AUTHORIZED / NOT CERTIFIED**. Earlier PLANNED/NOT RUN wording in retained intake notes is historical, superseded by these execution entries.
