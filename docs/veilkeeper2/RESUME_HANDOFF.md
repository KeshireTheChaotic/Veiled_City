# Veilkeeper 2.0 — current rebuild handoff

Checkpoint 2026-11-11; runtime source HEAD 43bc692c, dependency/audit commit 0866703d. Paused at the owner-requested 2% primary usage remaining; wait for explicit resume before implementation, tests, staging or qualification. Current-state review complete for this checkpoint; the full R0–R8 implementation remains active and incomplete. Slice reports below record tested work, not phase certification. Inspect Git and live handles before relying on this snapshot.

## Binding workspace and owner instructions

- Worktree: `D:/Library/Development/Veiled_City_2/rebuild`, branch `rebuild/veilkeeper2-audience-first`. Deprecated `D:/Library/Development/Veiled_City` is not an implementation target. Its user-authorized credential file may be loaded by path without printing/copying values.
- Preserve unrelated dirty `README.md`; never stage/reset/clean it. No subagents authorized. New native tests under `bot/tests/veilkeeper2` are ignored: force-add exact paths. Run fresh explicit changed-dependency checks; never present simulated SDK/model checks as live quality.
- Owner forbids computer-use until explicitly reauthorized. Do not use Windows/browser UI automation as a workaround. Autonomous bot/API and native testing are authorized.
- At 98% used / 2% remaining on either usage window: create a thorough current handoff, pause the goal and stop until resume. Do not redeem credits. Pause threshold reached: latest measured limits were 98% primary / 61% weekly used; re-read before relying on them.
- Commit scoped phase work. Publish/integrate completed major phases only to the rebuild branch, never the baseline. Already on the integration target: no self-merge. No major phase has passed; production cutover needs separate authorization.
- Frozen baseline `codex/clean-ai-gm-2026-10` remains `1ba6c7e15db1a66ba34b36336f31437beffe44d6`, freshly checked by git ls-remote this checkpoint. Origin rebuild remains `fda77bd84b216e0e883c8b1348b12e7611787388`; newer local slices have not been pushed. Refresh the source audit if baseline advances.

## Governing behavior and boundaries

Read AGENTS.md, docs/VEILKEEPER_2_ASTRA6_REBUILD_HANDOFF.md, owner AI GM behavior and the Audience-First, Creative-First, Agency-Preserving and Weighted Lore specifications before architectural changes. Removed source-linked documents are readable from pinned history; do not restore deleted documentation just to read it.

Exactly four AI capabilities: context_read, action_propose, state_inspect, knowledge_propose. Specific rules remain native validators; no unrestricted patches. The target is a creative, impartial conversational GM with independent limited-knowledge NPCs, persistent identities and a living world. Players exclusively control PCs and human proxies; native rules own consequences. Rumors, beliefs, lies and salience do not establish objective canon. Harmless direct address/sensory second person is allowed. No GM-private context in player inference.

## Current runtime

Legacy default start is unchanged. The opt-in native root opens dedicated scene/source/action/prompt/decision/interaction stores, plus knowledge/turn stores with a provider. Legacy character/campaign data is read-only. Native-start still requires a new/empty native store directory; do not restart an existing run against its nonempty stores by deleting them.

Rebuild inference defaults to local Ollama qwen3.5:4b at localhost:11434, enabled only by VK2_INFERENCE=1 and bounded by VK2_MAX_TURNS (1–100, default 10). VK2_PROVIDER=openai explicitly restores the existing remote/ChatGPT path. Source/actor/audience metadata and context lineage are native. Raw outputs remain withheld; manual GM draft publication is a qualification harness, not the R4 target delivery design.

All GM operations use typed `/vc-gm`; owner death commands use typed `/vc-player death-review|death-refresh|death-reconcile`; `/vc-roll` is dice only. Native schema lives in the v2 overlay; legacy command declarations are restored to the pinned blob. Register native commands with `register:v2:native`, allowed-guild only. Command schema compatibility does not prove all legacy commands are implemented.

Canonical actor readers join registered control, legacy identity and native HP/Armor/Hope/lifecycle. Missing/incompatible migration has no healthy fallback. Both death and conversation source readers now use that projection. Session start/end/reopen, character register/rebind, reviewed bootstrap, offscreen owner attendance and private-channel registration are implemented subsets. Most commands and playable opening/late entry remain incomplete.

