# RF05-F04 execution ledger

**Status:** PARTIAL — model-selection and one public-API import slice qualified; 61 assigned RF05-F04 transition entries remain.
**Base HEAD:** `b515fdb1f48da98b66564010ed87930e07cf7338`
**Scope:** [`SCOPE.md`](SCOPE.md)

## Source evidence

`narrative-delegation.js` currently mixes application-owned player/task routing with a pure lane-to-model selector. `gm.js` is the only observed consumer of both exports. The framework ownership manifest assigns the source module to Narrative but classifies the coordination functions as application workflows. This slice separates the model selector without moving player-intent coordination or changing any selection rule.

## Implementation and verification

Moved the unchanged `narrativeModel` function body to `frameworks/narrative/model-selection.js` and exposed it through the existing Narrative public API. `gm.js` now composes that API with the application-owned `coordinateNarrative`; the old module retains only task coordination. The Narrative ownership README documents the split. No prompt, model, audience, native outcome, or player-control behavior changed.

Fresh test `bot/tests/ai-gm-2026-10/rf05-f04-model-selection.test.mjs`: **3/3 passed**, exit **0**, duration **65.2965 ms**, one launch. It covers protected/unprotected observation and every configured/fallback lane branch. Changed JavaScript syntax: **5/5 passed**, exit **0**. RF05 architecture ratchet: **failed**, exit **1**, with 571 modules, zero unowned, 2731 imports, 968 active historical violation groups, and 967 transition errors. Changed-path findings for the four changed runtime modules: **zero violations and zero transition errors**. The 62 exact entries assigned to RF05-F04 remain (1 legacy location, 1 external capability owner, 60 private API imports); this slice does not remove them. No provider calls, tokens, or spend. Exact outputs and hashes are in `RF05-F04-RUN.json` and `phases/RF05/rf05-f04-model-selection-*.log`.

## Holds and rollback

The remaining RF05-F04 workflow/source obligations are not resolved by this slice. Roll back only this feature's commit; preserve F01–F03, existing user edits, and RF04 diagnostic logs. Provider calls and spend are prohibited and remain zero.

## Next step

Continue RF05-F04 with the remaining independently supportable workflow decomposition; do not mark the feature complete from model selection alone.

## C02 — Session public principal adoption

At base `e0bdf443a148b89f6642bbbd1c6d78e8b69576ec`, `gm.js` now obtains `conversationPrincipal` from the existing Session public API. Fresh test `rf05-f04-c02.test.mjs` passed 1/1 (one blocking run, exit 0, 964.9156 ms); changed JS syntax passed 2/2. The test loads the actual GM service, checks compatibility export identity, and exercises the authenticated principal against disposable SQLite. No provider, network, Discord or production data was used.

The RF05 ratchet first reported the absent exact import as `UNUSED_TRANSITION` (968 transition errors). After deleting only that obsolete transition and preserving its full record in `C02-RETIRED.json`, the ratchet remains failed on 967 unrelated existing errors/groups; 572 modules remain owned, with zero unowned. There are now 61 RF05-F04 transition entries left from the previous 62. This is one qualified import slice; all remaining F04 work and the phase gate remain incomplete. See [`C02-RUN.json`](C02-RUN.json) for hashes, exact results and rollback. Next work must separately scope another source adoption/decomposition. Release remains NOT AUTHORIZED.
