# C181 — Owned community composition retirement design

Status: design only. No runtime files, transition records, bridge contracts, manifests, or tests were changed for this design. Source hashes are a snapshot of the concurrently edited checkout; re-hash before implementation and preserve C178–C179 plus user Narrative changes.

## Bounded change

Move the composition in `bot/src/owned-community.js` into a Knowledge-owned `bot/src/frameworks/knowledge/owned-community-service.js`. Import `createOwnedCommunity` from `./owned-community.js`; import the Knowledge-owned `world-memory`, `world-events`, `world-record`, `world-community`, `npc-actor-source`, `personal-character`, and `community-evidence-sources` ports/modules directly. Do not route these same-owner dependencies through Knowledge public. Preserve the existing `actorSource` capture, lazy `organizationRules` singleton, all four wrapper function identities (`inviteOrganization`, `organizationRequest`, `reviewOrganization`, `organizationInbox`), and the module-load binding of that exact `organizationRequest` wrapper to `knowledgeOrganizationSource`.

Expose the four current public functions from `frameworks/knowledge/public.js`. Preserve the existing `createOwnedCommunity` factory export unchanged. Repoint Application callers `commands.js` and `city-commands.js`, plus the composition wrapper `bot/src/personal-continuity.js`, to Knowledge public. Keep the existing Daggerheart–Knowledge `knowledgeOrganizationSource` binding intact: consent processing relies on `organizationRequest` for explicit owner confirmation/decline.

### Intent-owned invitation operation

`ai-intents.js` is Intent-owned and currently calls `inviteOrganization`. Add a narrowly scoped Intent-owned fixed consumer contract for that operation, extend the already-adopted `intent--knowledge` pair with the matching API, and initialize it through the existing Intent–Knowledge application composition. Keep this connector distinct from `intentKnowledgeMaintenance`, which is a different maintenance API. Do not deep-import Knowledge from Intent and do not route the invitation through the root composition module.

### Operations-owned review operation

`ai-review.js` is Operations-owned (confirmed in `FRAMEWORK_OWNERSHIP.csv`) and calls `reviewOrganization` for the `organization_request` workflow. It must receive only `reviewOrganization` through a one-function Operations-owned consumer contract and a Knowledge–Operations pair adapter/bootstrap. Do not route it through Intent, reuse `operationsNpcReview` (which serves NPC goal/strategy operations), or deep-import Knowledge.

The `intent--knowledge` pair is already adopted for existing APIs; its current registry row snapshot is stale relative to that adoption, and its maintenance connector alone does not establish these mutation APIs. Extend it narrowly with only `inviteOrganization` and the separately designed evidence-custody operation. `knowledge--operations` remains `PROPOSED_NO_API`: add the narrow source/consumer contract, explicit adopted API and direction in bridge records, canonical `framework-to-framework/knowledge--operations/public.js`, and an application composition initializer before implementation. Initialize after Knowledge world events, world record/community, and NPC actor source are ready, and before Operations review is callable. Preserve the existing source binding and avoid eager imports that cause a public-barrel cycle.

RF05 phase scope permits supported existing ownership work while RF04 remains incomplete; the exact Operations import transition is already assigned RF05-F05. Its current `SCOPE.md` covers only `assertMutationSuccess`, so C181 must add a separately scoped feature contract for this existing Operations→Knowledge edge before implementation. This is scope reconciliation, not a new permission gate or a reason to defer the design. RF06 `commands.js` and `city-commands.js` re-points are the exact prerequisites already authorized by `RF06-PREREQUISITE-AUTHORIZATION.md`, preserving standalone database construction and saved formats.

## Supported behavior and compatibility

Observed production call sites:

| Caller | Owner | Operation | Existing authority |
|---|---|---|---|
| `commands.js` | Application | `organizationRequest`, `organizationInbox` | Player request/response and inbox commands. |
| `bot/src/personal-continuity.js` | Application composition wrapper | `organizationInbox` | Injected into the Knowledge continuity factory for the read-only continuity view. |
| `ai-intents.js` | Intent | `inviteOrganization` | Proposes a private, pending organization request. |
| `ai-review.js` | Operations | `reviewOrganization` | Reviews an owner-confirmed request in Operations workflow. |
| `city-commands.js` | Application | `reviewOrganization` | Explicit privileged update command, guarded by its existing GM/admin check. |
| `daggerheart--knowledge/public.js` | Daggerheart adapter | `organizationRequest` | Existing fixed-slot owner consent response. |

`organizationInbox` is read-only. `inviteOrganization` creates a pending character-private `organization_request` with proposal terms, source, actor and expiry; it checks opt-in, owned-character eligibility, known source, cooldown, and the five-pending limit. It does not accept a request, spend resources, force membership, or impose a contract. `organizationRequest` accepts only the existing closed `propose`, `confirm`, and `decline` shapes; owner confirmation remains explicit, revision-bound and source-validated.

