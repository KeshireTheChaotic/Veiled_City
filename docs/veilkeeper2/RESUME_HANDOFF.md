# Veilkeeper 2.0 — current rebuild handoff

Resumed 2026-11-03 by explicit goal activation. The full R0–R8 goal remains active and incomplete. Initial resumed usage: five-hour 1% used / weekly 79% used; recheck live limits at checkpoints and pause again at 98% used on either limit. This is a resumption guide, not phase acceptance. Latest lifecycle changes and evidence are in R3_DEATH_OUTCOME_STATE_REPORT.md. Do not infer approval from time passing or redeem a reset without permission.

## Workspace, Git and authorization

- Work only in `D:\Library\Development\Veiled_City_2\rebuild`, branch `rebuild/veilkeeper2-audience-first`. Parent workspace is `D:\Library\Development\Veiled_City_2`. Deprecated `D:\Library\Development\Veiled_City` remains untouched.
- Latest implementation commit before this documentation checkpoint: `0690c7093d3c25095c40e8da3f7afe95eb9e7c03`. Run `git log -1` for the documentation commit containing this handoff. The only pre-existing dirty path is unrelated `README.md`; preserve it and never stage it opportunistically.
- Frozen baseline checkout: parent `baseline`; pinned audit SHA `1ba6c7e15db1a66ba34b36336f31437beffe44d6`. Fresh successful `git ls-remote` confirms origin's baseline branch still matches this SHA. No upstream audit refresh is triggered by a changed baseline head at this checkpoint.
- Fresh origin rebuild head: `7d8a09cb15a89d9c87d0dcf1de6acc31da990592`. Local implementation is five commits ahead before this documentation checkpoint. Origin already contains that commit; no publish command was run during these implementation turns. Do not infer who published it or overwrite remote advances. Remote-tracking refs may be stale.
- User authorizes phase commits and origin publication after major-phase gates pass. Target the rebuild branch, NEVER `codex/clean-ai-gm-2026-10`. Current worktree already uses the target branch; no self-merge is needed. No complete major phase has been certified. Production deployment/cutover still requires separate authorization.
- User-authorized documentation cleanup is separately committed as `3ca9db9d`. It does not prove runtime retirement. Removed documents remain recoverable through pinned Git history.

## Binding instructions and task scope

Read `AGENTS.md`, the four governing specs under `docs/` and `docs/VEILKEEPER_2_ASTRA6_REBUILD_HANDOFF.md`. Owner behavior and removed source-linked specs remain available from pinned Git/history or frozen baseline. Core values override conflicting older docs: exact audience entitlement, broad creative fiction, exclusive player PC agency and weighted source/authority-bound lore.

The deliverable is an inventive conversational persistent-world GM, not a typed-intent classifier or rules terminal. Exactly four generic AI capabilities: `context_read`, `action_propose`, `state_inspect`, `knowledge_propose`. Specific mechanics stay internal native validators; no unrestricted state patches. NPCs have independent goals, voices and limited knowledge; belief, rumor, lies and descriptions do not become objective truth or PC choices. Harmless direct address/second-person description is allowed. No GM-private context in player inference.

No subagents are authorized. Use fresh tests under `bot/tests/veilkeeper2`; they are ignored, so force-add exact owned files. Run explicit changed-dependency test lists from `bot`, not legacy npm suites. Do not rerun a passing suite unless tested code changes. Separate local/synthetic, provider, live Discord, migration and gameplay evidence. Stage exact files and preserve unrelated work. Current Node is 24.19.0; installed SDKs are openai 6.6.0 / discord.js 14.27.0.

## What actually exists

All new runtime source is under `bot/src/v2`. Default `index.js` starts an offline kernel with an empty rule registry and no live transport. Package changes only add opt-in offline/test scripts; legacy `start` still runs `src/index.js`. Fresh comparison found no changes to legacy `bot/src` outside v2, `bot/sql` or content. No production database was opened, migrated or deployed and no live inference or Discord send was performed. A transport implementation existing in source does not mean it is installed.

R1/R2 substrate: four-capability kernel, native source authority/registry and scene snapshots, metadata-first source closure, actor-known context, separate GM-private planning, durable knowledge proposals/history, weighted recall policy, character/private-hook packages, imports/relationships, human canon review, bounded generic tool loop, opt-in Responses adapter, read-only Discord audience/message ingestion and per-call freshness checks. Durable turn claims save unreviewed drafts. Most native adapters, replay reconciliation, full formats and live qualification remain open. Canon approval does not disclose knowledge.

