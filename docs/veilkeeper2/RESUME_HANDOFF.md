# Veilkeeper 2.0 — current rebuild handoff

Checkpoint 2026-11-11, implementation HEAD **f8b51d20**. Goal active; **R0�R8 are all incomplete**. Owner explicitly resumed after the earlier usage pause. Latest observed usage: **36% primary / 82% weekly**; standing pause threshold is 98% on either window, not this checkpoint. Computer use remains forbidden. Current work adds read-only historical condition/GM source validation and pure native policy dependencies; these are not yet composed into root ordinary-roll authorization. No major-phase merge/push, production cutover or new Discord launcher.

Completed dependency slices: **e053bf70** historical owner condition-clear ancestry (44 affected checks); **a58e812d** native condition expiry (14); **540b7426** fixed group-feature rules/cost arithmetic (10); **0ff12095** native NPC reaction proof (8); **f8b51d20** committed historical GM decision source closure (12). Eighty-eight distinct native checks across these slices passed; each slice's report/hashes/affected list is in R3_CONDITION_CLEAR_HISTORY, R3_CONDITION_EXPIRY_HISTORY, R3_GROUP_FEATURE_POLICY, R3_NPC_REACTION_PROOF and R3_COMMITTED_GM_DECISION artifacts. The policy suite was rerun only after trailing whitespace in tested source changed; its final 10-check result is 67.1756ms. No legacy tests/fixtures were reused or removed. These local checks do not prove live Discord, model quality, full rules parity or any completed phase.

Prior **f22e0788** added minimal recalled-human-statement authorship; its one real local qwen3.5:4b probe remains unqualified and must not be rerun unchanged to seek a favorable sample (.reports/statement-authorship-20261111). **2145018e** added read-only legacy source getters, complete bounded pc_native_condition-family discovery and synchronous SQLite validation snapshots (30 affected checks). Raw native source rows may contain private information and must never enter audience inference. Metadata-only read of the authorized historical copy found zero family refs and unchanged main-file hash; this is not a current health or all-condition claim.

## Binding instructions and workspace

- Worktree `D:/Library/Development/Veiled_City_2/rebuild`, branch `rebuild/veilkeeper2-audience-first`; main working root `D:/Library/Development/Veiled_City_2`. Deprecated `D:/Library/Development/Veiled_City` is not an implementation target. Authorized credential file `D:/Library/Development/Veiled_City/bot/.env` may be loaded by path, never printed/copied.
- **Computer use forbidden** until explicitly reauthorized. No UI/remote-desktop/browser automation workaround. No subagents authorized.
- Preserve unrelated dirty **README.md**. `bot/src/v2/rules/hope-consent-ingress.js` also shows dirty but no textual diff in this run (earlier byte/line-ending restoration); do not stage/reset/clean it opportunistically. Stage exact owned paths only.
- Owner authorizes scoped commits and integration/push after each completed major phase **only to the rebuild branch**, never baseline. Already on that branch, so no self-merge. No major phase is qualified; no push performed.
- Online testing only guild **1467249344947159291**, legacy database copies. External inference cap previously $5; current default is local Ollama. No Discord plugin/connector was downloaded; existing discord.js/API was used. Never fabricate human interactions or call mocked transport live quality.
- At 98% used / 2% remaining on either window: finish current-state handoff, set goal paused, stop until explicit resume. Do not redeem credits. Goal remains the full R0–R8 rebuild; do not mark it complete for a slice.
- Fresh changed-import-dependent native tests only; no polling/watch test loops. Do not rerun completed unchanged suites. New `bot/tests/veilkeeper2` files are ignored; force-add exact test/helper files. Reports distinguish native SQLite, simulated SDK/provider, actual REST and human acceptance. No legacy test/fixture reuse or old-runtime retirement without replacement coverage.

## Governing sources and remote audit

Read AGENTS.md, docs/VEILKEEPER_2_ASTRA6_REBUILD_HANDOFF.md, owner AI-GM behavior, Audience-First, Creative-First, Agency-Preserving and Weighted Lore before architectural changes. Removed specifications remain readable from Git, e.g. pinned `docs/Implementation_Plans/WEIGHTED_LORE_FRAMEWORK.md`; do not restore deleted docs simply to read them. Weighted Lore was re-read for latest work: authorship alone does not prove prose is IC, so the proposed automatic literal-mention issuer was **not implemented**.

