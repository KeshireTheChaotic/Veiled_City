# P07 — Phase ledger

**Status:** IMPLEMENTATION COMPLETE — OFFLINE DELTA PASSED; LIVE ACCEPTANCE / RELEASE NOT AUTHORIZED. **Branch:** `codex/clean-ai-gm-2026-10`. **Baseline:** `42ca6334bf19fb0a4a3b3f1ea38bf6cd6bd47b0d`.

| Feature | Status | Evidence |
|---|---|---|
| P07-F01 | COMPLETE | Documentation baseline commit `e8646c3a295391f913d79c3288b43b848761d827`. |
| P07-F02 | COMPLETE | Pure policy; 4/4 fresh tests and syntax pass; commit `5bd61cbaafab95f314f99208d979c1bcd56c221b`. |
| P07-F03 | COMPLETE | Bridge integration; 3/3 fresh tests and syntax pass; commit `4d07d4c260406c3cd364590f1c83d649b0a07e10`. |
| P07-F04 | COMPLETE | Existing Director prompt guidance; 2/2 fresh tests and syntax pass; commit `cccd0304fa491a9a8425d9693cf94f11e3eacbc7`. |
| P07-F05 | SUPPORTED BY EXISTING CODE / STATIC | Privacy, continuity, memory, assembly and spotlight boundaries inspected; docs-only. |
| P07-F06 | COMPLETE — DELTA VERIFIED | 4 fresh acceptance tests passed; commit `35fa2eb5510bdff14cb9648e41513cf81878efe3`. |

## Phase evidence

| Field | Result |
|---|---|
| Initial worktree | Tracked tree clean; preserved user-created untracked P07 plan, P08 plan supplement, and P09 plans. |
| Feature commits | F01 `e8646c3a295391f913d79c3288b43b848761d827`; F02 `5bd61cbaafab95f314f99208d979c1bcd56c221b`; F03 `4d07d4c260406c3cd364590f1c83d649b0a07e10`; F04 `cccd0304fa491a9a8425d9693cf94f11e3eacbc7`; F05 `5c1da825f6bffd52d30a3882af19df6f2ddf6a3c`; F06 pending. |
| Fresh tests | F02 4 pass; F03 3 pass; F04 2 pass; F06 4 pass. Total 13 passed, 0 failed/skipped across four independent one-shot batches. F01/F05 doc/static only. Earlier passing feature suites not rerun after unrelated changes. |
| Test note | Initial F02 syntax check caught one missing parenthesis before test execution; repaired once, then the one frozen feature batch passed. No test was rerun after a pass. |
| Required references | README, TEST_PROTOCOL, DECISION_GATES, TEST_EXECUTION_NO_POLL, OWNER_AI_GM_BEHAVIOR_SPEC, CODEX_START_HERE, ENGINE constitution, and P07 handoff read. |
| Owner restrictions/questions | No new restrictive behavior proposed. Existing P07 policy is an optional deterministic tie-break; player agency/privacy/mechanics remain protected. |
| Tests/cost | No tests or providers used for documentation/baseline work; provider calls/tokens/cost = 0/0/$0. |
| Critical blockers | None. |
| Release authorization | Not authorized; no release certification. |

## Phase closeout

P07 implements deterministic same-NPC cross-character conversation overlap only when two current party-visible native accepted speech-intent sources match exact hashes. It preserves existing signal schemas, source identities, four-signal selection limit, response/causal precedence and revalidation. Director prompt guidance adds no model call. Static inspection found no need to change memory, privacy, continuity, spotlight, mechanics or outbox code.

Known local hold: cross-character relationships/interests/locations beyond the same-NPC speech evidence remain `unknown` and preserve existing order; no safe native cross-signal proof was established for those classes. No owner restrictions/questions are pending. No provider calls/tokens/expense; no cache or live latency evidence.

Fresh delta verification is not live semantics, Discord, database, cross-process replay/delivery or release certification. No critical blockers; NOT DEPLOYED / NOT FULL RELEASE QUALIFIED / RELEASE NOT AUTHORIZED. The final phase-evidence commit is reported by exact HEAD in the handoff.

