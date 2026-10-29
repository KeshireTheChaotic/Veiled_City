# C182–C185 — Knowledge memory cluster retirement design

**Status:** this file preserves the accepted design snapshot. The source and metadata implementation is documented separately in `C182-C185-SCOPE.md` on recovered branch `codex/rf04-memory`; source qualification remains pending the tester-owned batch. The earlier design-stage checkout and hash table below are historical and are not the current implementation freeze.

**Reviewed checkout:** branch codex/rf04-isolated, HEAD 40ed5a49dabce7a02f20975f4b703072a3e995ee. Git confirms this is a worktree and core.bare is false; the earlier default-sandbox status attempt failed because the isolated root was outside the active-turn sandbox permissions. Parent verified that Git status and branch operations work with explicitly escalated process commands. No Git configuration or worktree metadata was changed. Treat the hashes below as the inspected snapshot, not a clean-tree assertion. Recheck the active worktree and rehash before implementation.

## Objective and bounded ownership move

The Knowledge implementations already live in bot/src/frameworks/knowledge/ as factories. The four root files are compatibility compositions: they instantiate those factories, wire existing Knowledge/World/Session ports, and export forwarding functions. Move only that composition and the original exported operations into four Knowledge-owned service modules. Remove the root shims only after every production caller is routed through Knowledge public API or an exact fixed pair port.

Proposed sequence:

1. C182: move memory-lifecycle.js composition to frameworks/knowledge/memory-lifecycle-service.js.
2. C183: move context-memory.js composition to frameworks/knowledge/context-memory-service.js.
3. C184: move scoped-memory.js composition to frameworks/knowledge/scoped-memory-service.js.
4. C185: move narrative-memory.js composition to frameworks/knowledge/narrative-memory-service.js.

Each service imports its own factory, same-owner services, and same-owner contracts by relative file path, not back through frameworks/knowledge/public.js. Preserve each original forwarding-function body and canonical function reference, one lazy singleton where the root has one, and the context-memory source binding at module evaluation. Preserve the factory modules verbatim. No schema, storage, or saved-row migration is proposed.

## Public exports and existing schema exports

Add only service operations not already exported by Knowledge public:

- C182: narrativeMemoryEpistemic, rememberEntity, reviseMemory, retractMemory, retrieveMemoryRevisions.
- C183: persistentMemories, saveContextMemories, contextMemoriesForScope.
- C184: scopedSceneMemory, resolveScopedMemoryReference.
- C185: retainEstablishedNarrative, queueNarrativeMemory, acknowledgeNarrativeMemory, disclosedNarrativeMemory, selectDisclosedNarrativeMemory.

Knowledge public already exports contextMemorySchema and CONTEXT_MEMORY_PROMPT from factory module context-memory.js. Keep those and createContextMemory unchanged. Do not add duplicate exports from the service or change their values/identity. The root context composition eagerly calls createContextMemory() while initializing those constants; preserve that module-load construction timing. C182, C184, and C185 create rules lazily on first operation; preserve that behavior.

## Caller and contract map

| Current caller | Owner | Current operation | Proposed path |
|---|---|---|---|
| bot/src/state.js | Application | saveContextMemories within authoritative mutation application | Knowledge public; exact RF06-authorized caller repoint |
| bot/src/gm.js | Application | scopedSceneMemory; schema and prompt already come from Knowledge public | Knowledge public; exact RF06-authorized caller repoint |
| bot/src/typed-intents.js | Intent | resolveScopedMemoryReference while grounding immediate typed intents | One-operation Intent-owned Knowledge memory consumer on existing Intent–Knowledge pair; do not reuse authored-turn, maintenance, or action ports |
| bot/src/narrative-authority.js | Narrative | retainEstablishedNarrative after accepted established fiction | Two-operation Narrative-owned Knowledge memory consumer on existing Knowledge–Narrative pair |
| bot/src/narrative-authority-context.js | Narrative | selectDisclosedNarrativeMemory for narrative context | Same narrow Narrative-owned consumer |
| bot/src/publication-outbox.js | Publication | queueNarrativeMemory on enqueue and acknowledgeNarrativeMemory after delivery/reconciliation | Two-operation Publication-owned Knowledge memory consumer on existing, currently proposed Knowledge–Publication pair; adopt only this caller and these methods |
| bot/src/autonomous-world.js | World | contextMemoriesForScope through existing World context-memory fixed port | Preserve current Knowledge source-port bind; no new direct import or pair |
| Knowledge root compositions | Knowledge | Compose memory services | Direct same-owner service imports |

