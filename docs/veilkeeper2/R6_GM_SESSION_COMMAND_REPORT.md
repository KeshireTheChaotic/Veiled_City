# R6 — GM session-start command routing (complete slice)

Delivered: bot/src/v2/discord-gm-session.js routes an observed human `session start` command through private ephemeral acknowledgement, a durable closed interaction claim, fresh GM authority (discord-gm-authority.js) and fixed native creation (native-session-setup.js). Replies are private; nothing is published to the table; no retry after uncertain reply; duplicates return already_claimed. discord-interaction-router.js accepts optional `nativeGm` {gmAuthority}; it reuses the death services' sceneStore and interactionReceipts.

Tests (real SQLite stores; simulated Discord client/member/reply): r6-gm-session-command.test.mjs 4 passed / 370 ms; r3-discord-death-decisions.test.mjs (router consumer) 54 passed / 18280 ms.

Known issues: receipt binding uses synthetic sceneId `gm-operation:<id>` and actorId `human-gm:<user>` because the closed binding requires both. Router-level wiring of nativeGm has no dedicated test yet. Not installed in production start.

Deferred: GM pc_bootstrap_review routing and private snapshot preview, real campaign-policy/selection/repository adapters, session end/recap/opening, registration/rebinding.
