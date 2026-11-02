# R2 — durable private records into planning

Completed repository adapter slice; full R2 remains open.

`private-hook-store.js` now reads current committed hooks, reviewed canon and directional connections for private planning. It excludes pending suggestions, resolved/discarded hooks, canon-suggestion hooks and superseded versions. Hook projection contains the private seed and permission, not arbitrary imported payload or target assertions. Canon retains human-review provenance; relationships retain their separate non-consent/non-PC-choice authority.

`private-planning-repository.js` adapts those native records to versioned metadata and hashed bodies. All records are GM-private with no actor knowledge or recipient disclosure, including canon whose ledger label is public/party. Review is not evidence of delivery. The private planner's existing explicit reference authorization, source validation and post-inference revalidation still apply. Native storage computes projections/hashes; this adapter is intended for private planning, not audience recall selection.

## Evidence

Four fresh storage-to-planner cases plus eighteen changed-store import/relationship/canon cases: **22/22 passed**, zero failures/skips, 178.132 ms. No unrelated passing suites were rerun. Tests use actual disposable SQLite storage and the real import/review/planning modules, with injected native authentication/provider readers. They cover stored seed/relationship/canon types, pending proposal exclusion, missing/cross-campaign records, exclusion from audience packets, stale body revisions, resolved hooks, superseded canon and invalidation of existing private plans. They do not prove live model behavior or production native authorization.

Artifacts: R2_PLANNING_STORAGE_TEST_OUTPUT.txt, R2_PLANNING_STORAGE_TEST_EVIDENCE.json and R2_PLANNING_STORAGE_HASHES.json.

## Remaining gates and recovery

Scene/purpose selection and authorization still require the full native runtime adapter. Clocks, NPC agendas/cognition, reviewed knowledge integration, native recall causes/pins, private-to-observable transitions and actual provider tool loops remain open. Planning grants cannot establish facts merely by generating text, and no plan is executed or published. Full migration, restore, Discord and gameplay acceptance remain unproven; R0–R2 retain holds and R3–R8 remain outstanding.

No production database, legacy runtime source/schema/content, deployment or push changed. Existing implementations remain available. Rollback is to leave the opt-in modules unused; no production migration occurred. This checkpoint is not a completed major phase and does not trigger the authorized phase merge/push.

**Next exact work:** native scene/context and recall adapters plus provider tool-loop integration, then R3 deterministic rules behind the four generic capabilities.
