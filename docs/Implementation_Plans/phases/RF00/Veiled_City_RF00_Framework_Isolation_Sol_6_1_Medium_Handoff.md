# Veiled City — RF00 Framework Isolation
## Codex implementation plan

**Repository:** `https://github.com/KeshireTheChaotic/Veiled_City`  
**Development baseline branch:** `codex/clean-ai-gm-2026-10`  
**Initiative:** `RF` (refactoring), phases `RF00`–`RF07`  
**Type:** Architecture and implementation refactor, NOT an authorization to deploy, push, merge, or change gameplay.  
---

## 0. Mission and non-negotiable definition of done

Reorganize the Veilkeeper Node.js application into **strictly separated, explicitly labeled framework directories**. Each module has **exactly one framework owner**. Any code coordinating **two distinct frameworks** belongs in `bot/src/framework-to-framework/<framework-a>--<framework-b>/`, with the pair names alphabetically ordered. Cross-framework orchestration involving three or more frameworks belongs in `bot/src/application/workflows/`, which composes existing pair integrations and MUST NOT accumulate mechanics, narration policy, or mixed domain implementations.

This is a **behavior-preserving modular-monolith refactor**. Keep a single Discord-bot deployable and the current runtime, content model, Node ESM behavior, SQLite database and native Daggerheart authority. Move files first; only decompose or change implementations where essential to establish genuine boundaries. No cosmetic organization is complete if imports and domain authority remain entangled.

**Protect absolutely:** Audience-First, Creative-First, Agency-Preserving GM behavior; owner control of PC declarations and choices; source-qualified narrative; audience/privacy boundaries; independently motivated NPCs and active world; truthful Daggerheart adjudication; Fear, Hope, dice and resource semantics; SQLite durability; atomic receipts; idempotent Discord publication; saved-state readers and recovery. Never let the AI writer grant mechanical outcomes, canon, or consent.

### Scope and evidence at handoff

`bot/src/commands.js` (~202 KiB), `db.js` (~179 KiB), `gm.js` (~138 KiB), `pvp-fear-moves.js` (~79 KiB), `pvp-output.js` (~64 KiB), `simulation.js` (~58 KiB), `index.js` (~52 KiB), and `world-narrative-bridge.js` (~48 KiB) are special coupling hotspots. These are **audit snapshots**, not counts to hard-code into test assertions. Recalculate from actual checkout before implementation.

`bot/package.json` uses `"type": "module"`, Node `>=22.16.0`, startup `node src/index.js`, and register `node src/register-commands.js`. Preserve the externally visible commands and paths, adapting thin entrypoint wrappers if necessary. The current README identifies SQLite schema **460**; verify its value at actual HEAD and keep schema/storage unchanged unless an explicitly authorized migration is unavoidable.

## 1. Mandatory source reading and operating rules

Before touching production code:

1. Inspect actual `git status`, HEAD, branch and uncommitted changes. Never overwrite a dirty worktree or reset/rebase/force-push it. Anchor every report to the actual SHA; the inspected SHA above is an initial reference, not a substitute.
2. Read these in full, honoring their precedence: `docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md`, `content/ENGINE/AI_GM_CONSTITUTION.md`, `docs/Implementation_Plans/README.md`, `docs/Implementation_Plans/CODEX_START_HERE.md`, `docs/Implementation_Plans/TEST_PROTOCOL.md`, `docs/Implementation_Plans/TEST_EXECUTION_NO_POLL.md`, `docs/Implementation_Plans/DECISION_GATES.md`, `docs/Implementation_Plans/CURRENT_SOURCE_CROSSWALK.md`, and relevant current phase/feature ledgers. Check whether each path is present at actual HEAD; report missing references without fabricating replacements.
3. Read `bot/package.json`, actual import/export definitions, relevant `docs/Setup_and_Scope` files, and actual `bot/sql/schema.sql` before drafting framework boundaries.
4. Test launches: **no watching or polling**. Use a single blocking execution per frozen feature batch; if detached, do useful independent work and read its terminal result only at a natural checkpoint. Record genuine exit status; running is not passed.
5. Do not run paid provider calls, access production databases, trigger CI, deploy, restart production, push, open/merge PRs, or incur provider costs without explicit additional authorization. Offline checks must use disposable temporary SQLite, mocked provider/Discord, and deterministic controlled dice/clock.
6. Ask the owner before imposing **new** creative/narrative constraints, reducing NPC autonomy, forcing pacing, changing rules, or altering behavior. Isolate a local hold and continue safe unrelated RF work. Critical blockers affecting consent, private knowledge, state/receipt integrity or uncontrollable risk must stop the affected action.


