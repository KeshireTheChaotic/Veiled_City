# C180 — Evidence custody composition retirement design

Historical design proposal, superseded by [C180-SCOPE.md](C180-SCOPE.md). The proposal recorded a read-only design snapshot; implementation was later performed in the isolated worktree documented by the scope record.

## Bounded change

Move the composition currently in `bot/src/evidence-custody.js` into a new Knowledge-owned `bot/src/frameworks/knowledge/evidence-custody-service.js`. The service should import the factory directly from `./evidence-custody.js` and its same-owner dependencies directly from `./contracts/world-memory.js`, `./personal-character.js`, `./contracts/session-scene.js`, and `./contracts/community-evidence-sources.js`. Preserve the lazy `custodyRules` singleton, the `evidenceView` and `manageEvidence` exported wrapper functions, and the module-evaluation binding of that exact `manageEvidence` function object to `knowledgeEvidenceCustodySource`.

Export `evidenceView` and `manageEvidence` from `bot/src/frameworks/knowledge/public.js`. Preserve the existing `createEvidenceCustody` factory export unchanged. Repoint Application callers `commands.js` and the composition wrapper `bot/src/personal-continuity.js` to the Knowledge public surface. Intent-owned `ai-intents.js` must stop importing the root and receive only the `manageEvidence` operation through a narrowly scoped Intent-owned consumer contract, an extension of the existing `intent--knowledge` pair, and startup composition. Do not deep-import Knowledge from Intent and do not reuse `intentKnowledgeMaintenance`; it currently binds history reconciliation and memory-cluster maintenance, which are distinct operations.

Keep `knowledgeEvidenceCustodySource` and its existing Daggerheart–Knowledge binding intact. `consent-native.js` uses that fixed slot to apply explicit accepted/declined evidence transfer decisions after consent checks. Preserve binding identity and initialization order so the fixed consumer slot is ready before those commands can execute.

## Supported behavior and compatibility

Observed production callers are `commands.js` (custody mutation and evidence view), `bot/src/personal-continuity.js` (passes the Knowledge `evidenceView` operation into the personal-continuity factory), and `ai-intents.js` (status operation after human review). The Knowledge personal-continuity factory receives `evidenceView` as an injected dependency and does not import the root. The existing `daggerheart--knowledge/public.js` adapter separately binds `manageEvidence` from the same source port for native consent handling.

`evidenceView` is a read path: it applies handout visibility, limits player history to the active character or visible source, returns at most the latest 12 rows, and restricts pending-transfer details. `manageEvidence` is a write path: it checks the evidence-custody opt-in, closed operation shape, owner/source/revision and physical-evidence rules, then writes handout metadata, optional `evidence_effect`, `evidence_receipt`, and audit within the existing transaction. Preserve duplicate receipt semantics: key `${row.id}:${cityKey(input.key)}`; same-actor replay returns current view and a different actor is rejected. Preserve the physical-effect replay guard, saved row shapes, provenance, transaction boundaries, and output behavior. No migration or saved-format change is in scope.

## Exact transition obligations

Remove/archive only these existing records after the implementation satisfies their exact edges:

| ID | Record | Assigned removal | Planned disposition |
|---|---|---|---|
| `881172bf1ae489b52340425e7eb0754df67ca7dd9a2c0b7e3a288a4d193e403a` | `LEGACY_MODULE_LOCATION`, `bot/src/evidence-custody.js`, Knowledge | RF04-F03 | Retire root after Knowledge public service exports are in place and reverse imports are gone. |
| `121a5b1040a66e377bd5db6762cf7968d5ecbeb45efe9d243991e8fb97450b9a` | `DIRECT_CROSS_FRAMEWORK_IMPORT`, Intent `ai-intents.js` → root | RF05-F02 | Replace with the narrowly scoped Intent consumer port and adopted Intent–Knowledge pair. |
| `3a123a578cb24f8bcdaf331c8b44a078f78abbd44b03b72bc1c3f362c19c92bc` | `IMPORTS_PRIVATE_API`, Application `commands.js` → root | RF06-F04 | Repoint to Knowledge public under the exact RF06 prerequisite authorization. |

`bot/src/personal-continuity.js` → root is an additional composition-wrapper import with no listed transition record; repoint its injected function to Knowledge public as part of this retirement. The Daggerheart–Knowledge adapter does not import the root and is not an edge to remove.

## Initialization and cycle constraints

