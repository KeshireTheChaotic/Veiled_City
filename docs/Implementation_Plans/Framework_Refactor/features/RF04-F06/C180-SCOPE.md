# C180 — Evidence custody service migration

## Phase result

Moved the evidence custody composition into Knowledge-owned `evidence-custody-service.js`, exposed its two original public functions through Knowledge public, and removed the root composition module. Preserved the factory export, lazy singleton, wrapper names/function objects, and module-load binding of the original `manageEvidence` wrapper to the fixed Knowledge source port. Application commands and the personal-continuity composition wrapper now import the Knowledge public functions. Intent receives `manageEvidence` through the existing Intent–Knowledge pair's separate two-method effect port; maintenance remains a separate binding.

No policy, validation, receipt behavior, transaction boundary, storage schema, or saved format was intentionally changed. The factory implementation and DB construction remain in their existing owners.

## Changed files

- `bot/src/evidence-custody.js` (retired)
- `bot/src/frameworks/knowledge/evidence-custody-service.js` (new)
- `bot/src/frameworks/knowledge/public.js`
- `bot/src/frameworks/knowledge/contracts/community-evidence-sources.js` (service ownership comment)
- `bot/src/commands.js`
- `bot/src/personal-continuity.js`
- `bot/src/frameworks/intent/contracts/knowledge-actions.js` (new; shared C180/C181 port)
- `bot/src/frameworks/intent/public.js`
- `bot/src/ai-intents.js`
- `bot/src/framework-to-framework/intent--knowledge/public.js`
- `bot/src/application/composition/intent-knowledge.js`
- `docs/Implementation_Plans/Framework_Refactor/RF01/TRANSITIONS.json`
- `docs/Implementation_Plans/Framework_Refactor/RF01/BRIDGE_CONTRACTS.json`
- `docs/Implementation_Plans/Framework_Refactor/RF01/PACKAGES.json`
- `docs/Implementation_Plans/Framework_Refactor/BRIDGE_REGISTRY.md`
- `docs/Implementation_Plans/Framework_Refactor/features/RF04-F06/C180-RETIRED.json`
- `docs/Implementation_Plans/Framework_Refactor/features/RF04-F06/C180-SCOPE.md`

`intentKnowledgeActions` has only `manageEvidence` and `inviteOrganization`; both adapters pass the original Knowledge functions directly. The existing maintenance connector remains independent. `initializeIntentKnowledge` still returns the maintenance port and repeated calls bind the same original functions. Intent–Knowledge was already adopted for its existing authored-turn API; this phase did not re-adopt that pair.

## Transition records

Archived and removed only the assigned records:

- `881172bf1ae489b52340425e7eb0754df67ca7dd9a2c0b7e3a288a4d193e403a` — Knowledge root location, RF04-F03.
- `121a5b1040a66e377bd5db6762cf7968d5ecbeb45efe9d243991e8fb97450b9a` — Intent import to root, RF05-F02.
- `3a123a578cb24f8bcdaf331c8b44a078f78abbd44b03b72bc1c3f362c19c92bc` — Application command import to root, RF06-F04.

The additional composition-wrapper imports in `bot/src/personal-continuity.js` were repointed; no transition record existed for them. The factory at `bot/src/frameworks/knowledge/evidence-custody.js` and its `createEvidenceCustody` public export remain intact.

## Verification

The fresh bounded tests `rf04-f03-c80.test.mjs` and `rf04-f03-c81.test.mjs` passed; see `C180-RUN.md` and `C181-RUN.md` for the corrected C80 targeted pass and C81 combined-batch pass. Scoped syntax checks passed for 21/21 changed JavaScript and test files. SHA-256: C80 `78e5e6c5bd16deebc945d8a2af067711ea36c19ee7570160fa10ca03cce3b68c`; C81 `bcf9a54c493977424c52e6111602731204532479da07bfd4e22ac59a5721f845`. These fixtures are fake and bounded. No full production database, Discord, runtime, or release qualification is claimed; broader dependencies remain open.

## Rollback

Restore the archived transition records from `C180-RETIRED.json`, restore the removed root file and original imports, and remove only `evidence-custody-service.js` plus the C180 additions to the Intent action port/connector. Preserve the unrelated `inviteOrganization` C181 action when rolling back C180 alone. Revert only C180 edits in shared bridge/package/ownership files; keep all unrelated worktree changes.

## Source hashes

The complete current source and metadata hash table is in [C181-SCOPE.md](C181-SCOPE.md). Baseline HEAD was `40ed5a49dabce7a02f20975f4b703072a3e995ee`. The source-only implementation is in the isolated `codex/rf04-isolated` worktree. No changes were staged or committed.
