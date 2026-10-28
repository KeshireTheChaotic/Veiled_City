# RF04 compatibility readers and exit evidence — 2026-10-28

This is a read-only assessment of the current transition manifest, source consumers and phase instructions. It changes no architecture rule, deadline, baseline, ownership record or source behavior. The working tree included independent migration work; counts below describe the manifest at audit time, not a newly executed architecture gate.

## Applicable requirements

- `TEST_PROTOCOL.md:3` preserves production legacy readers needed for persisted compatibility. The owner handoff's RF06-F07 requires reverse-callers to be gone before removing old facade/shims, while retaining externally significant interfaces and historical saved readers; its migration sequence likewise requires migrated callers and fresh final-path tests before shim removal. RF07-F03 requires no expired shims.
- `RF04-F07/SCOPE.md:5` requires evidence for all scoped RF04 criteria, no local hold conflicting with exit, and a current architecture gate with no unauthorized edge, unowned module or transition error. RF04 scope disallows baseline expansion and deadline extension.
- `boundary-checker.mjs:93` emits `LEGACY_MODULE_LOCATION` for each legacy source path except a configured stable entrypoint; `:157` expires an exception only when checking a phase later than its `expires_after`. A passing RF04 ratchet therefore accepts RF04-deadline debt and alone does not prove RF04 source adoption or RF05 readiness. The current stable entrypoint list has only `bot/src/index.js` and `bot/src/register-commands.js`.

The manifest contained 103 location records expiring after RF04 at audit time. They are migration records, not a finding that 103 paths are required for external or saved-reader compatibility. For example:

| Root path and transition ID | Current source consumer and responsibility |
|---|---|
| `presentation-evidence.js` `301a4696dc0b88ae402306e5506d18c1ee74d1cd77fce246e4cbf5a860e13154` | `db.js` imports `relationshipEvidence` for existing relationship reads; its separate dependency is assigned to RF06-F02. C122 retains the root as a same-function Knowledge compatibility reader. |
| `history-reconciliation.js` `889bb8f01d57b1075e0d87c68797536b482569ae24fb2f40c74bba5e9f7663aa` | `ai-intents.js` still imports the root reader; that Intent-to-Knowledge dependency is assigned RF05-F02. C124 proposes retaining the same-function root path. |
| `city-calendar.js` `066111eafc97b52af7d2d45cc1c7647fa94dc4858068063c066e6b7c9938c26a` | `db.js` imports the existing due-event processor; persistence/source adoption remains independently accountable. |
| `scene-continuity.js` `04d586f2583bddefa11fac7812f127e3e12aef58d983656a515b8e52f1d92955` | `db.js` imports presence archival and `ai-intents.js` imports scene/presence readers. |
| `epistemic.js` `4d49610c9b0ddab7ae73402cde5f707524a2072a0d954beba0aa96c391e75ad5` | `db.js` imports evidence-type and active-evidence readers for saved facts. |

Existing stored data and its read semantics must remain compatible; that does not by itself prove the exact old JavaScript import path is externally significant after all supported callers migrate. Conversely, a source search cannot prove an externally consumed path is safe to remove. A true conflict arises if an exact old path is shown necessary for a supported external interface or historical reader after internal callers are migrated, while its RF04 location deadline remains and RF07 requires all expired shims removed. No blanket claim of impossibility follows from the current count.

## Reviewable resolution options

1. Complete each actual downstream caller migration with new affected-code and saved-data evidence; review supported external consumers and reverse imports; remove an unnecessary shim only after its callers are gone and final paths are covered. This changes no deadline or rule but can leave RF04 open while independently authorized RF05/RF06 work proceeds.
2. For a specific obligation demonstrably owned by a later phase, prepare a record-by-record ownership/deadline reconciliation with the exact edge, evidence, feature, preserved identity and rollback, following the prior 12-record Publication reconciliation. RF04 currently forbids deadline extension; any new reassignment outside existing authority needs an explicit owner amendment, not an automatic bulk move.
3. If an exact import path must remain an externally significant compatibility interface beyond RF07, prepare a narrowly scoped owner decision defining the supported path, semantics and lifecycle, plus architecture-checker coverage. The existing policy lists two stable entrypoints and the owner handoff prohibits broad permanent allowlists; adding another stable interface is a policy change requiring explicit authorization, not an inferred exemption.

Until evidence supports one of these routes for each affected record, preserve its local hold and continue independent safe work. Do not equate the RF04 ratchet with phase completion. RELEASE NOT AUTHORIZED.
