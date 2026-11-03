# Veilkeeper 2.0 â€” current rebuild handoff

Refreshed 2026-11-03. The full R0â€“R8 implementation goal is incomplete. The user-directed pause threshold has been reached: five-hour 98% used (2% remaining), weekly 94% used. Implementation stopped; the goal is being marked paused with this checkpoint. Confirm the returned goal status and stop until explicit resume. Never infer permission from a reset or redeem credits.

## Workspace and binding authorization

- Worktree: D:/Library/Development/Veiled_City_2/rebuild; branch rebuild/veilkeeper2-audience-first. Parent workspace: D:/Library/Development/Veiled_City_2. Deprecated D:/Library/Development/Veiled_City remains untouched.
- Preserve unrelated dirty README.md. Never stage, reset or clean it. User-authorized documentation cleanup is committed as 3ca9db9d; do not restore removed documents just to use them.
- Frozen parent baseline checkout/branch: codex/clean-ai-gm-2026-10 at 1ba6c7e15db1a66ba34b36336f31437beffe44d6. Fresh approved git ls-remote on 2026-11-03 still matches. Rebuild origin is 7340375cf2e0596aa274f0ebc0fdfb05656553f1, verified a local ancestor. Do not infer who published it. No push/merge was run during these slices.
- Latest prior commit is a5d9627d (observed human GM authority). The checkpoint containing R6_NATIVE_SESSION_SETUP_REPORT.md commits session creation plus this handoff; inspect git log for its exact SHA.
- Commit scoped phase work. Integrate/publish completed major phases only to the rebuild branch, never the baseline. This worktree already uses the integration target, so no self-merge. No complete major-phase gate has passed. Production cutover/deployment requires separate authorization.
- No subagents authorized. Current Node v26.13.0; installed discord.js 14.27.0 and openai 6.6.0. New tests under bot/tests/veilkeeper2 are ignored: force-add exact test paths. Run explicit fresh changed-dependency suites; do not rerun passed unchanged tests or use legacy npm suites/fixtures as replacement evidence.

## Governing objective

AGENTS.md, docs/VEILKEEPER_2_ASTRA6_REBUILD_HANDOFF.md, owner AI GM behavior and the Audience-First, Creative-First, Agency-Preserving and Weighted-Lore specs remain binding. They were read before architecture work; source-linked removed documents are recoverable from pinned history/frozen baseline. Recheck source references if baseline advances.

Exactly four AI capabilities: context_read, action_propose, state_inspect, knowledge_propose. Specific mechanics remain internal native validators, never generic state patches. The end product must be an inventive impartial conversational GM with independent limited-knowledge NPCs and a persistent world, not a rules terminal. Rumors, lies, perceptions and narration do not become objective truth; players exclusively control PCs. Harmless direct address/second-person description is allowed. No GM-private context in player inference.

## Honest phase status

- R0 partial: static inventory covers 1,077 modules, 4,224 exports, 219 routes, 55 effective tables and 456 literal kinds. 1,009 dynamic/unfiltered record contracts, semantic migrations and removal proofs remain open. See R0_BINDING_REPORT.md and audit manifests.
- R1 partial: four-capability kernel, scoped provider/source authority, native scene/source persistence, opt-in Responses adapter and read-only Discord ingestion. No full native startup, deployment or live qualification.
- R2 partial: metadata-first source closure, actor-known context, separate GM-private planning, weighted recall, knowledge proposals/history, private hooks/relationships and package/canon foundations. Full formats, identity/relevance adapters and canonical migration remain open.
- R3 partial: substantial ordinary/Hope/Fear/native damage/death/Blaze mechanics and receipts exist, including new reviewed bootstrap. Full SRD/house-rule parity, all actual readers/executors, PvP/team/features/costs/movement/items/economy/downtime and historical migration remain incomplete.
- R4/R5 incomplete: full prose consequence review, scene writing and proactive living NPC/world behavior still required. Do not redefine completion around mechanics.
- R6 partial: opt-in exact private death UI/publication/commands/root, owner attendance, canonical PC readers and human-GM authority/session creation. Most commands, startup/assembly/end/recap, guest/selection/proxy routing and real repository/config/session composition remain open.
- R7 partial: turn claims/withheld drafts and several uncertainty/receipt recovery primitives. Complete durable publication, crash/race/migration/rollback qualification remains open.
- R8 incomplete: independent acceptance matrix, behavior/live Discord/performance and full cutover qualification not performed.

Default bot/src/v2/index.js still creates an offline empty-registry kernel. Existing start still runs legacy src/index.js. No production database, live inference, live Discord send or deployment was performed. New code being present does not mean it is installed. Legacy source outside v2, SQL/content and old suites were not retired.

## Current native contracts and latest work

All paths below are under bot/src/v2 unless stated otherwise.

