# R6 — GM session-start and PC bootstrap command routing (complete slice)

Delivered: bot/src/v2/discord-gm-session.js routes observed human GM commands `session start`, `vc-roll effect {op:pc-bootstrap-preview,actor}` and exact `{op:pc-bootstrap-review,actor,snapshotHash}` through private ephemeral acknowledgement, a durable closed interaction claim, fresh GM authority and a fixed native effect. Preview replies privately to the GM with the persisted sheet summary and snapshotHash and has no effect; review calls initializePcFromReviewedSource atomically. Nothing is published to the table; no retry after uncertain reply; duplicates return already_claimed. Bootstrap ops are claimed only when `bootstrap` ({readSource, actionStore}) is supplied. discord-gm-authority.js gained the read-only pc_bootstrap_preview declaration. discord-interaction-router.js accepts optional `nativeGm`.

Tests (real SQLite stores; simulated Discord client/member/reply): r6-gm-session-command.test.mjs 6 passed / 384 ms; r6-discord-gm-authority.test.mjs 14 passed (re-run after the authority change); r3-discord-death-decisions.test.mjs router consumer 54 passed / 18280 ms (router unchanged since).

Known issues: receipt binding uses synthetic sceneId `gm-operation:<id>` / actorId `human-gm:<user>`. Router-level nativeGm wiring has no dedicated test. A bootstrap that commits but fails the transport receipt is held for native review. Not installed in production start.

Update (session end): `session end` (vc-session/vc session) ends the single active session and closes its active scenes atomically via native-session-setup.js end(); nothing is deleted, pending actions/rolls/prompts remain in their stores and bound proofs are withheld until native review. Added scene-store activeScenes reader and the session_end declaration. Tests: r6-gm-session-command 9 passed, r6-discord-gm-authority 14 passed, r1-scene-store 6 passed. No recap/opening prose and no reopening yet.

Update (owner registration): `vc-roll effect {op:pc-register,actor}` (needs the optional `characters` repository) registers an existing native character to its repository owner as controlRole owner in the sole active scene. It sets no resources, movement, proxy or attendance, and refuses existing registrations elsewhere (rebinding needs native review) and absent/ambiguous scenes. Added the pc_register declaration. Tests: r6-gm-session-command 11 passed, r6-discord-gm-authority 14 passed.

Update (reopen): `session reopen` (option session=<id>) reopens a session only when the native end command ended it, no other session is active, restoring exactly the scenes that command closed with participants preserved; it grants no arrival, resources or revived proofs. Added scene-store sessionScenes reader and session_reopen declaration. Tests: r6-gm-session-command 13 passed, r6-discord-gm-authority 14, r1-scene-store 6.

Update (rebind): `vc-roll effect {op:pc-rebind,actor}` updates a registered PC's owner/controller to the current repository owner in place (same scene, name kept, no proxy fields, controlRevision advances so earlier controller proofs are invalid). Refused for unchanged owner, unregistered, inactive or not-in-active-scene actors. No resources/position/attendance change. Tests: r6-gm-session-command 14 passed, r6-discord-gm-authority 14.

Deferred: real campaign-policy/selection/repository adapters, session end/recap/opening, registration/rebinding, historical migration.




