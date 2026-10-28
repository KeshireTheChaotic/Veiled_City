# RF04-F06 Publication port plan for the opening workflows

Base: `82c55f6b` (C162). Planning only; no production code, tests or TRANSITIONS.json changed. Slices start at C163. Record ids are the first 8 hex characters of the `RF01/TRANSITIONS.json` id; the slice tooling needs the full id from the UNUSED_TRANSITION output.

## 1. Key finding

The five opening workflows (`opening-flow`, `opening-entry`, `opening-cohort-runner`, `session-opening-recovery`, `session-opening-runner`) do not need the 30 imports of `pvp-output.js`. They need only six publication functions and a few session/world/operations names. All five workflows are owned by `application` (RF06 per OWNERSHIP_DECISIONS), so they may import framework `public.js` files directly. They cannot do that for publication today because `pvp-output`, `publishing` and `publication-outbox` are still root files (owner `publication`, RF06) and publication's `public.js` does not export them.

So the sequence has two parts:

- **Part A (C163-C167, the goal):** give publication a small provider slot (an existing `createFunctionPort`) that the three root files bind at load. Workflows import the slot from `frameworks/publication/public.js`. Then move the five workflows. Publication internals stay root.
- **Part B (C168-C174, RF06-F03, separate approval):** repoint publication's own ~30 outbound edges so the three files can move into `frameworks/publication`. This is what retires the root shims in section 5. It is not needed for the goal.

## 2. Inventory

Owner column is from OWNERSHIP_DECISIONS. "FW" means a framework copy exists (root file is a shim); "API" means the name is exported from that owner's `public.js`. Checked by name search in `frameworks/*/public.js` and `framework-to-framework/*/public.js`.

### 2.1 Imports of the five publication-related modules (what the workflows pull in)

| Importer (owner) | Module | Names | Target owner | State |
|---|---|---|---|---|
| opening-entry (application) | pvp-output | prepareOpeningEntryOutput | publication | root, no API |
| opening-entry | publication-outbox | queueTurnPublications | publication | root, no API |
| opening-entry | publishing | deliverQueuedTurn | publication | root, no API |
| opening-cohort-runner (application) | pvp-output | prepareOpeningCohortOutput | publication | root, no API |
| opening-cohort-runner | publication-outbox | queueTurnPublications | publication | root, no API |
| opening-cohort-runner | publishing | deliverQueuedTurn | publication | root, no API |
| session-opening-runner (application) | assembly-planning | assemblyHasHistory | application | root, moves in Part A |
| session-opening-runner | assembly-publications | deliverVerifiedAssembly | application | root, moves in Part A |
| opening-flow, session-opening-recovery | (application siblings, session/world/operations public) | already via `frameworks/*/public.js` | | no work |

### 2.2 Outbound imports of assembly-planning and assembly-publications (application-owned)

| Importer | Module (names) | Owner | State |
|---|---|---|---|
| assembly-planning | assembly-context (assemblyInputFingerprint, assemblyPlanFreshness, certifyAssemblyPlan, hookHash, assemblySourceError, assemblyHookSelection) | session | FW; API has only hookHash, assemblySourceError |
| assembly-planning, assembly-publications | assembly-state (assemblyPlanHash; assemblyHash, assemblySlots, legacyAssemblyState, assemblyDeliverySummary) | session | root only, no API |
| assembly-planning | session-opening (inspectSessionOpening, rebindSessionOpeningRefresh) | session | FW; not on session API |
| assembly-planning, assembly-publications | city-calendar (indexWorldEvent) | world | FW; API on world/public.js |
| assembly-publications | operational-metrics (measureNative, measureStage, operationalMetrics) | operations | FW; API on operations/public.js |
| assembly-publications | pvp-output (prepareAssemblyOutput), publication-outbox (queueTurnPublications), publishing (deliverQueuedTurn) | publication | root, no API |
| assembly-publications | kernel/errors | kernel | fine |