## 2. Target source topology

```text
bot/
  src/
    index.js                       # thin stable executable entrypoint
    register-commands.js           # thin stable registration entrypoint
    bootstrap/                     # startup wiring/config construction
    kernel/                        # ONLY demonstrably domain-agnostic primitives
    frameworks/
      ai-provider/
      character/
      content/
      daggerheart/
      discord/
      intent/
      knowledge/
      narrative/
      npc/
      operations/
      persistence/
      publication/
      session/
      world/
    framework-to-framework/
      daggerheart--narrative/
      daggerheart--world/
      discord--daggerheart/
      discord--publication/
      discord--session/
      intent--daggerheart/
      knowledge--narrative/
      narrative--world/
      npc--world/
      persistence--publication/
      session--world/
      ...                           # only observed, justified actual pairs
    application/
      composition/                  # dependency injection and wiring
      workflows/                    # >2 framework orchestration, thin only
  scripts/                          # backwards-compatible command wrappers
  tooling/                          # new categorized source for tooling
  tests/ai-gm-2026-10/             # fresh feature-local RF tests
  sql/                              # existing schema, unchanged by default
```

Framework internals should adopt only warranted subfolders: `public.js`, `README.md`, `contracts/`, `domain/`, `services/`, `internal/`, `adapters/`; avoid empty, ritualistic scaffolding. `framework-to-framework/<a>--<b>/` may have `public.js`, `contract.js`, `<a>-to-<b>.js`, `<b>-to-<a>.js`, `source-validation.js` as justified. No generic omnibus `integration/`, `common-domain/`, or `utils/` folder. Do not create unused pairs.

### Provisional framework ownership, subject to RF00 verified inventory

| Framework | Exclusive responsibility | Source candidates for classification (not wholesale-move instructions) |
|---|---|---|
| `ai-provider` | OpenAI client adapter, retries, request/response transport, prompt-cost budget | `prompt-budget.js`, provider call portions of `gm.js` |
| `character` | Character data, advancement, appearance, import/export, owner-authored descriptions | `character-system.js`, `character-export.js`, `character-observation.js` |
| `content` | Content packages, static catalogs, loaders/verification | `content.js`, `content-packages.js` |
| `daggerheart` | SRD, house rules, native rolls, attacks/defense, Fear, PvP mechanics, feature handlers | `dice.js`, `rules-srd.js`, `combat.js`, `native-feature-*.js`, `pvp-damage.js`, `pc-death.js` |
| `discord` | Discord gateway, command transport/schema, interaction lifecycle, privacy of channels, transport voice | `discord/*`, `voice.js`, command transport segments |
| `intent` | Authenticated utterance interpretation, typed intents, dependencies, arbitration proposals | `typed-intents.js`, `ai-intents.js`, `gm-unified-arbitration.js`, `scene-intent-board.js` |
| `knowledge` | Canon/evidence, epistemic state, memory, provenance, subjective knowledge, relationship records | `epistemic.js`, `context-memory.js`, `entity-memory.js`, `relationship-state.js` |
| `narrative` | Fiction authoring, scene prose, portrayal, narrative authority, narration validation | `narrative-writer-v9.js`, `narrative-authority.js`, `scene-fiction-authority.js`, `portrayal.js` |
| `npc` | NPC goals, cognition, motives, beliefs, conversations and autonomous intent | `npc-cognition.js`, `npc-conversations.js`, `simulation-motivation.js` (inspect) |
| `operations` | Logging, telemetry, diagnostics, failure-tracing, metrics and latency | `operational-metrics.js`, `turn-latency.js`, `operations/*` |
| `persistence` | SQLite schema, connections, transactions, generic SQL repositories and recovery storage | `db.js`, database adapters, SQL repositories |
| `publication` | Publication contracts/outbox, delivery attempts, acknowledgements, replay reconciliation | `publication-outbox.js`, `native-publications.js` (split by responsibility) |
| `session` | Attendance, assembly, openings, scene presence, spotlight and player response windows | `assembly-*.js`, `opening-*.js`, `session-opening*.js`, `scene-continuity.js` |
| `world` | World Director, factions, civic simulation, environments, world continuity and autonomous activity | `autonomous-world.js`, `director.js`, `city-*.js`, `simulation.js` (split), world/environment definition portions |

