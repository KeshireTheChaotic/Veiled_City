# R6 — GM session-start and PC bootstrap command routing (complete slice)

Delivered: bot/src/v2/discord-gm-session.js routes observed human GM commands `session start`, `vc-roll effect {op:pc-bootstrap-preview,actor}` and exact `{op:pc-bootstrap-review,actor,snapshotHash}` through private ephemeral acknowledgement, a durable closed interaction claim, fresh GM authority and a fixed native effect. Preview replies privately to the GM with the persisted sheet summary and snapshotHash and has no effect; review calls initializePcFromReviewedSource atomically. Nothing is published to the table; no retry after uncertain reply; duplicates return already_claimed. Bootstrap ops are claimed only when `bootstrap` ({readSource, actionStore}) is supplied. discord-gm-authority.js gained the read-only pc_bootstrap_preview declaration. discord-interaction-router.js accepts optional `nativeGm`.

Tests (real SQLite stores; simulated Discord client/member/reply): r6-gm-session-command.test.mjs 6 passed / 384 ms; r6-discord-gm-authority.test.mjs 14 passed (re-run after the authority change); r3-discord-death-decisions.test.mjs router consumer 54 passed / 18280 ms (router unchanged since).

Known issues: receipt binding uses synthetic sceneId `gm-operation:<id>` / actorId `human-gm:<user>`. Router-level nativeGm wiring has no dedicated test. A bootstrap that commits but fails the transport receipt is held for native review. Not installed in production start.

Update (session end): `session end` (vc-session/vc session) ends the single active session and closes its active scenes atomically via native-session-setup.js end(); nothing is deleted, pending actions/rolls/prompts remain in their stores and bound proofs are withheld until native review. Added scene-store activeScenes reader and the session_end declaration. Tests: r6-gm-session-command 9 passed, r6-discord-gm-authority 14 passed, r1-scene-store 6 passed. No recap/opening prose and no reopening yet.

Deferred: real campaign-policy/selection/repository adapters, session end/recap/opening, registration/rebinding, historical migration.