### 2.3 Outbound imports of pvp-output.js (publication-owned, 30 root modules)

Records are the active `from=pvp-output` records (all RF06-F03 except noted).

| Owner | Modules (names) | State | Records |
|---|---|---|---|
| session | scene-continuity (currentScene); conversation-principal (conversationPrincipal); assembly-state (assemblyOrientation); assembly-context (assemblyHookSelection); session-opening (assertSessionOpeningPublication); action-continuation (renderContinuationNotice) | FW for first two plus assembly-context, session-opening; API: currentScene, conversationPrincipal only. Pair `publication--session` ADOPTED (port `publicationSessionEvidence` exists) | 7a7dbf03, 156d4644, 7686b0d3, 41890ada, 50b2669b, 83897cce |
| world | city-calendar (indexWorldEvent); director (validatePostTurnStateReview) | FW + API for indexWorldEvent; director root. Pair `publication--world` ADOPTED | 5e97e751, d0453024 |
| knowledge | epistemic (activeEvidence, objectiveEvidence, evidenceType) | FW + API. Pair `knowledge--publication` PROPOSED_NO_API | c54a120c |
| character | character-observation (5 names) | root copy; framework copy lives in `world/contracts`. Pair `character--publication` PROPOSED_NO_API | 47196787 |
| daggerheart | pvp-authorship (pvpProjection, validatePvpClause); pvp-fear-moves; native-notice; native-environment-output | root, no API. Pair `daggerheart--publication` ADOPTED | 56ad3559, ba44d4fb, 8563ccbf, 9a5b072f |
| narrative | gm-world-narrative, nonmaterial-grammar, fresh-npc-authoring, fresh-scene-authoring, scene-description, scene-fiction-authority, narrative-authority, narrative-tasks, narrative-completeness, narrative-artifacts | root, no API. Pair `narrative--publication` PROPOSED_NO_API | 42baf831, 3c74a1fd, 9ee65c50, 0dfba4b3, 61a0d2aa, ae41fcc9, 0fd717a2, 30dc856d, dc182f30, b1e843a5 |
| intent | gm-arbitration-output (nativeGmNotice, nativeGmNotices) | root. Pair `intent--publication` PROPOSED_NO_API | a10a9a1f |
| operations | operational-metrics, turn-trace-context | FW + API. Pair `operations--publication` PROPOSED_NO_API | eae4bddf, b51856b8 |
| discord | discord/chunking (splitDiscordText) | API exists. Pair `discord--publication` CONTRACT_ONLY_UNWIRED | 101734f0 |
| publication (same owner, no record) | lifecycle-output, native-hook-output, native-outcome-output, handout | root; move with publication | - |
| cycle edges | pvp-authorship, pvp-fear-moves, action-continuation, native-notice, native-outcome-output, fresh-scene-authoring, scene-fiction-authority, narrative-authority/tasks/completeness/artifacts, native-environment-output, gm-arbitration-output | CYCLIC_IMPORT_EDGE | 1e6edc87, 3b05e55d, 75210e2b, 2105dd96, aee88912, cca63f68, 54775b89, 482b3115, 32e40efe, c552ecf3, c2812738, 382f8c56, dd8fe1b3 |

### 2.4 Outbound imports of publishing.js and publication-outbox.js