Original mandatory audit pin: **1ba6c7e15db1a66ba34b36336f31437beffe44d6**. Fresh remote check at this handoff confirms baseline **15a8f44671f227c6bec69bf30744e03c5692809b**, origin rebuild **fda77bd84b216e0e883c8b1348b12e7611787388**. The newer baseline was fetched/audited, never merged. UPSTREAM_15A8F_SOURCE_AUDIT.json/REPORT/HASHES preserve the source delta; refresh if upstream advances. New feature/Spellcast/condition/historical-receipt semantics are parity holds. Original source inventory remains pinned.

Exactly four AI capabilities: context_read, action_propose, state_inspect, knowledge_propose. Native effects remain source/actor/rule/consent bound, never generic patches. Players own PCs/proxies; native rules own consequences. Testimony/rumors/NPC lies are not truth. GM-private context never goes to player inference. Harmless direct address and sensory second person are allowed. Current AST closure: **113 native modules, 80 entry-reachable, 33 uncomposed/alternate, seven legacy imports, zero missing imports**. See NATIVE_DEPENDENCY_MAP.json; static closure is not parity or retirement evidence.

## Current implementation and recent commits

Each slice has matching report/hash/affected-test artifacts under docs/veilkeeper2. Counts overlap; never sum them as one release qualification. Exact tested bytes and limitations are in the reports.

| Commit | Delivered slice | Actual scoped checks |
| --- | --- | --- |
| bb808ada | Native Hope-cost consent prompt/SDK choice/atomic expense workflow | 274 / 27 files |
| afcdc6b5 | Upstream 15a8f source-delta audit | Static inventory, not runtime parity |
| c58b8e31 | Qualified sheet/modifier roll terms and saved dice evidence | 91 / 12 files, 2,016 arithmetic vectors |
| 21d408a7 | Explicit manifest-bearing runtime resume, per-directory SQLite process lock | 21 / 3 files |
| 1de7852d | Private cost interaction reconciliation; repairs bookkeeping, never repeats expense | 313 / 31 files |
| 678d10a2 | Empty WAL sidecars no longer falsely invalidate read-only legacy source | 23 / 3 files |
| a3342f0a | Online restart evidence; redundant launcher event logger removed for next launch | Actual connection/REST partial readback, launcher syntax |
| 6a505359 | Immutable source-bound roll adjudication persistence | 4 new |
| 0db78572 | Qualified roll continuation after Fear with fresh native review proof | 47 / 3 files |
| 98c1b86b | Native subclass/card-qualified Spellcast identity and read-only packaged catalog | 5 new; ported rule-body equality |
| 4aa2c813 | Compulsory Spellcast condition modifier adapter | 6 new; ancestry callback fixtures |
| acbf9239 | Root prose review now receives PC/proxy names and independent NPC names | 55 / 8 files |
| 5cb35f61 | Durable recall causes/pins/fictional ticks and actual root weighted selection | 59 / 9 files |
| 6b51d682 | Immutable pin release history; replay cannot reactivate released pins | 62 / 10 files |
| 6b510227 | Source-bound statement testimony and grant/saved-manifest origin validation | 152 / 22 files |
| 1931d840 | Historical Discord origin refresh around inference/tools/review/publication | 94 / 15 files |
| a345f5ed | Automatic authenticated player-statement capture, current utterance excluded from own packet | 98 / 16 files |
| 7eb06969 | Real committed Hope receipts issue private canonical recall interaction causes | 102 / 14 files |
| de5fa87e | Private statement/causal views isolated between same-account PCs; explicit native actor-view scopes | 170 / 25 files |

Latest dependency log: `../r2-receipt-recall-dependency-tests-20261111.txt` (98 remaining checks, 15873.3057 ms); four focused checks passed separately. R2_RECEIPT_RECALL_REPORT/HASHES/AFFECTED files describe actual native root/SQLite expense, OOC/decline exclusion, optional-storage failure, replay after fictional time and forged receipt rejection. No pending test process or source edits remain from that slice.

