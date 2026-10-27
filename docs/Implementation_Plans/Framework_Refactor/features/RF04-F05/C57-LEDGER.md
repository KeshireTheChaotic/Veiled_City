# C57 ledger

## 2026-10-27 C57 World Session scene and principal consumers

Five World legacy modules switched from the root `./scene-continuity.js` and `./conversation-principal.js` re-exports to World's existing `worldSessionScene` and `worldConversationPrincipal` ports; `worldSessionScene` now also forwards Session's original `scenePresence`, `sceneAccess` and `recordScenePresence`. All five load uncomposed.

Tests: one frozen batch of 8 files: 38 tests, 32 pass, 6 fail, all named in C57-RUN.json as pre-existing. Proof for the two not seen before: p06-f10 and p06-f12 fail identically (`ENVIRONMENT_SCENE_COMPOSITION`) with the C57 edits set aside (phases/RF04/rf04-f05-c57-baseline-test.log: 7 tests, 5 pass, 2 fail); the other four were already recorded in C52/C53. New rf04-f05-c57 3/3: widened port is fail-closed, exact and replacement-forbidden; composed World ports return the same real scene, presence and owner principal as Session directly; all migrated modules use the ports. rf04-f05-c20 bind fixture gained the three functions.

Architecture: RF04 exit 0, 0 active violations, 733 modules, 3107 imports; RF05 533 groups/errors (was 540). 7 exact records retired. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
