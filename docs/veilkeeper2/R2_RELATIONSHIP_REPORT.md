# R2 — imported private relationships

Completed native resolution/storage slice; full R2 and import migration remain open.

`relationship-import.js` resolves imported targets through a native reader, checks current campaign/type/identity/revision, preserves the legacy relationship type set and score clamp (-5 to 5), and produces directional GM-private connections. Unknown targets remain explicit indexed holds with their original payload retained; no NPC or other entity is invented by import. Canon-suggestion targets remain held for review. The relationship carries no PC-choice, consent or publication authority; scores cannot establish reciprocal feelings or obligations.

`character-package-service.js` composes target resolution with authenticated human-GM import. Native target snapshots are rechecked inside the transaction before and after writes. `private-hook-store.js` stores relationship history/current pointers atomically with hooks, canon suggestions and import receipts. Duplicate edges in one import retain the final supplied edge, matching the previous upsert behavior without redundant rows. Native list reads omit private relationships unless explicitly requested. Replay fingerprints continue to depend on the original import, so adding a resolver later cannot retroactively apply a previously held relationship under the same command.

## Evidence

Six fresh relationship cases plus the changed store/service's nineteen import/canon/package checks: **25/25 passed**, zero failures/skips, 230.5633 ms. Tests cover bounded directional connections, private/campaign/character isolation, replay, history, unresolved and canon holds, malformed targets, duplicates, cross-campaign rejection, final target-revision rollback and owner denial. Execution/output: R2_RELATIONSHIP_TEST_EVIDENCE.json and R2_RELATIONSHIP_TEST_OUTPUT.txt. Exact source/test/document hashes: R2_RELATIONSHIP_HASHES.json.

The pinned legacy database relationship and GM-hook importer were inspected for type/score/upsert semantics. Native readers here remain injected test doubles. Tests do not establish full production relationship dimensions, player consent, live Discord quality or campaign migration parity.

## Holds, rollback and next work

Production target resolution, derived relationship dimensions, immutable historical evidence migration, end-to-end private export composition and authorized disclosure still need qualification. The receipt reports held target indices; later reconciliation must use a fresh authorized command. Canon review, private-planning adapters and recall adapters still require complete integration. No relationship score grants PC agency or an automatic world effect.

No production state, legacy source/schema/content, deployment or push changed. Existing importer remains intact. Rollback is to leave the opt-in modules unused; dedicated v2 data must not replace production data until semantic migration/restore gates pass.

**Next exact work:** native private-planning/recall repository adapters and provider integration, then R3 deterministic rules. R0–R2 retain open gates; R3–R8 remain outstanding. The user authorizes merge/push after each complete major phase into the rebuild branch only, never `codex/clean-ai-gm-2026-10`; this slice is not a major-phase completion.