R3 ordinary/Hope: deterministic native dice/resource/combat primitives; ordinary preparation, immutable request/notice/saved owner dice, owner/control checks and action windows. Unified action-store Hope costs atomically update resource/action/receipt. Native source/component choices, durable prompts/decisions and reconstructed source proofs support explicit private owner cost consent. Earlier isolated Hope storage still exists; it has not been migrated or retired.

R3 Fear chain:

1. `pre-roll-fear.js` checks fixed pre-roll eligibility. `fear-opportunity-reader.js` derives unrolled status from durable owner dice and revalidates original source; native GM decision provenance is injected.
2. `roll-store.js` serializes one fixed Fear hold with owner dice in the same SQLite file. Separate-process tests establish hold-first, roll-first and one simultaneous schedule. Holds bind one decision/request and survive reopening.
3. `fear-reservations.js` reserves capped campaign Fear, immutable terms and owner-only notices. Publication attempts persist before send, refuse retry, retain uncertainty and bind acknowledgement to attempt/message. Attempted/uncertain publication cannot be cancelled using stale external proof. Reviewed orphan recovery writes a cancellation tombstone before roll release.
4. `discord-fear-announcements.js` is opt-in. It refreshes owner-only native audience before/after, sends fixed mechanics text with nonce/mentions disabled, saves native response and force-fetches the message. Reconciliation uses that saved response and audience fingerprint without sending. The send-to-local-save gap stays held; no blind resend.
5. `pre-roll-fear-coordinator.js` requires the active matching hold. Native attack candidates bind source/actor/control, encounter/statblock/target revisions, rule fingerprint, effective odds and fixed mechanical terms. Native legality is not implemented by the fingerprint alone.
6. Private affected-owner defense review and ordered confirmation/withholding persist. Base-defense confirmation cannot accept feature defenses. Silence never opens an attack.
7. One transaction debits exactly one reserved Fear before native d20/damage RNG and saves the result. Fixed streams cover crit/max-dice bonus, advantage, miss and no reroll/re-spend after reopen. Hits await Armor; misses do not draw damage. Rollback removes cost/result together.
8. `incoming-damage.js` calculates resistance, marked Armor/HP and death eligibility. `incoming-damage-authority.js` reconstructs saved native dice, verifies current private owner Armor choice and normalizes fixed mechanical records into the action store. No new RNG is used during damage.
9. `action-store.js` atomically updates native marked HP/Armor, one damage receipt and owner death eligibility. A duplicate attack/choice cannot apply twice. Death requests do not choose a fate.
10. Misses and committed nonlethal damage can close the interruption. Pending death eligibility blocks closure. The original roll stays held until current native continuation proves owner/control, ability to act and unchanged published stakes/Difficulty/modifiers. Dice recording rechecks that immutable continuation proof. Changed adjudication requires reviewed recovery; no refresh route yet.
11. Private death review and immutable owner choice persist. The resumed lifecycle slice adds canonical Stress/level/status/death state alongside existing HP/Armor/Hope, once-only native death dice/outcomes, critical recovery and Avoid Death permanent Hope cap/scars. Hope allocation and Blaze final action remain pending. See R3_DEATH_OUTCOME_STATE_REPORT.md; actual actor/event provenance and canonical live migration remain native adapter obligations.

## Phase gates — truthful status

- R0 partial: static inventory is 1,077 modules / 4,224 exports / 219 routes / 55 effective tables / 456 literal kinds. 1,009 dynamic contracts, semantic destinations and every-removal zero-consumer proofs remain open. Do not delete by directory name.
- R1 partial: offline kernel/provider/transport foundations exist; no complete installed new application or full dependency qualification.
- R2 partial: substantial privacy/lore/import substrate; actual recall/clock/pin/alias/identity/actor adapters, all formats and canon-to-known migration remain open.
- R3 partial: above mechanics are opt-in slices. Full SRD/house-rule parity, modifiers/team/PvP, features/conditions, reactions, injury/death, movement/items/economy/downtime and installed generic handlers remain required.
- R4–R8 incomplete: conversational consequence review/local repair, independent living NPC/faction behavior, complete commands/sessions/private/multiplayer, canonical migration/durable publication/performance, retirement and independent live quality/cutover remain required. Synthetic mechanical tests do not prove inventive human-GM behavior.