Source/scene authority binds exact recipients/writers, source revision, actor control and attendance epochs. Another owner's late entry preserves pending owner proofs; own absence/rejoin or lifecycle closure never revives old proofs. Receipt-only ancestry is metadata for already-issued outcomes, not new PC control. Death choices/recovery allocations require actual owner evidence; engine dice/outcomes and uncertainty receipts are durable. The generic tool bridge now executes the fixed, already-consented Hope cost through the existing atomic native authority and exposes owner-private immutable receipt projections. Other execution adapters and full SRD/house-rule parity remain incomplete.

## Latest implemented slices and evidence

- R6_COMMAND_BOUNDARY_REPORT.md; R6_PRIVATE_CHANNEL_REPORT.md; R6_DRAFT_PUBLICATION_REPORT.md: v2 schema/registration and thin native service boundaries.
- R7_DRAFT_SOURCE_REPORT.md; R7_DRAFT_REFRESH_REPORT.md: immutable original-source lineage and fresh Discord message/audience intake before reviewed publication.
- R7_REST_AUDIENCE_REPORT.md; R7_REST_AUDIENCE_LIVE_REPORT.md: complete fresh uncached REST rosters; two real seven-member reads at 858.05/563.66 ms. Larger-guild/private end-to-end timing remains open.
- R4_SEGMENT_REVIEW_REPORT.md; R4_POLICY_WIRING_REPORT.md; R4_AUTHORSHIP_REPORT.md: native per-paragraph diagnostics, independent siblings, explicit control/portrayal metadata, configurable native review policy. Screening is not semantic authorization.
- R7_SEGMENT_REVIEW_REPORT.md; R4_DURABLE_REPAIR_REPORT.md (`d1ad167c`): durable review snapshots and DB-before-memory local repair, exact ancestry/sequence/sibling checks, original raw draft unchanged. Repair slice: 78 passing affected behavioral checks. Candidates remain private requires_semantic_review, sent=false, knowledgeAcknowledged=false.
- R6_CONVERSATION_LIFECYCLE_REPORT.md (`4d31dfb6`): canonical death/owner/migration gating of conversation; 19 passing checks, with both new regression cases failing under previous raw-scene wiring.
- R7_CONTEXT_LINEAGE_REPORT.md (current checkpoint): durable metadata-hash ancestry for initial/tool context, cold ACL/source/NPC revalidation before publish, no body rereads, context-bound publication IDs and historical missing-lineage holds. 184 passing affected behavioral checks across 19 files. Source/test hashes and exact scopes are in the matching manifests.

Historical reports cover native ordinary rolls, Hope/Fear, damage/death/Blaze, consent, bootstrap and receipt repair. Read their source hashes before relying on old counts. Completed changed slices do not establish a full fresh suite, phase or live quality gate.

- R3_GENERIC_ENGINE_REPORT.md (current checkpoint): fixed Hope-cost generic engine bridge, current owner-private consent/source checks, replay/rollback, immutable tool-observed receipt lineage and cold publication verification. 198 passing affected checks across 21 files. Local GM prompt failed tool selection/agency; corrected explicit transport control committed synthetic Hope 3→1. No human consent or semantic-quality claim.

- R4_RECEIPT_RECAP_REPORT.md (current checkpoint): observed native Hope receipt can authorize only an exact private whole-paragraph factual recap during screening. Wrong amount/scope/hash/extra choices remain held. 95 passing affected checks across 15 files. Still requires_semantic_review, no publication.

- R3_ACTION_DISCOVERY_REPORT.md (current checkpoint): generic context_read topic actions returns current private already-consented Hope proposals without effects. 334 passing affected checks across 37 files. Real natural-language discovery probe failed; explicit three-call diagnostic discovery/commit control passed. No live human consent or autonomous quality claim.

- R2_NATIVE_RETRIEVAL_REPORT.md (current checkpoint): native root now selects established entitled records through metadata/complete-ancestry checks instead of always empty context. 87 passing affected checks across 13 files. Bounded deterministic selection is not full weighted recall; no fake interest/clock causes or private leaks.

- R2_NATIVE_PROPOSALS_REPORT.md (current checkpoint): native knowledge_propose retains private model proposals with original source/revision; no established truth/recall/canon promotion. 21 passing affected checks across four files. Establishment and explicit canon-request adapters remain uncomposed.

- R0_NATIVE_CLOSURE_REPORT.md: current AST dependency map, 90 native modules / 67 entry-reachable / 23 uncomposed or alternate / seven legacy imports / zero import issues. Four AI contracts match exactly. This static inventory is not dynamic execution or migration proof.

## Live test state — preserve it

Online testing is authorized only in guild 1467249344947159291, against a legacy DB copy; earlier external-inference cap was $5. Current tests use local Ollama with separate bounded call budgets. Process handle 62251 runs online-qualification.mjs from an earlier source snapshot. Verify the handle before claiming liveness; it has not been hot-reloaded with subsequent fixes.

