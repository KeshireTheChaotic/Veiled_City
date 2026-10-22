# P10 — Failure and recovery classification (proposed; verify in code)

Do not infer the incident's exact exception from `SESSION_OPENING`. At planning time only the Discord messages and source snapshot were inspected; live DB/log evidence and root-cause reproduction were not available. `No active session` before `/vc-session start` is an ordinary precondition error, not evidence of an opening crash.

| Observed / reproducible signal | Source seam | Cause classification needed | Permitted disposition |
|---|---|---|---|
| Fingerprint changes while `await gm.planAssembly()` is outstanding | `assemblyInputFingerprint()` and `assertSessionOpeningAttempt()` | `INPUT_CHANGED_PRECOMMIT` only after proving no native/turn/send commitment | Bounded, source-bound rebase with new fence; original history retained |
| Verification fails because original immutable auth/event is incorrect | `inspectSessionOpening()` | `OPENING_SOURCE_INVALID` | Hold original and surface scoped operator review; no auto-forged receipt |
| State changes after a turn/payload is committed but before send | `assembly-publications.js`, outbox | `COMMITTED_PAYLOAD_STALE` / `KNOWN_UNSENT` | Revalidate and deliver exact prepared payload or hold; no writer rerun |
| Discord send outcome unknown or process interrupted in-flight | publication outbox | `TRANSPORT_UNCERTAIN` | Hold exact part, authenticated reconciliation, no blind retry |
| Writer times out, throws, produces no units or units rejected | `opening-entry.js`, `narrative-authority.js`, `pvp-output.js` | `WRITER_ERROR`, `ZERO_UNITS`, `ALL_UNITS_HELD` (do not reveal provider text) | Truthful fallback if necessary; keep diagnosable review and enable safe new attempt only with separate proof |
| Entry lacks saved location and setup menu not available | `scene-setup.js`, `commands.js` | `SCENE_SETUP_*` reason by prerequisite | Owner-safe explanation and next action; independent camera fiction allowed |
| No prior verified initial camera, cohort owner check-ins occur | `initialCameraAcknowledged()`, `opening-cohort-runner.js` | `INITIAL_CAMERA_ABSENT` | Independently sourced shared-camera opportunity, no PC placement / duplicate opening |
| Director paused, principal changed, recipient not entitled | `session-opening.js`, audience/outbox readers | `PAUSED`, `PRINCIPAL_REVOKED`, `RECIPIENT_REVOKED` | Hold current actor/surface, retain native receipts |

These are **proposed diagnostic categories**, not assertions that the current database contains them. Preserve compatibility with older persisted `SESSION_OPENING` and `ASSEMBLY_SOURCE` records. Always log stable code, stage, attempt/turn/part ID, fingerprint redacted hash, source provenance and commitment flags; never raw prompt, full GM secrets or another owner's content.

**Classification precedence:** `source/actor/audience revoked` > `committed or possibly delivered` > `proven unsent precommit stale` > `authoring quality/fallback`. Never classify an unknown send as safe-to-regenerate merely because no acknowledgment is visible.

## Source and offline execution update — 2026-10-22

Implementation `079ab386c23aca1876a436bfe609e31907f2b633`; final evidence [P10_FINAL.json](../../evidence/P10_FINAL.json), 27/27, exit0. Ordinary attendance changes during planner/writer await are exercised on the corrected real runner at deterministic barriers; obsolete generation is superseded only with a durable no-commit proof and new epoch, never attempt2. This reproduces the controlled input-drift condition and verifies the correction; it does **not** establish the October22 production incident cause or provide a runtime baseline comparison.

| Verified category | Actual changed behavior / terminal evidence |
|---|---|
| OPENING_INPUT_CHANGED | No native/turn commitment: epoch1 replan; second churn OPENING_REBASE_PENDING; F02/F08 |
| OPENING_SOURCE_INVALID | Tampered immutable origin rejected; no reauthor/send; F02 |
| OPENING_COMMITTED_SOURCE_CHANGED | Accepted unit/turn/outbox prevents regeneration; pre-channel.send guard is NOT_SENT; F08 |
| TRANSPORT_UNCERTAIN | Actual uncertain or durable delivering rows remain held on reopen; F03/F08 |
| COMMITTED_KNOWN_UNSENT | Exact prepared payload/ID/hash delivered after SQLite reopen with no writer; F03 |
| WRITER_ERROR / PROVIDER_ERROR / WRITER_PARSE / PROVIDER_DEADLINE | Closed diagnostics retain no provider body/prompt; actual model adapter mocked in F08; private fallback tested F05 |
| ZERO_UNITS / ALL_UNITS_HELD | Distinct native draft evidence; truthful orientation version2, never verified authored scene; F05 |
| INITIAL_CAMERA_ABSENT | Authenticated failed original plus durable absence proof allows independent cohort source/turn; F04 |
| SCENE_SETUP reasons | Owner-safe disabled/history/already-set/no-entitled-options/owner-invalid/offer; no forced placement; F06 |
| OPENING_DIRECTOR_PAUSED / OPENING_FENCE_LOST | No stale draft/commit/send; authenticated revision-bound card after resume; old worker cannot downgrade replacement; F08 |

The no-commit proof is intentionally conservative across current-session native commitments. Unproven artifacts are isolated holds; they are never relabeled unsent or complete. Live diagnostics, external send certainty and semantic scene quality remain NOT QUALIFIED.