The Application repoints are the exact dependency classes covered by RF06-PREREQUISITE-AUTHORIZATION.md; that authorization permits only these observed prerequisites while preserving standalone DB construction and saved formats. RF05 scope permits supported ownership work while RF04 remains incomplete. This design does not invent a phase hold. Intent, Narrative, and Publication keep their own caller contracts; none imports Knowledge private implementation files.

The existing Knowledge–World, Intent–Knowledge, and Knowledge–Narrative pairs cover adjacent APIs but not all these operations. Extend each narrowly with the exact methods described here. Knowledge–Publication is PROPOSED_NO_API; adopt only the Publication outbox’s two observed operations, not all graph edges in that row. Create no new pair and expose no broad service object.

## World identity-kind dependency and startup

memory-lifecycle.js and narrative-memory.js currently import BACKGROUND_WORLD_KINDS from root world-background-identities.js. The root re-exports the original World public constant. frameworks/world/background-identities.js defines the frozen original array ['faction','organization','district']; World public re-exports that same reference.

Do not copy the list, construct another array, or import World public from Knowledge services. Add a narrow read-only getter to the existing Knowledge–World identity contract and adapter: bind a function returning World public’s BACKGROUND_WORLD_KINDS reference, and have the Knowledge consumer call that function. Keep resolvePlaceReference, preflightNpcIdentity, and worldIdentityOrigin references unchanged. The getter must return the exact original frozen array; test reference identity, not just equal contents.

Call the getter only inside existing lazy constructors: lifecycle() for C182 and memory() for C185. Do not read it at module evaluation, public-barrel evaluation, or pair composition. This preserves current first-use timing and avoids an uncomposed port read. C183’s eager createContextMemory constructor receives only the lazy rememberEntity callback; it does not need World kinds at construction.

index.js calls initializeKnowledgeWorld() before initializeNarrativeWorld(), initializeKnowledgeNarrative(), later Knowledge services, and business objects. Service module import does not invoke C182/C185 operations. Keep that order and ensure no new getter call is made during composition.

The getter grants no World identity creation, movement, actor control, canonical authorship, consequence, or audience authority. Preserve the original worldIdentityOrigin function binding. Separate Narrative imports of world-background-identities.js are outside this Knowledge cluster and remain: transition IDs e69b1f8c63dd20751407fd59c1e112f13f46632be1bcbf03ce43ec33985c74e9 and 9f382df80bbe91555c924fa84455a74b530896ba0ed8f6dbaabc12a63a681b29. Do not accidentally remove the root module for these Knowledge changes. World-owned autonomous-world.js keeps its own background identity responsibility.

## Service construction and source bindings

- C182 lazily creates one createMemoryLifecycle instance. Inject original callbacks through knowledgeNarrativeSources for narrativeSourceVisible and narrativeImportance, knowledgeWorldIdentities.worldIdentityOrigin, and the lazily obtained World-kind array. Preserve callback forwarding and wrapper exports.
- C183 preserves contextRules as one instance created at context-service module evaluation, because the old root eagerly builds context schema/prompt values. contextMemoriesForScope remains the exact service wrapper bound at module evaluation to knowledgeContextMemorySource. Preserve the Knowledge–World adapter and World fixed-port behavior.
- C184 lazily creates one createScopedMemory instance from canonical C183/C182 wrapper functions plus knowledgeSessionScene.currentScene and sceneView. Keep output fields, ordering, limits, and owner-scoped position resolution unchanged.
- C185 lazily creates one createNarrativeMemory instance from Knowledge-local narrative sources, World events, canonical C182 wrappers, and the exact World-kind array. Existing pair adapters bind exact C185 wrapper objects, not a copied factory object or second-owner forwarding wrapper.

