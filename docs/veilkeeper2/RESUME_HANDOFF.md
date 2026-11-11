## 2026-11-10: private-channel native service slice complete

R6_PRIVATE_CHANNEL_REPORT.md records eight passing focused/composition checks and source/test hashes. No live operation, schema migration, major phase completion or production change. Next: native draft-publication extraction and asynchronous scope revalidation.

# Veilkeeper 2.0 — current rebuild handoff

Reviewed and continued by explicit user request on 2026-11-10. The full R0–R8 rebuild remains incomplete. Current checkpoint resolves the legacy command-schema boundary: see R6_COMMAND_BOUNDARY_REPORT.md (9 focused checks). The 504/504 result below belongs to the prior a2feccb8 checkpoint, not a new full-suite run. Preserve unrelated README.md.

Prior live qualification (2026-11-03) used the authorized test guild and scratch copy/stores; that process has not been inspected, stopped or restarted during this review. Do not assume it is still running, and do not restart a scratch harness that deletes stores without preserving its state. No live registration, send or model call was performed during this continuation.

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

## Completed evidence — scope and hashes

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

## Additions after the usage-pause checkpoint (2026-11-03, all offline-tested; none installed in the legacy start)

Resumed by explicit user request after limits reset. Reports are under docs/veilkeeper2; read the one named for a slice before relying on it.

- GM commands (discord-gm-session.js + discord-gm-authority.js, R6_GM_SESSION_COMMAND_REPORT.md): session start/end, reopen (only sessions ended by native end), PC bootstrap preview/review, pc-register, pc-rebind, draft-list, draft-publish. All except start/end travel in the existing `vc-roll effect` JSON, so no schema additions were needed. Each uses private acknowledgement, a durable closed interaction claim, fresh human-GM authority and a fixed native effect; nothing retries after an uncertain effect or reply.
- Adapters (native-campaign-adapters.js): GM policy from the campaign gm_role_id only (no administrator fallback); owner-session reader resolves exactly one registered PC in the single active session.
- Composition (native-root.js, legacy-readonly-repository.js, native-start.js, R6_NATIVE_ROOT_REPORT.md, R6_NATIVE_START_REPORT.md): createNativeRoot opens six dedicated stores (+turns.sqlite with a provider), the exclusive router, the GM/attendance/death services and the message observer. `npm run start:v2:native` needs VK2_NATIVE=1, VK2_NATIVE_DIR (new/empty), VK2_LEGACY_DB (opened read-only), DISCORD_TOKEN. Inference is a second opt-in (VK2_INFERENCE=1, OPENAI_API_KEY, VK2_MODEL, VK2_MAX_TURNS 1-100) behind a hard call budget.
- Evidence and drafts: discord-message-observer.js records owner messages as native evidence; with a provider each becomes a withheld draft (empty GM context, nothing sent). turn-store adds recentDrafts and the publishing lifecycle (draft_saved -> publishing -> published or publication_uncertain). draft-publish sends one approved draft once, no mentions, no knowledge acknowledgement.
- Schema: by user decision `vc-session absent` and `leave` gained an optional `character` option. The pinned COMMAND_SCHEMA.json (frozen baseline) was not regenerated. register-commands has not been run.
- R0 (R0_DYNAMIC_TRIAGE_REPORT.md, DYNAMIC_RECORD_TRIAGE.json): 1,009 dynamic uses grouped. 118 forwarding wrappers verified pure. City-record writers (85 files, 210 uses): 51 files fully resolved, 34 partial (traced kinds recorded, untraced lines named), 0 unresolved. Per-file literal candidates are unreliable; only RESOLVED_WRITERS entries count. No hold is released; typed projections are unproved.
- User decisions recorded 2026-11-03: live qualification only in test guild 1467249344947159291, $5 inference cap, legacy DB copy only (never production). A bot token was pasted into chat and must be reset; it was never used or stored. See LIVE_QUALIFICATION_RUNBOOK.md (user runs it with their own secrets). No live run has happened.
## Migration/rollback and next exact work

Dedicated v2 stores reject unrelated schemas; never point them at production. Preserve all source, scene, character, action/Hope/life, roll/Fear, prompt/response, decision, interaction, knowledge and publication files. Do not delete choices, uncertain attempts, epochs or receipts to make old code run. Older constructors/digests/validators may reject new tables/metadata; disable opt-in services and use preserved copies/reviewed migration on rollback.

Next actions:

1. Check goal/usage and git status. Preserve README.md (unrelated dirty). Do not rerun passed unchanged suites. Read SESSION_REVIEW_2026-11-03.md first: it lists the open findings from the spec review.
2. Live qualification in test guild 1467249344947159291 (LIVE_QUALIFICATION_RUNBOOK.md, status log at the top). Done live: login, guild command registration, session start, character registration. Pending: `/vc-player private-channel` (now waits out Discord's member-listing rate limit), attendance, bootstrap preview/review, drafts and publish. The native bot is started from a scratchpad script with a scratch copy of the legacy DB; restarting it clears the native session.
3. Review findings to resolve (command-schema finding 4 was resolved on 2026-11-10; native registration now uses register:v2:native): (2) the per-draft human approval gate is a harness, R4 must publish validated ordinary prose autonomously; (3) move draft publication and private-channel registration out of the Discord adapters (registration already moved); (6) performance design for full member listing before R7/R8.
4. Compose GM context for drafts: knowledge store is wired as records; add selectContext/recall and GM-record authoring; then recap/opening occasions through the same exactly-once publication path. Party channel registration is still missing.
5. Close the 32 partial R0 writer entries, then prove typed projections per kind before releasing any hold; audit keyed reads and world-event writes the same way.
6. Migrate historical actors and pending death/Blaze/roll/Fear state with exact lineage; then remaining rules adapters (encounter, range, features, costs, PvP, movement, items, downtime) and R4/R5 living-world behavior.
7. Close every R1-R8 gate with independent live tests, concurrency/crash, migration/rollback and performance evidence. Production cutover needs separate authorization.