Update this ledger after each feature commit with exact SHA, files, test command/results and hashes when applicable, cost/cache evidence, local holds, decisions, and rollback. No production data migrations are planned; rollback is feature-commit revert.

## Corrective delta P07-F07..F12 (2026-10-22)

**Corrective status:** SAFE HIGH-PRIORITY DEFECTS FIXED; REMAINING MEDIUM INTEGRATION GAPS HELD. P07 is **not fully verified** and is **not release-qualified** while the Director handoff and source-to-optional intersection remain unproven.

**Actual corrective baseline:** branch `codex/clean-ai-gm-2026-10`, HEAD `47f93d755e8afc00a13206f148cf759f3c826269`, matching the tracked remote branch at intake. P08 edits were already present and are preserved. The final corrective source/test state was executed from working tree based on `607dba7b9a88696b956a9f7d0358edb8b7381410`; final source and coverage hashes are recorded below.

**Final local code/document commit:** `07d090322ef155368c3b1dad877fc019d1ba6946` on `codex/clean-ai-gm-2026-10`. This closeout contains the optional-only comparator hardening, removes the unsafe F10 causal-overlap experiment, and adds the F07–F12 ledgers. A subsequent metadata edit to this ledger is intentionally left in the worktree so no more commits are made while the remote-ref discrepancy is unresolved.

### Findings A1–A7

| Finding | Disposition | Current evidence |
|---|---|---|
| A1 duplicate coverage keys (HIGH) | FIXED | Four raw duplicate mappings were found (`world-narrative-bridge.js`, `gm.js`, `native-feature-catalog.js`, `native-adversary-context.js`). Registry rebuilt with one root key and the deduplicated union for each. Fresh F07 raw-key and `selectFreshTests()` tests passed. |
| A2 mandatory-response displacement (HIGH) | FIXED | Bridge now distinguishes opening/unresolved mandatory work, resolved intents as causal consequences, and ordinary conversation development as optional personal opportunity. The policy categorically prevents overlap metadata from reordering mandatory or causal classes. Fresh F09 7-candidate cap case retains opening recovery and a late unresolved task; F03 stale expected ordering was corrected to the new hard precedence. |
| A3 comparator antisymmetry (MEDIUM) | FIXED | Distinct qualified overlap sets now compare equally and keep input order; overlap is only considered in optional classes. F08 covers permutations, stability, class/urgency, no mutation, and mandatory/causal non-interference. |
| A4 additional non-conversation evidence (MEDIUM) | PROVEN LOCAL HOLD | Shared resolved-action source is causal, not optional. A possible common root cannot safely earn party tie-break priority without risking consequence order. F10 tests ensure these outcomes keep source order. No other native source proves an independently linked optional opportunity. |
| A5 Director downstream cap (MEDIUM) | PROVEN LOCAL HOLD | Path inspected: `worldNarrativeBridgePacket()` → `bindDirectorNarrativeSource()` source snapshot → `directorBriefForAudience()` → `worldDirectorBridgeBeats()` → `narrative-authority-context.js` `director_brief` → existing writer flow. Director bridge beats validate current sources, but established native narrative/receipt beats are built ahead of pacing hints under the same cap. No source-bound offline Director fixture proves which beats are comparably optional, so reordering is held. |
| A6 realistic end-to-end acceptance (MEDIUM) | PROVEN LOCAL HOLD | Fresh current-code tests cover ranking, hashes, mandatory cap, registry selection and privacy boundary. No disposable-SQLite candidate-to-Director/Discord fixture was safely completed. Historical 13-test count is not new certification; no live, publication, persistence-replay, or semantic quality claim. |
| A7 stale F06 pending wording (LOW) | FIXED | This append supersedes the old “F06 pending” summary without rewriting the F01–F06 history. The old line is a stale snapshot; F06 was previously committed at `35fa2eb5510bdff14cb9648e41513cf81878efe3`. |

### Corrective feature evidence

