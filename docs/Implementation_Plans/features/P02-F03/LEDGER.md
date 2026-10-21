# P02-F03 — Receipt and replay safety: ledger

**Status:** TARGETED DELTA PASS. Static source anchor `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

| Field | Evidence / result |
|---|---|
| Actual checkout & dirty-tree fingerprint | Intake 0834f299ccff1738e9b3dd753a5fc616d3965370; 22 modified plan files (56 insertions/4 deletions) plus untracked no-poll policy. Final source 8e01519b6511bc90af6a1c675e4a9950f12b703c; owner docs retained unstaged. |
| Changed production code | See execution entries and final source manifest below |
| Existing-doc/code delta verified | Current-source crosswalk and owner specification reconciled; no full behavior certification |
| New test location | bot/tests/ai-gm-2026-10/p02-f03.test.mjs |
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

Outbox now requires exact queued-channel acknowledgement and preserves uncertain-send holds. Disposable in-memory SQLite tests verify delivered/uncertain replay never sends. Initial batch exposed an import cycle; extracted the unchanged GM ruling schema/validator into a dependency-free module, retaining legacy exports. Initial batch: 6 pass, 1 import failure (run p02-1792598182574); one batched repair rerun: 8/8 pass.

Changed paths: bot/src/publication-outbox.js, bot/src/gm-ruling-schema.js, bot/src/gm-action-ruling.js, bot/src/typed-intents.js.

Provider tests: 0 calls, 0 provider tokens, $0 provider test spend. Codex token/cost totals unavailable; no invented savings. Cache: no claim unless measured below. Owner restrictions proposed: none. Local holds/unverified: Full production SQLite transaction, crash recovery and live Discord integration remain unverified. Critical blockers: none established. Release: NOT AUTHORIZED / NOT CERTIFIED. Rollback: reverse only this feature diff, preserving intake edits and saved records.

```json
{
  "run_id": "p02-1792598214135",
  "sha": "0834f299ccff1738e9b3dd753a5fc616d3965370",
  "start": "2026-10-21T15:56:54.176Z",
  "hashes": {
    "bot/src/action-consent.js": "89cd6e8337281901bbd1495acbe6bffe8aa69c8ff51234dc704f87625925e1ef",
    "bot/src/dice.js": "6534195eb0441d0c9982616a5d79e71f5067ddc863883a4cabda17072b6c865c",
    "bot/src/publication-outbox.js": "bccc83eb85b32bd807533a746cc9c65b2ae32c5bb6f4fda30fc6e9ea709559ab",
    "bot/src/gm-action-ruling.js": "e464b417969cf7858912d1c13ed1387f703cee4f12c118206a520b228bc4e6d5",
    "bot/src/gm-ruling-schema.js": "5bf7a66e7ea7c9b2f37dff2b76e19a5370eedd3f360a1afdabdfe8e1d74ee970",
    "bot/src/typed-intents.js": "ab22c14465978178bc24c2081ea7277e9f09da46fbb6775c382db6dcd32c795d",
    "bot/tests/ai-gm-2026-10/p02-f01.test.mjs": "f248845b35fde5f31f519526cb6ac9f289895fe7b8a6b0973eab0ab0462c5aed",
    "bot/tests/ai-gm-2026-10/p02-f02.test.mjs": "f2bfd26f1310aca238f37394029c7eb48ce9ea4b94cc3fb50c7ed28be1371f24",
    "bot/tests/ai-gm-2026-10/p02-f03.test.mjs": "c10128bbd70e06c46d967fae735a5656758f14138b2d88192f0a6327865b7680"
  },
  "tests": [
    "bot/tests/ai-gm-2026-10/p02-f01.test.mjs",
    "bot/tests/ai-gm-2026-10/p02-f02.test.mjs",
    "bot/tests/ai-gm-2026-10/p02-f03.test.mjs"
  ],
  "syntax": [
    {
      "path": "bot/src/action-consent.js",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/src/dice.js",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/src/publication-outbox.js",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/src/gm-action-ruling.js",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/src/gm-ruling-schema.js",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/src/typed-intents.js",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/tests/ai-gm-2026-10/p02-f01.test.mjs",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/tests/ai-gm-2026-10/p02-f02.test.mjs",
      "exit": 0,
      "error": ""
    },
    {
      "path": "bot/tests/ai-gm-2026-10/p02-f03.test.mjs",
      "exit": 0,
      "error": ""
    }
  ],
  "command": "node --test --test-reporter=tap bot/tests/ai-gm-2026-10/p02-f01.test.mjs bot/tests/ai-gm-2026-10/p02-f02.test.mjs bot/tests/ai-gm-2026-10/p02-f03.test.mjs",
  "end": "2026-10-21T15:56:54.907Z",
  "exit": 0,
  "error": null,
  "summary": [
    "# tests 8",
    "# pass 8",
    "# fail 0",
    "# cancelled 0",
    "# skipped 0",
    "# duration_ms 329.4393"
  ]
}
```

## Final source freeze

SHA: `8e01519b6511bc90af6a1c675e4a9950f12b703c`; branch: `codex/clean-ai-gm-2026-10`. Run: `fresh-delta-1792599054739`, 2026-10-21T16:10:54.739Z to 2026-10-21T16:10:58.308Z.

[Final command, exact input/test hashes and results](../../evidence/FINAL_DELTA.json): 47/47 fresh tests across 20 files, exit 0; 43 syntax checks pass. This feature participates only through its affected tests, except P00-F01 which is documentation-only. No inherited test, fixture, registry, broad validator, model-as-judge or paid provider run.

No new narrative restriction awaits owner. No critical blocker. Local unsupported adapters and unverified integration remain explicit above. Release is **NOT AUTHORIZED / NOT CERTIFIED**. Earlier PLANNED/NOT RUN wording in retained intake notes is historical, superseded by these execution entries.
