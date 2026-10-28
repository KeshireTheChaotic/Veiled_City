# C118 ledger

## 2026-10-28 C118 Narrative-World and Session-World bridges read scene, principal and records through their own frameworks' public APIs

The narrative--world pair module world-narrative-bridge.js stops importing the Knowledge shim narrative-records.js and the Session shims scene-continuity.js and conversation-principal.js; it now reads listNarrativeRecords, currentScene, scenePresence and conversationPrincipal through World's existing public ports worldKnowledgeSources, worldSessionScene and worldConversationPrincipal (same originals, bound at bootstrap). The session--world pair module opening-world-bridge.js imports currentScene from Session's public API instead of the scene-continuity.js shim. No new ports or slots. Four tests that reach the bridge uncomposed now import compose-startup.mjs (two tracked: p08-f07-correction, rf04-f04-c05; two local-only).

Tests: one frozen batch of 17 files: 36 tests, 36 pass, 0 fail. Supplemental: 68/68 (tests reaching the bridges through narrative-director-source, narrative-salience, opening-world-bridge or assembly-context; four uncomposed tests now import compose-startup.mjs because the bridge reads World's composed scene/principal/record ports) Architecture: 4 exact records retired. RF04 exit 0, 0 active violations, 824 modules; RF05 140 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