| Feature | Status | Changed contracts and fresh evidence |
|---|---|---|
| F07 | COMPLETE | Coverage registry union; 2/2 F07 tests pass. Commit `4c8b480f59554707ed3390fcb4150e23d9ca6f4b`. |
| F08 | COMPLETE | Stable comparator, optional-only overlap; 4/4 F08 tests pass. Commit `037113edca6c948b4549080510a7ec708f360c2e`, with subsequent final optional-class hardening included in corrective closeout. |
| F09 | COMPLETE | Mandatory/optional/causal signal classification and bounded selection; 3/3 F09 tests pass; source/test hashes and commands in feature ledger. Shared production commit `607dba7b9a88696b956a9f7d0358edb8b7381410`; final bridge SHA is `27C8F47141FEE2B60D1702308BFCB2616795FF0BB98ADD516FA8A256D7B5AE22`. |
| F10 | LOCAL HOLD | Non-conversation causal overlap is proven unsafe to use as optional scoring; rejection tests pass. The unsafe experimental adapter was removed in the corrective closeout; no F10 production capability remains. |
| F11 | LOCAL HOLD | Downstream four-beat Director capacity not end-to-end exercised; no production change. |
| F12 | PARTIAL | 2/2 focused acceptance tests pass; full candidate-to-Director, persisted SQLite, and Discord delivery acceptance remains held. |

### Test executions (all local/offline, no polling)

| Run | Command (from `bot/`) | Result |
|---|---|---|
| F07 | `node --test tests/ai-gm-2026-10/p07-f07.test.mjs` plus `node --check` | Exit 0; 2 passed. Includes raw duplicate-key detection, mapping union, and selector coverage. |
| F08 initial/final | `node --test tests/ai-gm-2026-10/p07-f08.test.mjs` plus changed-file syntax | Final exit 0; 4 passed after optional-only hardening. |
| First frozen union | F07–F10 + F02/F03/F06 explicit feature paths | Exit 1; 22 tests, 20 passed, 2 stale expected orders failed (F03 and F09). No tests were running/polled. |
| Targeted repair | `node --test tests/ai-gm-2026-10/p07-f03.test.mjs tests/ai-gm-2026-10/p07-f09.test.mjs` | Exit 0; 6 passed; stale expected order now matches mandatory-first semantics. |
| Comparator repair | `node --test tests/ai-gm-2026-10/p07-f02.test.mjs tests/ai-gm-2026-10/p07-f06.test.mjs tests/ai-gm-2026-10/p07-f08.test.mjs` | Exit 0; 12 passed, 0 failed/skipped. |
| Final bridge batch | `node --test tests/ai-gm-2026-10/p07-f03.test.mjs tests/ai-gm-2026-10/p07-f06.test.mjs tests/ai-gm-2026-10/p07-f09.test.mjs tests/ai-gm-2026-10/p07-f10.test.mjs tests/ai-gm-2026-10/p07-f12.test.mjs` | Exit 0; 15 passed, 0 failed/skipped. Changed bridge and fresh-test syntax checks passed. |
| Final policy-dependent bridge check | `node --test tests/ai-gm-2026-10/p07-f03.test.mjs tests/ai-gm-2026-10/p07-f09.test.mjs` | Exit 0; 6 passed, 0 failed/skipped. |

The passing fresh coverage comprises F02 (4), F03 (3), F06 (4), F07 (2), F08 (4), F09 (3), F10 (3), and F12 (2); F11 had no production change/test because it is explicitly held. These are targeted offline contract tests, not a release certificate. No legacy suite, broad validation, CI, provider, production database, or Discord service was invoked. Provider calls = 0 in this local work; no cache was added. Test runtime is not live latency/cost evidence.

| Final changed-code fingerprint | SHA-256 |
|---|---|
| `bot/src/narrative-opportunity-policy.js` | `751887C9E810C5F691FEA93D853F5564081FA967DC8E7AC6F518B93AFB23508B` |
| `bot/src/world-narrative-bridge.js` | `27C8F47141FEE2B60D1702308BFCB2616795FF0BB98ADD516FA8A256D7B5AE22` |
| `bot/tests/ai-gm-2026-10/coverage.json` | `14C55AC3D5142E9D7B34118126E420BA5843680E5C7369656139C7C0A1D0AA2E` |

