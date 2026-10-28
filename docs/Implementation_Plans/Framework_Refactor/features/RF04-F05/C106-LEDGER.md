# C106 ledger

## 2026-10-28 C106 Knowledge reads Narrative visibility, importance and relevance through a Knowledge port

Knowledge's narrative-memory.js and memory-lifecycle.js stop importing the Narrative root modules scene-fiction-context.js, narrative-salience.js, narrative-authority-context.js and narrative-relevance.js. Knowledge gains a fixed knowledgeNarrativeSources port; Narrative gains a narrativeRelevanceSource slot filled by narrative-relevance.js at load and reuses the C105 authority-context slot, the public narrativeSourceVisible and the existing narrativeImportanceSource. The existing knowledge--narrative adapter binds the port via connectKnowledgeNarrativeSources from initializeKnowledgeNarrative (no index.js change). Removing the edges also broke 12 recorded import cycles, which are retired.

Tests: one frozen batch of 62 files: 307 tests, 307 pass, 0 fail. Architecture: 17 exact records retired. RF04 exit 0, 0 active violations, 803 modules; RF05 188 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
