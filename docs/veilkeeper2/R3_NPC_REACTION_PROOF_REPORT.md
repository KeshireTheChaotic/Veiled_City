# R3 — native NPC reaction proof dependency

Implementation slice complete. All R0–R8 acceptance gates remain incomplete.

Ported the pure cohort split, NPC reaction roll and immutable arithmetic inspector from audited upstream 15a8f44671f227c6bec69bf30744e03c5692809b mixed-reaction-rules.js into rules/npc-reaction-proof.js. Function bodies match the source; only JSON hash/error imports were localized. Existing native gmD20Roll supplies the actual d20 arithmetic. No persistence/effect writer or old runtime import was added.

PCs retain individual owner invitations rather than acquiring GM dice. An already source-qualified, AI-controlled NPC can use its pinned adversary statblock and exact native Experience, or an ordinary pinned profile at +0 without adversary stats. Reaction natural20 succeeds without PC Duality resource rewards. The inspector recomputes result arithmetic and digest; it does not itself establish source authenticity, control, paid Experience, GM opportunity or consent. Those native validators remain necessary. A matching digest is never independent authority.

Eight fresh native checks passed, Node v26.13.0, 54.8725 ms. Tests cover mixed owner routing, all threshold boundaries, exact Experience, natural20, ordinary profiles, explicit human-controlled targets, invalid/dead/changed source snapshots, unknown/duplicate Experience, out-of-range native RNG, altered and resealed roll arithmetic, and receipt-family substitution. Deterministic native RNG input is used for reproducibility; no model chose faces. Source/test hashes and static affected list accompany this report. Only the new test imports the new module; no unchanged passing suite rerun. No Discord, real inference or human-quality qualification.

Modified files: npc-reaction-proof.js; r3-npc-reaction-proof.test.mjs; this report and hashes/affected list.

Migration/rollback: additive pure dependency, not root-composed. No stored state/schema changes, actor effects, old-runtime/test retirement, migration qualification, production operation or major-phase merge/push. Removing the unused module leaves persistence unchanged.

Known holds: actual source/control/opportunity/paid modifier validators and mixed execution/effect persistence. Root NPC autonomy and owner-reaction composition remain unqualified. This does not permit AI dice for human proxies or grant canonical effects from a receipt object.

Next R3 work: implement the historical committed GM decision reader over real SQLite source records, then group-feature/effect ancestry and complete original condition validation before composing condition modifiers. Continue R0–R8; computer use remains forbidden.
