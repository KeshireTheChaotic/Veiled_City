# Veilkeeper 2.0 — current rebuild handoff

Active checkpoint2026-11-14. R0 inventory/disposition and R1 offline-skeleton gates are complete. R2–R8 and the full goal remain incomplete. Completion is scoped to the exact early phase gates, not release or live game quality. Production unchanged.

## Workspace and binding instructions

- Worktree D:/Library/Development/Veiled_City_2/rebuild; branch rebuild/veilkeeper2-audience-first. Deprecated D:/Library/Development/Veiled_City is not an implementation target.
- Preserve unrelated dirty README.md and bot/src/v2/rules/hope-consent-ingress.js. Do not stage, reset, clean or amend them. Computer use forbidden; subagents not authorized.
- Scoped commits authorized. After qualified major phases, publish only the rebuild branch. This worktree already is that branch; no self-merge. R0 commit800cf762 was pushed successfully; the containing commit records R1 acceptance. Verify current remote equality at resume. Baseline branch and production are untouched.
- At98% used /2% remaining in either account window: write thorough handoff, update_goal paused, report its returned status and stop until explicit resume. Latest observed31% primary/21% weekly is historical; recheck live. Never redeem credits. Goal remains active.
- Fresh changed-code/import-dependent tests only. Do not rerun passed unchanged suites. Force-add ignored native tests by exact path. Do not remove legacy tests/runtime without replacement coverage and safe migration.
- Exactly four AI capabilities: context_read, action_propose, state_inspect, knowledge_propose. No individual mechanical/NPC/canon tools or arbitrary patches. Native rules own consequences; players own PCs/proxies. Rumors, imported suggestions and NPC plans are not objective truth or execution permission.
- Online authorization only real test guild1467249344947159291 and legacy database copies. Historical external inference cap$5; current model calls local only. Authorized credential path D:/Library/Development/Veiled_City/bot/.env may be loaded by path, never printed/copied. Synthetic guild IDs in tests are fixtures, not extra live authorization.
- Governing audience/creative/agency/weighted-lore and owner specifications, project AGENTS and mandatory docs/VEILKEEPER_2_ASTRA6_REBUILD_HANDOFF.md remain binding. Deleted historical specs can be read at the pin; do not restore merely to read.

## Completed early phase gates

R0:800cf762, pushed to origin. R0_PHASE_REPORT/ACCEPTANCE/HASHES and preservation/source-receipt/reference artifacts are current. Immutable pin1ba6c7e15db1a66ba34b36336f31437beffe44d6; latest freshly verified baseline15a8f44671f227c6bec69bf30744e03c5692809b. Direct Git-object reads independently verify1099/1123 source files,1077/1101 JS modules,10436/10512 runtime function definitions,4224/4327 public endpoints,4909/4965 imported bindings,219 command routes and55 effective tables at pin/upstream. Original10711 function count included non-runtime scripts. Checkout CRLF hashes are explicitly reconciled against immutable Git bytes.

11495 entries have exact preservation destinations; source modules retain planned native replacements.270 cited ranges were verified across both revisions, with24 explicit end-of-file corrections and five moved-export corrections. All4353 opaque contract occurrences across the two revisions remain adoption/removal blockers:2033 dynamic record uses and2320 injected/factory contracts. They are not claimed resolved.535/560 historical test artifacts are inventoried/hashed only. No deletion proposed or authorized; R3/R6/R7/R8 must prove each relevant target/authority/typed projection/replacement/migration before adoption. Seven fresh R0 checks pass: four contract checks in combined R0/R1 run109.2619ms, three final artifact checks275.2803ms. Historical pinned CALL_GRAPH and artifacts remain intact.