1. source-authority.js binds observed native messages, exact viewer/writer sets, owner/NPC-proxy control, scene/session/attendance and immutable source revisions. PC proxies are forbidden. inspectReceiptSource returns scoped metadata only for already-issued owner receipt ancestry after death; it is not a live grant or caller disclosure check. Closed/changed grants/history remain held.
2. scene-store.js derives authorityRevision and participantRevisions. Source digests use lifecycle plus the speaker's attendance epoch, preserving other players' pending sources on late entry. Own absence/rejoin and scene close/reopen cannot revive issued proofs. Equal initial epochs preserve old digest layout; old rows bootstrap from their native revision. Caller-supplied epochs are rejected. Older readers without metadata stay conservatively bound to scene revision.
3. rules/action-store.js shares canonical HP/Armor, Hope, Stress/level/life/death and immutable action events. Native attack RNG/Fear debit and PC damage are fixed transactions; no generic resolved transition or arbitrary state patch. Dedicated databases are opt-in, not migrated production authority.
4. rules/pc-life-state.js persists explicit private review/choice, once-only Risk It All/Avoid Death/Blaze outcomes and explicit Hope allocation. Avoid Death scars permanently change Hope cap; unconscious/pending/full-HP/dead actors cannot resume ordinary actions. Full before/after frames guard CAS. No automatic recovery split, authored scar or extra Fear move.
5. rules/blaze-of-glory.js and blaze-costs.js bind independently owner-authored final action, actual human approval, native automatic Critical, terminal verifier and final death/consumption. Exact planned/consented Hope costs have a narrow native exception. Actual final executor, other costs/features and GM adapters remain open.
6. Fear reservations/coordinator/roll store persist held announcements, saved send responses, private defenses/Armor, fixed damage, death completion and original-action continuation. Uncertain sends are not retried. Dead/unconscious/full-HP owners remain blocked. Changed eligibility requires reviewed refresh. Real source/encounter/range/features/GM readers and full concurrency/crash proof remain open.
7. death-prompts.js + discord-death-prompts.js save opaque native options, exact payload, one send attempt/response and private readback before activation. Reconciliation fetches only a saved response. Send-to-response-save gaps remain held. ensure reuses one current prompt per request/purpose; duplicates/changed/expired prompts are not silently replaced.
8. discord-death-decisions.js + component-choice-sources.js + rules/death-decision-ingress.js accept only observed same-client owner clicks, exact delivered message/body/options, fresh audience and native canonical terms. Component sources are labelled evidence, not invented PC dialogue. Native sequence is SQLite order. Explicit recovery buttons enumerate legal HP/Stress splits (at most 13).
9. interaction-receipts.js and discord-death-dispatcher.js separate ack, canonical effect and reply states. Duplicate events cannot process/reply again. Failed confirmation preserves effects. death-interaction-reconciliation.js repairs only transport bookkeeping from actual canonical receipt/source lineage; it does not replay dice/effects/progression/replies. Unsent replies become withheld.
10. native-death-workflow.js composes those services. Review advances to choice; an already saved choice resolves native fate once, including resume before outcome; Hope advances to allocation, Blaze awaits actual final action. Explicit observed death-refresh can supersede only stale confirmed-delivered controls, retaining old history/approval. It cannot bypass uncertain sends or replace saved choices.
11. discord-death-commands.js supports existing effect aliases for new-runtime death-review, death-reconcile and death-refresh. Real owner/session/channel scopes and permissions are rechecked. discord-interaction-router.js owns an unclaimed client, private denials and native namespaces; other callbacks must be routed explicitly. It is not installed alongside production. Denial deduplication itself is only bounded in-memory.
12. discord-session-attendance.js optionally composes into the root for present/arrive/absent/leave. It requires existing registered owner actor/session/scene, a native owner selection resolver and character identity. Offscreen attendance only: no fictional arrival, PC proxy, resource bootstrap or automatic party/co-location. Re-check-in retains an active marker. Source/scene epochs preserve another owner's real pending roll through reopening.
13. canonical-actor-readers.js joins native character repository, control and canonical PC tables. It supplies full native rule snapshots and metadata-only source readers, taking death/status/pools/cap from canonical state. Missing profiles, incompatible historical death, level/owner/control mismatch, active zero-slot bootstrap and mixed reads are held. Full snapshots contain private sheet data and must never be exposed to inference or unscoped exports.
14. pc-bootstrap-source.js + rules/pc-bootstrap.js add initializePcFromReviewedSource. Exact native persisted healthy active/reserve/guest sheet + registered owner + actual human review initialize absent defenses/Hope/life atomically. Typed receipt replays without resetting later damage. Partial/existing rows, historical death/unconscious/recovery, final HP and missing/zero permanent cap are held. No production migration or general repair is supplied.
15. discord-gm-authority.js verifies recent observed human declarations with forced fetched member/role/channel evidence and closed native policy. It supports session_start and exact pc_bootstrap_review only. Proofs are short leases (15 sec default, max 30); check is synchronous expiry/policy/declaration/revocation-hint validation, not a network fetch. Refresh before effects across async boundaries. No PC control or inference scope is granted.
16. native-session-setup.js creates one session plus empty opening scene atomically from that GM lease/declaration. Active-session conflict is checked in the transaction. Same-source replay cannot reopen an ended session or displace a successor. session-occasions.js shares planning mode enumeration. Session JSON title/assembly/setup provenance are closed optional metadata. No owner assignment, attendance, movement, opening prose or recap occurs.