## Runtime behavior and important boundaries

Root defaults to Ollama **qwen3.5:4b**, localhost:11434; VK2_INFERENCE=1 required, default cap10 (1–100), no automatic retry/cloud fallback. VK2_PROVIDER=openai is explicit. Model remains poor at grounded agency/tool discovery in recorded real local probes; do not overwrite failures or repeat unchanged probes merely to obtain green output. **Generated prose remains withheld.** Screened means regex screening, not semantic authorization. GM draft publishing is a separate qualification harness, not the finished R4 flow.

Actual conversational intake now records raw authenticated speech as private testimony with exact original audience, no automatically knowing NPC actors, no canon/effect/consent. Model failure can leave that observed utterance persisted; it is not successful narration. Source/channel/message lineage is checked only after complete metadata entitlement; edits/deletion/permission changes revoke pending grants and saved draft dependencies. Scene closure alone preserves historical testimony. Fresh historical reads use existing Discord SDK adapters before/after model rounds, tool-added context and pending review; GM publication also refreshes saved origins. More than 64 distinct origin proofs holds before network work. Reads are sequential, not atomic Discord snapshots: live latency/rate limits and revocation windows remain unqualified.

The root now ranks metadata with the existing recall policy. Stored causes/pins and fictional ticks are native only. No chat/wall-clock advance. The only newly authenticated gameplay issuer is an actual committed Hope expense; its exact receipt is re-inspected, original declaration stays testimony, canonical receipt identity deduplicates scoring, old causal tick survives replay, and private statement ancestry prevents cross-audience influence. Declines/OOC/model text/pure inspection mint no such cause. Optional recall failure is logged at native_receipt_recall and cannot undo or repeat the actual expense. Cross-store metadata recovery after failure is not automatic.

Qualified roll terms, adjudication storage, Spellcast identity/condition adapters and Fear continuation are still largely uncomposed in root. A native modifier ancestry validator/complete discovery, actual reviewed classification and continuation issuer, paid Experiences, owner dice/notice/Fear orchestration and atomic consequences are not supplied by fixture callbacks. Ordinary roll registration must not ignore legitimate conditions. The new adjudication file is not in runtime manifest allowlist and requires reviewed migration when composed.

Runtime resume uses runtime.sqlite manifest, exact legacy source identity, native file inode/schema hashes and a process-lifetime exclusive SQLite lock per directory. Explicit VK2_RESUME=1 required. Empty WAL/journal and absence are equivalent; nonempty bytes remain hashed. Older manifests recording empty-WAL SHA may hold until reviewed migration. Pre-manifest or partial-initialization adoption remains unimplemented; never delete stores to make startup pass. New recall.sqlite is recognized/sealed on successful startup. Downgrade must retain all origin, pin-release, recall, choice and receipt history; older code can misinterpret these records. No global cross-directory guild fencing exists.

## Actual online state — revalidate before use

Exec handle **92647** is now missing. Sanitized Win32 process inspection found no online-qualification/native-start Node launcher; no replacement was started. This is not a global bot-exclusivity claim. Old PID **22720** is historical and must not be acted on without fresh identity evidence. Source snapshot **678d10a2**, **not current Git**. Directory `.reports/online-7d5a6467-69fe-4adf-930f-d196b2579865`; legacy copy plus nine native game stores and runtime manifest. Last retained read-only counts at the prior checkpoint: turns=0, native interactions=0, source registry=0; not re-counted on this resume. No human flow or current-code live qualification occurred. Before any startup, recheck native processes/global guild ownership, preserved stores and manifest compatibility; never infer exclusivity solely from missing handles.

Actual prior checks: Ready event, guild-only 24-root registration, new cost-reconcile optional string leaf readback and absence from dice commands. Combined readback script then exited1 because live runtime manifest was correctly exclusively locked: preserve this partial result, not green the whole script. qualification.json/report retain evidence. Running launcher still has the now-removed extra diagnostic event listener and emitted one 11-listener warning; next launch uses corrected source. Do not restart solely to remove that harmless log listener.

