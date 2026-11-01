# AF07 — Qualification and release gate

**IN PROGRESS — focused offline changed-code evidence is recorded; full qualification is not complete.** AF07 requires source-qualified coverage of all 153 occurrences, multi-owner and recovery scenarios, and a separate authorized staging run with a real model. Offline fakes do not qualify the staging criterion.

## Completed evidence available

- AF01 shared context retrieval: 5 fresh tests passed; all 49 exact contexts and 153 source occurrences covered at their source projection boundary.
- AF02 shared operation foundations: fresh arithmetic/cost/token/opportunity/owner-choice/area-cohort tests passed in their recorded runs. Latest mixed-reaction delta: 5 SQLite-backed tests passed, 0 failed/skipped, exit 0; two changed JS/MJS syntax checks passed. The production composition exports the coordinator, but it is not integrated with a feature effect or Null Foam condition consumer.
- AF03 bounded effect migrations: 22 fresh tests passed, 0 failed/skipped, exit 0 across source workflows, effect parity, receipt transitions and nine proof gates.
- AF04 source capability coverage: 4 tests passed, 0 failed/skipped, exit 0; exact counts 30 native-bounded, 49 context-only, 69 held and 5 fiction-only. Held effects remain held.
- AF05 projection and actor-local discovery: 6 projection tests and 4 discovery tests passed in recorded runs; these prove native proposal gates, not model choice quality or live multiplayer delivery.
- AF06 context-factory retirement: fresh replacement test passed 1/1; two syntax checks passed; refreshed current-source audit exited 0 with zero old factory consumers.

Exact commands, test counts and input hashes remain in each phase's evidence files. Completed unchanged tests have not been rerun.

## Remaining gates

1. AF04: integrate mixed PC/NPC reactions with durable Restrained, Spellcast-disadvantage and verified-release consumers; do not mark Null Foam executable before then.
2. AF05: prove the native proposal/commit route, rejection and legal re-selection around an executable feature in a complete unified turn. The existing projection tests stop before autonomous completion.
3. AF06: context factories are retired. No further effect-path deletion is justified until a specific duplicate implementation and its reader dependencies are identified.
4. AF07: add the remaining feature-specific legal/illegal/source-drift/cost/receipt/replay tests and scenario tests for simultaneous owner reactions, transitions, restart, Fear interrupts, missing/expired NPCs, player control/PvP, inventory, private clues and weighted memory.
5. Model/Discord staging gate: one authorized live run on 2026-10-31 read the development `.env`, queried the configured development database read-only (one campaign and one active session), and connected to Discord using only the Guilds intent. It read or sent no Discord messages and exposed no secret or guild identifier. A real Codex-backed ChatGPT turn committed on a disposable SQLite fixture with no API key. The model produced one unified decision but no native action, so this proves the live connection and turn path only; it does not prove feature selection or native feature execution. The development campaign database was not mutated.

6. AF07 runner and active encounter guard: `bot/scripts/af07-codex-scene.mjs` is a guarded opt-in harness; mock mode is the default. An active adversary encounter lacks the `encounter_proposal` record required by environment binding, so the binding now treats its missing reference as absent and returns the normal local environment hold rather than passing `undefined` to SQLite. The mock scene test exercises this alongside the full unified GM commit path.

Focused AF07 verification after these changes: three changed-file syntax checks passed and `node --test tests/ai-gm-2026-10/af07-codex-scene.test.mjs` passed **2 tests, 0 failed/skipped, exit 0**. The separate live command `node scripts/af07-codex-scene.mjs --live-codex` exited 0 with `turnCommitted=true`, `unifiedDecisions=1`, `gmNativeActions=0`, `groupFeatureExecutions=0`, `discordConnected=true`, and the development database queried read-only. The deterministic mock produced one group-feature execution and pending owner invitation. Exact inputs and limits are in `AF07_QUALIFICATION.md`.

**Status:** not release-qualified. Do not deploy or claim all-feature execution. Next exact work: complete AF04's mixed operation and condition consumers and AF05's end-to-end execution/reselection scenario; expand AF07 with owner reaction submissions, recovery and the source/scenario matrix. The live model did not autonomously select a feature, so that behavior remains unproven. No human moderator queue is introduced by this hold.

## Full-turn feature rejection — verification complete