The new service must import factory and ports from Knowledge-owned modules directly, never from `frameworks/knowledge/public.js`, avoiding a public-barrel cycle. Preserve the source-port bind at service module evaluation and bind the same wrapper function object as before. Startup currently initializes personal continuity and Intent–Knowledge before command dispatch; extend the existing Intent–Knowledge composition with a separate narrow connector and confirm it runs after the service module has evaluated. Keep the existing maintenance binding unchanged. The Intent–Knowledge pair is already adopted for existing APIs; this slice extends it with a narrow custody operation rather than re-adopting the pair. Do not change the existing Daggerheart adapter or personal-continuity startup ordering without evidence that the source binding is unavailable.

## Verification and rollback for implementation

Before edits, re-hash all source files listed in the evidence snapshot and confirm the three transition IDs still exist unchanged. Inspect all production imports in `bot/src`, `bot/scripts`, tooling, and package entry points; historical fixture strings are evidence only and must not be rewritten. After implementation, use a fresh focused test such as `rf04-f03-c80.test.mjs` for service composition and port binding (the architecture checker requires the two-digit C-number suffix), syntax-check changed JavaScript, and run only the currently authorized phase-aware architecture gate after the C178–C179 freeze permits it. Verify no saved-row shape or receipt key changed. Record actual outcomes; this design run ran no tests or checks and provides no qualification evidence.

Rollback removes only the new service/Intent port and adapter/composition additions, restores the three source import sites and root module, and restores only the three exact transition records if they were retired. Preserve all concurrent C178–C179 files, existing user Narrative edits, unrelated dirty files, and any pre-existing changes to shared manifests. Do not reset the checkout or roll back shared files wholesale.

## Concurrent source SHA-256 snapshot

| Path | SHA-256 |
|---|---|
| `bot/src/evidence-custody.js` | `abbfa2cc34801fc0b2f2f139f8937f975db04761562e1d4fc1629bf2a81d3f3c` |
| `bot/src/frameworks/knowledge/evidence-custody.js` | `e25258e791f84031eceaea8342965f1150cfc234ae4652fc68bafef577335745` |
| `bot/src/frameworks/knowledge/public.js` | `7d852fadc3b9d72a80e004abec04fb27feb6b1e8e1d03f274183602811c96aa6` |
| `bot/src/frameworks/knowledge/personal-continuity.js` | `dcf9f61e2a78327393b58c90e80867522f5468e1dab9383326428390ec1eef02` |
| `bot/src/personal-continuity.js` | `dcf549b99cc822ede45904a7ee8ccbe3e51acc1162ae7bda0b06dd8db44dd4f0` |
| `bot/src/commands.js` | `42eeb87b18d2fa64ba571803889652035dd9eccf40b7864451a0c8bedf3e4ef7` |
| `bot/src/ai-intents.js` | `edc85bde196dd0bb4b979d26a1aa818ebffe3a8780eef9aeee18c73100a1881b` |
| `bot/src/frameworks/intent/contracts/knowledge-maintenance.js` | `a8be3c37bdaca3d59f7b6922d1aa585123171bce27366017ecfbd1b156fb883b` |
| `bot/src/framework-to-framework/intent--knowledge/public.js` | `b2c270c380ce4a4566c98fc04d78393cb0190b8b3cbfd05b1e1fc89f52a27492` |
| `bot/src/application/composition/intent-knowledge.js` | `4b0ad6ee56673c8e878a3782d856009d1b0dbef4cc470c36865419991e28fd7b` |
| `bot/src/framework-to-framework/daggerheart--knowledge/public.js` | `f88ac3d4a678be1c8b575290bca2412d31b3cbaab44f7697c2933ea94d4deef3` |
| `bot/src/application/composition/personal-continuity.js` | `f8731715616beeacded69e002a965ead3326f35adc34311d94bdf87aaedbff3b` |
| `bot/src/index.js` | `f6253ecd98b6d6449800435c0a96b2ad5f82a7417ee355a848ee7c46814ad7d8` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/TRANSITIONS.json` | `f79f8e728fcf039868d44f62bf01b8db41a12e85030627a7e8fa0769c517b459` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/BRIDGE_CONTRACTS.json` | `547c6fcd09e78e6a02fcf644301152297937f21edea954263a832e6f09f3e69c` |
| `docs/Implementation_Plans/Framework_Refactor/BRIDGE_REGISTRY.md` | `5494dd43e06d284fe3d9b8107210fe9c72be7db9b36718625e83d2ce3c2bd524` |
| `docs/Implementation_Plans/TEST_PROTOCOL.md` | `25d216f1da8eb6a09c34e7c192a6e805aebff7b775623c216f320c1eac2be423` |

The transition manifest was already dirty from concurrent work at snapshot time; its SHA is not a pristine baseline. Re-read the live manifest, preserve its unrelated changes, and remove only the exact listed record after the relevant edge is proved gone.