Add a separate Intent-owned one-function port for resolveScopedMemoryReference; do not reuse intentKnowledgeActions or intentKnowledgeMaintenance. Add a separate Narrative-owned two-function port for retainEstablishedNarrative and selectDisclosedNarrativeMemory; do not relabel these as evidence. Add a Publication-owned two-function port for queueNarrativeMemory and acknowledgeNarrativeMemory. Keep all existing pair APIs and source bindings. Extend initializeIntentKnowledge(), initializeKnowledgeNarrative(), and add a narrowly named Publication initializer. These connectors bind functions only: no DB construction, factory invocation, World-kind lookup, or record writes at startup. Initialize the new Publication port with other inert composition initializers after Knowledge sources are available and before outbox use. Preserve initializeKnowledgeWorld() before C182/C185 first use.

## Behavior, saved rows, and privacy

This is a code relocation and adapter extension only. Preserve factory sources and exact wrapper signatures/results.

- Memory identities remain parent- and audience-scoped. Preserve deterministic memory-id keys, memory_revision keys, revision supersession, retraction, expiry ticks, epistemic types, and the resolved-native-receipt requirement. memory_identity and memory_revision stay ordinary city records; do not migrate or rewrite existing rows.
- Version-2 World memory remains a projection of an existing autonomous identity and accepted native narrative unit. Verify exact native:narrative-authority source hash, identity origin and kind/name/aliases, event ancestry, and visibility. Undisclosed native memory remains GM-private. Disclosed projection still requires bounded exact Publication receipts matching delivered message, channel, visibility, and target character. Memory is not canon or mechanical authority.
- Context memory stays capped and closed to object/detail/rumor, sourced from authenticated current character input, and saved only when durable details are supported by player input or output. Preserve private/party surface assignment, audience-contract version, context_memory key/data shape, and the fail-closed reader that excludes legacy/unbound rows.
- Scoped lookup still intersects active source-compatible revisions with current audience, checks current character ownership for version-2 private rows, respects protected pending references and expiry, and merges existing audience-bound descriptive context rows. Scene positions remain based on active public/party receipts and current sceneView. Reference resolution remains evidence, never permission or outcome authority.
- Narrative retention stays gated by narrative_memory and excludes native_outcome_render. Preserve narrative_delivery rows, narrative-world-memory key, native:narrative-memory source id, event IDs, source hashes, publication IDs, acknowledgement status, and unit hashes. Queueing remains in the authoritative outbox enqueue flow. Acknowledgment stays after actual delivered Discord receipt or authenticated exact-message reconciliation and inside the existing transaction. It must not run on voice/progress output, failed/uncertain transport, or unverified reconciliation.
- Narrative selection continues to require acknowledged delivery, original source visibility, exact character/user ownership, accepted unit hash, and every publication delivered with a Discord message ID. Ranking and caps remain after eligibility filtering; selection does not infer NPC knowledge or PC witness status.

Preserve write ordering and current unit-of-work boundaries. Do not add a broader transaction or change the outbox transaction. saveContextMemories validates input/source first, writes the descriptive context_memory row, then calls rememberEntity. Narrative queueing remains inside publication enqueue. Acknowledged delivery remains after the publication row is marked delivered, before the existing transaction returns. Failures keep their current rollback scope.

## Exact transition records

These are the complete current IDs found in RF01/TRANSITIONS.json. Archive the complete exact records before removing any, and only after the related edges have moved and fresh feature tests pass.