Preserved run: `.reports/online-6b8c5ce9-2c6b-4725-9bd5-fb6eb2b5ef56` (legacy-copy.sqlite, native stores, commands-before.json). Current launcher preserves stores on close. Older scratch harnesses may delete stores on shutdown; do not restart/stop one without identifying and preserving it.

Actual results: login/ready and 24 guild command roots; five autonomous API checks in AUTONOMOUS_DISCORD_REPORT.md, including shared-channel privacy refusal and rejection of bot/substituted-human authorship. One labeled retained bot message: 1569931894793969685. Its journal `.reports/autonomous-discord-20261110/receipt.json` forbids automatic send repeats. Zero model calls/game effects in that API test. Native interaction/turn rows were zero at last inspection; human-principal slash-command gameplay is not qualified and must not be fabricated.

ONLINE_OLLAMA_REPORT.md and qualification/ retain actual synthetic local-model evidence. Baseline, compact prompt, NPC-viewpoint, ownership-metadata and reasoning-mode probes still show PC authorship/grounding failures. Tool transport and private-canary input exclusion passed their bounded checks. No automatic delivery should be enabled from these results. Experimental prompts/reasoning mode were not applied to the running bot. No real player/GM secrets were used in those model probes.

## Honest major-phase status

- R0 partial: static inventory 1,077 modules / 4,224 exports / 219 routes / 55 tables / 456 literal kinds; dynamic record/writer contracts and semantic migration/removal proof remain open. Read current audit JSON before relying on historical hold counts.
- R1 partial: native opt-in startup, four-capability kernel/provider and scoped ingestion exist; full replacement/startup/operational qualification incomplete.
- R2 partial: source closure, actor-known context, private planning separation, weighted recall, private packages/canon foundations and durable context lineage exist. Real recall/identity/import/export/perception composition and migration incomplete.
- R3 partial: substantial native mechanics/receipts, explicit owner death/recovery/Blaze and reviewed bootstrap exist. Full SRD/house-rule parity, remaining generic tool-to-actual-executor composition, all features/costs/PvP/team/movement/items/economy/downtime and historical pending-state migration remain open.
- R4 partial: one-call ordinary generation and native segment/review/repair foundations exist. Receipt-backed semantic/agency validation, exact candidate approval/outbox, local writer repair and useful autonomous delivery remain incomplete; current model quality failed.
- R5 incomplete: private fictional-time scheduling, independent NPC cognition/actions/plans/fairness and source-bound observable beats remain largely open.
- R6 partial: typed subset, owner/private/session/death/root foundations exist. Full command/import/export/voice/multiplayer/guest/proxy/opening/late-entry flows and human-principal live acceptance remain open.
- R7 partial: claims, source/epoch/uncertainty receipts, context dependencies and private review/repair persistence exist. Full durable publication/ack, recovery/migration/rollback, all crash/concurrency cases and performance qualification remain open.
- R8 incomplete: independent full behavioral/parity/privacy/fault/quality gates and separately authorized production cutover have not passed. No old runtime or legacy tests retired without migration/replacement proof.

## Latest checkpoint commits and reproducible evidence

All following commits are local on the rebuild integration branch. Counts overlap across slices; do not add them into a full-suite total. No major phase is certified.

| Commit | Delivered slice | Completed affected verification |
| --- | --- | --- |
| a0c31341 | Generic native Hope execution, owner-private receipt projection and durable receipt dependencies | 198 checks / 21 files |
| db94c98c | Exact private Hope factual recap backed by an observed receipt | 95 checks / 15 files |
| aec28b48 | Native ready-operation discovery through context_read topic actions | 334 checks / 37 files |
| 57af21c3 | Native root metadata/ancestry-first selection from established knowledge | 87 checks / 13 files |
| 43bc692c | Private model proposal retention without truth/canon promotion | 21 checks / four files |
| 0866703d | Current AST dependency map and condensed audit documentation | Generation exit 0; no behavioral reruns |

Reports named above have adjacent *_HASHES.json and *_AFFECTED_TESTS.json where behavioral tests apply. Hashes record tested source/test bytes at that slice; later dependency changes supersede earlier qualification for those files. NATIVE_DEPENDENCY_MAP.json captures all 90 native module source hashes at 43bc692c, including uncomposed modules, plus the literal legacy entry closure. No runtime code changed after that map. The documentation commit is its snapshot, not a new behavioral baseline.

