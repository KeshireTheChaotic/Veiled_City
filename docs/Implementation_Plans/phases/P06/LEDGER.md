# P06 — Native catalog and qualification: ledger

| Feature | Status | Evidence |
|---|---|---|
| [P06-F01](../../features/P06-F01/LEDGER.md) | SOURCE PASS / LOCAL HOLDS | Phase baseline 8e01519; occurrence changes through bd517f2; see feature ledger |
| [P06-F02](../../features/P06-F02/LEDGER.md) | TARGETED PASS | Phase baseline 8e01519; see feature ledger |
| [P06-F03](../../features/P06-F03/LEDGER.md) | TARGETED PASS | Phase baseline 8e01519; see feature ledger |
| [P06-F04](../../features/P06-F04/LEDGER.md) | TARGETED PASS | `p06-f04-20261021-a`; 6/6 tests; implementation `bd517f2`; see feature ledger |
| [P06-F05](../../features/P06-F05/LEDGER.md) | TARGETED PASS / SUPPORTED | `p06-f05-20261021-a`; 5/5 tests; see feature ledger |
| [P06-F06](../../features/P06-F06/LEDGER.md) | TARGETED PASS / SUPPORTED | `p06-f06-20261021-a`; 10 unique passing tests after one catalog assertion repair; see feature ledger |
| [P06-F07](../../features/P06-F07/LEDGER.md) | TARGETED PASS / SUPPORTED | `p06-f07-20261021-a`; 12/12 tests; see feature ledger |
| [P06-F08](../../features/P06-F08/LEDGER.md) | TARGETED PASS / SUPPORTED | `p06-f08-20261021-a`; 14/14 tests; see feature ledger |
| [P06-F09](../../features/P06-F09/LEDGER.md) | TARGETED PASS / SUPPORTED | `p06-f09-20261021-a`; see feature ledger |
| [P06-F10](../../features/P06-F10/LEDGER.md) | TARGETED PASS / SUPPORTED | `p06-f10-20261021-a`; owner approved broadening the adapter |
| [P06-F11](../../features/P06-F11/LEDGER.md) | TARGETED PASS / SUPPORTED | `p06-f11-20261021-a`; see feature ledger |
| [P06-F12](../../features/P06-F12/LEDGER.md) | SUPPORTED / TARGETED DELTA PASS | `p06-f12-20261021-a`; see feature ledger |
| [P06-F13](../../features/P06-F13/LEDGER.md) | SUPPORTED / TARGETED DELTA PASS | `p06-f13-20261021-a`; see feature ledger |
| [P06-F14](../../features/P06-F14/LEDGER.md) | SUPPORTED / TARGETED PASS | `p06-f14-20261021-a`; source-qualified Door Chain adapter; see feature ledger and [evidence](../../evidence/P06_F14_TARGETED.json) |
| [P06-F15](../../features/P06-F15/LEDGER.md) | TARGETED PASS / COMMIT PENDING | `p06-f15-20261021-a`; source-bound imaging record; see feature ledger and [evidence](../../evidence/P06_F15_TARGETED.json) |

Audit anchor: `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`. P00-P05 implementation baseline: `8e01519b6511bc90af6a1c675e4a9950f12b703c`; final P06 source: `bd517f2ad101d7a8c14dcbd36476ca67748d180b`. Baseline fresh delta: 47/47 tests passed across 20 fresh files and 43 changed-file syntax checks passed (exit 0), run `fresh-delta-1792599054739`. P06-F04 delta is separately recorded below. This phase is covered by feature results and is not 47 unique tests on its own. Critical blockers: none established. Phase-specific holds and unverified work remain below.

**Test execution:** one final blocking frozen-delta run, no polling: `fresh-delta-1792599054739`, exit 0. Full command, hashes and concise results: [FINAL_DELTA.json](../../evidence/FINAL_DELTA.json). Feature ledgers retain the individual affected-code batches and any repair history.

