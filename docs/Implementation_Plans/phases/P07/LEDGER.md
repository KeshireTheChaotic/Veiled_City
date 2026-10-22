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