**High-risk classification nuance:** A prefix is not an owner. `native-environment-*` often crosses Daggerheart rules and world definitions; divide actual responsibilities into `daggerheart`, `world`, and `daggerheart--world`. `pvp-output.js` combines mechanics, narrative validation and publication; split according to behavior. `gm.js`, `commands.js`, `db.js`, `state.js`, `simulation.js`, `world-narrative-bridge.js` are mixed candidates; do not blindly `git mv` wholesale into a framework. Use the import graph and function-level ownership manifest first.

## 3. Enforced dependency and ownership laws

1. **One source owner**: exactly one owning framework, integration pair, `application`, `bootstrap`, or narrowly qualified `kernel` location. Tests have one corresponding owner/bridge. No implementation module belongs to two places, including aliases containing duplicate business logic.
2. **Framework self-containment**: framework source may import within itself; may use standard/approved external packages and genuinely framework-neutral `kernel` primitives; **must not import another framework's internals, public API, or its framework-to-framework bridge**. Cross-framework ports live as framework-owned interface contracts, fulfilled by injection at composition root.
3. **Exact pair bridges**: each pair integration may import **only the declared public API/contracts** of its two named frameworks, its own local files and neutral kernel. It cannot import a third framework, a second bridge's internals, or application coordinator code. Name pairs alphabetically and expose a controlled `public.js` entrypoint. Integrations own mapping, transaction coordination, event translation and source/audience validation necessary for that pair; no unrelated business rules.
4. **Three-plus orchestration**: `application/workflows/` owns thin workflows combining multiple bridges. It may depend on framework public APIs/ports and bridge public APIs only. It may not become a second `gm.js` or `state.js` catch-all: split workflows by use case, have typed inputs/outputs, deterministic ordering, and tests.
5. **Persistence isolation**: SQLite repositories own SQL, transaction handling, storage mappers and schema compatibility—not world rules, NPC cognition, narration, dice or consent logic. Use framework-to-persistence bridges where domain-to-storage translation actually occurs. Cross-repository transactions retain existing atomic boundaries; never split one authoritative commit into independently committed writes.
6. **Publication isolation**: mechanically authorized evidence and narrative candidate validation do not become transport authority. Accepted outputs, audience entitlements, outbox retries and explicit acknowledgements preserve idempotence. Discord `send` calls live in Discord transport; publication provides delivery envelopes and state contracts via `discord--publication`.
7. **No bypasses**: no `../../../` deep-import escape hatches, import cycles across packages, unreviewed dynamic imports, runtime module-loader tricks, global singletons bridging ownership, copy/paste helpers to silence boundary checks, or broad permanent allowlists. Transitional compatibility shims must have owner, deletion feature and deadline.
8. **Boundary checker**: introduce a fast static import-graph check detecting static imports/exports, literal dynamic imports, relative and aliased imports, permitted public entrypoints, forbidden pair third-party deps, cycles and unclassified files. Flag computed dynamic imports for explicit review; do not claim complete AST coverage if unavailable. Output actionable old path/new owner/forbidden edge reports and machine-readable JSON. Keep transitional violations in a tightly scoped expiring manifest and drive it to **zero** at RF07.