### P06-F01: SOURCE PASS / LOCAL ADAPTER HOLDS
All 153 exact occurrences pass source inspection. Occurrence-local discovery isolates a changed actor while unrelated supported actors remain available. Strict historical full-catalog compiler is preserved. 153 scope/ledger pairs created; descriptors unchanged, 16 supported and 137 review_only. Initial batch had 4 pass/1 failure due to missed selector wiring; repair passed 5/5. Final union passes.
Changed: bot/src/native-feature-catalog.js. SHA: 0834f299ccff1738e9b3dd753a5fc616d3965370 + working delta. Tests: p06-1792598757560; exit 0; # tests 5; # pass 5; # fail 0; # cancelled 0; # skipped 0; # duration_ms 322.997. Full hashes/command in feature ledger. Provider calls/tokens/spend: 0/0/$0; Codex usage unavailable. Restrictions: none proposed. Local holds: 137 occurrence adapters remain review_only; source verification does not qualify native execution. No new handler enabled. Critical: none established. Release unauthorized.

### P06-F02: TARGETED PASS
Player export recursively excludes GM-only hook/canon infrastructure and explicitly GM-private nested records, preserving player background, mechanics and unknown player fields. GM hook export remains available; saved data is not mutated. No Daggerheart rule changed.
Changed: bot/src/character-export.js. SHA: 0834f299ccff1738e9b3dd753a5fc616d3965370 + working delta. Tests: p06-1792598757560; exit 0; # tests 5; # pass 5; # fail 0; # cancelled 0; # skipped 0; # duration_ms 322.997. Full hashes/command in feature ledger. Provider calls/tokens/spend: 0/0/$0; Codex usage unavailable. Restrictions: none proposed. Local holds: Full import lifecycle and rule reconciliation beyond affected export contract are unverified. Critical: none established. Release unauthorized.

### P06-F03: TARGETED DELTA PASS
New independent runner selects only fresh mapped tests, rejects unknown source and inherited script paths, checks changed syntax and executes the frozen test union once without polling. Final: 47 pass, 0 fail/cancelled/skipped; 20 fresh files, 43 syntax checks.
Changed: bot/scripts/ai-gm-delta.mjs, bot/src/ai-gm-test-selection.js, bot/tests/ai-gm-2026-10/coverage.json. SHA: 0834f299ccff1738e9b3dd753a5fc616d3965370 + working delta. Tests: fresh-delta-1792599054739; exit 0; # tests 47; # pass 47; # fail 0; # cancelled 0; # skipped 0; # duration_ms 1575.418. Full hashes/command in feature ledger. Provider calls/tokens/spend: 0/0/$0; Codex usage unavailable. Restrictions: none proposed. Local holds: Live/provider/Discord and broad release certification not authorized or performed. Critical: none established. Release unauthorized.

## Final frozen delta

Implementation SHA: `8e01519b6511bc90af6a1c675e4a9950f12b703c`. Status: source/delta pass with 137 review-only occurrence holds. Occurrence sources, private export and frozen delta qualification.

Run `fresh-delta-1792599054739`: 47/47 tests across 20 fresh files, exit 0; 43 changed-file syntax checks exit 0. Input/test hashes and complete command: [FINAL_DELTA.json](../../evidence/FINAL_DELTA.json). This phase's tests are a subset of that union, not 47 unique tests per phase.

Provider calls/tokens/spend: 0/0/$0. Codex tokens/cost unavailable. No subagents. No new creative restrictions awaiting owner; full owner spec read. No critical blocker. Local holds and unverified work remain in each feature ledger. No release authorization or certification. Source commit is clean; owner plan/specification and this documentation remain working-tree edits. Rollback only the affected source diff, preserving saved state and owner documents.

## Resumption checkpoint — 2026-10-21

Current branch/SHA: `codex/clean-ai-gm-2026-10` / `8e01519b6511bc90af6a1c675e4a9950f12b703c`. Exact-source review of `adversary:aster-vale-catastrophe-analyst:bad-branch` confirmed its printed Stress cost and better-position effect, and located a source-bound success-with-Fear trigger predicate. No matching position/effect commit exists in the qualified native route, so this occurrence stays `review_only`; see its occurrence scope and ledger. Changed production modules: none. New tests run: none, because implementation was unchanged and prior passing tests must not be repeated. Existing P06 result remains 5/5 in its feature batch and 47/47 final fresh union; those do not qualify the held effect. Documentation changed: P06 phase/feature and exact occurrence records; P00/P01 scope status labels aligned to their existing ledgers. Provider calls/tokens/spend 0/0/$0; Codex usage unavailable. No owner restriction proposed, no critical blocker, no release authorization.

