# VEILKEEPER 2.0 — ASTRA 6 GROUND-UP REBUILD HANDOFF

**Status:** implementation specification / architectural proposal, **not an implemented change**  
**Repository:** https://github.com/KeshireTheChaotic/Veiled_City  
**Baseline branch:** `codex/clean-ai-gm-2026-10`  
**Immutable audit SHA:** `1ba6c7e15db1a66ba34b36336f31437beffe44d6`  
**Audience:** Astra 6, acting as senior architect, game-engine developer, narrative systems engineer, and test engineer.  
**Scope:** a clean replacement of the Veilkeeper bot application, orchestration and AI-facing runtime; semantic preservation/migration of campaign content, persistence, Daggerheart SRD 2.0 + Veiled City house rules, multiplayer security, player-controlled character interfaces, and delivery reliability.

> **Important source limitation:** This handoff was constructed by examining the repository tree (5,662 entries, including 1,077 `bot/src` JavaScript files), the important runtime functions listed below, project policy documents, and implementation ledgers. It is **not** proof that every one of those files was individually read or that any live Discord scenario was executed. Before modifying code, Astra must run a complete dependency, command, schema, and test inventory on the pinned checkout. All line references below are **at the immutable SHA above** and will drift on other commits. All architectural APIs named `context.read`, `action.propose`, etc. are **proposals**, not existing implementations.

---

## 0. DIRECT EXECUTION INSTRUCTIONS TO ASTRA 6

You are tasked with **building a new Veilkeeper runtime from first principles** on a new branch, not cosmetically refactoring the existing `GMService` or adding another narrative compatibility layer. Begin by reading `AGENTS.md`, the five authoritative behavior/spec documents linked in §1, the existing Daggerheart and Veiled City mechanical specifications/content, all command/import/export contracts, and this handoff. Preserve ownership, secrets, canon, dice, persistence and publication invariants. Design for a compelling human-feeling GM first and call native rules only when the fiction actually requires mechanical or authoritative resolution.

**Hard constraint from project owner:** *Drop all specific AI-facing native functions; expose only a small set of generic native functions.* No separate model-callable `roll`, `move`, `enter`, `npc_speak`, `fear_move`, `scene_fiction`, `canon_event`, `combat_attack`, `director_tick`, `create_minor_npc`, etc. All concrete operations, feature identities and rule algorithms belong in versioned, ruleset-owned data/handlers **behind** generic ports. Do not merely rename a large list of specialized model tools. Equally, do not delete specialized mathematical/procedural rules without an equivalent implementation. Domain-specific implementation may exist **internally**, but its public function surface is generic and its decisions cannot be bypassed by the model.

**Required behavior:** A player can have a rich, spontaneous, in-character conversation without emitting any typed intent, state-review grid, scene task, native proposal or other administrative record beyond authenticated conversation, delivery provenance and eligible memory. When an attempt has consequences, use a structured generic proposal and deterministic rules. Fictional intent ≠ successful effect. Spoken testimony ≠ objective fact. Salience ≠ truth. GM awareness ≠ player/NPC knowledge. Player silence ≠ consent.

**Execution constraints:** Work in a new dedicated branch/worktree; preserve baseline unchanged; never run migrations on production DB or deploy to the live bot without separate authorization; retain backups and rollback. Track a phase gate and actual test evidence. Do not report a mock pass as live behavioral qualification. Do not remove legacy functions until their old consumers have been migrated, data compatibility established and replacement parity tests passed. Use the repository's `AGENTS.md` rule of YAGNI, bounded context, independently justified changes, and no pointless reruns.

### Definition of success

Players experience Veilkeeper as an autonomous, impartial, inventive GM rather than a chatbot or rules terminal. NPCs initiate, respond with distinct voices, remember interactions, lie and disagree in character, and pursue independent plans. In a normal social exchange the application makes **one audience-safe language-model call**, without prerequisite schema classification or a second prose rewrite; richer secrets, cross-audience consequences, adjudication, and world planning may justifiably require additional steps. Player autonomy, scope authorization, exact source provenance and Daggerheart outcomes remain uncompromised. Only the engine can commit changes; only authorized publication can disclose results.

---

## 1. THE NON-NEGOTIABLE CORE VALUES AND CONCEPTS

These are **source-derived normative requirements**, not claims of present runtime behavior:

1. **Audience-First:** Tell the scene to the people experiencing it. Show sensory atmosphere, distinctive dialogue, pressure, opportunity and observable consequences; do not recite internal clocks, validator scores or intent labels. Character, party, GM, NPC and spectator viewpoints are different information domains. See [Audience-First specification, lines 5–20](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/docs/Implementation_Plans/AUDIENCE_FIRST_SPEC.md#L5-L20), [52–83](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/docs/Implementation_Plans/AUDIENCE_FIRST_SPEC.md#L52-L83).
2. **Creative-First:** Veilkeeper independently introduces ordinary people, locations, customs, rumors, conflicts and clues. It does not need a player request or human approval for every incidental detail. It must not invent protected canon, supernatural powers or important mechanical consequences by unsupported narration. See [Creative-First, lines 5–29](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/docs/Implementation_Plans/CREATIVE_FIRST_SPEC.md#L5-L29).
3. **Agency-Preserving:** A player exclusively owns their PC's voluntary actions, speech, beliefs, feelings, consent and expenditures; the GM owns the rest of the world, and the rules own adjudicated results. No scripted PC response, false victory before a roll, coerced emotional state, or proxy-PC impersonation. See [Agency-Preserving, lines 7–31](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/docs/Implementation_Plans/AGENCY_PRESERVING_SPEC.md#L7-L31).
4. **Weighted Lore, Facts and Canon:** Establish separate testimony, belief, observation, hypothesis, temporary scene detail, persistent identity, objective fact, and protected campaign canon. Relevance and repetition drive recall, not truth. Verifiable independent events drive eligible persistence; exact authorized workflows drive canon promotion and rules. See [Weighted Lore, lines 5–33](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/docs/Implementation_Plans/WEIGHTED_LORE_FRAMEWORK.md#L5-L33), [50–88](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/docs/Implementation_Plans/WEIGHTED_LORE_FRAMEWORK.md#L50-L88), [146–181](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/docs/Implementation_Plans/WEIGHTED_LORE_FRAMEWORK.md#L146-L181).
5. **Living world, not reactive text completion:** NPCs have distinct wants, fears, relationships, loyalties, capabilities, memories, imperfect knowledge and changing beliefs. Factions can act while offscreen when fictional circumstances allow. Never force irreversible changes across unresolved player response windows. See [owner GM spec, lines 28–52](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md#L28-L52).
6. **Daggerheart as a storytelling engine:** Preserve spotlight-based play, pre-roll stakes/Difficulty, duality dice, actual Hope/Fear, player PC rolls, GM/NPC rolls, costs, damage, recovery, consent/PvP and death rules. Never fabricate dice or move resources outside native authority. See [owner spec, lines 54–64](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md#L54-L64).
7. **Multiplayer fairness and private continuity:** Spotlight is not fixed-turn initiative. Presence/absence, overlapping intentions, character ownership, proxy control, private discoveries and actual acknowledged delivery determine knowledge and opportunities. See [owner spec, lines 66–82](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md#L66-L82).
8. **Human-sounding writing:** No mandatory menus, repetitive questions, generic cliffhangers or repetitive mechanical notices. Reward indirect intent, clever methods and NPC initiative. Treat narration as an experience, not as a serialized policy report. See [owner spec, lines 7–13](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md#L7-L13).
9. **Honest performance/reliability:** Prompt and model budgets should match the task. Fast deterministic access/validation; AI only for interpretation and drama. A failure must not invent state or silently swallow a player's unresolved request. See [owner spec, lines 84–93](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md#L84-L93).
10. **Simplicity is a feature:** Source [AGENTS.md, lines 15–31](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/AGENTS.md#L15-L31) explicitly prioritizes avoiding overengineering. Generic ports should be few, audited and stable; hidden special-case orchestration violates the point of rebuilding.

**Priority rule:** A compelling story has priority *within* authoritative boundaries. Privacy, PC ownership, consent, physical and mechanical consequences, and established canon are not stylistic preferences; they are enforceable constraints. An engaging but unauthorized result should be converted to an offer, attempt, attributed allegation, uncertainty or observable pressure without declaring success.

---

## 2. ROOT CAUSES OF THE CURRENT 'ROBOT GM'

This section identifies **observed implementation coupling**, then the **inferred human-experience consequence**; the latter is not a production measurement.

- **Mandatory classifier before engagement:** [GMService.shouldRespond(), `gm.js:483–548`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/gm.js#L483-L548) may return false for indirect or apparently conversational input; [processPartyTurn(), `index.js:407–565`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/index.js#L407-L565) then returns without a GM response. **Impact:** missed conversational invitations and scenes that feel inert.
- **Monolithic strict transport:** [gmSchema, `gm.js:167–219`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/gm.js#L167-L219) requires narration, typed intents, world additions, events, NPC memories/goals, canon proposals, simulation updates and state review regardless of whether anything mechanical happened. [GMService.runTurn(), `gm.js:623–1020`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/gm.js#L623-L1020) also rejects an authenticated responding turn with empty `player_intents` (around `gm.js:818–835`). **Impact:** expensive form completion instead of natural conversation.
- **Mandatory typed interpretation:** [createPlayerIntentContract(), `player-intent-contract.js:2–65`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/intent/player-intent-contract.js#L2-L65); [persistPlayerIntents(), `typed-intent-persistence.js:64–142`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/intent/typed-intent-persistence.js#L64-L142). **Impact:** simple speech and improvisational narrative are forced through action-adjudication contracts.
- **Storytelling as task coverage:** [coordinateNarrative() / creativeBrief(), `narrative-delegation.js:7–50`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/narrative-delegation.js#L7-L50), [narrativeTasks(), `narrative-tasks.js:8–41`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/narrative-tasks.js#L8-L41). **Impact:** the model is rewarded for handling classified tasks rather than directing a living scene.
- **A second author reconstructs the GM's voice:** [authorNarrativeRequests(), `narrative-authority.js:170–216`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/narrative-authority.js#L170-L216), [prepareAuthorizedTurnOutput(), `pvp-output.js:374–610`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/pvp-output.js#L374-L610). The latter rebuilds `result.narration` from authorized parts rather than simply publishing the original GM draft. **Impact:** duplicated inference and compromised narrative flow.
- **Lexical filters are overbroad:** [validateUnit(), `narrative-authority.js:68–159`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/narrative-authority.js#L68-L159) rejects many PC name/alias references and broad second-person phrasings. [NARRATIVE_V9_INSTRUCTIONS, `writer-contract-v9.js:16–35`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/writer-contract-v9.js#L16-L35) explicitly tells the writer to avoid PC names. **Impact:** stilted NPC address and false holds. The code itself notes bounded tripwires cannot be universal semantic detectors.
- **Place invention coupled to registration and movement:** [createWorldIdentityRules()/establishNativeNarrativeEntity(), `identity-rules.js:7–86`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/world/identity-rules.js#L7-L86) and the V9 writer instructions require location entities for many descriptions. **Impact:** improvised accessible geography is treated as an object-creation transaction. An untraveled door or alley can be scenery without prematurely granting access.
- **World initiative as workflow:** [queueDirectorAfterPartyTurn(), `director-cadence.js:9–32`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/world/director-cadence.js#L9-L32), [runWorldDirector(), `gm.js:1102–1162`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/gm.js#L1102-L1162). **Impact:** a rigid round/scene/downtime planner can miss opportunities for organic in-scene NPC reaction.
- **Repair generates another enormous turn:** [structuredResponse(), `gm.js:418–480`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/gm.js#L418-L480), [runTurn correction, around `gm.js:960–1020`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/gm.js#L960-L1020). **Impact:** poor latency, unnecessary regeneration, and dropping legitimate dramatic details in safe recovery.

Do not erase these findings by layering an additional postprocessor atop V9. **Retire the coupling and retain only the protections it was serving.**

---

## 3. TARGET ARCHITECTURE: SMALL KERNEL, HUMAN GM

```text
Discord event / slash command
        │
        ▼
Authenticated input envelope
(principal, owner/proxy, message, session/scene, visibility, source ID)
        │
        ▼
Audience and context assembler ──▶ scoped facts, testimony, memory, roster,
        │                           known locations, NPC portrayal, mechanics
        │
        ├── ordinary conversation ──────────▶ audience-safe GM model (one call)
        │                                         │
        └── secret-dependent / major world beat ─▶ GM-private dramatic planner
                                                  │ (private reasoning only)
                                                  ▼
                                           eligible observable beat
                                                  │
                                                  ▼
                                           scoped GM writer
                                                  │
                           ┌──────────────────────┴─────────────────┐
                           ▼                                        ▼
                    prose-only segments                     generic action.propose
                    (no effects authority)                 / knowledge.propose
                           │                                        │
                           │                                generic preflight
                           │                                ruleset validation
                           │                                pending choice/roll
                           │                                atomic commit receipt
                           └──────────────────────┬─────────────────┘
                                                  ▼
                                      recipient-bound publication
                                      source/revision recheck + outbox
                                                  │
                                                  ▼
                                  acknowledged delivery + scoped memory
```

### 3.1 Only four AI-visible generic tools

```ts
interface NativeAI {
  // Read-only, ACL-filtered, provenance-carrying; never raw unfiltered DB access.
  context_read(query: { topic: string; focus?: string; cursor?: string }): ScopedContextPage;

  // Any attempted mechanical or consequential world operation.
  action_propose(input: {
    source_ref: string;
    actor_ref: string;
    action: { kind: string; parameters: Record<string, unknown> };
    expected_revision?: string;
    reason?: string;
  }): ActionDisposition;

  // Read a pending, blocked, committed or delivered result; no execution.
  state_inspect(input: { receipt_ref: string }): AuthorizedReceiptView;

  // Testimony, provisional identities, observations, memory or high-impact lore drafts.
  knowledge_propose(input: {
    source_ref: string;
    kind: 'testimony'|'observation'|'identity'|'memory'|'fact'|'canon_proposal';
    claim: string;
    subject_ref?: string;
    evidence_refs?: string[];
  }): KnowledgeDisposition;
}
```

**Implementation requirements:**

- The model **cannot set trusted principal, actor ownership, recipient, audience, grant, role, permission, commit status or delivery status**. The server attaches these from the authenticated envelope and native state. A model-supplied `actor_ref` is merely a target claim; native code verifies authority over it.
- The generic proposal envelope is *closed, versioned and schema validated*. The action kind is resolved by a ruleset registry; unknown operations are refused without guessing. Ruleset definitions may have specific data and algorithms, but there is no separate model-callable native function per verb.
- Each action handler exposes the *same internal* lifecycle: `describe/validate/prepare/commit/inspect` or equivalent, returning `narratable`, `awaiting_player_roll`, `awaiting_consent`, `blocked`, `pending`, `resolved` with exact receipts. Do not make a model tell the engine that an action succeeded.
- No model tool for `force_effect`, `direct_db_write`, `publish_to_user`, `promote_canon`, `accept_pc_intent`, `roll_for_pc` or changing a session's viewer scope.
- A normal conversation does **not** call any tool. `context_read` is optional for details not already in the prepared packet; avoid mandatory retrieval calls for every paragraph.
- A genuine action may take more than one inference turn because the engine must return real rulings/receipts. Stop narration at the attempt until adjudication. Do not buffer or fake PC choice/roll results.
- An NPC's voluntary non-mechanical reaction (speech, gesture, refusal, lie) is authorized by GM portrayal unless it relies on unavailable presence, forbidden proxy control or unearned private knowledge. It does **not** require `action_propose` merely to speak.

### 3.2 Trusted native kernel; no per-feature AI interface

```text
services/core        input envelope, principal, source hashes, revision and idempotency
services/context     scope and actor-specific knowledge retrieval; policy guard
services/rules       ruleset registry: Daggerheart SRD 2.0 + Veiled City extensions
services/actions     single generic proposal lifecycle, deterministic legality/commit
services/world       actor/NPC/faction simulation, fictional-time clocks, ordinary authoring
services/knowledge   provenance, testimony, memory, fact/canon authority and salience
services/audience    per-recipient scopes, revalidation, safe narrative release
services/publication outbox, Discord, private channels, delivery receipts
services/gm          conversation model, private dramatic plan, presentation, repair
```

**Not the same as deleting game rules.** For example, [gm-execution-rules.js:26–65](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/daggerheart/gm-execution-rules.js#L26-L65) currently dispatches specific GM actions by string. Replace this hardcoded orchestration with a ruleset registry. The complex attack, Fear, damage, consent, recovery and death calculations still exist as deterministic ruleset code/data behind generic `validate/commit/inspect` handlers until parity-proven replacements exist. Do not interpret “generic” as unrestricted generic state patches; those would destroy mechanical authority.

### 3.3 How player-facing prose works

- **Low-risk / ordinary:** Fully scope the prompt before inference. The same GM model makes creative decisions and writes prose. No additional writer. No typed-intent schema. Validate real source/scene/audience and explicit attempted-result boundaries; publish valid segments.
- **Secret-dependent:** A separate GM-private planner is allowed full GM context; it returns only an approved *dramatic beat proposal*, e.g. “The official evades the question; a surveillance vehicle appears outside.” Native authority establishes any actual change. The audience writer only sees the permitted behavioral beat, NPC knowledge and entitlements, **never** the underlying hidden motive or unrelated private fact. Never issue an omniscient writer prompt that asks it not to leak secrets.
- **Mechanical:** Propose generic action. Server declares legitimate Difficulty/modifiers/stakes before a PC roll. Continue at `awaiting_roll` until the player rolls; the model may show the attempt and the surrounding world's immediate, non-success-dependent reaction but not a result. Return to prose after a committed receipt.
- **Cross-audience:** Independently construct a packet and produce a segment for each entitled private recipient and/or party. Prevent cross-scope evidence reuse except through a documented authorized revelation/disclosure. Shared party prose can be generated once for that party. Same GM event can have different observed consequences without giving everyone its private cause.
- **PC reference vs control:** “Mercer, I know you were asking around” is not itself agency theft; “Mercer agrees and hands over his evidence” is. Delete blanket name/second-person bans; enforce actual action/consent/knowledge/receipts instead. Explicit speech attribution and narrator perspective remain essential.
- **Validation:** Prefer *source restriction plus typed consequential receipts* over textual regexes. Limited lexical tripwires can be observability aids but **must not be treated as complete semantic proof**, and must not blindly block normal NPC dialogue. Uncertain high-stakes claims are held and isolated; ordinary harmless prose is not subjected to canonical-source equality for every noun.
- **Local repair:** A held segment is replaced in its original audience scope using the known rejection reason. Valid neighboring prose, rolls, commits and receipts remain untouched. A later failure is not an excuse to reroll or replay an action. Do not repair a GM-secret leak by asking the same omniscient prompt to rewrite while still exposing that secret.

---

## 4. FUNCTION-BY-FUNCTION SOURCE DISPOSITION MATRIX

**Legend:** **KEEP** = preserve behavior and preferably source; **PORT** = move behind a generic interface; **REPLACE** = write new architecture, preserve independently proven invariants; **REMOVE** = retire from the new runtime *after* migration/coverage. There is no instruction to delete historical records. Dates and SHA are pinned above. Each linked range is to the examined original code.

### 4A. Inbound, orchestration and conversational intent

| Existing module / function (pinned lines) | Fate | Why this decision | Replacement / retained contract |
|---|---|---|---|
| [`processPartyTurn()` — L407–L565](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/index.js#L407-L565) | **REPLACE** | Routing, generation, commit and publication are interleaved in one turn handler. | Thin Discord adapter -> conversation orchestration -> generic actions -> outbox. |
| [`processPrivateTurn()` — L311–L405](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/index.js#L311-L405) | **REPLACE** | Private scene uses a separate long flow; scope and ownership checks must survive. | Shared turn pipeline parameterized by server-bound audience and private principal. |
| [`processTurnEnvelope()` — L569–L620](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/index.js#L569-L620) | **KEEP / PORT** | Exact turn receipt, replay and recovery sequencing are foundational. | Generic idempotent intake envelope; preserve receipt stages and error truthfulness. |
| [`resolveController()` — L73–L88](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/index.js#L73-L88) | **KEEP / PORT** | Identifies authenticated PC / NPC proxy and handles ambiguous multiple roles. | Principal service; never let AI select a controlling player. |
| [`routeNativeSpans()` — L105–L110](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/index.js#L105-L110) | **REPLACE** | Legacy native-span preprocessing is a specialized routing surface. | Retain exact immutable consumed-span ledger, execute only explicitly authorized native commands. |
| [`GMService.shouldRespond()` — L483–L548](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/gm.js#L483-L548) | **REMOVE** | Pre-GM classification can suppress meaningful roleplay; another inference call adds latency. | Deterministic channel/session eligibility plus a single GM ability to remain silent for player-only chatter. |
| [`GMService.buildContext()` — L550–L622](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/gm.js#L550-L622) | **REPLACE** | Builds broad multi-purpose GM context in one service; mixes private planning and actor perspective. | Reusable GM-private and audience-scoped packet assemblers with explicit disclosure boundaries. |
| [`GMService.runTurn()` — L623–L1020](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/gm.js#L623-L1020) | **REMOVE / REBUILD** | Requires monolithic schema, typed intents, state review, correction and multiple writer lanes. | Simple conversation workflow plus optional action/knowledge proposals. |
| [`gmSchema` / `stateReviewSchema` — L157–L219](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/gm.js#L157-L219) | **REMOVE** | Every response must fill many unrelated administrative fields and status categories. | Small prose response with optional generic action proposal; no forced no-change grids. |
| [`GMService.structuredResponse()` — L418–L480](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/gm.js#L418-L480) | **KEEP INTERNALLY** | Strict parsing and bounded retries useful only when a consequential tool operation requires structure. | Generic structured tool transport; ordinary prose uses text generation. |
| [`GMService.requestModel()` — L410–L413](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/gm.js#L410-L413) | **KEEP / SIMPLIFY** | Provider dispatch abstraction already exists. | Model gateway shared across conversational and planning modes. |
| [`createPlayerIntentContract()` — L2–L65](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/intent/player-intent-contract.js#L2-L65) | **REMOVE** | Converts every utterance to a closed intent taxonomy, including nonaction speech. | Raw utterance to language model; only explicit action proposals are typed. |
| [`validatePlayerIntents()` / `recoverPlayerIntents()` — L1–L118](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/intent/player-intent-validation.js#L1-L118) | **REMOVE / PORT SAFETY** | Exact spans/quote boundaries are valuable but attached to pervasive player-intent objects. | Authenticate source and voluntary action when an action is proposed; no classifier for ordinary dialogue. |
| [`persistPlayerIntents()` — L64–L142](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/intent/typed-intent-persistence.js#L64-L142) | **REMOVE** | All conversation depends on accepted intent rows and referent resolution. | Native action proposals receive immutable source claims only when applicable. |
| [`persistTypedDialogue()` — L143–L162](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/intent/typed-intent-persistence.js#L143-L162) | **REMOVE** | Dialogue persistence depends on accepted typed `speak` intent. | Store speaker-authored utterances as attributed conversation events independent of action authorization. |
| [`currentTypedMovement()` / `autoCompleteOrdinaryMovements()` — L163–L208](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/intent/typed-intent-persistence.js#L163-L208) | **REMOVE** | Movement is derived from selected taxonomy entries; can conflate intent and arrival. | Generic `action.propose` movement validated against owner, scene, access and current revision. |
| [`validateIntentResolutions()` — L209–L236](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/intent/typed-intent-persistence.js#L209-L236) | **REPLACE** | Checks classified intent completion rather than player-facing response quality. | Pending action receipt and meaningful response/delivery coverage checks. |
| [`proposeIntents()` / `acceptIntentForAdjudication()` — L19–L143](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/intent/semantic-intake.js#L19-L143) | **REMOVE / PORT PROVENANCE** | Good source verification coupled to unnecessary semantic intent persistence. | Reuse exact authored envelope validation inside generic action preflight. |
| [`routeGameplayIntake()` — L9–L16](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/intent/gameplay-intake.js#L9-L16) | **KEEP IDEA** | Already preserves the full original message. | Full utterance ingestion in the new intake service. |
| [`semanticResponseObligation()` — L23–L39](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/intent/gameplay-intake.js#L23-L39) | **REPLACE** | Responding is derived from a list of classified intents. | Conversational engagement and unresolved-action promise; no typed-intent prerequisite. |
| [`captureAuthoredTurnEnvelope()` — L14–L34](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/intent/authored-turn-envelope.js#L14-L34) | **KEEP / PORT** | Immutable exact player source and ownership essential to prevent fake permissions. | Generic source envelope for every authored message. |
| [`recordNativeConsumedSpans()` — L35–L50](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/intent/authored-turn-envelope.js#L35-L50) | **KEEP / PORT** | Prevents duplicate execution of actual native commands and owner spans. | Action-source dedup and replay proof. |
| [`interpretationContext()` — L74–L104](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/interpretation-context.js#L74-L104) | **REPLACE** | A separate semantic interpretation stage is unnecessary for ordinary conversation. | Scoped referent/conversation recall inside context assembler; authorization remains separate. |

### 4B. Narrative, audience and delivery of prose

| Existing module / function (pinned lines) | Fate | Why this decision | Replacement / retained contract |
|---|---|---|---|
| [`createNarrativeContextBuilder()` / `buildNarrativeContext()` — L2–L134](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/context-builder.js#L2-L134) | **KEEP POLICY / REBUILD PACKET** | Verifies owner, current scene, location, private facts and NPC availability but hardwires V9 operations/camera/task format. | Source- and audience-safe generic prompt/context builder independent of task IDs. |
| [`createAudienceAuthority()` — L14–L46](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/audience-authority.js#L14-L46) | **KEEP / GENERALIZE** | Unforgeable server-issued recipient-bound grants are important; existing grants *require task_ids*. | Issuer of scene/audience/principal proof without narrative task binding. |
| [`audienceSurface()` — L47–L55](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/audience-authority.js#L47-L55) | **KEEP / GENERALIZE** | Trusted mapping from private/channel/internal grant to publication surface. | Same policy for generic segments and native receipts. |
| [`mintNarrativeAudience()` / `revalidateNarrativeAudience()` — L12–L38](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/native-audience-grant.js#L12-L38) | **REPLACE FORMAT** | Hashes scope/source/scene and revalidates but binds V9 task IDs/operation. | Generic `audience.issue` and `audience.revalidate` with revisioned rights and exact source. |
| [`createNarrativeSourceVisibility()` — L2–L30](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/source-visibility.js#L2-L30) | **KEEP / PORT** | Recursive source-provenance visibility blocks hidden evidence being cited from public output. | General ACL closure for facts, memory, world events and receipts. |
| [`coordinateNarrative()` / `creativeBrief()` — L7–L50](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/narrative-delegation.js#L7-L50) | **REMOVE** | Orchestrates narrative by accepted typed-intent task classes. | Situational dramatic brief derived from scene/events and optional native dispositions. |
| [`narrativeTasks()` / `taskDispositions()` — L8–L79](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/narrative-tasks.js#L8-L79) | **REMOVE** | A regular conversation becomes a typed task matching exercise. | Explicit action/response obligations and delivery acknowledgements only. |
| [`NARRATIVE_V9_INSTRUCTIONS` / schema — L8–L36](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/writer-contract-v9.js#L8-L36) | **REMOVE** | Requires versioned acts/task IDs/placement and forbids normal PC-name use. | Short GM portrayal contract plus generic audience metadata and optional receipts. |
| [`actToNativeUnit()` / `compileWriterV9()` — L9–L36](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/narrative-writer-v9.js#L9-L36) | **REMOVE** | Converts prose to prescriptive native unit taxonomy. | Simple audience-bound prose segments; no task-index proof of creativity. |
| [`compileNarrativeActs()` — L14–L45](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/narrative-acts-v9.js#L14-L45) | **REPLACE** | Useful partial hold semantics are entangled with V9 act schema. | Generic segment verifier; valid independent siblings remain deliverable. |
| [`validateUnit()` — L68–L159](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/narrative-authority.js#L68-L159) | **REWRITE** | Mixes correct scope/actor checks with blanket text bans and exact wording constraints. | Retain ACL, actor presence and receipt gates; allow free dialogue/PC names; reject actual agency takeover, leaked source, unsupported effect. |
| [`authorNarrativeRequests()` — L170–L216](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/narrative-authority.js#L170-L216) | **REMOVE** | Requires a version 8 request and permits only a tightly limited writer budget. | Direct scoped response; optional private planning and local bounded repair. |
| [`establishNarrativeUnits()` — L218–L299](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/narrative-authority.js#L218-L299) | **REPLACE** | Persists V9 unit/fiction_delta and fates under a specific request format. | Generic eligible scene event, attributed dialogue and publication records with native receipts. |
| [`renderNarrativeUnit()` — L300–L319](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/narrative-authority.js#L300-L319) | **REPLACE** | Rebuilds original task/capability context on every render. | Revalidate generic source/scope/principal/receipt and original immutable output hash before delivery. |
| [`speakerBrief()` / `npcAddresses()` — L13–L53](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/narrative-speakers.js#L13-L53) | **KEEP / REFRAME** | NPC locality, proxy eligibility and entitlement are useful; individual voices need a richer authored persona. | NPC portrayal packet with distinct voice, current motivation and actor-known facts; private motives may stay planner-only. |
| [`prepareAuthorizedTurnOutput()` — L374–L610](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/pvp-output.js#L374-L610) | **REPLACE** | Rewrites generated narration from approved part types and quarantines the original; critical source of voice loss. | Build an approved generic publication envelope from valid scoped prose and separately committed outcomes. |
| [`renderPart()` / `validateOutputPart()` — L123–L227](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/pvp-output.js#L123-L227) | **KEEP INVARIANTS** | Source/status/hash/scene/owner checks prevent replay and scope drift. | Move them into a generic publication validator; remove per-narrative-version case explosion. |
| [`validateOutputPart()` — L367–L372](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/pvp-output.js#L367-L372) | **KEEP / PORT** | Checks verified publication part and content hash. | Generic immutable segment proof. |
| [`validateNarrativeCompleteness()` — L6–L45](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/narrative-completeness.js#L6-L45) | **REPLACE** | Scores task types and statuses; has a diagnostic rather than guaranteed repair path. | True player-visible completion: substantive delivered reply, unresolved action/roll, valid silence, audience and follow-up. |
| [`validateCandidateClaims()` / `validateNarrativeClaims()` — L113–L145](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/narrative-integrity.js#L113-L145) | **REFACTOR** | Native consequences/evidence checks necessary, claim annotation burdens ordinary prose. | Require machine-verifiable proof for consequential propositions only, not every descriptive sentence. |
| [`materialParaphrases()` — L2–L28](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/material-paraphrases.js#L2-L28) | **RETAIN AS TELEMETRY** | Regex tripwires are neither complete semantic privacy proof nor adequate sole authority gate. | Diagnostic/risk trigger for true consequences; never ban ordinary second-person phrases by default. |

### 4C. Generic native rules and state

| Existing module / function (pinned lines) | Fate | Why this decision | Replacement / retained contract |
|---|---|---|---|
| [`registerIntentAdapter()` / `adapters` — L2–L4](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/intent/adapter-registry.js#L2-L4) | **KEEP IDEA / REPLACE API** | Already separates dispatch from implementation but registry API is an intent-specific global mutable map. | Ruleset registry of versioned action definitions with shared lifecycle. |
| [`preflight()` / `applyNative()` — L15–L58](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/intent/native-preflight.js#L15-L58) | **KEEP LOGIC / GENERALIZE** | Checks policy, exact source, revision, proxy ownership and prerequisites. | Generic action preflight; no feature-specific if/else in central orchestrator. |
| [`dispatchAiIntents()` — L144–L173](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/ai-intents.js#L144-L173) | **REPLACE TRANSPORT** | Useful transaction, policy budget, replay and receipt behaviors; schema is world AI intent-specific. | Single `action.propose` dispatcher; also handles GM NPC/faction planning proposals. |
| [`registerIntentAdapter(...)` specialized definitions — L175–L299](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/ai-intents.js#L175-L299) | **REMOVE AS API** | Many feature-specific AI-facing contract names and special paths violate generic interface target. | Rule modules register action definitions behind one dispatcher; old adapters removed only after parity. |
| [`createWorldOperationAuthority()` — L4–L211](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/world/operation-authority.js#L4-L211) | **KEEP RULES / REWRITE CONTRACT** | Delegation, actor evidence, expiry, private operation eligibility and receipts are valuable. | Policy engine operates on generic action definitions and actor grants. |
| [`prepareNativeWorldOperation()` — L58–L104](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/world/operation-authority.js#L58-L104) | **REPLACE** | Specifically enumerates features/operations, private allowances and source state. | Generic capability check with rule-owned policy and source-bound grant. |
| [`applyAuthoritativeMutation()` — L78–L248](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/state.js#L78-L248) | **KEEP ATOMIC SEMANTICS / REPLACE INPUT** | Transaction, source, effect and canon validation are essential, but model `narrative` object is deeply coupled. | Atomic generic action-batch commits using native proposals and immutable results. |
| [`previewAuthoritativeMutation()` — L249–L259](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/state.js#L249-L259) | **KEEP** | Rollback simulation must never consume real dice or commit results. | Dry-run generic rules and world actions for validation. |
| [`commitGmTurn()` — L25–L96](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/turn-orchestration.js#L25-L96) | **REPLACE** | Couples transcript, typed rolls, world mutation, legacy projection, canon drafts and outbox in one transaction body. | Small transaction coordinator: commit accepted generic operations, persist provisional prose records, queue publication exactly once. |
| [`reconcilePreviewConsequences()` — L19–L24](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/turn-orchestration.js#L19-L24) | **REPLACE** | Depends on typed intents and narration to enforce consequences. | Compare native receipt obligations to issued/pending action proposals; no prose-suggested state. |
| [`createUnifiedAdjudication()` / `adjudicateSceneBoard()` — L5–L169](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/daggerheart/unified-adjudication.js#L5-L169) | **REPLACE ENTRY** | Valid Daggerheart checks but overly specialized scene-board arbitrator. | Generic action adjudicator invokes pure Daggerheart validators according to operation kind. |
| [`applyUnifiedBatch()` — L198–L249](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/daggerheart/unified-adjudication.js#L198-L249) | **REPLACE** | Giant specialized board batch with environment/combat feature cases. | Native staged batch executor with one shared engine transaction and ruleset hooks. |
| [`createGmExecutionRules()` / `executeUnifiedGmActions()` — L5–L65](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/daggerheart/gm-execution-rules.js#L5-L65) | **REPLACE DISPATCH** | Long operation-name switch; mechanics sound, interface too specific. | Versioned action-handler registry with shared generic prepare/commit/inspect functions. |
| [`createRollRequestRules()` / `prepareRollRequest()` — L7–L141](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/daggerheart/roll-request-rules.js#L7-L141) | **KEEP RULES INTERNALLY** | Trait/difficulty/modifier authority and player owner are mandatory. | Mechanic rules registered as action handlers; no distinct model roll tool. |
| [`createPcDeathRules()` / `choosePcDeathMove()` — L7–L100](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/daggerheart/pc-death-rules.js#L7-L100) | **KEEP RULES INTERNALLY** | Death moves, owner choice and actual d12 RNG are rules-bound. | Generic owner-choice disposition; exact SRD options still implemented by ruleset. |
| [`createNativePvpAuthority()` — L3–L22](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/daggerheart/pvp-authority.js#L3-L22) | **KEEP RULES INTERNALLY** | A PC target must trigger authentic PvP ownership/consent. | Generic conflict resolver uses PvP guard and exact agreement receipts. |
| [`openActionWindow()` / `joinActionWindow()` — L17–L85](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/session/scene-action-window.js#L17-L85) | **REPLACE INPUT** | Supports overlapping actions but requires accepted typed_intent rows. | Generic scene coordination windows bound to action proposals, owner consent and resources. |
| [`resolveActionWindow()` — L95–L170](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/session/scene-action-window.js#L95-L170) | **KEEP RULES / GENERALIZE** | Simultaneous resource conflict resolution remains useful. | Generic action-window resolution based on validated proposals. |
| [`recordCharacterArrival()` / `reconcileSceneArrival()` — L32–L58](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/session/scene-continuity.js#L32-L58) | **KEEP GUARANTEE / INTERNALIZE** | Character arrival needs authenticated owner and committed scene/event. | Movement handler behind generic action; no model-callable `scene.enter`. |
| [`applyAutonomousWorld()` — L120–L316](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/world/autonomous-world.js#L120-L316) | **REPLACE** | World authoring and scene action depend on old narrative shape and typed intents. | Generic `knowledge.propose` for identities and `action.propose` for consequential world changes. |
| [`establishNativeNarrativeEntity()` — L15–L86](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/world/identity-rules.js#L15-L86) | **KEEP SAFETY / SIMPLIFY** | Independent GM origin, protected identity collision and source checks are critical. | Ordinary fiction provenance registry; scenery need not automatically become a navigable location or an authoritative secret. |

### 4D. Lore, NPC cognition, autonomous world

| Existing module / function (pinned lines) | Fate | Why this decision | Replacement / retained contract |
|---|---|---|---|
| [`ContentIndex` / `search()` — L24–L74](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/content/content.js#L24-L74) | **KEEP / IMPROVE** | Existing setting/reference source index is reusable. | Make source retrieval ACL-aware with stable document IDs; enforce GM-private reference walls. |
| [`ContextPlanner.plan()` — L8–L79](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/knowledge/context-planner.js#L8-L79) | **KEEP / EXTEND** | Prioritizes scoped facts, NPC knowledge/goals, history and canon. | Two packet modes: GM-private planning and audience-safe portrayal; relevance-ranked causal sources. |
| [`ContextPlanner.authorityIndex()` / `authorityPage()` — L80–L88](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/knowledge/context-planner.js#L80-L88) | **KEEP** | Source pagination can avoid giant prompt dumps. | Bounded detail-on-demand read-only context calls. |
| [`createMemoryLifecycle()` / `rememberEntity()` — L5–L91](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/knowledge/memory-lifecycle.js#L5-L91) | **KEEP** | Visibility, provenance and category-specific memory evidence already exist. | Generic evidence-based memory and identity operations. |
| [`reviseMemory()` / `retractMemory()` — L92–L120](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/knowledge/memory-lifecycle.js#L92-L120) | **KEEP** | Corrections and historical lineage are needed; do not rewrite past NPC knowledge silently. | Versioned amendments/retractions with evidentiary sources. |
| [`createNarrativeMemory()` / `acknowledgeNarrativeMemory()` — L4–L96](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/knowledge/narrative-memory.js#L4-L96) | **KEEP / REBIND** | Actual acknowledged player delivery governs memory becoming player-known. | Bind to generic publication receipt instead of V9 narrative units. |
| [`selectDisclosedNarrativeMemory()` — L101–L128](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/knowledge/narrative-memory.js#L101-L128) | **KEEP** | Scoped selective recall supports continuity without copying full history. | Context planner with privacy- and relevance-aware salience. |
| [`applyCanonProposalDrafts()` — L3–L44](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/knowledge/canon-proposal-drafts.js#L3-L44) | **KEEP AUTHORITY / REPLACE PROOF** | Currently requires accepted typed private canon request and substring match. | Authenticated private owner explicit request + exact source; proposal not auto-promotion. |
| [`factVisibleTo()` / `disclosureFailureReason()` — L2–L13](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/knowledge/disclosure-authority.js#L2-L13) | **KEEP** | Audience ACL and archived/source-equality checks are essential. | Uniform knowledge ACL across source classes. |
| [`retrieveNpcCognition()` — L65–L148](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/npc/cognition.js#L65-L148) | **KEEP / EXTEND** | Actor memory, belief, goals and salience are exactly what recurring NPCs need. | Per-NPC decision packet; do not expose GM-only causes as NPC knowledge. |
| [`applyNpcCognitionDrafts()` — L7–L85](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/npc/cognition-drafts.js#L7-L85) | **KEEP GUARANTEES / REWORK** | Actor observation proof and correction lineage good; split legacy AI goals from current authority. | Generic knowledge proposals for NPC beliefs and memories; goal changes through governed action proposals. |
| [`actorSource()` / `createNpcMotivationRules()` — L6–L41](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/npc/motivation.js#L6-L41) | **KEEP INTERNAL** | Actor goals/actions demand subjective knowledge and resources, not omniscient GM facts. | Generic world action validator checks NPC goal, knowledge, location, proxy control and resources. |
| [`createDirectorCadence()` / `queueDirectorAfterPartyTurn()` — L6–L37](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/world/director-cadence.js#L6-L37) | **REPLACE** | Round participation count is too rigid as primary autonomy trigger. | Causally scheduled fictional-time opportunities and scene beat checkpoints; never wall-clock punitive advancement. |
| [`rankWorldNarrativeOpportunities()` — L16–L33](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/narrative-opportunity-policy.js#L16-L33) | **KEEP IDEA / REPLACE CAP** | Currently ranks an opaque set and truncates to 4, potentially suppressing organic signals. | Priority queue with fair bounded budgets and persistent unconsumed opportunities. |
| [`rankDirectorActions()` — L6–L25](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/world/director-action-ranking.js#L6-L25) | **KEEP IDEA / REWORK** | Knowledge, goal, repetition and source proximity scoring supports credible action. | Causal, scheduled NPC/faction initiative with resources and uncertainty. |
| [`GMService.runWorldDirector()` — L1102–L1162](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/gm.js#L1102-L1162) | **REPLACE** | Separate large strict schema and fixed round/scene/downtime instructions. | Private world thinker producing generic action/knowledge proposals and observable dramatic beats. |
| [`GMService.planNpcActions()` — L1184–L1225](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/gm.js#L1184-L1225) | **REPLACE** | Single planner asks for capped action list and tightly predefined structures. | Selectively evaluate active NPCs by scene pressure/fictional causality; generic proposals. |

### 4E. Infrastructure, presentation, persistence and release

| Existing module / function (pinned lines) | Fate | Why this decision | Replacement / retained contract |
|---|---|---|---|
| [`VeiledDB` / `migrateSchema()` — L38–L126](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/persistence/database.js#L38-L126) | **KEEP DATA / REPLACE ADAPTER** | Existing SQLite campaigns and migrations contain years of authoritative state. | New repository layer with tested one-way migration; no destructive in-place production conversion. |
| [`ContentIndex.read()` — L39–L42](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/content/content.js#L39-L42) | **KEEP / HARDEN** | Setting docs and GM private material are reusable. | Approved content paths and explicit reader credentials; avoid arbitrary file traversal. |
| [`assertGmOnlyChannel()` / `assertPlayerPrivateChannel()` — L35–L85](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/discord/privacy.js#L35-L85) | **KEEP / PORT** | Discord channel permission failures are actual privacy leaks. | Validate channel/recipient permissions at provisioning and again on delivery. |
| [`createDiscordClient()` — L3–L7](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/discord/client-factory.js#L3-L7) | **KEEP / PORT** | Discord transport need not be reinvented. | Thin adapter independent of GM and native rules. |
| [`splitDiscordText()` — L17–L73](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/discord/chunking.js#L17-L73) | **KEEP** | Handles Discord length, quotes/fences and mention boundaries. | Generic content-safe chunker in publication transport. |
| [`createInteractionTextDelivery()` — L2–L13](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/discord/delivery.js#L2-L13) | **KEEP / PORT** | Works for commands/interaction replies; native ownership outside. | Thin Discord reply adapter. |
| [`queueTurnPublications()` — L42–L72](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/publication-outbox.js#L42-L72) | **KEEP INVARIANTS / ADAPT** | Binds approved result to recipient/delivery/turn ID. | Queue authorized generic prose segments and receipts. |
| [`deliverTurnOutbox()` — L92–L143](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/publication-outbox.js#L92-L143) | **KEEP** | Durable send and uncertain-ack reconciliation prevents duplicate secrets/messages. | Reuse exact-once intent and no blind uncertain resend behavior. |
| [`reconcilePublication()` — L144–L169](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/publication-outbox.js#L144-L169) | **KEEP** | Explicit GM reconciliation for uncertain sends. | Recover per destination without reroll/restate. |
| [`deliverQueuedTurn()` — L115–L150](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/publishing.js#L115-L150) | **KEEP / ADAPT** | Real Discord transport receipt and delivery stages exist. | Thin publisher consuming generic outbox envelopes. |
| [`loadConfig()` — L29–L97](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/bootstrap/config.js#L29-L97) | **REPLACE / SIMPLIFY** | Old feature-flag combinations encode past narrative generations. | Versioned configuration: runtime, model profiles, safety, feature gates and logging only. |
| [`requestModel()` — L8–L43](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/ai-provider/model-transport.js#L8-L43) | **KEEP / PORT** | Bounded transport retries, usage metrics, aborts and latency trace are solid. | Provider-neutral gateway; ordinary prose no strict schema. |
| [`beginGenerationFeedback()` — L2–L16](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/ai-provider/generation-feedback.js#L2-L16) | **KEEP DEFAULTS** | Typing indicator and opt-in progress; the owner dislikes routine processing messages. | Keep nonintrusive typing; no habitual status text. |
| [`createSceneContinuity()` — L6–L177](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/session/scene-continuity.js#L6-L177) | **KEEP SCOPES / PORT** | Precise presence/access and verified owner arrival are essential in multiplayer. | General scene graph and presence service. |
| [`operation_receipts`, `mutation_ledger`, `world_events`, `city_records` SQL — L624–L887](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/sql/schema.sql#L624-L887) | **KEEP DATA / PORT** | Source and receipt lineage underpins authority and replay. | Versioned new-store projection retaining historical opaque records. |
| [`turn_attempts` / `publication_outbox` SQL — L921–L962](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/sql/schema.sql#L921-L962) | **KEEP DATA / PORT** | Committed vs delivered must remain distinguishable. | Durable outbox with historical delivery reconciliation. |

## 5. WHOLE-PROJECT COMPATIBILITY: WHAT THE REBUILD MUST NOT LOSE

This is **a complete runtime rebuild**, not permission to drop the existing product's player- or GM-facing features. Astra must inventory every slash command and data package before cutover; the table above focuses on architecture-critical functions, not a claimed complete symbol inventory.

### 5.1 Character, campaign and import/export

| Source | Fate and specific reason |
|---|---|
| [Character exports: `playerCharacterProjection()` `character-export.js:33–40`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/character-export.js#L31-L40) | **KEEP exact privacy semantics.** Player-safe packages must exclude GM secrets, private hooks and high-privilege metadata. New export serializers must compare semantic fields and scope. |
| [`buildPlayerExport()` `character-export.js:41–59`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/character-export.js#L41-L59) | **KEEP compatibility.** Current package identifies schema `veiled-city-character-export-v3.3.3`; parse old versioned packages even if the new engine exports a newer schema. |
| [`buildGmHooksExport()` `character-export.js:60–81`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/character-export.js#L60-L81) | **KEEP as a separate GM-private artifact.** Imported hooks are potential story seeds, not owner-visible truth or automatic canon. |
| [`buildGmPrivateExport()` `character-export.js:82–98`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/character-export.js#L82-L98) | **KEEP GM-only content and entitlement.** This must never be merged into the player projection. |
| [`buildGmCanonExport()` `character-export.js:108–124`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/character-export.js#L108-L124) | **KEEP versioned canon, conflicts and proposals.** Separate human review gates from the conversational model. |
| [`normalizeGmHookImport()` `gm-hook-import.js:5–32`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/gm-hook-import.js#L5-L32) | **PORT recognition of existing hook schemas** and explicitly unverified canon suggestions. Support legacy imports without granting authority. |
| [`buildCommands()` `command-definitions.js:9–640`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/discord/command-definitions.js#L9-L640) | **REBUILD routing, preserve compatible commands** for character creation/import/export, narrative import/export, GM hooks, level-up, session, campaign, handouts, canon, consent, rolls, encounter, voice and admin. Generate a machine-readable current-command inventory. |
| [`commands.js` central command handler and imports, lines 1–77](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/commands.js#L1-L77) | **REPLACE 2,208-line command workflow architecture.** Commands become thin input/owner adapters to the same application and native kernel; do not duplicate rules in Discord handlers. |

The application must preserve character sheets, ancestry/community/class/domain, level-up, Veiled City Hex/house rules, HP/Stress/Hope/Armor, inventory, downtime, spotlight, damage thresholds, encounters, NPC proxies, player-owned relationships, private narrative files and campaign configuration. **Exact correctness must be established by reading the actual current Daggerheart content/rules and existing command schema**; do not infer game rules from this document alone.

### 5.2 Persistence, scene, time, content and operations

- Treat [`bot/sql/schema.sql:30–249`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/sql/schema.sql#L30-L249) as the baseline for campaigns, players, characters, sessions, facts, messages, rolls and audits; [`380–620`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/sql/schema.sql#L380-L620) for canon, conflicts, relationships, handouts and GM hooks; [`624–887`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/sql/schema.sql#L624-L887) for operations, NPC memories, cognition, fictional clock, world events and generic city records; [`921–962`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/sql/schema.sql#L921-L962) for delivery receipts/outbox. New schema may differ, but all semantic authority and lineage must survive.
- Retain fictional time distinct from wall time. In-game clocks may advance on committed actions, meaningful scene transitions or authorized downtime. A Discord outage or overnight absence cannot independently punish PCs or advance opportunities across missing response windows.
- Retain scene placement, exits, connected locations, visibility and legitimate access as distinct concepts. Describing a door doesn't move a player; establishing a door doesn't mean it is open; an NPC mentioning a secret passage doesn't prove one exists. [Scene continuity, `scene-continuity.js:19–88`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/session/scene-continuity.js#L19-L88).
- Preserve campaign content and source visibility (`content/`, Daggerheart definitions, house rules, imported setting docs). [ContentIndex, `content.js:24–74`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/content/content.js#L24-L74) is a useful source reader but not a substitute for proof of each source's audience rights.
- Keep the GM's manual administrative ability to correct, approve, review and reconcile the campaign. **Autonomous** does not mean unaccountable or free to create protected canon. Human GM corrections are higher authority than a narrative inference.
- Preserve the currently supported voice delivery integration as an *optional publication consumer*, not a dependency of text narration or action commit. Preserve safe channel, role, owner and channel visibility checks before posting.

### 5.3 Character-facing and NPC-facing information

- Character-specific facts, private discoveries, transcript, visual perceptions and GM secrets are separately stored and separately retrieved.
- NPCs retain independent memories, belief statuses (`known`, `suspected`, `rumor`, `doubted`, `unknown` or current equivalents), goals, loyalties, injuries and capacity. An actor does not learn a secret just because the GM's planner knows it.
- A player-controlled NPC proxy is **not** available for AI-directed voluntary speech or tactics while a legitimate owner holds that proxy. Scope granted to the human proxy does not grant global GM knowledge.
- A passive/spectator channel receives only explicitly permitted spectator material. Never publish GM notes, drafts, raw model messages or private prompts as a fallback.
- Preserve immediate ability to pause Director autonomy, inspect pending operations and prevent duplicate work. Preserve feature-disabled honest messages without narrative claims that a mechanic occurred.

---

## 6. KNOWLEDGE MODEL: FACTS, LORE, CANON, MEMORIES, SECRETS

Implement **one generic `knowledge.propose` entry point** with domain-specific epistemic and authority rules behind it. Do not collapse everything into `fact(key,value)` or `canon(description)`.

### 6.1 Required record classes and meaning

| Concept | GM may create | Truth/authority rule | Persistence and disclosure rule |
|---|---|---|---|
| **Uncommitted color** | Ambient sound, weather impression, background gesture, a detail that does not alter source-backed state | Prose-level invention consistent with scene and canon | Can remain in narrative transcript; not all adjectives need database records |
| **Attributed testimony** | NPC lies, rumors, predictions, speeches, conflicting recollections | The *speech event* is known; the claim is not thereby true | Speaker/source/scene/listener; can be recalled by audience that actually heard it |
| **Actor belief** | Suspicions, imperfect inference, mistaken conclusions | Truth belongs to that actor's cognition, not objective campaign fact | NPC-scoped knowledge, belief revision and correction lineage |
| **Provisional identity** | Incidental NPC, storefront, alley, local custom, provisional faction relation | Requires independent GM origin; identity collision/geography checks when eligible to persist | Stable key only if future reference merits it; no automatic powers, custody or player obligations |
| **Objective fact/observation** | Verified clue, witnessed event, independently established ordinary environment | Requires source-specific accepted evidence or native observation/receipt | Scoped to actual witnesses and permitted readers; corrections versioned |
| **Durable identity** | Recurring NPC/place that matters over time | Existence and identity persistence supported by appropriate native authoring/evidence | Survives prompt retirement; no automatic canon of each utterance |
| **Protected canon** | Campaign truth, key identity/history, major supernatural explanation, protected faction secret | Existing authoritative source or correctly authorized proposal/promotion; cannot come from repeated rumor | Versioned ledger, conflict/review, private/public truth distinct |
| **Mechanical state** | Damage, Stress, currency, items, powers, clocks, Fear, consent, movement | **Only generic action rule engine** may commit | State + immutable receipt; prose cannot alter it |

**Explicit contrast:** A bartender may tell players “There's a sleeper beneath the viaduct.” That establishes that the bartender said it and perhaps believes it. The GM may separately establish a mundane sleeping room or related NPC. It does not establish that a supernatural sleeper exists, that the characters know its true nature, or that the bartender knows GM-only origins. Each stronger proposition needs separate authority.

### 6.2 Weighted persistence is a recall policy, not an epistemic authority

Preserve independent authenticated evidence, source deduplication, fictional-time recency, salience, pins, reconciliation and prompt retirement. An NPC returning, the party seeking them out, or a successful investigation may make them narratively important. Hundreds of model echoes do **not** validate an invented supernatural claim. [Memory lifecycle, `memory-lifecycle.js:21–145`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/knowledge/memory-lifecycle.js#L21-L145); [Narrative memory, `narrative-memory.js:58–128`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/knowledge/narrative-memory.js#L58-L128).

**Important migration trap:** [applyCanonProposalDrafts(), `canon-proposal-drafts.js:19–26`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/knowledge/canon-proposal-drafts.js#L19-L26) currently depends on accepted private typed intents for an explicit owner canon proposal. Deleting typed intents without replacing this source/consent proof would silently break legitimate proposals. Implement an authenticated private-owner source proof independent of the old typed representation; keep review separate.

### 6.3 Hidden narrative infrastructure

Keep GM-only hooks, relationships, mystery hypotheses, NPC secret motives, planned revelations and proposed canon *independent of player-visible character packages*. These are private optional seeds subject to compatibility, not absolute facts merely because imported. A story seed can influence a private planner and produce foreshadowing that players legitimately witness, without revealing the source or culprit. The GM must never use a hidden hook as automatic authority over a PC's decisions.

### 6.4 Publication acknowledgement creates audience knowledge

A private clue generated into a pending outbox is not yet a fact that its recipient learned. Only delivery acknowledgement or another independent authorized observation allows the relevant knowledge record to become recipient-known. If a send becomes `uncertain`, do not assume delivery or resend blindly. This is already represented by [acknowledgeNarrativeMemory(), `narrative-memory.js:76–96`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/knowledge/narrative-memory.js#L76-L96) and [deliverTurnOutbox(), `publication-outbox.js:92–143`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/publication-outbox.js#L92-L143).

---

## 7. AUDIENCE-FIRST PRIVACY WITHOUT ROBOTIC PROSE

**Do not replace the current audience-safety boundary with a single omniscient prompt that writes everything.** That would plausibly increase both leaks and rejected prose. Instead, prevent exposure of forbidden materials to the audience-facing author before writing begins. Then independently validate authorization at send time.

### 7.1 Two clear prompt categories

**A. GM-private decision packet**: real canon, private hooks and clocks, objective world state, all relevant NPC plans and legitimate actor/owner scope. Outputs *proposals* for independent actions and authorized observable beats; its draft is never player-publishable. Use only when needed (secret-dependent or independent major development).

**B. Audience-scoped portrayal packet**: the correct scene's established observations, permitted portrayals, relevant known interactions and approved beats. It does *not* include hidden culprit identity, another player's secrets, GM-private unexplained reasons, unrevealed house rules or unobserved clocks. This call can freely write atmospheric prose and NPC speech because its input is already scoped.

Both packets are assembled by server-native policy, never by the language model's statement that something is “public”. [buildNarrativeContext(), `context-builder.js:11–134`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/context-builder.js#L11-L134) and [createAudienceAuthority(), `audience-authority.js:14–46`](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/bot/src/frameworks/narrative/audience-authority.js#L14-L46) supply proven invariants, but **do not copy their V9 `task_ids` binding** into the new generic grant.

### 7.2 Scope transitions are explicit events

GM-private → recipient-private or party disclosure requires an established reason: a witnessed clue, NPC speech available to listeners, a properly delivered handout, an agreed conversation or a validated mechanical result. Do not use implicit cross-knowledge merging. Even two players in the same Discord channel may have different character-private knowledge.

### 7.3 Privacy and agency acceptance examples

- NPC: “Mercer, you're asking the wrong questions.” **Allowed.** PC name does not mean PC ownership theft.
- Narrator: “You can see the lamplight moving under the door.” **Allowed** when this is a valid character viewpoint with visible details; not an assertion that the PC voluntarily opened the door.
- Narrator: “Mercer obeys, pockets the relic and swears loyalty.” **Blocked** without the owner-authored action and every relevant native permission/receipt.
- GM knows an official ordered surveillance; party observes an unmarked vehicle. **Allowed** once the observable vehicle is world-authorized. Party writer does not receive official's secret order.
- NPC tells a false accusation. **Allowed** as testimony even if known false to the private GM; the accusation cannot become objective canon.
- Private player learns a clue. **Delivered only to that recipient**; party memory not updated until a separate authorized communication/revelation.
- A player names a mysterious exit not yet established. **Player claim is not proof.** The GM may independently invent a compatible route or present real uncertainty; no forced arrival or access.

### 7.4 Safety layers (defense in depth)

1. **Intake security**: authenticated guild/scene/channel/owner/proxy/source/phase; no client-supplied role or recipient.
2. **Read security**: actor and recipient ACL applied before retrieving full text; retrieved sources carry provenance and scope.
3. **Plan security**: GM-private material is retained in planner only; the planner emits selected eligible beats, not raw explanations.
4. **Write security**: models receive scoped input and cannot assign recipient/grant/effect to prose.
5. **Consequence security**: only accepted action receipt allows committed effects.
6. **Publish security**: revalidate recipient, scene, principal, current source status, fact visibility, media/channel permissions, and hash before send.
7. **Post-delivery security**: ack-based knowledge; no blind uncertain retries; GM review for ambiguous delivery.

**Do not claim automatic semantic validation is complete.** Track residual source/claim risks, red-team privacy, and hold only material uncertain assertions; natural-language regexes are not mathematical proof against paraphrases.

---

## 8. WORLD DIRECTOR, NPC INITIATIVE, PLAYER SPOTLIGHT

### 8.1 Autonomy

Replace rigid mandatory player-round → Director event sequencing with an **event-triggered fictional-time scheduler** that can evaluate: entrance/exit, consequences of a roll, changing NPC knowledge, a faction reaching a milestone, a clock reaching its fictional threshold, downtime, scene transition, public disclosure or a long conversation that naturally invites an NPC reply. These are *opportunities*, not guaranteed interruptions. Do not advance the clock merely because wall time passes. Do not steal the spotlight from unresolved PC interventions.

A Director pass selects meaningful independent actor decisions; generic action proposals undergo eligibility and resource checks. Its output can also be `no meaningful change` without filler prose. A faction may prepare secretly and produce a later observable trace. Plans can fail. Important actor updates become source-backed cognition and memories.

### 8.2 NPCs are not throwaway dialogue functions

Give recurring NPCs compact living actor sheets: voice/diction, goals, fears, resources, location, beliefs, memory, relationships, loyalties, present objective and unresolved pressures. On meaningful interactions, evaluate what this NPC *wants to do now*, what they know and who they think the audience is. Portray the NPC with freedom: interrupt, deflect, lie, joke, refuse, bargain, seek allies, depart or make a mistake. Retain independent motivation without assigning PC acceptance. Use a separate actor-decision inference only when the situation merits it; avoid one model per NPC per sentence.

### 8.3 Spotlight

Preserve Daggerheart's freeform spotlight rather than fixed turns. Native encounter windows or an explicit overlap can coordinate simultaneously contested resources, cooperative actions, meaningful pre-roll interruptions and PVP. Use fair attention and action dependencies; a player who is only talking does not have to “spend a turn”. Before resolving meaningful incoming effects or scene transitions, identify which active PCs have unanswered opportunities to respond. A GM-driven NPC may interrupt only within fictional/rules fairness, not because a scheduler demands an action.

### 8.4 How creative invention survives

The GM may invent a whistle from the stairwell, an NPC drinking cold coffee, a flickering sign or an ordinary locked service door without an extra authorization model call. Persistent named NPCs/places use `knowledge.propose` for independent identity and scope. Mechanical locations become part of the scene graph only when action/map consequences require a durable key; a door in prose can exist before it becomes a graph node. Supernatural causes, major political changes and protected mystery answers require stronger authority and may be independently hidden from player readers.

---
## 9. PERSISTENCE AND UPGRADE STRATEGY

### 9.1 New-store design

Build the new runtime against a versioned schema with well-defined repositories, not raw SQL spread across GM prompt code. The minimal conceptual stores are:

1. `principals` / owner/proxy/session assignments and revocations (historical revisions preserved);
2. `world_events` immutable causes and observed outcomes;
3. `actors` / `scene_graph` / `simulation_clock` / pending world opportunities;
4. `action_proposals` / `action_receipts` / pending roll, consent, response and action windows;
5. `knowledge_claims` / `epistemic_links` / `npc_cognition` / `memory_interest` / correction lineage;
6. `canon_entries` / `canon_proposals` / `canon_conflicts` / GM review results;
7. `narrative_segments` / `audience_grants` / `publication_outbox` / acknowledgements;
8. `campaign_config`, `content_versions`, `character_packages` and `audit_log`.

This is a *logical schema outline*, not an instruction to add eight giant tables or duplicate existing data. Normalize only where it clarifies authority and avoids inconsistency; use stable, reversible views for legacy IDs.

### 9.2 Exact migration rules

- Back up old SQLite DB and associated character/content assets; record hashes, schema version and migration build version. Read old store with read-only snapshot where possible. Do not test against live user DB directly.
- Map every old fact, character, resource, inventory, relationship, canonical key/value/status, handout visibility, NPC knowledge source, world event, simulation clock, scene graph edge, roll outcome, pending owner decision and delivery receipt. Classify ambiguous old drafts as **unverified**, not as new canon.
- Preserve source/event IDs or create an immutable mapping `legacy_id -> new_id`, retaining every historical link. Original old `typed_intent` records are history, not model-facing action permissions. Do not replay historical accepted intents during migration.
- Preserve private character and GM-only scopes exactly. If old scope is ambiguous, quarantine for authorized review; never default to `party`.
- Preserve outstanding pending rolls, Fear interrupts, consent requests and death-move choices. A pending action's identity and immutable source must not change so it becomes accidentally executable twice.
- Publication status `delivered`, `not_sent`, `uncertain`, `draft` must remain distinct. On an uncertain part, require authenticated inspection/reconciliation rather than automatic resend.
- Verify old and new read-only projections of character sheets, canonical entries, NPC goals/knowledge, world positions, clocks, inventory and historical rolls match. Proposed changes in semantics require explicit reviewed mapping and documented exceptions.
- Only after imported state passes invariants, let the new bot accept fresh turns. Keep the old data read-only as a rollback reference. Do not support two active writers to the same campaign store.
- Export format compatibility is mandatory: player-safe v3.3.3 and corresponding GM-private/hooks/canon packages should be readable after migration. New exports can use a newer explicit schema identifier. Never round-trip GM data into a player-safe package.

### 9.3 Legacy cleanup discipline

Do not delete `bot/src/frameworks/daggerheart/` as a whole, or remove `state.js` or `pvp-output.js` before replacement receipts, effects and renderers are in place. Do not delete old rows that are referenced by historical audits. Remove all runtime calls to legacy typed intents / V7/V8/V9 narrative generation after the last compatibility consumer is ported. Legacy readers may remain in a quarantined **migration-only** package, but there must not be two operational GM pipelines after release.

---

## 10. EXECUTION PHASES AND NON-NEGOTIABLE GATES

Treat each phase as a deliverable with source/test hashes, changed files, actual test outcome, known exceptions and rollback notes. Use a new test prefix such as `bot/tests/veilkeeper2/` and a new *opt-in* test selector. Respect the existing [TEST_PROTOCOL, lines 1–10](https://github.com/KeshireTheChaotic/Veiled_City/blob/1ba6c7e15db1a66ba34b36336f31437beffe44d6/docs/Implementation_Plans/TEST_PROTOCOL.md#L1-L10) for fresh feature tests, no unapproved legacy suite execution, no test polling and no treating inherited golden tests as fresh proof. The additional historical comparison harness must be explicitly approved/isolated as necessary to comply with the current testing policy.

### Phase R0 — Freeze baseline and construct the exhaustive removal map

**Work:** Create new branch `rebuild/veilkeeper2-audience-first` (or branch acceptable to owner); record frozen baseline SHA. Traverse all source imports and both public API and command registries. Generate precise module/function inventory, current native action/feature catalog, app and Discord call graph, schema migration graph, historic content package matrix, source/receipt graph and existing safety/behavior tests. Review live-status ledgers without claiming deployment. Locate dead code by real reference graph, not directory names. Inventory `bot/src/application/composition/`, `framework-to-framework/` and `bot/src/commands.js` as likely over-coupled old framework wiring. Produce `REBUILD_INVENTORY.md`, `CALL_GRAPH.json`, `STATE_MIGRATION_MAP.md`, `COMMAND_COMPATIBILITY.md`, `RULE_PARITY_MATRIX.md`, `REMOVE_LIST.md`.

**Gate:** No missing **public** mechanic, Discord command, import/export format, source/recipient authorization or database table; every old entry point has a named destination (`retain/port/replace/remove/migration-only`) and every deletion has a zero-consumer proof. Provide unresolved edges as explicit blockers rather than guessing.

### Phase R1 — New bootable application skeleton and generic kernel

**Work:** New source root `bot/src/v2/` or separate `bot-v2/` (Astra chooses after R0; do not create both). Add dependency-injected service contracts; one authenticated event envelope; one audience principal resolver; one source/receipt storage abstraction; one ruleset registry; one model gateway; one outbox publisher. Keep `index.js`/legacy service untouched as baseline while new app boots in **offline/no-send mode**. No source duplication beyond temporary migration adapters.

**Gate:** Starts without live Discord writes; generic handlers register, reject unknown operations, enforce source/actor and expected revision, read accepted packets, retain trace IDs; no current-game rule accidentally executed by model text.

### Phase R2 — Audience, actor knowledge, memory, canon substrate

**Work:** Port audience entitlement/authorization, source-closure, principal and scene validation, actor-specific cognition, source-aware context planner, source-backed history, weighted memory and independent high-impact canon review. Split GM-private vs audience-scoped prompt contexts. Remove V9 `task_id` requirement from newly issued grants; preserve its immutable recipient, source, scene, principal and view proof. Add generic `context_read` and `knowledge_propose` tools. Implement actor-known vs audience-entitled intersection.

**Gate:** No private/GM/cross-PC facts in non-entitled packet (including indirect source references, NPC quotations, cache records and stale snapshots). Source revocation invalidates a pending grant. Salience cannot promote rumors or identities to protected canon. GM-only imported hooks never appear in player export.

### Phase R3 — Generic action dispatcher and Daggerheart ruleset parity

**Work:** Rehost deterministic rule mechanics behind versioned generic action descriptions and one `action_propose`/`state_inspect` interface. Port roll request/PC roll owner, NPC/GM RNG, thresholds, Hope/Fear, spotlight windows, reaction/interrupt, cost, damage/armor, consent, PvP, injury/death, movement/access, item/equipment, economy, downtime and house rules. Register all current operations as internal rule definitions; replace hardcoded AI-exposed operation names. Adapt `applyAuthoritativeMutation` transaction semantics and `previewAuthoritativeMutation` no-effect dry run. No generic direct-write actions.

**Gate:** New rules produce equivalent outcomes to current authoritative rules for identical inputs and **fixed native RNG streams** where permitted; no fabricated outcomes. Pre-roll Difficulty/stakes are published before PC dice. Concurrent and repeated proposals cannot double-spend, double-roll, force consent or change another owner's PC. Fear expenditure notices issued as required, including pre-roll timing. Protected PvP/death owner choices still work.

### Phase R4 — Direct conversational GM and prose security

**Work:** Implement one audience-safe conversation model path. Permit NPC language, voices, counteroffers, interruptions, lies, humor, environmental details and creative approaches. No mandatory typed-intent, `gmSchema`, V7/V8/V9 act, native scene task, task coverage or `state_review`. Route consequential attempts to generic action proposal only when required. Model provider neutral, short authoritative prompt, dynamic scoped retrieval. Create small native publication segment record and targeted **consequential** material review. Build local per-segment repair and discard old unpublishable drafts as private diagnostics.

**Gate:** Every ordinary interaction can receive a useful natural response with **one** inference call and no native action; NPC may address a PC by name. PC choices never assigned; no unsupported successful move/roll/possession/consent; private data absent from packet. A harmless withheld segment cannot cause valid independent siblings or the turn itself to disappear silently.

### Phase R5 — Autonomous Director and living NPC behavior

**Work:** Add private event/fictitious-time pressure scheduler. Model NPC goals, knowledge, resources and actor motivation, active scene response, background plans and genuine failure. Director emits generic action/knowledge proposals and narrow observable dramatic beats. No random wall-clock advancement. Extend salience to relationships and emerging faction connections without privileging salience as authority. Track attention fairness and pending player response opportunities.

**Gate:** NPC and faction actions advance independently when fictional opportunities exist; they can also decline to act. Plans cannot force player acceptance or retroactively establish secret truth. The Director cannot disclose GM-private results to unauthorized writer or bypass Daggerheart/Fear costs.

### Phase R6 — Multiplayer, private scenes, sessions and all commands

**Work:** Rebuild the thin Discord gateway for party/private/GM/admin/rules-desk/voice and passive spectators. Preserve role assignment, NPC proxies, ambiguous control resolution, character creation/import/export, session opening/late entry, handouts, combat/roll/consent forms, GM correction/canon conflict and review commands, faction/Director status, downtime and operations. Ensure source-to-recipient mapping is first-class in every turn. Rewrite assembly/opening as special **scene occasions**, not standalone narrative-generation versions. Use the same generic audience writer. Handle multi-player simultaneous intentions and important pending actions.

**Gate:** Multiple participants receive the correct shared and private details; absent characters do not spontaneously act; an NPC proxy is controlled by its legitimate human; no cross-user private leakage; first scene and late entries are playable; no fixed initiative enforced in non-mechanical storytelling; commands and imports meet R0 compatibility list.

### Phase R7 — Migration, durability, publication and performance

**Work:** Build a read-only importer from the existing schema and snapshots, original ID mapping, semantic projections and option to audit diff, rollback snapshot. Wire durable outbox, idempotent audience publication, discord message acknowledgement, uncertain-send reconciliation and archive. Add real usage/cost/latency tracing per scene, model call, tool proposal, retry, hold and actual delivered part. Ensure fallback for optional memory/Director failure; never fake native consequences.

**Gate:** Source/owner/recipient/receipt consistency survives restart, crash, replay and concurrent processing. No duplicated effects, rolls or Discord output. Private memory only updates after acknowledgement. Performance targets are set from observed baseline and measured live-like runs; no unverified speed claim.

### Phase R8 — Cutover, removal and release qualification

**Work:** Run new app in replay/shadow/no-send against controlled fixtures and approved observed play. Complete narrative-quality review, mechanical parity, privacy attack tests and fault injection. Generate deletion list with zero import/command consumers and migration parity proofs. **Only then** delete specialized *AI-facing* native tools, mandatory typed intent orchestration, V7/V8/V9 writer contracts and their runtime wrappers, redundant duplicate composer wiring, stale flags and obsolete tests whose coverage is replaced. Keep historical conversion reader only. Produce a clean runtime dependency graph with no dual GM path.

**Gate:** All critical invariants and quality acceptance checks pass. A human owner authorizes deployment/cutover separately. Migration reversibility, backups, feature logs and fallback plan are documented. Never infer that test pass = live qualification.

---

## 11. REQUIRED TEST PROGRAM (DETERMINISTIC + HUMAN EVALUATION)

### 11.1 Behavioral scenarios (minimum)

Each scenario records: exact authored input, actor/recipient/scene, relevant fact/knowledge/canon state, expected permissions, expected player-facing behavior, expected engine action and event/receipt disposition, output audience, unresolved choice, model call count, latency, and delivery receipt.

| ID | Input/scenario | Required behavior | Forbidden behavior |
|---|---|---|---|
| C01 | Ordinary friendly NPC conversation; player says only “Interesting.” | NPC reacts naturally or the scene appropriately breathes without typed intent | A fabricated action or `type=other` requirement |
| C02 | Indirect need: “I can't afford this rent” | NPC/setting responds with a plausible opportunity or opinion | Automatically accepting a job or awarding money |
| C03 | Player quotes an attempted action as rumor | Preserve reported speech | Execute quoted movement, damage or payment |
| C04 | Player uses an unusual creative tactic | Plausible GM interpretation; rule only if material uncertainty | “Unsupported intent” because no taxonomy value exists |
| C05 | NPC addresses PC by full name | Natural authorized direct address | Lexical PC-name hold |
| C06 | NPC alleges another NPC is criminal | Attributed speech/belief, possible investigation | Automatic canon fact of guilt |
| C07 | Player says “I go through the locked door” | Resolve access with native permission, potential check; conditionally narrate | Guaranteed arrival without access proof |
| C08 | PC attacks a foe | State Difficulty/stakes first; await *real* PC duality dice | Fabricated faces or success before roll |
| C09 | NPC attacks with pre-roll Fear opportunity | Correct Fear announcement and native ordering | Hidden or invented Fear expenditure |
| C10 | PvP target without consent | Consent/ownership pathway | Damage to target PC by narrative fiat |
| C11 | Mortal/death-choice event | Native owner death-move options and RNG only as rule permits | AI chooses PC's death move |
| C12 | NPC proxy currently controlled by human | Model portrays world reaction only | AI speaks/moves voluntary proxy actions |
| C13 | One PC privately discovers faction clue | Only correct private output and knowledge acknowledgement | Party/Spectator receives clue or GM-only cause |
| C14 | GM knows an NPC is lying | NPC speaks plausibly from actual character knowledge; player hears testimony | Audience writer receives and leaks private truth |
| C15 | Player tries to canonize a building by asking “Is this the mayor's secret palace?” | May establish a separate ordinary place with GM independent choice or deny it based on state | Player assertion directly creates protected canon |
| C16 | Ordinary new named NPC recurs after several sessions | Stable identity, relationships and appropriate memories | New duplicate NPC on every scene or truth promotion from mentions |
| C17 | Two PCs act concurrently on contested objective | Response window/coordination, fair spotlight, native resolutions | First writer silently determines the other PC's choice |
| C18 | Faction acts during downtime | Real fictional-time action with source and consequences | Overnight real-time punishment or clock tick without fiction |
| C19 | GM writer fails; independent facts/rolls committed | Correct receipts preserved; safe authorized response/notice; no reroll | Generic error masking committed state or secret leak fallback |
| C20 | Discord returns ambiguous send acknowledgement | Hold uncertain result for exact reconciliation | Blind resend, double-message, double-memory |
| C21 | Player in one private scene, party in another | Explicit different audiences and scene contexts | Cross-scene co-location or leaked dialogue |
| C22 | Newly described locked service door is not a map object | Natural atmospheric fiction; durable key added only if consequential | Forced current-scene movement or compulsory location creation in same sentence |
| C23 | GM generated secret hook/proposed canon imported | Privately influences eligible foreshadowing; review if needed | Raw private hook on player character export or direct exposition |
| C24 | NPC changes mind after discovering contradictory evidence | Revises belief while preserving old memory/claim lineage | Rewrites objective history or retroactively deletes earlier speech |
| C25 | Audience writer contains normal second-person perception | Approve actual sensory access | Generic “you”/PC-name ban without material violation |
| C26 | Held one paragraph of multipart scene | Withhold/repair only that segment and publish valid siblings | Re-run state mutation, lose all narration, or publish unauthorized partial secret |

### 11.2 Native invariants

1. Every mechanical effect has one unique, verified, replay-safe receipt; same input reprocessing is idempotent.
2. Every player-owned decision, roll, spend, consent, death move and proxy action traces to the authenticated current principal or explicit recognized delegation.
3. GM/NPC rolls are produced through native RNG and recorded with sufficient verification; model cannot choose faces or alter them for story.
4. All mechanics are sourced to Daggerheart SRD 2.0 + project house rules, with rule IDs/revision; no accidental conventional fixed-turn initiative.
5. Snapshot/preview never draws real random dice, consumes resources or delivers messages.
6. Committed, prepared, published, delivered and player-known are distinct states, including crash/replay.
7. No action is implicitly permitted because an NPC offered it, a player imagined it, or a model claimed it.
8. Source revisions, actor control revisions and audience permissions revalidate at execution **and** publication.
9. In-game time and wall time are not conflated.
10. All alternate ruleset handlers run behind the *same generic action envelope*, not bespoke model tools.

### 11.3 Red-team security

Include deliberate attacks via quoted secrets, NPC lies, prompt-injection attempts in handouts/documents, hidden GM notes, mislabeled audience, alternate spellings, nicknames, source-referenced paraphrase, stale recipient, proxy-role change, deleted facts, compromised private Discord channel permissions, and narrative paraphrases of canonical answers. Tests must prove *unauthorized source isolation*, not just substring matching. Any confidential context reaching a player-facing model is a security design defect even if the generated prose happened not to reveal it in the fixture.

### 11.4 Human GM-quality evaluation

Blind review the same situations under old and new pipelines. Rate (1–5) vividness, NPC individual voice, initiative, causal continuity, responsiveness to indirect intent, meaningful choice, natural pacing, avoidance of repetitive menus, agency fidelity, privacy correctness and mechanics fidelity. Collect independent human judgments for a fixed set of scenarios; do not tune only on the examples in this document. Track number of model calls and prompt tokens per player-relevant response, time to first meaningful prose, time to committed mechanic and actual successful Discord delivery.

**Performance objective (proposal, not measured fact):** one model request in the common conversational lane; extra private planning or tool round trip only when they produce a material benefit. Establish quantitative p50/p95 and token/cost targets **after** measuring old baseline on comparable hardware, model and live-like conditions, then enforce regression budgets. Avoid fixed arbitrary thresholds that reward shallow prose or prevent required rules checks.

---

## 12. IMPLEMENTATION QUALITY, PROJECT STRUCTURE AND ANTI-PATTERNS

### 12.1 Suggested new source layout (Astra may choose different exact paths with reasons)

```text
bot/src/v2/
  app/             event-to-GM workflow, scene/session lifecycle
  auth/            principal, actor/proxy control, audience ACLs, grants
  context/         retrieval planner, source/provenance, scoped prompt packets
  gm/              conversational GM, private Director, NPC portrayal, repair
  kernel/          generic operation contracts, registry, revisions, receipts
  rules/daggerheart/ ruleset-native pure calculations, costs, player choice
  rules/veiled-city/ house rule extensions and verified content adapters
  world/           actors, scenes, fictional time, action opportunities
  knowledge/       lore, canon, beliefs, evidence, weighted memory
  persistence/     repositories, transactions, migrations
  transport/       model adapter, Discord adapter, optional voice
  publication/     audience-safe output segments and durable outbox
```

This is not a command to split a five-line function into a separate module. Maintain cohesive ownership and minimal public ports. **One source of truth per rule and per permission.** Avoid dependency cycles and service locator forests. Static dependency checks should forbid GM model code importing direct SQL or Discord send functions and forbid a ruleset importing GM prose.

### 12.2 Prohibited rebuild anti-patterns

- Recreate mandatory `player_intents` under a new name such as `semantic_actions` for all dialogue.
- Add an AI model “safety reviewer” that is mandatory for every paragraph without actual privacy benefit.
- Allow generic `state.patch` / `run_sql` / `apply_damage` from unverified model arguments.
- Keep separate V7, V8, V9 and V10 narrator pipelines indefinitely “for compatibility”.
- Remove the player name ban but also remove genuine player-choice/consent safeguards.
- Pass a private planner's full output verbatim to the public writer.
- Treat one accepted NPC statement or repeated scene description as canonical history.
- Make a permanent NPC dossier for every incidental noise, door, shop sign or unnamed witness.
- Let a failed writer roll back a legitimately committed independent mechanical effect, or make a writer retry repeat a roll.
- Treat unresolved/outbox-uncertain as “delivered”; falsely tell a player an action succeeded or they know a secret.
- Automatically advance world state based on idle real-time to simulate “autonomy”.
- Over-engineer arbitrary type taxonomies, duplicate ports or microservices simply to reduce file lengths.

### 12.3 Why this is a real rebuild and not a cosmetic refactor

The old dependency direction is **GM inference → huge structured result → typed interpretation → native state preview → multiple authoring versions → publication part projection → outbox**, with interwoven correctness contracts. This rebuild changes the dependency direction to **authenticated situation → scoped conversational GM → *optional* generic native operation → authoritative result → scoped publication**, plus **private autonomous world planning** when justified. The difference is architectural, not a prompt change.

---

## 13. REQUIRED ASTRA 6 HANDOFF REPORT AT THE END OF EACH PHASE

Provide:

- Phase ID, pinned baseline and current new-branch commit SHA.
- Objective and exactly which old pathways are replaced/ported/removed (function/path/line/range, accurate to current branch).
- New generic contracts/operation definitions and why the design meets Audience-First/Creative-First/Agency-Preserving/Weighted Lore.
- DB changes, content/ruleset behavior and any explicit migration mapping.
- Tests executed: exact *fresh* test paths/commands, pass/fail/skipped, real elapsed evidence, source hashes; no unexecuted claim.
- Privacy/agency/roll/canon/replay/delivery regression findings, and evidence of actual model/Discord use when present.
- Performance: measured provider call counts, token costs, latency and where extra calls were justified.
- Remaining compatibility consumers and zero-consumer deletion proofs.
- Known risks and recovery plan, without concealing holds as passes.
- Next phase, exact changed files and gate. No premature deployment.

**Final release report** must include architectural dependency graph, command parity matrix, character package compatibility table, all critical mechanical parity results, secret-leak red-team results, quality test outcomes, migration dry-run and rollback report, live-ready configuration guide, and explicit owner deployment decision.

---

## 14. FIRST COMMANDS / STARTING WORK PACKAGE FOR ASTRA 6

1. Check out exactly `1ba6c7e15db1a66ba34b36336f31437beffe44d6` as comparison baseline; inspect upstream changes before any integration. Read `AGENTS.md` and four behavior frameworks plus owner specification.
2. Create new branch/worktree and a non-sending experimental app entry point; do not overwrite the running bot.
3. Produce exhaustive import/export/command/module and database dependency inventory from source. Confirm actual model/tool and Daggerheart SRD/house rule definitions rather than taking design assumptions on faith.
4. Publish `RULE_PARITY_MATRIX.md` and `GENERIC_NATIVE_API.md`: exact generic tool signatures, trusted server-injected properties, ruleset action disposition taxonomy and proof boundaries. Obtain internal architecture acceptance through tests; do not require user to answer an already resolved design question.
5. Build R1 and R2 first: source/provenance, audience grants without V9 tasks, scoped context and read-only conversation with no write/effect capabilities. Prove no privacy or ownership leak before enabling generic action commits.
6. Progress through R3–R8 gates. Keep implementations small and cohesive; once new coverage passes, delete retired code rather than retaining duplicate live pathways.

## 15. COMPLETION CONTRACT

The rebuild is complete only when all of the following are true:

- Ordinary roleplay is spontaneous and substantive with **zero mandatory typed-intent work**, zero forced GM state matrices and typically one inference call.
- The GM can invent people, customs, objects and environmental texture autonomously without making uncommitted mechanics/canon true.
- Distinct NPCs pursue their own believable agendas; weighted memory and historical causes guide future scenes.
- Every consequential PC/NPC/world operation enters through a small set of generic AI-facing tools and a common validated native engine. No specialized native model tools remain.
- All Daggerheart/Veiled City rules and owner-controlled decisions are mechanically authoritative; no invented rolls, Fear, resources, damage, consent or death choices.
- GM private and player private knowledge cannot appear in another audience's context or published prose without authorized disclosure.
- Character package, GM hook/canon, campaign/scene/roll/downtime/command and source history compatibility are demonstrated with tests and dry-run migration.
- Discord publication/outbox is idempotent and recovers crashes and uncertain sends without silently discarding narration or double-publishing actions.
- Prose quality is independently judged to be clearly more human, less formulaic and more responsive than the old pipeline, without observed critical privacy, agency, mechanics or canon failures in the defined acceptance suite (report actual evidence and sample limitations).
- Legacy code whose function has been replaced has no active import/runtime consumer; one cohesive production GM pipeline remains; the owner controls release.

> **Final mandate to Astra 6:** Do not rebuild Veilkeeper into a new kind of rules form. Rebuild it into **a creative, autonomous, impartial human-feeling GM** whose world has memory, consequences and secrets. Make the boundary between spoken fiction and authoritative state narrow, explicit and reliable. Protect player authority and audience privacy rigorously, but let the GM speak, invent and react like a person. The objective is not for Veilkeeper to tell players a story; it is to create a living world in which player choices produce stories worth telling.
