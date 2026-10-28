# C107 ledger

## 2026-10-28 C107 Knowledge owned communities read World long projects and civic updates through a Knowledge port

Knowledge's owned-community.js stops importing the World root modules long-projects.js and city-civic.js, and memory-lifecycle.js stops importing world-authorship.js. Knowledge gains a fixed knowledgeWorldCommunity port; World gains long project and city civic provider slots that long-projects.js and city-civic.js fill at load. worldIdentityOrigin reuses the existing knowledgeWorldIdentities port. The existing knowledge--world adapter binds the new port via connectKnowledgeWorldCommunity from initializeKnowledgeWorld (no index.js change). BACKGROUND_WORLD_KINDS (2 records) stays: a constant value, not a function. The local source-baseline test rf04-f05-c39 now also strips the appended slot binding before hashing; the stripped bodies still match C39-SOURCE-BASELINE.json exactly.

Tests: one frozen batch of 122 files: 776 tests, 775 pass, 1 fail (named in C107-RUN.json: rf04-f05-c01.test.mjs | current startup source binds pair before runtime services and retains static NPC provider registration reachability). Architecture: 3 exact records retired. RF04 exit 0, 0 active violations, 805 modules; RF05 185 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