Local logs one directory above the worktree: r3-generic-engine-dependency-tests-20261110.txt (186 checks plus separate focused 12); r4-receipt-recap-dependency-tests-20261110.txt (80 plus focused 15); r3-action-discovery-dependency-tests-20261110.txt (316 plus focused 18); r2-native-retrieval-dependency-tests-20261110.txt (84 plus focused three); r2-native-proposals-dependency-tests-20261111.txt (17 plus focused four). The corresponding manifests identify exact commands' test paths. Do not rerun unchanged completed suites; calculate changed-import dependents first and run explicit paths from the repository root with node --test.

New retained actual local-model evidence in docs/veilkeeper2/qualification/: ollama-native-cost-check.json (GM prompt failed, no tool, Hope unchanged); ollama-native-cost-control-stale-revision.json (literal placeholder revision refused); ollama-native-cost-control.json (corrected explicit transport control, real synthetic cost committed); ollama-native-cost-discovery.json (natural request failed, no tools); ollama-native-cost-discovery-control.json (three-call discovery/commit control passed). These use synthetic owner decisions and actual local qwen3.5:4b/native validators, not live human consent. No messages were sent by these probes. Never overwrite failure receipts to present a passing aggregate. Diagnostic prompts were not applied to the running bot.

The test bot's execution handle 62251 was polled and remained running without new output at this checkpoint. Read-only SQLite counts freshly confirmed vk2_turns=0 and vk3_native_interactions=0. The retained prior Discord API message is still the only send from the autonomous API check; its journal forbids repeats. Do not infer human gameplay or current loaded source from the live client's presence.

Git status after 0866703d: only unrelated README.md is dirty. No implementation changes or tests are left uncommitted. Preserve that README diff exactly. The baseline and origin rebuild refs were freshly checked this checkpoint and remain the pinned and fda77bd8 refs above. No merges/pushes occurred because no major phase passed; we are already on the requested rebuild integration branch.

Resume procedure: verify usage and explicit user resume if the goal is paused; inspect git status/worktree/branch and the preserved process before edits. Read AGENTS.md and this handoff, then the exact next module/report dependencies. Source-linked removed core specs remain available through git show at the pinned commit under docs/Implementation_Plans/. Do not restore removed docs merely to read them. Refresh the pinned audit only if the baseline advances. Computer-use stays forbidden unless the user explicitly reverses that instruction.

The next implementation slice should compose the existing cost-prompt-store.js, discord-cost-decisions.js and rules/hope-consent-ingress.js with the native interaction router/root, using actual owner evidence and source-bound native terms. Discovery currently assumes those accepted terms/consents already exist and does not create them. Do not mint acceptance from model prose or a fabricated human SDK event. Then connect ordinary-roll-preparation.js, roll-action-lifecycle.js, owner-roll-evidence.js, roll-store.js and pre-roll Fear coordination through the same generic boundary, retaining native dice, notice delivery, owner roll evidence and full modifiers/house rules. Current ordinary preparation intentionally supports only zero modifiers and is not full parity. Use NATIVE_DEPENDENCY_MAP.json to distinguish composed production candidates from isolated tested services.

In parallel scope only when authorized, R2 still needs authenticated observations, actor knowledge, world identity reuse and recall causes/pins/fictional time; readEvidence currently returns null in native root and deliberately prevents establishment from model proposals. No NPC autonomous source/scheduler exists in the composed root. The current 256-candidate/64-record default selector is bounded deterministic retrieval, not weighted attention. R4 still needs independently validated broader semantic/agency quality, approved repaired-candidate delivery and actual acknowledgements. Current exact recap is a narrow diagnostic exception, not a general authorization engine.

## Next exact work and rollback

The fixed Hope-cost tool bridge and exact private recap check are implemented. Owner-private ready-operation discovery is implemented for already-consented Hope costs. Next implement native proposal preparation and actual owner consent workflow composition, then connect the remaining action/consent/death receipts to broader consequential review and generic orchestration. Preserve one-call ordinary prose and engine-owned outcomes; never mint mechanical authority from review JSON. Then implement independently validated repaired-candidate publication/ack and close R4–R8 gates. Observed native Hope receipts now have durable hash dependencies checked before publication. Other effect families/current-state dependencies and receipt-backed semantic assertion review remain open.

Preserve all native stores, source/control epochs, choices, rolls, uncertain attempts and publication receipts. No reset/clean or deletion to make older code run. Use preserved copies and explicit reviewed migrations for rollback; disable publication before downgrading safeguards. Production/deployment remains unchanged and requires separate authorization.