**Changed production modules:** `bot/src/narrative-opportunity-policy.js`, `bot/src/world-narrative-bridge.js`. No Daggerheart mechanics, dice, spotlight, PC decision, receipt, state, persistence, outbox, publication, or writer authority implementation was changed. Existing P08 dirty work and untracked plans remain outside this correction.

**Rollback:** locally revert only the P07 correction commits in reverse order (final closeout, F09/F10 shared ranking commit, F08, F07). Preserve the pre-existing P08 worktree and supplied P07/P08/P09 plans; do not reset or clean the checkout. No data migration exists.

**Authorization:** NOT DEPLOYED / NOT FULL RELEASE QUALIFIED / NO LIVE NARRATIVE QUALITY VALIDATION. NO PUSH / NO MERGE / NO DEPLOY / NO PRODUCTION DB / NO CI. Release authorization remains NOT AUTHORIZED. No new creative or autonomy restriction is pending owner decision; the only holds are lack of safe native proof/integration evidence.

**Remote-ref discrepancy:** No `git push` command was invoked. A read-only check after local commit found `origin/codex/clean-ai-gm-2026-10` at the same final SHA and its local reflog entry says `update by push` at `2026-10-22 12:15:46 -0500`. The source of that ref update is not established from this checkout. No corrective remote operation was attempted. This is outside the approved release/push authorization and requires owner review.

## Second corrective delta P07-F13..F18 (2026-10-22)

**Phase status override:** P07 remains **PARTIAL — offline source-to-writer-context path verified; local holds remain; NOT RELEASE QUALIFIED**. This append supersedes earlier broad phase-complete language only for the new F13–F18 evidence and does not rewrite F01–F12 results.

**Intake:** branch `codex/clean-ai-gm-2026-10`; actual HEAD `febd854fe47cfd2d5a070f2182b2c2af146d28f6`; tracked tree clean, with three preserved user-supplied untracked P07/P08 handoff/acceptance documents. Reference SHA `78dc7f159592f4904a5faafc91fb457c661873e5` was an ancestor, not a reset target. Read-only upstream at intake matched actual HEAD. No push was performed.

**Implementation commit:** `9bf6f71fac5a4f0c7f1f02270d0b3c00735eef3f` on the requested branch. It adds the F13–F18 scope/ledger pairs, fresh SQLite fixture and tests, duplicate-safe runner loader, coverage unions, P07 scope addendum and plan index note. No change to P08/P09/native mechanics, action authority, database schema, authoring pipeline priorities, caps, or publication/outbox code.

### Findings and acceptance disposition

| Area | Status | Evidence and exact boundary |
|---|---|---|
| A4 non-conversation optional intersection | LOCAL HOLD, source-proven | Resolved intents and simulation receipts are causal/committed; encounter candidates do not bind two independently sourced PC hooks; scene intent board represents current actions, not optional opportunities. No non-speech party bonus was added. See F15 evidence matrix. |
| A5 Director downstream projection | PARTIALLY VERIFIED | Two authenticated same-NPC speech opportunities were selected, appeared in the real mocked `GMService.runWorldDirector` input, were rebound/revalidated, and appeared in the audience-bound writer packet with two of four beat slots available. No four-committed-beat collision fixture; no existing observations/consequences were reordered. |
| A6 source integration | PARTIALLY VERIFIED | Disposable SQLite builds current owner, scene, presence, accepted speech and heard-memory records; test reaches native bridge, Director, reader and writer-context builder. The writer did not generate playable prose and no output was published. |
| Coverage loader | FIXED + TESTED | The actual fresh runner uses duplicate-decoded-root-key detection before parsing; escaped/whitespace duplicates and malformed/trailing JSON fail closed; current coverage unions are asserted. |
| P07-F13 / F14 / F15 / F16 / F17 / F18 | COMPLETE / PARTIAL / LOCAL HOLD / COMPLETE / PARTIAL / COMPLETE | Individual evidence is in each feature ledger. F18 complete means evidence closeout only, not phase completion or release. |

