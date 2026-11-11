# Veilkeeper 2.0 — current rebuild handoff

Current-state review complete for this checkpoint; the full R0–R8 implementation remains active and incomplete. Slice reports below record tested work, not phase certification. Inspect Git and live handles before relying on this snapshot.

## Binding workspace and owner instructions

- Worktree: `D:/Library/Development/Veiled_City_2/rebuild`, branch `rebuild/veilkeeper2-audience-first`. Deprecated `D:/Library/Development/Veiled_City` is not an implementation target. Its user-authorized credential file may be loaded by path without printing/copying values.
- Preserve unrelated dirty `README.md`; never stage/reset/clean it. No subagents authorized. New native tests under `bot/tests/veilkeeper2` are ignored: force-add exact paths. Run fresh explicit changed-dependency checks; never present simulated SDK/model checks as live quality.
- Owner forbids computer-use until explicitly reauthorized. Do not use Windows/browser UI automation as a workaround. Autonomous bot/API and native testing are authorized.
- At 98% used / 2% remaining on either usage window: create a thorough current handoff, pause the goal and stop until resume. Do not redeem credits. Latest measured limits were 66% primary / 56% weekly used; re-read before relying on them.
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

Source/scene authority binds exact recipients/writers, source revision, actor control and attendance epochs. Another owner's late entry preserves pending owner proofs; own absence/rejoin or lifecycle closure never revives old proofs. Receipt-only ancestry is metadata for already-issued outcomes, not new PC control. Death choices/recovery allocations require actual owner evidence; engine dice/outcomes and uncertainty receipts are durable. Full SRD/house-rule parity and real execution adapters remain incomplete.

## Latest implemented slices and evidence

- R6_COMMAND_BOUNDARY_REPORT.md; R6_PRIVATE_CHANNEL_REPORT.md; R6_DRAFT_PUBLICATION_REPORT.md: v2 schema/registration and thin native service boundaries.
- R7_DRAFT_SOURCE_REPORT.md; R7_DRAFT_REFRESH_REPORT.md: immutable original-source lineage and fresh Discord message/audience intake before reviewed publication.
- R7_REST_AUDIENCE_REPORT.md; R7_REST_AUDIENCE_LIVE_REPORT.md: complete fresh uncached REST rosters; two real seven-member reads at 858.05/563.66 ms. Larger-guild/private end-to-end timing remains open.
- R4_SEGMENT_REVIEW_REPORT.md; R4_POLICY_WIRING_REPORT.md; R4_AUTHORSHIP_REPORT.md: native per-paragraph diagnostics, independent siblings, explicit control/portrayal metadata, configurable native review policy. Screening is not semantic authorization.
- R7_SEGMENT_REVIEW_REPORT.md; R4_DURABLE_REPAIR_REPORT.md (`d1ad167c`): durable review snapshots and DB-before-memory local repair, exact ancestry/sequence/sibling checks, original raw draft unchanged. Repair slice: 78 passing affected behavioral checks. Candidates remain private requires_semantic_review, sent=false, knowledgeAcknowledged=false.
- R6_CONVERSATION_LIFECYCLE_REPORT.md (`4d31dfb6`): canonical death/owner/migration gating of conversation; 19 passing checks, with both new regression cases failing under previous raw-scene wiring.
- R7_CONTEXT_LINEAGE_REPORT.md (current checkpoint): durable metadata-hash ancestry for initial/tool context, cold ACL/source/NPC revalidation before publish, no body rereads, context-bound publication IDs and historical missing-lineage holds. 184 passing affected behavioral checks across 19 files. Source/test hashes and exact scopes are in the matching manifests.

Historical reports cover native ordinary rolls, Hope/Fear, damage/death/Blaze, consent, bootstrap and receipt repair. Read their source hashes before relying on old counts. Completed changed slices do not establish a full fresh suite, phase or live quality gate.

## Live test state — preserve it