### Minimal architectural example

```js
// frameworks/narrative/contracts/world-evidence-port.js
// An interface contract / documentation type; no world-framework imports.

// framework-to-framework/narrative--world/public.js
// Accepts world and narrative public capabilities, maps verified evidence.

// application/composition/create-veiled-application.js
// Injects narrative's world-evidence port implementation from the bridge.
```

Do **not** invent APIs and claim they exist. Document and implement real contracts only after RF00 import and call-site analysis.

## 4. Phase and feature plan

Use the repository's phase/feature documentation convention while keeping the RF initiative isolated:

```text
docs/Implementation_Plans/Framework_Refactor/
  README.md
  CODEX_START_HERE.md
  FRAMEWORK_OWNERSHIP.csv
  SOURCE_RELOCATION_CROSSWALK.csv
  DEPENDENCY_GRAPH.json
  BRIDGE_REGISTRY.md
  ARCHITECTURE_RULES.md
  PHASE_DEPENDENCIES.md
  phases/RF00/SCOPE.md
  phases/RF00/LEDGER.md
  ... phases/RF07/{SCOPE,LEDGER}.md
  features/RF00-F01/SCOPE.md
  features/RF00-F01/LEDGER.md
  ... one independent SCOPE.md and LEDGER.md per feature ...
```

Create only the currently active phase and feature pairs when starting; the phase plan below serves as the master roadmap. Do not rewrite or overwrite historical `P00`–`P09` records. Every feature ledger: actual base/result SHA, ownership decisions, changed paths, imports changed, runtime/public contracts, exact fresh tests with exit codes, blocked/deferred edges, performance/cost measurements if captured, residual risks, rollback command/path and readiness. Each phase cannot close with unspecified violations; record explicit local holds, not invented successes.

### RF00 — Verified inventory and dependency design (NO implementation moves)

- **RF00-F01 — Checkout baseline:** confirm actual HEAD/status/Node/npm/schema/runtime commands; preserve dirty edits; note P-series in-flight work and coordination conflicts.
- **RF00-F02 — Complete tracked-source inventory:** classify all source JS/JSON, entrypoints, scripts, tests, generated assets, content loaders and schema relations. Produce `FRAMEWORK_OWNERSHIP.csv` with old path, new path, owner, rationale, complexity, public exports, side effects, risk and move phase.
- **RF00-F03 — Import/call graph:** parse static/re-exports/literal dynamic imports; identify reverse-dependency counts, import cycles, global state, module-load side effects, serialization and database coupling. Produce `DEPENDENCY_GRAPH.json`, readable diagrams, violations and `BRIDGE_REGISTRY.md` proposals.
- **RF00-F04 — Contract authority trace:** trace Discord → authenticated intents → GM arbitration → native resolution → persisted receipt → audience-scoped narrative → outbox → actual Discord delivery; distinguish public/private owner/GM lanes and uncommitted proposals.
- **RF00-F05 — Migration sequence and risk gates:** rank packages into low, medium and high coupling; resolve contentious ownership at function level; identify critical saved-state, schema, consent, Fear and source-authority boundaries. Create the relocation crosswalk and phase dependency graph.
- **RF00-F06 — Baseline evidence and freeze:** record only permissible newly created, changed-code-focused tests for any new audit/tooling code. Existing tests are not permission to run them. Approval is needed only for genuinely new restrictions or actions not already authorized.

**Exit:** all tracked source paths classified, high-risk ownership explicitly stated, real dependency map available, zero runtime behavior changed.

### RF01 — Architecture skeleton, ports and enforcement