## Completed evidence â€” scope and hashes

Latest reports/manifests are under docs/veilkeeper2. They are slice evidence, not combined phase certification. Later hashes supersede changed source files. Some raw logs are only in tool transcripts; do not invent artifacts.

- R6_NATIVE_SESSION_SETUP_REPORT.md: 20 passed / 532.3219 ms; session creation + scene store + human GM checks.
- R6_NATIVE_GM_AUTHORITY_REPORT.md: 9 passed / 532.8302 ms at prior GM-only checkpoint.
- R3_REVIEWED_PC_BOOTSTRAP_REPORT.md: 54 passed / 4681.4606 ms; actual canonical store/damage/death consumers and review fixtures.
- R6_CANONICAL_ACTOR_READERS_REPORT.md: 7 passed / 1366.7059 ms; native-shaped SQLite repository, actual death/scar/receipt state.
- R6_SESSION_ATTENDANCE_REPORT.md: 102 distinct cases across 92-case source consumer run, final 10 attendance cases and 7 repeated root cases. It preserves actual delivered pending ordinary-roll authority across another late arrival. Discord/GM/dice ingress remains simulated.
- R6_OWNER_PROMPT_REFRESH_REPORT.md: 81 passed / 27923.9048 ms.
- R6_EXCLUSIVE_INTERACTION_ROUTER_REPORT.md: 14 passed / 5367.278 ms.
- R6_OWNER_DEATH_COMMANDS_REPORT.md: 21 distinct passed; R6_DEATH_INTERACTION_RECONCILIATION_REPORT.md: 46 passed.
- R6_NATIVE_DEATH_WORKFLOW_REPORT.md: 54 distinct passed; R6_DEATH_COMPONENT_DISPATCH_REPORT.md: 15 new passed.
- Earlier R3 Discord ingress/publication/allocation, owner receipt ancestry, lethal interruption, Blaze costs/terminal/approval and death/continuation reports remain authoritative for their scopes. Read matching hash manifests before relying on historical counts.

Actual SQLite/source/rules checks are separate from simulated SDK/member/send/readback/reply/GM/declaration certificates. No mocked test proves live Discord quality. Passing suites must not be rerun without a tested-code change.

## Migration/rollback and next exact work

Dedicated v2 stores reject unrelated schemas; never point them at production. Preserve all source, scene, character, action/Hope/life, roll/Fear, prompt/response, decision, interaction, knowledge and publication files. Do not delete choices, uncertain attempts, epochs or receipts to make old code run. Older constructors/digests/validators may reject new tables/metadata; disable opt-in services and use preserved copies/reviewed migration on rollback.

Next actions:

1. Check actual goal/usage and Git status. If paused, stop until explicit resume. Preserve README. Inspect latest report/manifest/commit and remote heads before integration. Baseline unchanged does not close R0 dynamic audit holds.
2. Session-start and PC bootstrap preview/review routing are done (R6_GM_SESSION_COMMAND_REPORT.md, router option nativeGm with bootstrap deps). Remaining: no public private-state output, no retry after uncertain effects/replies. Root currently owns death and optional attendance only; GM factory/services are not routed yet.
3. Policy and owner-session adapters exist (R6_CAMPAIGN_ADAPTERS_REPORT.md); compose them with the real repository in a root and test against it. Finish private native preview/review presentation; do not substitute role booleans or model markers for authority. Respect lease freshness.
4. Session end exists (closes scenes, deletes nothing). Reopening exists; recap/opening occasions need live-inference authorization and remain open through the same audience writer, preserving important pending actions. Owner registration and in-place rebinding exist (pc-register, pc-rebind); add explicit player selection without resetting canonical resources, fictional movement or granting PC proxies. Pre-session attendance and legacy guest/NPC delegation remain open.
5. Migrate historical actors and pending death/Blaze/roll/Fear state with exact source/authority/knowledge lineage. Full actor-frame CAS must not be relaxed when changing projection. Old initialized or partial profiles need reviewed attestation/recovery, not re-bootstrap.
6. Finish actual native GM/rules/encounter/range/feature/cost/PvP/team/movement/item/downtime adapters and conversational result publication/Fear continuation. Then broaden R4/R5 living-world/NPC behavior rather than stopping at controls.
7. Close R0 dynamic contracts and every R1â€“R8 acceptance gate, independent live tests, concurrency/crash, semantic migration/rollback and performance before retiring runtime paths or declaring a major phase complete. Publish certified major phases only to origin rebuild; production remains separate.