| Feature | Exact ID | Record | Edge / owner | Assigned phase |
|---|---|---|---|---|
| C182 | 59fb1144bb66b9687357dd486981f5935c805df2048e60c179dfdf0b26840ae4 | LEGACY_MODULE_LOCATION | root memory-lifecycle.js; Knowledge | RF04-F03 |
| C182 | 28ca56baa1c10fb2466e70d6d08590f4d09689c861583725dfc4c9f059da71cf | DIRECT_CROSS_FRAMEWORK_IMPORT | Knowledge memory-lifecycle.js → root World background identities; Knowledge | RF04-F03 |
| C183 | 2b3c51560835b752ebcd4b8959925154019680390c08c4b7f0a7590cd0f69892 | LEGACY_MODULE_LOCATION | root context-memory.js; Knowledge | RF04-F03 |
| C183 | fbbb470a971e6adb4302e434842a0899c049d75f77740d462218b34335301fe0 | IMPORTS_PRIVATE_API | Application state.js → root context memory; exact RF06 prerequisite | RF05-F05 record; RF06 prerequisite authorized |
| C184 | 1568e94e0f16947d4000df0af0933e9cb3343ff46f893c5be964edd23f4b71fa | LEGACY_MODULE_LOCATION | root scoped-memory.js; Knowledge | RF04-F03 |
| C184 | 5572c7bf7ee1347d1b5e6fa6d3c64328f2f17f966eb0da37240a7b5881925dd5 | IMPORTS_PRIVATE_API | Application gm.js → root scoped memory; exact RF06 prerequisite | RF05-F04 record; RF06 prerequisite authorized |
| C184 | cbbf253547fb99caaa17e2bc1a6b5f64c6cac6cb55a3296e8261238bac55fd7a | DIRECT_CROSS_FRAMEWORK_IMPORT | Intent typed-intents.js → root scoped memory | RF05-F02 |
| C185 | 93b05185a2ba1616c4876bfa5e3f5de9f66cc2f9c9973145130b8b56bd0d2681 | LEGACY_MODULE_LOCATION | root narrative-memory.js; Knowledge | RF04-F03 |
| C185 | b73dc0faea278b823ba464fcec9f4a0ffe595d66fd06fd0674c8164067c13743 | DIRECT_CROSS_FRAMEWORK_IMPORT | Narrative narrative-authority-context.js → root narrative memory | RF05-F03 |
| C185 | 5537607cd0b595d0efff861f6fbd32858dbc702e9bfe87d6ff9385d550c65f67 | DIRECT_CROSS_FRAMEWORK_IMPORT | Narrative narrative-authority.js → root narrative memory | RF05-F03 |
| C185 | 6a197535fe04246a22a7fa4f88ee159cd6444dbd2716cb09e0aca8fa42971b1b | DIRECT_CROSS_FRAMEWORK_IMPORT | Knowledge narrative-memory.js → root World background identities | RF04-F03 |
| C185 | 061ae93ba3876167c05801e6492dd826470536e7f04bd1de6d648bdb96483270 | DIRECT_CROSS_FRAMEWORK_IMPORT | Publication publication-outbox.js → root narrative memory; exact RF06 prerequisite | RF06-F03 |

Same-owner root imports among C182–C185 resolve through the Knowledge service modules and have no separate transition rows. The two Narrative imports of world-background-identities.js above remain outside this cluster. Do not retire unrelated C180/C181 records or broaden phase assignments.

## Risks, qualification, and rollback

Material risks are private memory crossing actor/audience scope, treating a projection as objective/native authority, changing version-2 identity qualification, or granting a broad mutation API. Narrow fixed ports preserve rule checks in existing Knowledge factories and bind exact original function objects. The World getter preserves the same frozen array. Each safeguard has a direct fresh-test case; a source move alone is not qualification.

Use only fresh feature tests and disposable SQLite per TEST_PROTOCOL.md. Cover complete port binding/identity and replacement rejection; lazy getter timing and exact frozen-array identity; authenticated context saves and legacy-row rejection; private/cross-character scoped filtering; v1/v2 receipts; narrative queue/ack on delivered versus failed/uncertain output; saved row/receipt shapes; and startup order. Do not run or repurpose historical tests or fixtures, legacy suites, provider/network services, or production DB. This design executed no tests or gates and makes no qualification claim. Keep implementation test names compatible with the architecture checker; do not add selector exceptions for C182–C185.

Rollback removes only the four new service modules, their Knowledge public exports, exact new caller-owned contracts/adapters/initializers, and the World identity getter. Restore the four root compositions and their imports/binds. Restore only the exact archived transition records for implemented slices. Preserve C178–C181 source, manifests, dirty Narrative work, and unrelated files. Never reset or restore shared files wholesale.

## Source hashes at inspected HEAD

Hashes are SHA-256 at HEAD 40ed5a49dabce7a02f20975f4b703072a3e995ee. C180/C181 source and manifest work is in flight; rehash before implementing. Transitions, bridge contracts, registry, ownership CSV, index, Knowledge public, and Intent–Knowledge files are shared/high-conflict inputs, not permission to overwrite their current changes.

