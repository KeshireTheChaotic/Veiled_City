# R3 — composed historical group-feature execution

Implementation slice complete. All R0–R8 acceptance gates remain incomplete.

Added group-feature-history.js and npc-condition-clear-history.js. The historical group reader composes actual committed GM-decision, saved-roll and NPC-reaction readers with native group-feature policies. It checks the parent decision/board/source closure, feature definition/hash, committed cost snapshot, PC invitations, mixed cohort and NPC receipts, terminal effect/withdrawal evidence and NPC condition dispositions. Withdrawn and pending PC owners never acquire a failed reaction. A cleared NPC condition additionally composes original historical NPC decision, matching paid spotlight/cost, private clear publication and exact condition-only ledger transition. There are no injected proof stubs, old runtime imports or new AI capabilities.

Source: audited upstream 15a8f44671f227c6bec69bf30744e03c5692809b, group-feature-execution-rules.js inspectGroupFeature (line290), inspectNpcClearCause (line93); mixed-condition-rules.js clearProof/inspectMixedConditionClear (lines70–99). Group proof body matches the source after localized imports/direct native clear reader call. NPC clear uses the historical=true source branch, eliminating current-state action authorization and capability indirection. Guards and hashes remain; no mutation API was ported. Upstream source and final implementation/test hashes accompany this report.

These readers inspect already committed history. A saved cost row/hash does not itself authorize a new expenditure; complete original effect/condition and current action validators remain necessary. Historical scene boards are legacy evidence only, not a restored conversation classifier. Raw source data can be private and never enters audience inference.

16 fresh native SQLite checks reached passing outcomes, Node v26.13.0. Initial run12/16 passed in2672.7659ms; four terminal-path fixtures overwrote the execution publication because the fixture progress record reused its source key. Corrected the fixture to use a distinct progress source, then reran only those four failed checks:4/4 in633.5346ms. Product validator was not weakened. Static import closure selects only this new test; no unchanged passing suite was rerun.

Coverage: pending execution; terminal saved roll/effect snapshots; authenticated original-owner withdrawal; ordinary-profile and adversary NPC receipts alongside pending PCs; failed NPC condition history; full paid cleared-NPC ancestry; source-byte preservation; altered parent/feature/actor publications, cost status/hash/guild, child state/audience, feature definition/target, NPC receipts, clear ledger and spotlight, and stale original condition. The fixture establishes actual native rows and deterministic native d20 results, not live Discord, real model or human-quality evidence. It is not full mechanical parity.

Modified files: two native historical reader modules; r3-group-feature-history.test.mjs; this report and hashes/affected list.

Migration/rollback: additive native read composition, not yet root ordinary-roll composition. No data/schema/gameplay writes, old runtime/tests retired, populated migration qualification, production mutation or major-phase merge/push. Removing these unused readers leaves stored state unchanged.

Known holds: original owner reaction-effect validators (including area outcomes and resource/choice/command ancestry), full original condition/cause validation, current feature/source/control/cost authorization, current modifiers and root owner dice/Fear/outcome flow. Matching history does not grant new consequences or disclose private facts. Full R0–R8 gates remain open.

Next exact R3 work: compose historical reaction-effect and original condition validators over this group reader, retaining exact owner choices, saved results and mutation history. Then qualify complete source-bound modifiers before enabling owner rolls. Continue R0–R8; computer use remains forbidden.