`reviewOrganization` is mutating. It requires current revision, explicit `confirmed_by`, consented status, current character ownership and valid unexpired source. Within its existing transaction it emits the `owner-world:${motivationKey(row.record_key)}` source event, may update city civic/project state, saves `community_membership` on `found`/`join`, and records final status/audit. Preserve ordering, transaction boundary, authority flags, status/result shapes, cooldown/expiry and saved row formats. No migration or saved-format change is in scope.

The existing Intent–Knowledge maintenance API (`reconcileHistory`, `manageMemoryCluster`, `memoryMaintenanceCandidate`) remains separate. The proposed Intent contract grants `inviteOrganization` only; the proposed Operations contract grants `reviewOrganization` only. Do not expose the entire Knowledge service over either bridge.

## Exact transition obligations

Remove/archive only these current records once the respective edge has been replaced or retired:

| ID | Record | Assigned removal | Planned disposition |
|---|---|---|---|
| `029579f8c2c4eca569d8a2740e9c70fa9810e252567e8e09451503f2a5e215e8` | `LEGACY_MODULE_LOCATION`, `bot/src/owned-community.js`, Knowledge | RF04-F03 | Retire root after Knowledge public service and all source imports are settled. |
| `8379846863c2ca10cc7e022ba5d3b484562ff66e338b0211043b21bfb6c61064` | `DIRECT_CROSS_FRAMEWORK_IMPORT`, Intent `ai-intents.js` → root | RF05-F02 | Replace with one-function Intent-owned consumer port and Intent–Knowledge pair API. |
| `a613566deb5b9c689ebd6d054edbdd34d41f736e8a6505cb65661358269d2872` | `DIRECT_CROSS_FRAMEWORK_IMPORT`, Operations `ai-review.js` → root | RF05-F05 | Replace with one-function Operations-owned consumer port and Knowledge–Operations pair API; add explicit scope contract in RF05-F05 first. |
| `79c0f22fb4c327478ff892ee054376df8abd484b44f46f8957fe5b5f61a56f61` | `IMPORTS_PRIVATE_API`, Application `city-commands.js` → root | RF06-F04 | Repoint to Knowledge public under exact RF06 prerequisite authorization. |
| `af7534c3faacdd33d84157aad792b46eae73b32cbda1ea0eb84583d54866d9b9` | `IMPORTS_PRIVATE_API`, Application `commands.js` → root | RF06-F04 | Repoint to Knowledge public under exact RF06 prerequisite authorization. |

`bot/src/personal-continuity.js` → root is an additional composition-wrapper import without a listed transition record; repoint its injected wrapper dependency during root retirement. The Daggerheart adapter imports Knowledge source ports, not the root, and its binding is preserved.

## Initialization, behavior and cycle constraints

Keep the service module’s public imports acyclic: direct import same-owner factories and ports; publish wrappers through the Knowledge public module. The `knowledgeOrganizationSource` bind must happen at module evaluation as it does today and continue to receive the same `organizationRequest` function object. Retain the existing Daggerheart–Knowledge adapter and its consent initialization. Initialize the Intent adapter independently from maintenance. For Operations, initialize the Knowledge–Operations adapter only after all fixed Knowledge sources required by `reviewOrganization` have been initialized and before review entry points become available. Check `index.js`’s real startup sequence at implementation time because it is concurrently edited; do not guess or reorder unrelated initializers.

The service’s wrappers must keep their current argument/result behavior. Keep read-only inbox/projection calls separate from invitation and review writes. Preserve `organization_request` and `community_membership` rows, `owner-world:*` event key, source/provenance checks, transaction and audit behavior, confirmation and replay/revision semantics. No callers should get broader authority through pair bridges.

## Verification and rollback for implementation

Before editing, re-hash all source files listed below; inspect current `TRANSITIONS.json`, `BRIDGE_CONTRACTS.json`, bridge registry, ownership CSV and phase authorization because C178–C179 have concurrent manifest work. Audit all production references in source, scripts, tooling and package entry points. Historical fixture text is not a production caller and must not be rewritten. Once an implementation batch is frozen and authorized, use fresh focused tests for Knowledge composition/bindings, Intent invitation API, Operations review API and bootstrap ordering, with new pair-API architecture tests using the checker’s two-digit C-number suffix (for example `rf04-f03-c81.test.mjs`); syntax-check changed JavaScript and run only the authorized phase-aware architecture gate. Verify read-only inbox paths write nothing, invitation stays pending, review preserves event/transaction/receipt semantics, and no stored rows change shape. This design run executed no tests or checks and gives no qualification evidence.

Rollback removes only the new service and the new Intent/Operations contracts, adapters, bootstrap and adopted bridge records, restores the five exact source imports/root module, and restores only the exact transition records retired by this slice. Preserve C178–C179 source/docs, user Narrative work, unrelated dirty files, and concurrent shared-manifest edits. Never reset or restore shared files wholesale.