Online testing is authorized only in guild 1467249344947159291, against a legacy DB copy; earlier external-inference cap was $5. Current tests use local Ollama with separate bounded call budgets. Process handle 62251 runs online-qualification.mjs from an earlier source snapshot. Verify the handle before claiming liveness; it has not been hot-reloaded with subsequent fixes.

Preserved run: `.reports/online-6b8c5ce9-2c6b-4725-9bd5-fb6eb2b5ef56` (legacy-copy.sqlite, native stores, commands-before.json). Current launcher preserves stores on close. Older scratch harnesses may delete stores on shutdown; do not restart/stop one without identifying and preserving it.

Actual results: login/ready and 24 guild command roots; five autonomous API checks in AUTONOMOUS_DISCORD_REPORT.md, including shared-channel privacy refusal and rejection of bot/substituted-human authorship. One labeled retained bot message: 1569931894793969685. Its journal `.reports/autonomous-discord-20261110/receipt.json` forbids automatic send repeats. Zero model calls/game effects in that API test. Native interaction/turn rows were zero at last inspection; human-principal slash-command gameplay is not qualified and must not be fabricated.

ONLINE_OLLAMA_REPORT.md and qualification/ retain actual synthetic local-model evidence. Baseline, compact prompt, NPC-viewpoint, ownership-metadata and reasoning-mode probes still show PC authorship/grounding failures. Tool transport and private-canary input exclusion passed their bounded checks. No automatic delivery should be enabled from these results. Experimental prompts/reasoning mode were not applied to the running bot. No real player/GM secrets were used in those model probes.

## Honest major-phase status

- R0 partial: static inventory 1,077 modules / 4,224 exports / 219 routes / 55 tables / 456 literal kinds; dynamic record/writer contracts and semantic migration/removal proof remain open. Read current audit JSON before relying on historical hold counts.
- R1 partial: native opt-in startup, four-capability kernel/provider and scoped ingestion exist; full replacement/startup/operational qualification incomplete.
- R2 partial: source closure, actor-known context, private planning separation, weighted recall, private packages/canon foundations and durable context lineage exist. Real recall/identity/import/export/perception composition and migration incomplete.
- R3 partial: substantial native mechanics/receipts, explicit owner death/recovery/Blaze and reviewed bootstrap exist. Full SRD/house-rule parity, generic tool-to-actual-executor composition, all features/costs/PvP/team/movement/items/economy/downtime and historical pending-state migration remain open.
- R4 partial: one-call ordinary generation and native segment/review/repair foundations exist. Receipt-backed semantic/agency validation, exact candidate approval/outbox, local writer repair and useful autonomous delivery remain incomplete; current model quality failed.
- R5 incomplete: private fictional-time scheduling, independent NPC cognition/actions/plans/fairness and source-bound observable beats remain largely open.
- R6 partial: typed subset, owner/private/session/death/root foundations exist. Full command/import/export/voice/multiplayer/guest/proxy/opening/late-entry flows and human-principal live acceptance remain open.
- R7 partial: claims, source/epoch/uncertainty receipts, context dependencies and private review/repair persistence exist. Full durable publication/ack, recovery/migration/rollback, all crash/concurrency cases and performance qualification remain open.
- R8 incomplete: independent full behavioral/parity/privacy/fault/quality gates and separately authorized production cutover have not passed. No old runtime or legacy tests retired without migration/replacement proof.

## Next exact work and rollback

Connect actual native action/consent/death receipts to scope-bound consequential material review and generic consequence orchestration. Preserve one-call ordinary prose and engine-owned outcomes; never mint mechanical authority from review JSON. Then implement independently validated repaired-candidate publication/ack and close R4–R8 gates. Context manifests do not yet encode every effect/current-state/consent dependency.

Preserve all native stores, source/control epochs, choices, rolls, uncertain attempts and publication receipts. No reset/clean or deletion to make older code run. Use preserved copies and explicit reviewed migrations for rollback; disable publication before downgrading safeguards. Production/deployment remains unchanged and requires separate authorization.