### Fresh execution evidence

Final post-repair union, from `bot/`:

`node --test --test-reporter=tap tests/ai-gm-2026-10/p07-f13.test.mjs tests/ai-gm-2026-10/p07-f14.test.mjs tests/ai-gm-2026-10/p07-f16.test.mjs tests/ai-gm-2026-10/p07-f17.test.mjs`

Exit 0; 6 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo; Node duration 1070.5177 ms. The same single blocking invocation ran `node --check` on `bot/scripts/ai-gm-delta.mjs`, the new fixture and all four new tests; all passed. `git diff --check` passed.

Earlier results are retained accurately: the first two repair batches each exited 1 (2 passed / 4 failed). Initial fixture data did not persist/reload the PC location needed by the native arrival/dialogue writers, and the coverage assertion put the F16 test under bridge mappings rather than the runner mapping. Those setup/assertion defects were repaired. A final batch passed 6/6. Following an EOF-only whitespace edit to three tests, the changed fresh union was run again and passed 6/6; no run was watched or polled. No historical test, old suite, broad validation, CI or provider test ran.

Final tested inputs (working-tree code based on `febd854fe47cfd2d5a070f2182b2c2af146d28f6`, before implementation commit `9bf6f71`):

| Path | SHA-256 |
|---|---|
| `bot/scripts/ai-gm-delta.mjs` | `94CD4341D97F343C2E52B4BC5FE3A6078881ACC2E41B246640FB0015745452DE` |
| `bot/tests/ai-gm-2026-10/p07-f13.test.mjs` | `8727585FE9ED4E96DB6C773376871EEE2D1A6CBF0B25B74F9067D353FB842951` |
| `bot/tests/ai-gm-2026-10/p07-f14.test.mjs` | `94F58568F9394A74B3D566DE511F1B4EB660F44933CC7FE3975827BE9EF2D1C1` |
| `bot/tests/ai-gm-2026-10/p07-f16.test.mjs` | `89EBE4DBDBD01D8346591079C4F256C12ECEAC2097979C426EE44CB7425A4A4F` |
| `bot/tests/ai-gm-2026-10/p07-f17.test.mjs` | `CBFCE2A04EC4A9D55A720102A9DCB9B675EF0872C57F3DBB10B4A6A8270FFCD2` |
| `bot/tests/ai-gm-2026-10/p07-native-fixture.mjs` | `9DB47F99248FEC77020DF36B7F58A36D32C75C5E621C390F07E9D16E559217DE` |
| `bot/tests/ai-gm-2026-10/coverage.json` | `B9B66BFD694C032F9209B95CEF22DAE2286D28EC280F6B11920EC7F51104BB89` |

Provider/network/live cost = 0; one offline injected World Director response was counted. No caching change. Offline runtime is not live latency/cost evidence. SQLite was disposable local state only; no live Discord, production database, migration, restart recovery or publication exactly-once test was performed.

### Remaining holds, rollback and authorization

- F14: missing evidence is current audience-validated persisted committed/required beats and comparable optional candidates across 0/1/3/4 committed slots, including revocation/scope revalidation. Until then no reprioritization may displace established observations or native consequences.
- F15: missing producer contract is recorded in the feature ledger. This is a source capability hold, not a permission restriction; no owner decision is pending.
- F17: database close/reopen restart replay, owner-control revision and scene-switch changes, required-response overflow, actual writer output, and Discord/outbox exactly-once remain unverified.
- No critical blocker. No unsupported behavior was fabricated. No new creative/autonomy limitation was proposed.
- Roll back implementation with `git revert 9bf6f71fac5a4f0c7f1f02270d0b3c00735eef3f`; no schema/data rollback is required. Preserve the three untracked user documents.
- **NOT LIVE VERIFIED / NOT FULL RELEASE QUALIFIED / RELEASE NOT AUTHORIZED. NO PUSH / NO MERGE / NO DEPLOY / NO CI / NO PRODUCTION DB / NO PAID PROVIDER.**
## Third corrective delta — P07-F19..F25