- **RF01-F01:** add required directory structure, framework README ownership contracts and constrained public API policy; no empty framework contents for show.
- **RF01-F02:** define minimal framework-owned ports and DTO/event schemas for observed dependencies, with source, audience, owner and receipt identity where appropriate.
- **RF01-F03:** establish `application/composition/` dependency injection and thin workflow conventions; prevent cyclic initialization and eager connection creation on module import.
- **RF01-F04:** implement import-boundary checker with unit tests from fresh cases; transitional violations documented and measured, never hidden by a global exemption.
- **RF01-F05:** publish canonical `BRIDGE_REGISTRY.md` (pairs, exact two owners, directions, validation, lifecycle, consumers and tests).
- **RF01-F06:** verify new tooling via changed-code syntax and fresh tests; confirm startup code and behavioral interfaces are unchanged.

**Exit:** architecture rules executable, ownership registries in place, safe pilot migration ready.

### RF02 — Pure and low-coupling framework migration

- **RF02-F01:** isolate only genuinely generic `kernel` utilities (`errors.js` etc. after dependency inspection), preserving exception names/semantics.
- **RF02-F02:** move content catalog/manifest loaders and validate content root/path resolution; keep `content/` data unchanged.
- **RF02-F03:** move operations metrics/logging/diagnostics and preserve diagnostic event shape/timing.
- **RF02-F04:** move pure character import/export/advancement utilities; split any cross-rule or SQLite operations into bridges instead of importing them directly.
- **RF02-F05:** relocate self-contained Discord transport helpers (`discord/chunking.js`, privacy, interaction lifecycle) and stabilize public entrypoints.
- **RF02-F06:** check only newly affected paths and new test fixtures; remove/expire temporary shims established in this phase.

**Exit:** small representative framework moves demonstrate that import enforcement and ESM paths work without behavior changes.

### RF03 — Daggerheart and player-authority boundaries

- **RF03-F01:** isolate SRD/house rules, dice parser, typed rolls, mechanical receipts, resource costs and rule references.
- **RF03-F02:** isolate combat, encounters, damage, defenses, conditions, native features and bounded adversary handler catalog. Verify all current feature dispositions and identifiers remain unchanged.
- **RF03-F03:** isolate PvP offers/reactions, consent-driven actions, Fear notices, fear interrupts, player spending and death options; distinguish mechanical logic from Discord menus and narrated outputs.
- **RF03-F04:** divide `native-environment-*` between `world`, `daggerheart` and `daggerheart--world` by exact responsibility; never move world fact creation into mechanics or move mechanical checks into world narration.
- **RF03-F05:** implement `intent--daggerheart`, `daggerheart--narrative` and `discord--daggerheart` adapters where observed. Require source-pinned requests and receipt-backed responses.
- **RF03-F06:** fresh contract tests: duality dice natural values, pre-roll Difficulty/stakes, declared Fear spending, owner choices, damage/Armor, no fabricated results, PvP permission and successful/failed retry boundaries.

**Exit:** mechanics independently encapsulated, external request flows pass through contracts, native outcome and ownership semantics preserved.

### RF04 — World, NPC, knowledge and session boundaries

- **RF04-F01:** move world civic services, World Director cadence, environment definitions, world event modeling and autonomous updates; no real-time wall clock mutation of campaign state.
- **RF04-F02:** isolate NPC cognition, subjective beliefs, autonomous motivation and dialogue state, retaining the distinction between belief, canon and audience entitlement.
- **RF04-F03:** isolate memory/evidence/canon, narrative provenance and relationship state; keep provisional inventions from being silently promoted to established facts.
- **RF04-F04:** isolate session attendance, assembly, opening, scene presence, spotlight/action windows, late arrivals and recovery.
- **RF04-F05:** implement `npc--world`, `knowledge--narrative`, `session--world`, `narrative--world` (split current `world-narrative-bridge.js`) and other verified bridges.
- **RF04-F06:** protect privately scoped hooks, relationships, GM secrets, character-specific information and deliberately uncommitted fiction through every bridge.
- **RF04-F07:** fresh changed-code contract tests for scoped knowledge, non-forced attendance/co-location, simulation receipt authority, narrative world evidence and replay.

