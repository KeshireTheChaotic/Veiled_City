# P06-F01 — Special native features by occurrence: ledger

**Status:** SOURCE PASS / LOCAL ADAPTER HOLDS. Static source anchor `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

| Field | Evidence / result |
|---|---|
| Actual checkout & dirty-tree fingerprint | Intake 0834f299ccff1738e9b3dd753a5fc616d3965370; 22 modified plan files (56 insertions/4 deletions) plus untracked no-poll policy. Final source 8e01519b6511bc90af6a1c675e4a9950f12b703c; owner docs retained unstaged. |
| Changed production code | See execution entries and final source manifest below |
| Existing-doc/code delta verified | Current-source crosswalk and owner specification reconciled; no full behavior certification |
| New test location | bot/tests/ai-gm-2026-10/p06-f01.test.mjs |
| Tests actually executed & outcomes | Final frozen union: 47/47, exit 0; feature-specific evidence below |
| Runtime/mock measurements | Only the fresh scenarios documented below; no live measurement |
| Provider calls/tokens/expense | 0 real provider calls/tokens; $0 provider-test spend; Codex usage unavailable |
| Cache and invalidation evidence | P05-F02 has measured warm/cold/source/audience invalidation; no other cache claim |
| New narrative/autonomy restrictions or owner question | None proposed |
| Noncritical holds | See explicit local holds/unverified work in execution entries |
| Critical blocker | None established |
| Rollback / next step | Reverse only feature diff; retain historical readers/state and all owner edits. Resolve listed local holds separately. |

## Execution 2026-10-21 — SOURCE PASS / LOCAL ADAPTER HOLDS

HEAD: `0834f299ccff1738e9b3dd753a5fc616d3965370`; branch: `codex/clean-ai-gm-2026-10`. Changes are working-tree deltas; input/test hashes below identify tested content.

All 153 exact occurrences pass source inspection. Occurrence-local discovery isolates a changed actor while unrelated supported actors remain available. Strict historical full-catalog compiler is preserved. 153 scope/ledger pairs created; descriptors unchanged, 16 supported and 137 review_only. Initial batch had 4 pass/1 failure due to missed selector wiring; repair passed 5/5. Final union passes.

Changed paths: bot/src/native-feature-catalog.js.

Provider tests: 0 calls, 0 provider tokens, $0 provider test spend. Codex token/cost totals unavailable; no invented savings. Cache: no claim unless measured below. Owner restrictions proposed: none. Local holds/unverified: 137 occurrence adapters remain review_only; source verification does not qualify native execution. No new handler enabled. Critical blockers: none established. Release: NOT AUTHORIZED / NOT CERTIFIED. Rollback: reverse only this feature diff, preserving intake edits and saved records.

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

## Resumption checkpoint — 2026-10-21

Current branch/SHA: `codex/clean-ai-gm-2026-10` / `8e01519b6511bc90af6a1c675e4a9950f12b703c`. Re-inspected the exact native source and consumer for `adversary:aster-vale-catastrophe-analyst:bad-branch`. The source-bound trigger predicate exists, but the execution path has no qualified native position-selection/movement commit for its printed effect; occurrence remains locally held. Changed production modules: none. Fresh tests run: none because no production code changed; previous 5/5 P06 feature batch and 47/47 final union remain the applicable existing evidence and were not rerun. Documentation changed: P06-F01 ledger, occurrence scope/ledger, P06 phase ledger, and stale P00/P01 feature-scope status labels. Provider calls/tokens/spend 0/0/$0; Codex usage unavailable. No restriction awaits owner. No critical blocker. Release not authorized.

## Resumption checkpoint — second occurrence — 2026-10-21

Current checkout before closeout commit: `codex/clean-ai-gm-2026-10` / `62e13b4b39330ef9b2b144065d1d54616fdd8b34`; tested implementation source: `8e01519b6511bc90af6a1c675e4a9950f12b703c`. Reviewed `adversary:aster-vale-catastrophe-analyst:forecast-window`: printed rule is a 1 NPC Stress cost and temporary advantage grant to a Far allied adversary, expiring after the Analyst's Severe damage. Native code has no stored grant, one-use roll consumption or expiry receipt. Occurrence stays `review_only`. Changed production modules: none. No fresh tests rerun because no production code changed; the previous catalog-source tests remain non-qualifying for effect execution. Docs changed: occurrence scope/ledger, P06-F01 ledger and phase P06 ledger. Provider calls/tokens/spend 0/0/$0; Codex usage unavailable. No owner restrictions, no critical blocker, release unauthorized.

## Resumption checkpoint — P06-F38 — 2026-10-21

Implementation commit: `c9f214667bee01a21c97580870d13176b20b4812`. Added an occurrence-specific source-checked GM context cue for Containment Shutters. It exposes the printed one-Fear and Difficulty 14 route rule while committing no Fear, barrier, route, PC choice, roll or result. Fresh run `p06-f38-20261021-a`: 132 tests across 36 mapped fresh files (130 pass, 2 stale-count failures); only the repaired fresh catalog test reran as `p06-f38-20261021-repair`, passing 3/3. Unique cases 132/132 pass; changed syntax 6/6; JSON 2/2. Catalog: 51 supported / 102 review-only / 0 needs-authoring. Fear spend, barrier state, route and Difficulty 14 outcome remain local holds. Provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable. No owner question or new restriction; no critical blocker; release unauthorized. See [P06-F38 evidence](../../evidence/P06_F38_TARGETED.json).

## Resumption checkpoint — P06-F39 — 2026-10-21

Implementation commit: `eb49d962659e70a29c1a2481a1a67fb37f78b2c7`. Added a source-checked exact Break the Hold GM cue to current bound adversary context. Fresh run `p06-f39-20261021-a`: 136 tests across 37 mapped fresh files (135 pass, 1 stale source-isolation count); only the repaired F01 catalog test reran as `p06-f39-20261021-repair`, passing 3/3. Unique cases 136/136 pass; changed syntax 6/6; JSON 2/2. Catalog now 52 supported / 101 review-only / 0 needs-authoring. Proof trigger, player-owned Presence Roll and conflict-removal result remain local holds. Provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable. No owner question, new restriction or critical blocker. Release unauthorized. Evidence: [P06-F39](../../evidence/P06_F39_TARGETED.json).

## Resumption checkpoint — P06-F40 — 2026-10-21

Implementation commit: `6e60f3442f85e707e148c11d9a49d59dde7566dd`. Added a source-checked exact Professional Entry cue to current bound Contractor context. Fresh run `p06-f40-20261021-a`: 140 tests across 38 mapped fresh files (139 pass, 1 stale source-isolation count); only the repaired F01 catalog test reran as `p06-f40-20261021-repair`, passing 3/3. Unique cases 140/140 pass; changed syntax 6/6; JSON 2/2. Catalog now 53 supported / 100 review-only / 0 needs-authoring. Prepared-position/first-use predicate and native Advantage application remain local holds. Provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable. No owner question, new restriction or critical blocker. Release unauthorized. Evidence: [P06-F40](../../evidence/P06_F40_TARGETED.json).

## Resumption checkpoint — P06-F41 — 2026-10-21

Implementation commit: `71761927e547ca0b0ba5d73ae2246f06b5e5c818`. Added an exact source-checked Mark the Variable cue to current bound Analyst context. Frozen `p06-f41-20261021-a` passed 144/144 tests across 39 fresh files, no repair/rerun; syntax 5/5 and JSON 2/2 passed. Catalog now 54 supported / 99 review-only / 0 needs-authoring. NPC Stress, PC/ally/target, Difficulty grant and Severe-damage expiry remain local holds. Provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable. No owner question, restriction or critical blocker; release unauthorized. See [P06-F41 evidence](../../evidence/P06_F41_TARGETED.json).
