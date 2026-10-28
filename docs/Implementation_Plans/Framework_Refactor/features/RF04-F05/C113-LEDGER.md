# C113 ledger

## 2026-10-28 C113 Native consent responses read Knowledge organization requests and evidence custody through a native port

Daggerheart's consent-native.js stops importing the Knowledge root modules owned-community.js and evidence-custody.js. Native rules gain a fixed nativeKnowledgeActions port; Knowledge gains organization request and evidence custody slots filled at load by owned-community.js and evidence-custody.js. The adopted daggerheart--knowledge adapter binds the port via connectNativeKnowledgeActions from initializePersonalContinuity (no index.js change). Static reachability from index.js unchanged.

Tests: one frozen batch of 82 files: 509 tests, 509 pass, 0 fail. Architecture: 2 exact records retired. RF04 exit 0, 0 active violations, 817 modules; RF05 156 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