The disposable runner now reports the actual number of pending owner reaction invitations. A legal Flashbang proposal creates one execution and exactly one invitation. A proposal selecting Command the Blood for the Contractor completes the unified turn with zero native actions, feature executions or owner invitations. This qualifies a local rejection through the native commit boundary; real-model reselection remains open.

Modified files: `bot/scripts/af07-codex-scene.mjs`, `bot/tests/ai-gm-2026-10/af07-codex-scene.test.mjs`, this ledger, `EVIDENCE.json`, and `AF00/AF07_QUALIFICATION.md`. Two changed-file syntax checks passed; the focused suite passed **3 tests, 0 failed/skipped, exit 0**. No new live call occurred. Known issues and deferred items remain the mixed condition workflow, owner/recovery matrix and real-model selection. Next exact work: **AF04 mixed PC/NPC condition execution**. This delta is complete; AF07 remains in progress.

AF02 mixed-settlement interface verification complete: three fresh SQLite tests and three syntax checks passed. The mixed coordinator can now hand inspected ready outcomes to native effect writers with stable target keys, pending/withdrawal semantics and transaction rollback. Null Foam host wiring, condition writers, release and Spellcast consumers remain open; no feature activation or live evidence is claimed. See AF02/MIXED-SETTLEMENT-EVIDENCE.json.

## Actual native owner reaction scene paths — complete for this delta

The disposable scene harness now supports source-selected adversaries, complete PC trait/resource sheets, the existing roll-collaboration flag, and a post-commit verification callback. It exercises production owner invitation inspection, authenticated submission, native dice, typed result proof, conditional effects, private receipts and parent settlement. Ordinary success preserves the owner consequence choice; wrong owners cannot submit or choose. Withdrawal creates no failure or dice. Critical reactions generate no Hope or Stress recovery. Two independent owners finish All Lanes Stop across a SQLite close/reopen, while the first response alone leaves the group pending.

Modified: bot/scripts/af07-codex-scene.mjs, bot/tests/ai-gm-2026-10/af07-codex-scene.test.mjs, this ledger and OWNER-SCENE-EVIDENCE.json. Final verification complete: 8 tests passed, 0 failed/skipped, exit 0; two syntax checks passed. Earlier failures exposed fixture omissions (collaboration flag and actual all-target policy label), corrected before the final source-frozen run. The provider is mocked; native owner/source/dice/effect/SQLite services are real. Database reopen does not prove a process restart. No live Discord/provider call occurred. Deferred: AF04 Spellcast and NPC/ally release; real-model feature selection/reselection and the remaining AF07 matrix. Next exact work: AF04 source-bound Spellcast enforcement, followed by AF05 real-model scenario qualification.

## Source-backed NPC motive and live feature-selection diagnostics — harness complete, selection unproven

The new feature-scene wrapper reuses the existing disposable harness and AI factory. It establishes a source-visible NPC withdrawal objective and verifies that eligible abilities reach the native prompt board. Safe provider-response diagnostics count decisions and legal feature selections without retaining raw model text or identifiers. The shared arbitration prompt now distinguishes lifecycle status from posture/equipment and asks corrections to preserve independent valid intents.

Modified: bot/scripts/af07-codex-feature-scene.mjs, bot/tests/ai-gm-2026-10/af07-feature-scene.test.mjs, bot/src/frameworks/intent/unified-arbitration-prompt.js, this ledger and FEATURE-SCENE-EVIDENCE.json. Final offline verification: 2 tests passed, 0 failed/skipped, exit 0; three syntax checks passed. These source-frozen checks were completed before the explicit pause and were not repeated unchanged on resume.

Two authorized live ChatGPT/Codex trials completed with a live Discord connection and read-only development database preflight. Gameplay writes remained disposable; no Discord messages were read or sent, no billed API call was used, and no credentials/guild identifiers were emitted. The first trial needed a narrative lifecycle correction. The corrected diagnostic trial returned two structured responses, both with zero decisions and zero eligible feature selections; neither trial committed a feature. This demonstrates the live path and an unproven tactical-selection gate, not successful autonomous feature use. No further trial is justified without a distinct change or new hypothesis. Deferred: AF04 Spellcast/release consumers and remaining AF05/AF07 execution/reselection/recovery coverage. Next exact work: AF04 complete source-bound condition consumers.