| Path | SHA-256 |
|---|---|
| bot/src/memory-lifecycle.js | 336382571996402B646E6C0A7A64B9B134031CFC5F9730508E8A54F6F768E |
| bot/src/context-memory.js | 86D24B84F0F4E8E62DE99B16A6B5EBE2F54276169FC2C04CE0F99B97C91A371D |
| bot/src/scoped-memory.js | AAFB580ADEA7378F7E65F2BC12038AC1CC4008D1CC0B245E92096B4489C32024 |
| bot/src/narrative-memory.js | 8B938AA2B20F4DA21B6E954C1918B059B4DE0AAFEDAAC0A208B9EE697D062ADD |
| bot/src/world-background-identities.js | E9A821F5F05B82E1EB31B078199F6AF11DE9C5E2125D65C4C040EC550B7CEE82 |
| bot/src/frameworks/knowledge/memory-lifecycle.js | 6B469AA2EA2EA38399F1C416960B52F3B6428E999FBC3242DE4EF86680EC0177 |
| bot/src/frameworks/knowledge/context-memory.js | B3533DDF6B16D69EBB76BB23A18F63326D2EA8FBE2E8FD7FE45FA3282026EA2C |
| bot/src/frameworks/knowledge/scoped-memory.js | DA9790D8B1F53F169D1DEBAAF0510FB87C9327DC2746085B983C5D49E874C945 |
| bot/src/frameworks/knowledge/narrative-memory.js | 7864BFE52DDC7508B2CFD02C9CEA8DFF23DFFFD819EF7DFFABB889FC9E906DD9 |
| bot/src/frameworks/knowledge/public.js | 134EE10416E2AFEFC141906E569E4B8CE5C9848941483FE02265517962812146 |
| bot/src/frameworks/knowledge/contracts/world-identities.js | 084D13E7F5216A2685C26A20F9029358332E132A476C0B4C223C4B34EB8D361B |
| bot/src/frameworks/knowledge/contracts/world-memory.js | 2CB8FD097276F8F95281E1665958B295A17527E591E0E2534A4FDB841E754E5C |
| bot/src/frameworks/knowledge/contracts/world-events.js | F76DC63C079E34C4B2B1FAB9AC221912EF06A78583C114F70C3F5A2EA8A29F75 |
| bot/src/frameworks/knowledge/contracts/session-scene.js | 4C8BF3B280DFA5182A1F3DF859CA5FC814E84552025DBAECF6825506F332241E |
| bot/src/frameworks/knowledge/contracts/context-memory-source.js | DFB90B1A52C63F62749293789BD0DBED6F7F1A4807F5F73173372715B78E0340 |
| bot/src/frameworks/knowledge/contracts/narrative-sources.js | DD98D643B290A48F5CFF8FC1A6E6D9501AFA21D4700362BB1398C41E0EFAD9EF |
| bot/src/frameworks/world/public.js | 837C163EDDFA8D40F00E3BF0C76D786293DD7BAA1A412A87E701D39498DC192A |
| bot/src/frameworks/world/background-identities.js | E2E4D08793F4C553BE1464E3356EFBD7B4F79EB17886A946F42907D7A6C7DA16 |
| bot/src/framework-to-framework/knowledge--world/public.js | F8335584C17F16A780A80837AB8B5317CE7B640DB23D606E16C6C15053C9F761 |
| bot/src/framework-to-framework/knowledge--narrative/public.js | 36CBB35A34D673DB0E999547C06245C50EC8938B0D33A9EBCE0B34C9B7B86AA4 |
| bot/src/framework-to-framework/intent--knowledge/public.js | 4B174CBDB793F64F053BB388A3EE63C46C4CC28CE5D43A4A0A475C92666FD39B |
| bot/src/application/composition/knowledge-world.js | 4D07554585D0D3F94628498B6529186D05DFCCAC302C38C18917A23587E2277D |
| bot/src/application/composition/knowledge-narrative.js | BA1E5DD7F9B6B52CAC0FFDCB1D518FFF4393DC80426832963BD4180543EBECBF |
| bot/src/application/composition/intent-knowledge.js | F2F4C6CBEB84F41AFDF8CD2DCA6D2B3BFA47A65BD16AE5C7C9B1857B0A6512DC |
| bot/src/application/composition/public.js | 410532ECF98E2E4C91317C6E7F340D253932AAC0CD6AA3D697FBA5D0779D5643 |
| bot/src/index.js | A656368320EA3FE491C73228946C4C363C270676379B15CDA710953CA73C467E |
| bot/src/gm.js | 41DF283F31B6B193DA80B4B7E07FAB39EDFAA0EB85A3533CB25C45BDC39CFE60 |
| bot/src/state.js | 201FC2C9680FB96AE4DFA6D4CE75FEE2D98ED1C23204079EB716A43CD355B98A |
| bot/src/typed-intents.js | 9D88E75435E69555D1D0742C08C0F59AD1A841414B330F3E9520274F29298A36 |
| bot/src/narrative-authority.js | C1909B050E6C8718B2F98232232D11288DBBD8D57A29A54974E5AF5DA2E4408A |
| bot/src/narrative-authority-context.js | 1232B4D17D17779C2C0CBA7E99F243F590D2F06A6934E84A1F8BEDDC1A98F176 |
| bot/src/publication-outbox.js | B7939C8C230A14C534FE87B97E5EEDA2D1FB2044768A33D58E6CA401DAF4DEF5 |
| bot/src/autonomous-world.js | 36799CC77AA18D1BA622D6DDDB7CD472E3021F5743ECC7AE19CD1AE7CE000194 |
| bot/src/frameworks/narrative/contracts/knowledge-evidence.js | 4A3D9CDB21F6CE43DEC7F464A778B712781A6B7CBB6E0851D0EF15A35F1C2CAC |
| bot/src/frameworks/narrative/public.js | 7132845DAA454DBDAB8D8984D5920A8726822E0CC83A880AE46F2BBB7532E2D8 |
| bot/src/frameworks/publication/public.js | DB501A3967E97542FB6039E601176E975233EF0718A3EDCFCC236850BB10FF6F |
| docs/Implementation_Plans/Framework_Refactor/RF01/TRANSITIONS.json | 372C731C38F8D720EC261AB14A5C55DF41E4BB66669F1431A77087AC3C7D057E |
| docs/Implementation_Plans/Framework_Refactor/RF01/BRIDGE_CONTRACTS.json | 04C3443FB9E75CA17BDB3E190A4EEBC4E5635E61CC56E37B4331C752E2097B89 |
| docs/Implementation_Plans/Framework_Refactor/BRIDGE_REGISTRY.md | 48EFE6390E61BB8896BAB2634A753841036CDDF018BF6F1B463471DB3F55A3EB |
| docs/Implementation_Plans/Framework_Refactor/FRAMEWORK_OWNERSHIP.csv | 2C4D90561219CDB87D5D0E8F73B90C1FFFB0CDECD0EA7158AA832A8CACBD96AB |
| docs/Implementation_Plans/Framework_Refactor/phases/RF04/SCOPE.md | 309753DC27363DD2F5B437FAE78F7C0838FA6EC5BD1F7AA247D589497602CD2E |
| docs/Implementation_Plans/Framework_Refactor/phases/RF05/SCOPE.md | 063994A52B8D1DAE0DDBC2AF67CEB3F21E45FB211460B234237424B97ABBF2E8 |
| docs/Implementation_Plans/Framework_Refactor/phases/RF04/RF06-PREREQUISITE-AUTHORIZATION.md | 79818D987B9B92D9F552575DCB39684546B4C27006B117519136A45B69F53372 |
| docs/Implementation_Plans/Framework_Refactor/features/RF04-F06/C180-EVIDENCE-CUSTODY-RETIREMENT-DESIGN.md | AA86059C6184DB988DBA02031E94DCD53AAB5F62942B7B750B7218C52D49B8B3 |
| docs/Implementation_Plans/Framework_Refactor/features/RF04-F06/C181-OWNED-COMMUNITY-RETIREMENT-DESIGN.md | EC37A2E6FB106752C8DED483953A3E413CC74AD59FD0295D4FB3F41E3B94F469 |
| docs/Implementation_Plans/TEST_PROTOCOL.md | 9840EB011223BE3864D3714EC9468A382EBE260FB5442B546A8415D8027C51C2 |