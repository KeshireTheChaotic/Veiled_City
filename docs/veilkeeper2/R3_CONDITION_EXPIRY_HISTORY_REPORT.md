# R3 — historical condition duration proof

Implementation slice complete. All R0–R8 acceptance gates remain incomplete.

Added rules/condition-expiry-history.js: read-only inspection of a condition already marked expired after a later native paid spotlight. It requires the exact stored condition snapshot, expiry receipt/private publication, original condition data hash, native spotlight publication and matching committed cost row/hash, same actor/scene, a later spotlight index and an exact transition deactivating only the referenced condition. It neither advances a clock nor writes a condition, grants a GM action or establishes the original effect. Original condition/effect ancestry and full cost authority must be validated by the future composed inspector.

Source: audited upstream 15a8f44671f227c6bec69bf30744e03c5692809b, group-feature-execution-rules.js lines642–652. Proof block matches that source apart from indentation and local Error construction. Added wrapper checks the exact expired condition identity. No legacy runtime imports or AI tools added. The baseline is unchanged from the remote verification recorded in the preceding clear-history report.

14 fresh native SQLite checks passed, Node v26.13.0, 1044.1281 ms. The static import graph identifies only the new test as affected by this new, uncomposed module. Previously passed checks were not rerun. Tests cover exact private receipt and source hashes, no source writes/current-owner dependency, guild isolation, unresolved/missing/revoked history, wrong recipients, missing/uncommitted costs, resealed actor/scene/earlier/equal spotlight substitution, independent-condition changes, stale input rows and changed original duration policy/data. Hashes and affected test list accompany this report. No model, Discord or production operation was executed; this is not live/human-quality evidence.

Modified files: new native expiry-history reader and r3-condition-expiry-history.test.mjs, this report, source/test hashes and affected list. The legacy source adapter did not change in this slice.

Migration/rollback: additive unused reader, no persisted state or schema changes. Removing the new module has no runtime persistence effect. No old code/test retirement, populated migration qualification, major-phase merge/push or production change.

Known holds: original effect/parent feature/reaction/cost ancestry assembly and version2 mixed-condition validation remain incomplete. This component alone must not be used as a condition or cost authority. Root ordinary-roll composition, full rules parity, autonomous world behavior and release acceptance remain unqualified.

Next R3 work: implement the historical group-feature/effect and mixed-reaction dependency closure with real native source validators, then compose these duration readers and complete source-qualified condition modifiers. Continue all R0–R8 phases; computer use remains forbidden.