## Concurrent source SHA-256 snapshot

| Path | SHA-256 |
|---|---|
| `bot/src/owned-community.js` | `52a6b22234550eacef0ff3dfbb57bfd2871ff0e4bf26143c572eb7801ccaa9fb` |
| `bot/src/frameworks/knowledge/owned-community.js` | `47e21e43afd126149a6289886025f91cb56b9effe3cd7c2bde70d1ae3a32363b` |
| `bot/src/frameworks/knowledge/public.js` | `7d852fadc3b9d72a80e004abec04fb27feb6b1e8e1d03f274183602811c96aa6` |
| `bot/src/frameworks/knowledge/personal-continuity.js` | `dcf9f61e2a78327393b58c90e80867522f5468e1dab9383326428390ec1eef02` |
| `bot/src/personal-continuity.js` | `dcf549b99cc822ede45904a7ee8ccbe3e51acc1162ae7bda0b06dd8db44dd4f0` |
| `bot/src/commands.js` | `42eeb87b18d2fa64ba571803889652035dd9eccf40b7864451a0c8bedf3e4ef7` |
| `bot/src/city-commands.js` | `031b58dd128bcee1c408dd0628196cbd5838642b90bc8930ef23875d9a94927e` |
| `bot/src/ai-intents.js` | `edc85bde196dd0bb4b979d26a1aa818ebffe3a8780eef9aeee18c73100a1881b` |
| `bot/src/ai-review.js` | `45e4b6ad9cc2bc7e5b72ede450bd8c21d8e40a72750b15ee5b29fc048bea3fe5` |
| `bot/src/frameworks/operations/public.js` | `766dfa40a894a1abf02e3e91f0a3a2afc48fc77672f32f866f6e93b1e3c92eef` |
| `bot/src/frameworks/operations/contracts/npc-review.js` | `09c1cffdcc2c98d2715238ee22b98b667598f8c096c615d1d04fc69e321e0c1e` |
| `bot/src/framework-to-framework/intent--knowledge/public.js` | `b2c270c380ce4a4566c98fc04d78393cb0190b8b3cbfd05b1e1fc89f52a27492` |
| `bot/src/framework-to-framework/knowledge--operations/public.js` | absent at snapshot |
| `bot/src/application/composition/intent-knowledge.js` | `4b0ad6ee56673c8e878a3782d856009d1b0dbef4cc470c36865419991e28fd7b` |
| `bot/src/application/composition/operations-knowledge.js` | absent at snapshot |
| `bot/src/application/composition/public.js` | `a75774a3a018876e853f43c635a03d04d78cc91f6ba54530d3af298775964760` |
| `bot/src/application/composition/personal-continuity.js` | `f8731715616beeacded69e002a965ead3326f35adc34311d94bdf87aaedbff3b` |
| `bot/src/framework-to-framework/daggerheart--knowledge/public.js` | `f88ac3d4a678be1c8b575290bca2412d31b3cbaab44f7697c2933ea94d4deef3` |
| `bot/src/index.js` | `f6253ecd98b6d6449800435c0a96b2ad5f82a7417ee355a848ee7c46814ad7d8` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/TRANSITIONS.json` | `f79f8e728fcf039868d44f62bf01b8db41a12e85030627a7e8fa0769c517b459` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/BRIDGE_CONTRACTS.json` | `547c6fcd09e78e6a02fcf644301152297937f21edea954263a832e6f09f3e69c` |
| `docs/Implementation_Plans/Framework_Refactor/BRIDGE_REGISTRY.md` | `5494dd43e06d284fe3d9b8107210fe9c72be7db9b36718625e83d2ce3c2bd524` |
| `docs/Implementation_Plans/Framework_Refactor/FRAMEWORK_OWNERSHIP.csv` | `65300d5037cdfc7c10efcbe2251ee1f6fa74d9ada2a01fe17df0a5649d3f4529` |
| `docs/Implementation_Plans/Framework_Refactor/features/RF05-F05/SCOPE.md` | `2a93b12366c103894f1854c044c2734f84c20199b74401088601de450de33f0c` |
| `docs/Implementation_Plans/Framework_Refactor/phases/RF04/RF06-PREREQUISITE-AUTHORIZATION.md` | `ce8d33e0577ac25a356ace960b39de70cc147965d1ceb6c5a92ced5f8293b479` |
| `docs/Implementation_Plans/TEST_PROTOCOL.md` | `25d216f1da8eb6a09c34e7c192a6e805aebff7b775623c216f320c1eac2be423` |

`TRANSITIONS.json` and `BRIDGE_CONTRACTS.json` were already dirty from concurrent work at snapshot time. Their hashes describe the live snapshot, not clean baselines; preserve concurrent edits and change only the exact records needed for this slice.
