# C110 ledger

## 2026-10-28 C110 Session reads Knowledge visibility, referents, evidence and history through a Session port

Session's dialogue-continuity.js and session-briefs.js stop importing the Knowledge root modules disclosure-authority.js, public-referents.js, epistemic.js (shims) and history-reconciliation.js. Session gains a fixed sessionKnowledgeSources port; Knowledge gains a history reconciliation provider slot filled at load by history-reconciliation.js and supplies factVisibleTo, mentionsPublicIdentity, evidenceType and activeEvidence from its public API. The existing knowledge--session adapter binds the port via connectSessionKnowledgeSources from initializeKnowledgeSession (no index.js change). Static reachability from index.js is unchanged.

Tests: one frozen batch of 69 files: 399 tests, 399 pass, 0 fail. Architecture: 4 exact records retired. RF04 exit 0, 0 active violations, 810 modules; RF05 166 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