| Importer | Owner: modules (names) | State | Records |
|---|---|---|---|
| publishing | discord: chunking, privacy (assertGmOnlyChannel, assertPlayerPrivateChannel) | privacy has no API | 31284b1e, cbde0db8 |
| publishing | world: simulation (simulationOverview, acknowledgeSimulationHook), city-calendar | simulation API partial | cb8bec10, 0e2a325f |
| publishing | knowledge: epistemic, disclosure-authority (factVisibleTo) | disclosure-authority has FW, not on knowledge API | 34b7483f, 1d98bff4 |
| publishing | operations: failure-trace, operational-metrics, turn-trace-context | failure-trace root only | de3d7490, 7d9836de, de118f06 |
| publishing | external capability (discord.js AttachmentBuilder) | EXTERNAL_CAPABILITY_OWNER | 2f85e645 |
| publication-outbox | discord chunking; daggerheart pvp-authorship; operations: operational-metrics, turn-latency, turn-trace-context; knowledge: narrative-memory; narrative: narrative-completeness, narrative-director-source | turn-latency and narrative-* root only | d5dbff2d, 35c3c840, 993e2b22, c4caa6a6, 8262ab7b, 061ae93b, dc5f7c23, 20f53352; cycles b8ed5e0a, c0bf9f16, 7a3fbb1e, 227e7833 |

## 3. Classification

- **(a) Reachable through an owner's public.js: repoint.** Valid only for application-owned consumers (the workflows and assembly-*). Publication-owned root files must still use ports for any other owner.
  - indexWorldEvent (world), measureNative/measureStage/operationalMetrics/openingErrorCode (operations), hookHash/assemblySourceError (session): already repointable.
  - Needs a one-line owner export first (same-owner, mechanical): assembly-context and assembly-state names, inspectSessionOpening, rebindSessionOpeningRefresh on `frameworks/session/public.js`. assembly-state is root-only, so its framework copy is a prior same-owner move (check `frameworks/session` first).
- **(b) Needs a consumer-owned port plus adapter.** Every cross-owner edge from pvp-output, publishing and publication-outbox (section 2.3 and 2.4), because their consumer is the publication framework. Ports go in `frameworks/publication/contracts/`. Adopted pairs: `publication--session`, `publication--world`, `daggerheart--publication`. Pairs to adopt (PROPOSED_NO_API): `knowledge--publication`, `narrative--publication`, `operations--publication`, `intent--publication`, `character--publication`. To wire: `discord--publication` (CONTRACT_ONLY_UNWIRED).
  - Part A needs no port or adapter: the publication provider slot is publication's own export and the consumer is an application workflow.
- **(c) Constants read at module load.** None found among the imported names: every cross-owner import is a function. Two are singleton objects, `operationalMetrics` and `turnLatency` (identity must be preserved; function ports forward functions only). Treat them as call-time object use: see owner decision D3. Each Part B slice must still run the uncomposed `import-all` check, since a top-level use would turn an edge into (c).
- **(d) Cycles and private API.**
  - IMPORTS_PRIVATE_API: all workflow edges in 2.1 and 2.2 (Part A removes them).
  - `pvp-output` <-> `publication-outbox` (bindOutputPublication etc. flow one way, queue the other). Same owner; resolved by moving both together in C174.
  - `pvp-authorship` re-exports `assertPvpOutput` from `pvp-output` (daggerheart file depending on a publication file). Owner decision D2.
  - `action-continuation` imports `prepareContinuationOutput` from `pvp-output` while `pvp-output` imports `renderContinuationNotice` from it. Owner decision D2.
  - The narrative-*, native-notice, native-environment-output, gm-arbitration-output cycle edges are reached through pvp-authorship, so they clear with the D2 resolution.

## 4. Slice sequence

Common rules: playbook per-slice procedure; ratchet RF04 exit 0; no records added to TRANSITIONS.json. Test names `rf04-f06-cNN.test.mjs` (two digits, per the playbook note for C100+). Root files must still re-export or be removed in the same slice so existing importers keep working.

### Part A: publication slot and workflow moves (goal)