**Exit:** world can evolve independently; NPCs remain characterful; session and knowledge rights are not collapsed into world or narrative.

### RF05 — Intent, narrative, provider and GM application orchestration

- **RF05-F01:** isolate model transport/client, retry behavior, cost/prompt budgets and generation feedback from GM domain policies; preserve configured model-selection behavior.
- **RF05-F02:** isolate semantic interpretation, typed intents, action/span dependencies, arbitration proposal schemas, scene intent board and decision review.
- **RF05-F03:** isolate narrative authoring, source-bound composition, pacing, dialogue/portrayal, output integrity and audience validation. Do not reduce improvisation or impose new creative prohibitions.
- **RF05-F04:** decompose `gm.js` by **responsibility**, not arbitrary line count. Keep GM decision policy in its owning framework, move external framework execution to pair bridges, move turn-level multi-party coordination to small use-case workflows.
- **RF05-F05:** decompose `state.js` and `turn-orchestration.js` into intent validation, transactional native commit workflow, narration packaging and post-turn review coordination. Preserve exact accept/propose/commit distinction and retry semantics.
- **RF05-F06:** fresh contract tests for owner intent ownership, no narrated success before adjudication, audience-private partitioning, missing/failed provider fallback behavior, deterministic idempotence and prompt request multiplicity (measured, not guessed).

**Exit:** no all-knowing GM importer reaches into all frameworks; one cohesive turn workflow remains but uses injected contracts.

### RF06 — SQLite, publication, Discord commands and composition

- **RF06-F01:** capture storage API/schema/transaction map, serialization shapes, historical readers and foreign key/receipt behavior; keep actual SQLite schema unchanged by default.
- **RF06-F02:** incrementally decompose `db.js` into connection, transaction coordinator and SQL-focused repositories, with domain-to-storage mappings in `persistence--<framework>` pairs as needed. Maintain a transitional `VeiledDB` public facade until all callers migrate. Do not duplicate SQL operations or independently commit correlated effects.
- **RF06-F03:** decompose `publishing.js`, `publication-outbox.js`, `native-publications.js`, `pvp-output.js` publication fragments into exact ownership; use `discord--publication` and `persistence--publication` contracts. Preserve uncertain-delivery recovery safeguards.
- **RF06-F04:** decompose `commands.js` and `command-definitions.js`: Discord command registration/dispatch remains in Discord, framework-specific operations in named integration bridges and workflow/application handlers, not within a monolithic command switch.
- **RF06-F05:** reduce `index.js` to stable startup + `bootstrap` + app composition; keep original executable entrypoints, npm scripts, env variable names and default path resolution functioning.
- **RF06-F06:** newly authored changed-code tests for synthetic SQLite transactions/recovery, retry/restart/outbox acknowledgements, duplicate Discord interactions, private channel delivery and pure command-schema dispatch; no live service calls.
- **RF06-F07:** remove old facade and shims only after the reverse import graph confirms zero active callers; retain externally significant compatibility interfaces and historical saved readers.

**Exit:** high-coupling hubs decomposed with no schema drift, loss of state authority, output privacy breach or duplicate publication.

### RF07 — Complete architecture gate and technical handoff

- **RF07-F01:** categorize new tooling under `bot/tooling/`; retain thin `bot/scripts/` compatibility wrappers only for currently supported CLI/package commands; leave prohibited historical tests and fixtures intact.
- **RF07-F02:** update *current* README/architecture, module maps, setup references and active crosswalk links; record historical docs as historical rather than rewriting evidence or old status claims.
- **RF07-F03:** remove all transitional cross-framework exceptions and expired shims. Verify every active source file classified, no cross-framework deep imports, no third-party bridge imports, no architecture cycles, no unused pair folder.
- **RF07-F04:** run the permitted union of **fresh RF tests for only source changed in this initiative**, with one terminal result per batch; changed JS/MJS syntax checks and import-checker gate. No broad legacy validation, unapproved CI or live Discord test.
- **RF07-F05:** check stable entrypoint, npm command strings, content paths, SQLite schema checksum/version, native feature catalog count/status, contracts, visibility/recovery flows and low-cost performance measures against the actual baseline. Unverified live behavior must remain marked unverified.
- **RF07-F06:** provide final source relocation crosswalk, ownership/bridge graph, measured violations (`0` required to claim architectural completion), concise file diff overview, phase+feature ledgers, test exit evidence, open holds and release-status warning. Return branch and exact final SHA. No deployment/merge without owner authorization.