## Resumption checkpoint — second occurrence — 2026-10-21

Current checkout before closeout commit: `codex/clean-ai-gm-2026-10` / `62e13b4b39330ef9b2b144065d1d54616fdd8b34`; tested implementation source: `8e01519b6511bc90af6a1c675e4a9950f12b703c`. Exact-rule review of `adversary:aster-vale-catastrophe-analyst:forecast-window` found the printed Stress cost and temporary advantage duration, but no native persisted grant/consume/expiry path. It remains an occurrence-local `review_only` hold. See the occurrence scope and ledger. Changed production modules: none. New tests run: none; prior green tests were left untouched because associated code did not change. Existing final delta remains 47/47 and is not execution qualification for this rule. Docs changed: occurrence scope/ledger plus P06-F01 and phase P06 ledgers. Provider calls/tokens/spend 0/0/$0; Codex usage unavailable. No owner question or restriction, no critical blocker, release unauthorized.

## P06-F04 phase checkpoint — 2026-10-21

Current base HEAD: `97d3a696831af78d5eb42865467be2dab4b30797`; tested implementation inputs are hash-pinned in [P06_F04_TARGETED.json](../../evidence/P06_F04_TARGETED.json). Sirens Outside is now the 17th supported occurrence; 136 remain review-only. Frozen affected-code batch `p06-f04-20261021-a` passed 6/6 tests and 4/4 syntax checks. Only `p06-f01.test.mjs` was rerun among previous tests because its associated catalog module and expected count changed; `p06-f04.test.mjs` is new. No other passing tests were rerun. Provider calls/tokens/spend 0/0/$0; Codex usage unavailable. No owner restrictions or critical blockers. Local holds remain occurrence-scoped. Not full release qualification; release unauthorized.

P06 phase commit: `bd517f2ad101d7a8c14dcbd36476ca67748d180b`. Current catalog is 17 supported, 136 review-only, 0 needs-authoring. These 136 are occurrence-local review holds, not a critical phase blocker. The source crosswalk and top-level inventory now reflect the implementation commit. No broad suite was run; no passing tests were rerun without associated code changes. Release authorization remains false.

P06-F05 promotes only Upload in Progress through its existing native countdown contract. Frozen batch `p06-f05-20261021-a` passed 5/5 with 4/4 syntax checks. Catalog is now 18 supported, 135 review-only, 0 needs-authoring. Provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable. No new narrative restriction or critical blocker; release remains unauthorized.

Latest source commit: `4969d912a37df3d8ee35418461dae0d61d1ba742`. README and current source crosswalk inventory fields match the 18/135 catalog state.

P06-F06 enables the exact Too Loud to Think native roll-modifier mapping. Initial batch had one stale expected-status assertion; the single affected catalog test file was repaired and passed, and already-passing feature tests were not rerun. Final unique affected coverage is 10 tests passing; four initial plus one repair syntax checks passed. Current catalog: 19 supported / 134 review-only / 0 needs-authoring. Provider calls/tokens/spend 0/0/$0, no cache claim. No owner restriction or critical blocker; release unauthorized.

Latest implementation SHA: `ca570f89768777e1c165f7d74d6b281e0a1c6580`; current inventory remains 19 supported / 134 review-only.

P06-F07 enables Emergency Cascade through its existing exact scene-action route. The shared fresh batch passed 12/12 with 4/4 syntax checks. Current catalog: 20 supported / 133 review-only / 0 needs-authoring. Provider calls/tokens/spend 0/0/$0; no cache claim. No owner question, new narrative restriction or critical blocker; release unauthorized.

P06-F08 enables Code Blue through its exact existing medical emergency route. Fresh shared batch passed 14/14 with 4/4 syntax checks. Catalog: 21 supported / 132 review-only / 0 needs-authoring. Provider calls/tokens/spend 0/0/$0; no cache claim. No owner question, new narrative restriction or critical blocker; release unauthorized.

Latest implementation SHA: `c3fae2768504fb7b4971c47b0f647fe9d0bf1d43`; current catalog has 21 supported occurrences.