**C163 Publication opening egress slot.**
- Files moved: none. Modified: `pvp-output.js`, `publication-outbox.js`, `publishing.js` (append `bind` at file end), `opening-entry.js`, `opening-cohort-runner.js`, `frameworks/publication/public.js`, `bot/tests/ai-gm-2026-10/compose-startup.mjs`.
- Ports added: `frameworks/publication/contracts/opening-egress.js`, `createFunctionPort(['prepareOpeningEntryOutput','prepareOpeningCohortOutput','prepareAssemblyOutput','queueTurnPublications','deliverQueuedTurn'])`, exported from publication public.js. Provider slot bound by the three root files at load.
- Adapters: none. Initializer: none (binding is at module load); compose-startup must import the three roots.
- Retires: e95ac454, 5e9f428a, d8f9bb54 (opening-entry); 4b9d5741, ed5a20d5, 66bdb933 (opening-cohort-runner).
- Risks: fail-closed if a test imports a workflow without the roots (add `compose-startup.mjs`); a binding at load must not import cycle-prone modules. Decision D1.

**C164 Repoint assembly-planning and assembly-publications.**
- Files modified: both files, `frameworks/session/public.js` (export names listed in 3(a)), plus a same-owner move of assembly-state into session if no framework copy exists.
- Ports/adapters/initializers: none. The slot from C163 covers prepareAssemblyOutput, queueTurnPublications, deliverQueuedTurn.
- Retires: 4db4d184, c3c18fca, 99fda444, c393f28f (assembly-planning); c1dc065f, f13d4ee1, f6eb35e1, 185792d7, a786a88e, eda2e079 (assembly-publications).
- Risks: exporting assembly-state from session widens the session public surface (review names only); inspect `rebindSessionOpeningRefresh` for hidden db coupling.

**C165 Move assembly-planning and assembly-publications to `application/workflows/`.**
- Files moved: both. Add `application/workflows/public.js` exports; repoint `commands.js` and `session-opening-runner.js` imports; leave no root shim unless a test still imports the old path.
- Retires: a2fb1a12, b1602366 (LEGACY_MODULE_LOCATION, RF05-F05).
- Risks: `commands.js` and tests import the old paths. Check `assembly-delivery.js` (application-owned) is not an unlisted dependency.

**C166 Move opening-entry and opening-cohort-runner.**
- Files moved: both; export from workflows public.js; repoint importers (check `grep` before the move).
- Retires: 1e3110ca, 0193c98b.
- Risks: importers outside the five (opening-flow only, expected).

**C167 Move session-opening-runner, session-opening-recovery, opening-flow.**
- Files moved: all three, in dependency order (runner, recovery, flow); repoint `index.js` and `commands.js`.
- Retires: 934ec472, 626dd513, 41b258b6, plus 596382ba (index.js -> session-opening-runner).
- Risks: `index.js` startup wiring and compose-startup mirror; recovery imports runner functions (`sessionOpeningFlight`) so keep the exports. Ends Part A with the five workflows in `application/workflows` and a `public.js`.

### Part B: publication internals (RF06-F03; optional for the goal, required for section 5)

Each slice adds consumer-owned ports in `frameworks/publication/contracts/`, one adapter per pair, one initializer in `application/composition/` (called in `index.js` and mirrored in `compose-startup.mjs`), and where the provider is root-only a provider slot bound by that root file.