R1: R1_PHASE_REPORT/ACCEPTANCE/HASHES records completion of offline boot, dependency injection, authenticated event/source and actor/principal binding, accepted audience packets, source/receipt contract, native versioned registry, model gateway and no-send outbox. Three fresh actual-CLI/composition acceptance checks pass in combined109.2619ms run, zero failures/skips. They reject unknown state patches, forged source/actor and stale revision, retain trace/replay receipts and prove model damage prose cannot execute a rule. Provider/world data are synthetic; no live quality or Daggerheart parity claim. Exactly four capabilities. Static current native closure136 modules,102 reachable,34 uncomposed,eight audited legacy utility/transport imports,zero missing edges. Unchanged passed R1 suites were not rerun.

## Recent implementation checkpoints

- dc6e0945 R6 composed authenticated private GM imports;244 distinct checks across30 files passed, including real root/cold resume/export/snapshot/restore with simulated Discord/CDN. Prior881e8fc1 added atomic private narrative history;34 checks. gm-hook attachment preparation bda86db3 and failed-export receipt fix5689a22f remain supporting slices.
- Existing import-gm-hooks privately defers, authenticates observed current GM before download, validates exact campaign character and commits hooks/connections/pending canon/narrative atomically. Character targets resolve exact current identities; NPC/faction/location/etc targets stay preserved holds. Durable claims prevent repeat import/reply across restart and uncertain outcomes. No PC control, canon approval, actor knowledge, fiction publication or game effects.
- VK2_PRIVATE_IMPORTS=1 initializes private-hooks.sqlite only on a fresh runtime. Existing manifested store reopens automatically. Enabling on an older ready manifest holds before root/login without modifying sealed files. Older nine-table standalone stores also hold before DDL. Reviewed migration remains required.
- GM exports merge current native hooks/connections/proposals and source-bound narrative; all JSON/Markdown/DOCX formats retain it. Native reviewed canon stays separate from legacy authority. Player exports exclude private fields. Native snapshot/restore includes private store and durable journals, with exact source hashes and original run identity.
- R5 cd9fdbdc: actor-known private motives/goals/beliefs and complete source closure; GM-private never reaches audience gateway; current PC text never becomes NPC hearing.
- R5 7c767b31/fc679143: durable unexecuted private NPC intentions, cold continuity, root.npcPlanning plan/inspect/retain with fresh source/actor checks. No effects/disclosure authority.
- R5 12320bba: private planning from committed scene opening/reopening, durable once-per-opening/NPC claim and fair consideration. Optional VK2_DIRECTOR=1; defaultoff. No clock-based cadence, spontaneous PC control or consequential NPC action.410 affected checks in original report; synthetic provider only for Director.
- R7 d22a36d2/3f5207e3: local shared guild lease and native offline snapshot/inspect/restore. Separate bundles only; restored login needs exact VK2_RESTORED_SNAPSHOT_HASH plus VK2_RESUME=1. Legacy/cross-machine exclusion remains open.
- Earlier R6 player/GM exports all formats8c079c90, GM JSONe482626e, owner JSON46c1208e; R3 read-only session/encounter readersc2bf74e3; model profile484b5a56. Reports preserve actual checks and limits; counts overlap and are not release totals.

## Conversational quality and model evidence

qwen3.5:27b approved for continued testing. Default model-config remains thinking=true,4096 output tokens,90000ms timeout; do not silently switch from separately labeled non-thinking diagnostics. Actual model calls are terminal and must not be rerun unchanged. R4 remains unqualified: continuity/PC-agency errors, unsupported invented conditions and long latency/timeouts are retained negative evidence.

- Owner Nov11 rerun:27B_RESPONSE_LOG_20261111_202433.md/json/csv; eight cases, seven prose41490–78582ms, median60477ms, one timeout90018ms.
- R5_NPC_27B_RESPONSE_LOG.json: two thinking cases timeout90018.3931/90008.3165ms; separate non-thinking proposals24376.8428/27792.8133ms. Precise invented timetables/signature conditions stay uncommitted claims.
- R5_NPC_PRIVATE_CONTEXT_RESPONSE.json: non-thinking48292.6113ms, two entitled private reads, zero unauthorized body reads.
- R5_NPC_PLAN_HISTORY_RESPONSE.json: real SQLite reopen, two calls40470.2204/27025.5244ms; retained unexecuted intent but repeated a line and said Mira or the player. Preserve failure.
- R5_NATIVE_NPC_PLANNING_RESPONSE.json: real root plus simulated SDK and actual local model46379.2798ms; changed prompt avoided extra physical player/PC actions in one sample. One sample is not qualification.