**Exit:** no unowned modules, prohibited dependencies or unresolved anonymous integration points; fresh changed-code gates pass; runtime equivalence claims never exceed the actual evidence.

## 5. Migration transaction pattern and feature sizing

For each feature, follow exactly this pattern:

1. Freeze **scope** (target files and expected ownership); capture old imports/exports, public behavior, database interactions and graph edges. Prefer a self-contained batch of ~1–12 files; for giant modules use one cohesive functional responsibility per feature. The number is guidance, not a speed/size requirement.
2. Write fresh focused tests for **currently changed production code**, building fixtures from newly constructed minimal examples; never open legacy tests as reusable templates.
3. Stage a pure physical move (`git mv`) and update path references in one reviewable change. Do not mix unrelated algorithm changes, source-authority changes or formatting churn.
4. Where a file has mixed owners, extract one behavioral slice into the right framework or bridge, keeping the original public facade until callers migrate. Changes must preserve input/output, exceptions, event order, receipts, transactions and audience.
5. Run the new import checker and `node --check` for changed JS/MJS; run one new feature-test batch under the existing protocol; record actual exit code and counts. Stop affected migration on meaningful regressions, not entire initiative if unrelated safe work exists.
6. Update `SOURCE_RELOCATION_CROSSWALK.csv`, dependency graph, bridge registry, phase+feature ledgers and tracked transitional violation count.
7. Remove compatibility shim only after all calls have been migrated and a fresh test covers final import paths. Avoid an unbounded second architecture of wrappers.

Use deterministic AST/lexer-backed codemods where suitable, with diff review, not naive global search-and-replace. Ensure ESM `.js` extensions, JSON import treatment, relative fixture paths, resource and content path resolution, side-effect initialization, `import.meta.url`, Node package scripts and bundled Docker entrypoints remain correct.

## 6. Success gates and measurements

| Gate | Pass condition |
|---|---|
| Ownership | 100% of active `bot/src` source and support assets assigned exactly one owner; no unexplained unclassified files |
| Boundaries | 0 illegal framework imports; 0 pair-to-third-framework imports; 0 inter-package cycles; 0 perpetual exception allowlist entries |
| Integration | Every identified bidirectional cross-framework interaction is located in a correctly named pair integration, with typed/validated contract and accountable owner |
| Main source hubs | Large mixed modules decomposed by responsibility; thin facade exceptions documented and justified, never counted as complete without actual decoupling |
| Mechanics & player authority | No changed rules, fabricated dice, unauthorized resource spend, PC decisions or consent; receipts remain native-owned |
| Privacy & narrative | GM/private/character-only content does not cross audience boundaries; narrative writer remains expressive, organic and non-authoritative |
| Persistence & replay | SQLite schema/storage and historical readers compatible; authoritative effects and outbox retries/acks remain atomic and idempotent |
| Runtime surface | `npm` entrypoint script strings, slash command behavior, env variables, content resolution and deployment paths intentionally preserved |
| Tests | Fresh RF tests for affected production code pass with captured exit status; changed-file syntax and boundary checks pass. No claims of full release qualification from these tests |
| Efficiency | Record actual import graph size, changed loc/paths, detected cycles/violations, test counts, and measured offline invocation/performance deltas where available; no invented cost savings |

### Minimum fresh test scenarios (split by the feature that changes the code)