- **C168 Operations edges:** move `turn-latency.js` and `failure-trace.js` into `frameworks/operations`; adopt `operations--publication`; ports for metrics/trace/latency/failure. Retires de3d7490, 7d9836de, de118f06, 993e2b22, c4caa6a6, 8262ab7b, eae4bddf, b51856b8. Decision D3.
- **C169 Session and world edges (existing adopted pairs):** extend `publicationSessionEvidence` and `publicationWorldReceipts` (or add siblings) for currentScene, conversationPrincipal, assembly-*, session-opening, indexWorldEvent, validatePostTurnStateReview, simulation hooks. Retires 7a7dbf03, 156d4644, 7686b0d3, 41890ada, 50b2669b, 5e97e751, d0453024, cb8bec10, 0e2a325f.
- **C170 Knowledge edges:** adopt `knowledge--publication`; epistemic, disclosure-authority, narrative-memory. Retires c54a120c, 34b7483f, 1d98bff4, 061ae93b. Needs disclosure-authority exported from knowledge API first.
- **C171 Daggerheart edges and the cycle:** native-notice, pvp-fear-moves, native-environment-output through `daggerheart--publication`; resolve the `assertPvpOutput` and `prepareContinuationOutput` cycles (D2). Retires 56ad3559, ba44d4fb, 8563ccbf, 9a5b072f, 83897cce, 35c3c840 and cycle ids 1e6edc87, 3b05e55d, 75210e2b, 2105dd96, 382f8c56, b8ed5e0a.
- **C172 Narrative, intent, character, discord edges:** adopt `narrative--publication`, `intent--publication`, `character--publication`; wire `discord--publication`. Retires the section 2.3 narrative/intent/character/discord ids, 31284b1e, cbde0db8, d5dbff2d, dc5f7c23, 20f53352, and remaining cycle ids. Largest slice; split by owner if the ratchet shows more than one coupled group.
- **C173 Same-owner publication consolidation:** move `lifecycle-output`, `native-hook-output`, `native-outcome-output`, `handout` into `frameworks/publication` (native-hook-output pulls `city-constraints` and `scene-continuity`, so it needs the session/world ports from C169 first).
- **C174 Move pvp-output, publication-outbox, publishing into `frameworks/publication` with a real public.js.** Slot exports become real functions; workflows stay unchanged. Retires dfdbd9db, 4083f213, 741afbb1, 2f85e645 (EXTERNAL_CAPABILITY_OWNER may need its own decision), c0bf9f16, 7a3fbb1e, 227e7833.

## 5. Root shims unblocked

Counts are root importers in `bot/src/*.js`; tests and tooling were not audited.

| Shim | Edges from the in-scope modules | Other importers remaining | Result |
|---|---|---|---|
| city-calendar | assembly-planning, assembly-publications (C164); pvp-output, publishing (C169) | about 25 (commands, db, state, many narrative-*) | Not removable; four edges cleared |
| city-constraints | none direct; reached via native-hook-output (C173) | 12 | Not unblocked by this sequence |
| conversation-principal | pvp-output (C169) | 21 | One edge cleared |
| disclosure-authority | publishing (C170) | 5 (narrative-authority-context, narrative-clauses-v9, narrative-integrity, scene-description, scene-fiction-context) | Closest to removal; the other five are narrative-owned |
| epistemic | pvp-output, publishing, lifecycle-output (C170, C173) | 10 | Edges cleared |
| scene-continuity | pvp-output (C169), plus action-continuation, native-* via C171 | about 30 | One main edge cleared |

None of the six becomes removable from this sequence alone; Part A unblocks only the assembly-* city-calendar edges. Part B removes publication's share. The remaining importers belong to other owners' slices.

## 6. Owner decisions (not mechanical)

- **D1. Provider slot bound by legacy root files (C163).** Accepting a temporary slot bound at module load, instead of waiting for Part B, lets the workflows move now. Slot disappears in C174. Alternative: block the five workflows until Part B finishes.
- **D2. Who owns `assertPvpOutput` and `prepareContinuationOutput`.** Today a daggerheart file re-exports from a publication file, and a session/daggerheart file imports publication output preparation. Choose: move those functions to publication and keep the render function as the port, or invert with a port from publication. Affects the cycle ids in C171.
- **D3. Cross-cutting telemetry singletons** (`operationalMetrics`, `turnLatency`, `failureTrace`) used by publication. Choose between a function-port surface for the few methods used, or allowing the publication framework to import `frameworks/operations/public.js` as a documented exception. Not decidable mechanically.
- **D4. `EXTERNAL_CAPABILITY_OWNER` for discord.js `AttachmentBuilder` in publishing (2f85e645).** Needs a ruling on whether publication or discord owns the attachment construction.
- **D5. Pair adoption scope.** Five pairs in Part B (`knowledge`, `narrative`, `operations`, `intent`, `character` with `publication`) each need contract text approved before adoption.