All those probes made zero live Discord/cloud calls/sends or fictional time/effect changes. Full responses/times/request/source hashes remain in reports and ignored raw .reports directories. No new model call during current R0/R1 acceptance.

## Online and rollback evidence

No launcher started in this checkpoint. Last sanitized process scan found no matching project/native Node launcher; not global ownership proof. Historical PID22720/exec92647 are not action targets without fresh identity evidence. Never expose credentials or private archive bodies.

Historical .reports/online-7d5a6467-69fe-4adf-930f-d196b2579865/native contains actual stores; parent contains legacy-copy.sqlite, SHA0fe6f5c91a2df83aa7bfb92eb816630a110dfe435c8c1bc66065eea7361513bf. Source678d10a2 is historical, not current. Original one-send message1569931894793969685 is guarded by .reports/autonomous-discord-20261110/receipt.json: NEVER resend unchanged.

Actual offline CLI snapshot probe .reports/runtime-snapshot-probe-20261114-f5894402-e5d8-4137-af17-148f59e1c1e5: snapshotHash40a4cab883017fc77fe54011d2936f33c8807b317b15d6e0b80ba23a6a8088a9, runID0faadc15-2ce8-44c2-a8e6-b54b8c31ffa5,11 files/nine native data files byte-verified. Original legacy counts preserved. Restored bundle NEVER logged in. Wrong parent-path attempt held safely in the separate b0fdbc57 probe directory; preserve both. Runtime import tests now separately prove the expanded private store snapshot/restore with synthetic data.

Keep main/WAL/journal, source/origin/pin/recall/choice/interaction/uncertain-publication histories. No automatic adoption of pre-manifest/partial stores, no schema downgrade to fit code, no erase-to-retry. Default shared lease resolves to baseline/.vk2-runtime-leases; all native launchers must share it or identical explicit VK2_GUILD_LEASE_DIR. Offline isolated-copy lease directories are not deployment-global ownership claims.

## Remaining work and next exact phase

R2 next: source-backed NPC perception/IC-speech/witness, correction/retraction and imported actor knowledge; complete weighted relevance/time issuers and protected-canon lifecycle. Never treat current player text as automatic NPC hearing or a planner thought as an event. Preserve R0 opaque contracts until each adoption proof exists.

R3: full current action terms/target/range/usage/cost/condition/owner readiness, Daggerheart2.0/house-rule parity and complete action controller. Root ordinary rolls remain disabled. Owner roll-choice evidence has executionAuthority:false. No supplied dice faces, invented target/range or scene-ID equivalence. Native UUID and legacy scene-composite mapping remains reviewed-migration work; scenePresence is descriptive, authoritative encounter ranges control rules.

R4: sustained creative human-quality conversation, semantic agency/privacy/grounding and qualified publication. Local regex/repair and synthetic green checks are not semantic proof. Existing reviewed draft publication requires explicit fresh human-GM approval and exact source/audience/receipt revalidation; automatic prose remains unqualified.

R5: meaningful independent NPC/faction actions and resources, other fictional events/time opportunities, pending player response windows, presence/witness/disclosure and fair long continuity. Current Director retains private intentions only.

R6: remaining sheet imports and commands, setup/late arrivals/proxies/private multiplayer/voice and human acceptance. Private import legacy campaign snapshot/GM-log parity and uncertain transport reconciliation remain holds.

R7: populated legacy/pre-manifest conversion, external publication reconciliation, legacy/cross-machine writer exclusion and complete crash/fault/performance/revocation acceptance. R8: independent parity/privacy/quality/migration/human release and separately authorized production cutover. Do not mark full goal complete for R0/R1 or other slices.