Old session62251 no longer exists. Historical `.reports/online-6b8c5ce9-2c6b-4725-9bd5-fb6eb2b5ef56` retained; all eight native stores were empty at review. Failed fresh `.reports/online-e92cb152-a9c1-4efb-9877-5835d5f6472e` retained; startup stopped before login on the now-fixed empty-WAL false mismatch. No populated adoption was claimed. Original one-send live test message **1569931894793969685** remains guarded by `.reports/autonomous-discord-20261110/receipt.json`; do not rerun/resend it. Five earlier API checks are not narrative/human acceptance. Known test character Tyrell Williams id `c17c02e2-c569-40dc-a16f-b6a3c3c7c8ea` is legacy data, not proof of native bootstrap.

## Full phase status and next work

- **R0:** pinned inventory and newer source audit exist; dynamic/function binding, 34 partial writer files, public mechanic/command/schema/import destinations and removal proofs remain incomplete. Upstream changed references/parity must not be ignored.
- **R1:** bootable opt-in four-tool runtime and scoped adapters exist; full architectural/gateway/outbox acceptance is not certified.
- **R2:** native entitlement, source closure, knowledge proposals, weighted retrieval and private statement/receipt causes now operate in composed tests. Remaining: private recipient-only import/legacy actor-view mapping and party witness/perception, full cause/commitment/time issuers, complete semantic relevance and alias identity proof, large-history retrieval beyond 256 candidates/64 selected and 4096 evidence, NPC cognition/perception, correction/retraction, protected canon and real imports/exports. Historical channel reassignment can conservatively hold old origins until reviewed reconciliation.
- **R3:** Hope consent/expense and extensive damage/death/Fear/roll foundations exist; full Daggerheart 2.0/house-rule parity, source adapters, owner roll controls, helper/Tag Team/PvP, features, movement, inventory/economy/downtime and migration remain open.
- **R4:** one-call draft, paragraph screening/local repair and exact native cost recap exist. Full agency/grounding/quality/material semantics and automatic durable delivery are not qualified. Native PC names protect more cases but regex is not semantic proof.
- **R5:** genuine private fictional-pressure scheduler, independent NPC/faction decisions/resources/voices/failures, attention fairness and pending response opportunities remain mostly unimplemented.
- **R6:** typed subset of session/attendance/private/GM/bootstrap/death/cost gateways exists. Most commands, imports/exports, proxies, first scenes/late arrivals, multiplayer/voice and real-human acceptance remain open.
- **R7:** durable receipts/claims/lineage/uncertainty/review/repair and per-directory resume exist. Populated migration/adoption, backups/downgrade tooling, full crash/outbox/concurrency/global fence, performance and live source windows remain open.
- **R8:** independent release, parity/privacy/quality, migration reversibility and human cutover authorization remain unqualified. Production unchanged; no legacy runtime/tests retired.

Next exact R3 implementation: port/compose the historical group-feature execution and reaction-effect inspectors over the actual read-only source repository. New committed-gm-decision.js is the committed=true historical branch of audited gm-capability-rules.js; it intentionally does not authorize new actions or prove payment by itself. npc-reaction-proof.js supplies real arithmetic inspection; group-feature-rules/outcomes and feature-cost-plan/native-resource-plan supply exact native policies. condition-clear-history and condition-expiry-history verify only termination after original condition/effect ancestry is proven. Do not insert fake callbacks or treat a matching digest, arbitrary sheet condition or empty source family as permission.

Sources still needed: audited group-feature-execution-rules.js inspectGroupFeature (line290), validateGroupReactionEffect (518), validateNativeCondition (624), mixed area owner/NPC and cleared-NPC ancestry; original saved-roll getter is database.js line1857 (guild/id lookup + payload_json). The native repository does not expose getSavedRoll yet. Group/mixed history must retain actual parent decision/cost, feature definition, owner roll/choice, original source and exact mutation checks. Handle cycles/reused conditions explicitly, not via permissive recursion defaults. No root roll enablement until the entire required source closure and current modifiers pass.

Then continue native gameplay causes/commitments/time, source-qualified owner rolls/Fear/outcomes, large-history recall and living NPC/world scheduling through the same four capabilities. Re-read governing sources for architectural work. Preserve the full R0�R8 goal; local dependency slices are not phase/release completion.