P06-F09 supports VIP Threshold through its existing source-backed private-floor admission contract. Initial frozen batch passed 15/16; a case-insensitive assertion repair was isolated and the repaired file passed 2/2. Unique tests: 16 pass after repair; five syntax checks passed. Catalog: 22 supported / 131 review-only / 0 needs-authoring. Implementation SHA: `7b011f25c4cd6ad24aef92a74b3db49616e5b79e`. Provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable. No new narrative restriction, owner question or critical blocker; release unauthorized.

P06-F10 broadens Automatic Correction per the owner's answer to its open scope question. Its initial frozen batch passed 17/19; two failed files were repaired and only those files reran, passing 6/6. Unique test cases: 19/19 pass after repair; five syntax checks passed. Catalog: 23 supported / 130 review-only / 0 needs-authoring. Implementation SHA: `95e21990e740d17cda5f4386ffbeb35a6070516a`. Provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable. No new creative limitation, critical blocker or release authorization.

P06-F11 enables Everybody Saw Something Different through the existing exact attributed-witness adapter. Its frozen batch passed 22/22 with four syntax checks. The test delta covers source/capability integrity and early malformed-proposal rejection; complete live-state witness establishment remains unverified. Catalog: 24 supported / 129 review-only / 0 needs-authoring. Implementation SHA: `a857ae4d1dea57e8ecb87309f01371f0f33ebd52`. Provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable. No new narrative limitation, critical blocker or release authorization.

P06-F12 supports Maintenance Memory through an audience-visible, exact established-fact anchor. Initial batch `p06-f12-20261021-a` completed 28/29; its sole failure was an ASCII/typographic apostrophe mismatch in the new assertion. Only the changed `p06-f12.test.mjs` was rerun, passing 4/4. Unique feature/batch tests: 29 passed after repair. Changed JS/MJS syntax: 6/6; changed JSON parsed: 2/2. Live integrated scene receipt/replay remains unverified. Catalog: 25 supported / 128 review-only / 0 needs-authoring. Provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable. No new creative limitation or critical blocker; release unauthorized. See [P06-F12 evidence](../../evidence/P06_F12_TARGETED.json).

P06-F12 feature implementation commit: `9e9e94b89b7c77e8e7cddac84aa406515b9d08e2`.

P06-F13 supports Storm Drain Shrine Local Memory through the existing native ordinary-roll modifier and player-owned roll path. Its frozen affected-code batch passed 30/30; 7 changed JS/MJS syntax checks and 2 changed JSON parses passed. Source-bound tests cover passive Advantage, exact action/environment/actor binding, forged protocol rejection and the unified arbitration route; complete live-state modifier/receipt replay remains unverified. Catalog: 26 supported / 127 review-only / 0 needs-authoring. Provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable. No creative limitation, owner question or critical blocker; release unauthorized. See [P06-F13 evidence](../../evidence/P06_F13_TARGETED.json).

Latest implementation SHA: `2958560f52e0bce6c1dc91eacd0b1532875f1c29`; current inventory remains 20 supported / 133 review-only.

P06-F14 supports Apartment Veil Breach Door Chain via a source-bound current-scene resident identity and obstacle receipt. The first affected-code batch reported one failure in the new F14 fixture (missing location on its test profile); only the changed F14 test reran and passed 5/5, exit 0. The initial batch also performed 9/9 changed JS/MJS syntax checks and 2/2 JSON parses. No aggregate initial case count was returned by the runner and is not inferred. Evidence and file hashes: [P06-F14 evidence](../../evidence/P06_F14_TARGETED.json). Implementation commit `16652d07f36dbf9b83c4da69d39fd43a7f144382`. Catalog: 27 supported / 126 review-only / 0 needs-authoring. Provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable. Same-turn delivery and persistent DB replay remain unverified; no owner restriction or critical blocker; release unauthorized.

P06-F15 supports After-Hours Emergency Department Something in Imaging with a source-bound anomaly/clue record scoped to its entitled audience. Its affected-code batch ran 43 tests: 42 passed, 1 failed on a test-only source assertion; only the changed p06-f15 file reran, passing 5/5. Final unique coverage 43/43; syntax 10/10 and JSON 2/2. Evidence and input hashes: [P06-F15 evidence](../../evidence/P06_F15_TARGETED.json). Catalog: 28 supported / 125 review-only / 0 needs-authoring. Provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable. DB replay/audience integration and same-turn narration remain unverified. No owner restriction or critical blocker; release unauthorized. Commit SHA to follow.
