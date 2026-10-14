# Unpublished world-annotation recovery

Status: QUALIFIED OFFLINE. Owner authorized commit/deployment with completed V96-05E, base `9421b6e3dceeb0c1f5f86aa7f3c347b644833b25`, application 10.0.0. Unfinished V96-06 and concurrent optimization work are excluded. Completion commit: `fix(narrative): quarantine invalid world-status draft claims`; resulting SHA is recorded in Git history and deployment handoff.

Accepted typed intents are canonical adjudication inputs; authenticated human declarations own intent; native receipts own outcomes.

## Production read-only findings

The default production SQLite file was opened using `DatabaseSync` with `readOnly:true` and `PRAGMA query_only=ON`; no `VeiledDB` constructor, migration, bot, credentials or provider was used. `quick_check(1)` returned `ok`, the reported character was active, and `total_changes()` was zero. No active session was present in the inspected guild at inspection time; the logged errors may predate that state or a configured alternate database. Configuration overrides were not read from credentials.

The supplied source reference resolves to an unarchived party-visible `session-2-recap` fact, not a world-event/native lifecycle receipt. Its historical equipment failure and knocks do not establish a new current knock or equipment consequence. No matching rear-door actor lifecycle exists. The stored locations are not dead/removed actors. These findings do not justify resetting a session, modifying imported characters or inventing native state.

| Failure | Enforcement boundary / cause | Correction |
|---|---|---|
| `actor_status` on a rear door | `status` validator only resolves character/NPC lifecycles; a generic world-description annotation was invalid | Preserve strict rejection, hold the already unpublished world annotation for GM review |
| `uncertainty_framing` on completed equipment failure | Uncertain metadata contradicts completed wording; a recap is not current authorization | Preserve the wording/framing guard; never publish that raw assertion |
| No GM response after safe projection | Post-projection candidate audit still threw those world-annotation errors and rolled back the turn | Recover only after exact original-candidate/current-output proof; publish independently certified parts and retain bounded private diagnostics |

## Authority and privacy

`validateCandidateClaims(...,{output})` requires native prepared publication authority and the exact original candidate binding. Only `world` / `status` annotations with no authored-source claim, rejected specifically for `actor_status` or `uncertainty_framing`, can be held. All remaining annotations are validated together, preserving whole-paragraph tripwires and error ordering. The loop is bounded by the original 32-claim budget. Raw calls without certified output remain strict; stale/tampered output cannot authorize recovery.

Actual PC lifecycle, damage, knowledge, consent, canon, movement and result checks are unchanged. The final publication payload still passes the existing native output/outbox validator; rejected prose and labels cannot certify themselves. `assertNarrativeApplied` is unchanged. A mixed invalid PC clause still aborts and rolls back. Existing saved costs/receipts are neither replayed nor reversed.

Transactional `candidate_claim_review` records are GM-private, deterministic, `needs_review`, and explicitly noncanonical. Original drafts remain in existing private output quarantine. No raw text is added to general metrics, player memory, journals, voice or publications. Preview diagnostics roll back; commit persists one review record. No SQL migration or production database write is required.

The prompt clarifies lifecycle versus ordinary description and recap versus current receipt. It is not the security boundary. No phrase exception, new effect adapter or additional provider request was introduced. Unsupported raw description remains withheld; this fix does not claim to authorize fresh knocks or failures from recap text.

## Regression evidence and rollback

The first fixture attempt used `addFact()`'s ID return as an object and failed `claim_shape`; corrected before treating results as production reproduction. Corrected red baseline: **1/6 pass**, **5 fail**, including both exact live-error categories in party/private adapters. Initial fix: **6/6**. Expanded shared-tree T1: **134/135**, one existing inference error-order regression from checking claims separately. Keeping remaining annotations together restored the original assertion: **10/10** recovery/inference tests. Isolated final T1/T2 results follow after execution.

Production-baseline isolated T1 passed **135/135**, zero skips, **57,129 ms**. Its T2 passed **142/142 suites**, **0 failed / 0 not-run**, **26/26** acceptance mappings, **335,940 ms**; check passed **328** modules/scripts and **24** command schemas, sync **613** files, diff-check exit **0**. Network denied, live requests **0**, billable tokens **0**. Report interval `2026-10-14T02:33:33.590Z`–`2026-10-14T02:39:09.530Z`; TEMP `veiled-claim-fix-isolated-t1.log`, `veiled-claim-fix-check-final.log`, `veiled-claim-fix-validate-final.log`, actual exit **0**. This qualifies the fix on deployed 05S, not the subsequently requested combined 05E release. Combined final qualification is pending and must execute against the exact new inputs.

New default suite covers actual combined GM, commit, outbox payloads, restart, duplicate delivery, party/private audience, strict direct rejection, forged/mismatched proof, mixed PC lifecycle rollback, historical recap retention, and independently owner-authorized cost projection without replay. Existing SEM06, PVP30/PVP30q/PVP30ag, FH40, native death, memory/privacy and both D08 suites remain mandatory.

### Final combined qualification

`node scripts/sync-release.mjs 10.0.0` exit **0**, **618** files. `npm run check` exit **0**, **332** modules/scripts and **24** command schemas. `npm run validate` exit **0**, **143/143 suites**, **0 failed / 0 not-run**, **26/26** acceptance mappings, **393,405 ms**. Both D08 checks, original PC/PvP guards, native mechanics/death, privacy, completed 05E and the nine new recovery tests passed in this registry. Network **denied**, live requests **0**, billable tokens **0**. Report interval `2026-10-14T02:42:52.075Z`–`2026-10-14T02:49:25.479Z`, SHA-256 `de2c3fa23d2d78938665bda55d3c3b92558950f8095c6b12bf05a6875d542807`. TEMP `veiled-claim-combined-check.log`, `veiled-claim-combined-validate.log`; actual exit **0**.

All **618** manifest entries matched before results-only documentation, including **362** non-document inputs with aggregate digest `e9cf2c031ba1d5052d6e6f795de86c1457fca3d3801645030fe21c8a7637a2f8`. Results-only refresh must retain that digest and exact original assertions. No executable/test edits or redundant full run after this PASS. Deployment changes source only; it does not start a bot, migrate a database, resume sessions, reroll mechanics or make live/billable calls.

Rollback is source-controlled: preserve additive private review records as inert audit history, never delete characters, reset sessions, reroll dice or undo committed receipts. Reverting this fix restores the prior response-aborting world-annotation behavior. Live Discord/model testing and bot restart have not been performed.