Anchored at `c03fd5dbdaa8d0570e59f83d71060285cb7eec07`; feature commits: F19 `d4f3ffe78e5a06e7402fc9fbe6cf1e2dc66b74fe`, F20 `ec0451914fe5080e537c5b04bba12f9ec54f30a2`, F21 hold record `d3012f358f4d8cd851fd1b507c68c27032842fe9`, F22 `507ff89dd7892c649b054c041b5b401edf97eaa4`, F23 `a067857b1029d8579fb41b2517065e7e098305a6`, F24 `77c6ba2`, F25 closeout follows.

P07-F19 adds native SQLite → World Director → source-bound writer-context evidence. F20 repairs omission counts by validating each bounded source proof before accounting: at capacity 0/1/3/4 two optional conversation signals yield 2/3/4/4 beats and 0/0/1/2 omitted; eight accepted native scene proofs yield 4 beats, 4 omitted, 0 held. F21 remains LOCAL HOLD: source inspection found no native producer linking two independently owned PC sources to the same already-established optional non-conversation incident. The smallest safe upstream `optional_incident_link` writer contract is in its ledger. No shared interest was inferred. F22 verifies only existing independently authenticated same-NPC speech ranking. F23 verifies SQLite restart replay, source retraction, attendance/audience/scene revalidation. F24 verifies the real injected Director and delegated writer, accepted native narrative unit, durable mocked outbox, uncertain send reconciliation and known-not-sent retry. F25 runs the frozen fresh-test union.

### Final corrective union

One blocking run: 9 fresh tests from F13, F14, F16, F17, F19, F20, F22, F23 and F24; exit 0; 14 passed, 0 failed/skipped/cancelled/todo; duration 5443.5696 ms. Changed bridge/fixture/all nine tests syntax checks and `git diff --check` passed. No old suites, broad validation, paid providers, CI, production DB or live Discord ran. Four deterministic injected responses were used by the two F24 test workflows; zero live provider calls, zero cost, and no cache change. Full hashes, per-feature results and T01–T14 matrix are in F25 ledger.

### Feature dispositions

| Feature | Status | Evidence / boundary |
|---|---|---|
| F19 | COMPLETE | Real owner-authored source → Director request → persisted source → current writer context. Does not alone prove writer acceptance. |
| F20 | COMPLETE | Validated overflow/omission behavior at 0/1/3/4 and eight accepted scene units. |
| F21 | LOCAL HOLD | Missing authorized non-conversation source-link producer; do not synthesize native evidence. |
| F22 | PARTIAL | Same-NPC speech overlap ranking passed; F21 adapter unsupported. |
| F23 | PARTIAL | Restart, retraction, attendance, audience and scene verified; control change and some required-response recovery gaps remain. |
| F24 | PARTIAL | Public accepted writer/outbox path verified offline; no private recipient or cross-process contention acceptance. |
| F25 | COMPLETE | Frozen union and evidence closeout only. |

P07 status: **PARTIAL**. T01/T02/T12/T14 remain untested, T04 locally held, T05/T08/T13 partial; see matrix. No critical blocker is established. No new GM creativity, NPC autonomy, party-convergence, or narrative limits were introduced. Existing privacy, agency and native Daggerheart authority remain in force.

Rollback: revert the third-corrective commits in reverse order, beginning with the F25 closeout commit, then F24 `77c6ba2`, F23 `a067857b1029d8579fb41b2517065e7e098305a6`, F22 `507ff89dd7892c649b054c041b5b401edf97eaa4`, F21 documentation commit `d3012f358f4d8cd851fd1b507c68c27032842fe9`, F20 `ec0451914fe5080e537c5b04bba12f9ec54f30a2`, F19 `d4f3ffe78e5a06e7402fc9fbe6cf1e2dc66b74fe`; preserve all earlier P06/P08/P09 and untracked user work. No migration or production state change was made.

**Offline delta only. NOT LIVE VERIFIED. P07 NOT COMPLETE. RELEASE NOT AUTHORIZED. NO PUSH / MERGE / DEPLOY / CI / PRODUCTION DB / PAID PROVIDER.**