## Current evidence and hashes

Reports and manifests are checkpoint-specific. Never sum overlapping runs or treat all historical hashes as current. No unchanged suite was rerun just for this handoff.

- `R3_FEAR_CONTINUATION_REPORT.md`: 65/65, 3555.824 ms; hashes cover current roll store and coordinator plus coordinator test. Actual log in parent workspace: `fear-continuation-test.log`.
- `R3_DURABLE_DEATH_CHOICE_REPORT.md`: 61/61, 5939.7861 ms; latest action-store and damage-store-test hashes. Includes current coordinator suite as a changed action-store consumer. Parent log: `incoming-death-choice-test.log`.
- `R3_INCOMING_DAMAGE_AUTHORITY_REPORT.md`: adapter/source hash and 26/26 at its earlier checkpoint; its test has since grown. Parent log: `incoming-damage-authority-test.log`.
- `R3_FEAR_RECONCILIATION_REPORT.md`: transport source hash / 32/32 at that checkpoint. Later coordinator/store hashes supersede them. Parent log: `fear-reconciliation-test.log`.
- `R3_FEAR_CONCURRENCY_REPORT.md`: three independent-process schedules. This is not exhaustive races or abrupt-kill qualification.
- `R3_INCOMING_DAMAGE_REPORT.md`: pure incoming calculator 3/3; pinned extraction is arithmetic evidence, not whole-engine parity.
- Earlier R1/R2 and Hope/component-chain reports remain relevant to unchanged modules. Consult the matching report before reusing evidence.

Handoff hash manifest records key current sources, tests and documentation without asserting a newly rerun aggregate gate. Some raw outputs live only in prior tool transcripts/report summaries; do not invent missing raw artifacts.

## Migration, rollback and concrete holds

Dedicated SQLite stores reject unrelated schemas; never point them at production databases. Action storage now has `vk3_pc_defenses`; roll storage has `vk3_roll_fear_holds`. Old constructors reject newer tables. Preserve database copies and migrate explicitly on downgrade; do not drop live tables, receipts, owner choices, uncertain attempts or holds. Fear, PC/Hope/action/source knowledge stores are not a qualified canonical production migration. No migration/restore/cutover acceptance is claimed.

Real GM decision, encounter/statblock/presence/range/access, passive/condition/feature/erratum, actor revision and owner native event readers remain incomplete. Test callbacks returning accepted records are not production authority. Snapshot fingerprints require actual native source derivation. Armor/death Discord UI and source-ingress are not wired. Threads/DMs remain unqualified. Model provider and Discord tests are offline/simulated. There is no general automatic resend or uncertainty recovery, no performance claim and no production fallback rehearsal.

## Ordered next actions

1. Check goal status and live limits. If paused, stop until explicit resume. Inspect Git status/latest report and preserve README. Recheck remote heads before future integration; do not reset or overwrite externally published work.
2. Continue owner death lifecycle from pinned `pc-death-rules.js` and current `pc-life-state.js`. Canonical transactional Stress/level/status/death state now shares the action database with existing HP/Armor/Hope. Qualify native live actor/source projection and migration; do not create competing PC authorities or generic patches.
3. Implement explicit native Hope recovery allocation and Blaze of Glory approved owner final action/death. Once-only initial death outcomes now preserve all branches and Awaiting states. Do not automatically allocate recovery, author a scar, add a Fear move or invent the final action.
4. Link actual death outcome/eligibility into lethal interruption completion. A dead/unconscious PC must not regain its original action. Add lawful continuation/refresh/recovery only from current native rules; retain stale-action holds.
5. Connect actual native Armor/death component decisions, private risk display and source evidence, then current actor/adjudication/GM legality readers. Qualify source revocation, edited messages, ownership changes and private scope through real native stores. Do not promote synthetic marker fields to authority.
6. Qualify concurrent damage/death/announcement/cancellation, process crash, delivery ambiguity and restart without duplicate effects/RNG/output. Rehearse semantic migration/restore before retirement. Preserve native transaction boundaries and canonical receipts.
7. Complete R0 public contract/dependency/removal map and every remaining R1–R8 acceptance gate. Restore conversational/autonomous scope alongside mechanics: the end goal is a living GM world, not a rules terminal. Only certify full phase completion against governing specs; then publish that phase to origin rebuild. Production cutover remains separately authorized.