- Import graph: permitted intra-framework import; forbidden direct cross-framework import; allowed 2-framework bridge; rejected third-framework bridge; detected cycle; literal dynamic import; unknown/unowned path.
- Complete request-to-publication: authenticated owner declaration preserved, proposal validated, native decision recorded, source-pinned narration projected to the correct audience, outbox committed and acknowledged.
- Contradictory private/public evidence must not be revealed; NPC beliefs and uncommitted hooks must not become canon.
- Natural Hope/Fear die outcomes not fabricated; Difficulty/stakes established prior to roll; optional spending explicitly owner-driven; pre-roll Fear events announced.
- Long-running session restart, late attendance, scene presence, uncertain delivery, effect replay and duplicate command cases preserve prior semantics.
- World and NPC autonomy works independently of a player's direct engagement without taking control of PCs or inventing irreversible effects.

## 7. Reporting contract and escalation

At the end of every feature and phase provide a compact factual report:

```text
RF phase / feature:
Git branch / starting SHA / resulting SHA:
Files moved / split / new:
Framework owner(s) and pair bridge(s):
Import violations: starting / ending / known temporary:
Contracts preserved or intentionally changed:
Fresh tests created and executed (command, count, exit code):
Syntax checks and architecture checks:
SQLite schema and saved-state impact:
Private-audience and PC-agency impact:
Actual provider calls/tokens/spend (if measured):
Unverified behavior / risk / rollback:
Local holds / questions requiring owner authorization:
```

**Escalate to owner** for any necessary game-rule or narrative-restriction change; data migration or saved-state breaking change; new provider spend; production DB access; production deployment/restart; CI run or workflow weakening; unapproved push/merge; or a required multi-framework interface change that cannot preserve observable behavior. Do not stop independent safe tasks for a localized hold.

## 8. Codex starting prompt (copy this section into Sol 6.1 Medium)

> You are the **lead architect and implementer** for Veiled City's **RF00 Framework Isolation**. Work on the actual local checkout of `KeshireTheChaotic/Veiled_City`, expected source branch `codex/clean-ai-gm-2026-10` (inspected SHA `f43d002693cb4ee38038b5dbb2c1049de95b3ffd`; verify actual HEAD). Use this handoff as the initiative's master specification.
>
> **First execute RF00 only**: inspect worktree and read the owner AI GM specification, ENGINE constitution, active implementation/test/no-poll/decision-gate documents. Inventory every tracked application file, all imports/re-exports and module side effects, classify each into an exclusive framework or justified integration pair, identify cross-framework and dependency-cycle risks, and generate ownership CSV, relocation crosswalk, import graph, bridge registry and RF phase/feature SCOPE+LEDGER files. Do not move implementation modules or change behavior during RF00.
>
> After RF00 has a complete and internally consistent design, proceed serially through RF01–RF07 with small changes and fresh feature-local tests only. All single-framework code stays in its framework; all two-framework translation and bidirectional work belongs in exactly named `framework-to-framework/<a>--<b>/` packages; three-plus orchestrations belong in thin application workflows. Enforce zero unauthorized imports at the final gate.
>
> Preserve Veilkeeper's creative autonomy and audience-first human GM behavior, every PC's agency, accurate native Daggerheart mechanics, knowledge boundaries, SQLite schema, receipts and retry-safe publication. Never import or run legacy tests, poll test execution, call live provider services, use the production database, trigger CI, push, merge, deploy or restart without separate owner approval. Respect dirty work and other ongoing branches; ask only for genuinely authorization-requiring decisions, recording local holds and continuing unrelated safe work.
>
> At each feature boundary, report true changes, checked imports, fresh test commands/results, exact SHA, unresolved exceptions and rollback. At the final gate report full owner and bridge inventory, zero boundary violations, tested vs unverified behavior, and release authorization status. **Do not claim a source relocation alone constitutes architectural decoupling.**

---

*Prepared from GitHub source and active plan documents inspected on 2026-10-23. Repository was not modified.*
