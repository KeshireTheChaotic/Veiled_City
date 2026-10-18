# Veiled City — Granularity-Aware World Director and Bidirectional Audience-First Contract

**Design revision:** v1.2, 2026-10-17, proposed architecture, not implemented.  
**Integration baseline:** `KeshireTheChaotic/Veiled_City`, `codex/audience-first-narrative-v9` at `47c5d35f90df2e5a69e406e857bbc946ce0957bf`.  
**Companion:** `VEILED_CITY_CONSOLIDATED_MULTI_AGENT_PLAN_v1_3.md`.

## Executive decision

Adopt hybrid **Unified AI GM + Autonomous Actors + Event-Driven Resolution** with a single `WorldDirectorCoordinator`, a **coarse-to-fine simulation ladder**, and a **bidirectional, typed, source-verified contract** with Audience-First v9. The Director decides what autonomous world actors try; native engines resolve whether it actually happens; Audience-First communicates only established, recipient-entitled outcomes. Audience-First's verified observations, player intentions, dialogues and coverage needs also inform Director opportunity selection. Neither system may directly mutate truth by generated prose. **Player-authored input is never an identity-establishment or canon authority; only an independently qualified AI-GM native action or one of the existing scoped GM-private-hook, relationship and canon workflows may establish new world facts.**

**The key optimization:** the *world state* need not equal a row for every NPC action, every simulated minute, or every AI suggestion. Retain durable aggregate snapshots and consequential native receipts; keep uncommitted opportunities, planning candidates and inert ambient beats transient.

## 1. Simulation resolution ladder and storage

| Tier | Resident state | Execution cadence | Promotion condition | Demotion product |
|---|---|---|---|---|
| `L0/background` city/distant organizations | District/faction pressure, stance, resources, goals and coarse clocks as aggregates | Deterministic on meaningful fictional-time advances, **no individual LLM calls** | Player linkage, strong causal threat, nearing clock deadline, operator-defined pivotal story fact | Compact aggregate update; material source receipts retained |
| `L1/active_world` nearby regions and relevant faction operations | Sparse actor references, relevant projects, named strategic threat, bounded pending opportunities | Batch once per round/scene or meaningful clock step | Visible encounter opportunity, interaction, direct influence of PC actions | Updated L0 summary plus outstanding effects and source ancestry |
| `L2/scene` local named NPCs and playable situations | Native presence, source-backed knowledge, current motives, conversation, declared immediate actions | Existing GM scene turn, prefer **same planning model call** | Actual encounter with valid actors/stakes, explicit new scene entry | L1 event/knowledge summary; preserve canonical NPC identity and sourced memories |
| `L3/encounter` exact participants and effects | Current native combatant, HP, Stress, Evasion, initiative/spotlight, targets, features and pending owner options | Exact native encounter windows | Enters via source-verified encounter or approved native activation path, not inferred threat label | Exact outcome/death/Armor/condition receipts, witness and consequence events |

An entity may remain canonical while *inactive*: promote **simulation detail**, not necessarily existence. Do not delete established identities or overwrite historical NPC memories on demotion. Do not instantiate full battle stats for an ambient tavern patron; only a sourced eligible encounter with an exact existing approved adversary template gets those stats. No ambient narrator paragraph creates mechanical adversary capability.

### Aggregate example

A single current-source `district_pulse` may summarize `pale-court` pressure, investigation priority, threat and resource band within `north-district`; there is no need for ten simulated covert-agent attempts. When a PC crosses into that region and triggers relevant context, materialize **one** warranted operative or investigative operation with a native source. NPC identity, encounter template and secret knowledge remain separately authorized.

### Storage rules

1. **Persist consequential state, not deliberation.** Save aggregate revisions, materialized entity changes, verified native effects, pivotal clock transitions, delivered/witnessed disclosure evidence and outbox obligations. Do not save every discarded plan, idle NPC tick, repeated summary, or speculative model option as a new durable game event. Existing mandatory native provenance records remain mandatory for all executed effects.
2. **Fixed-size snapshots and changesets.** Use one versioned aggregate per scope/key and one coalesced `world_pulse` per meaningful fictional-time unit where feasible; reference old source IDs rather than duplicating long narrative strings. Separate immutable causal events from replaceable derived caches; never compact away active source proofs or historical readers required for replay.
3. **No per-NPC background LLM jobs.** Deterministic goal/pressure progression handles L0. L1 opportunities are ranked and batched; only high-salience unresolved choices enter a shared GM model call. Offscreen changes must obey actual fictional-time pacing; never update every few wall-clock seconds.
4. **Budget by affected scope.** Starter test budgets (tune by benchmark): up to 4 active world scopes, up to 8 nominated world actors, up to 4 actionable proposals per Director opportunity, and at most 1 high-impact committed world changeset per scope per opportunity. These are **engineering starting budgets**, not existing settings or asserted final optimal values. Higher throughput must preserve source, independent PC actions and critical consequences; over-budget work is queued or coalesced, not silently dropped.
5. **Prompt context is a projection, not a dump.** Include only eligible local active sources, a small relevant world-summary excerpt and explicitly resolved task/receipt IDs. Keep costs/tokens and omitted coverage as measurable diagnostics; do not turn summaries into a new authority or new NPC knowledge.
6. **Memory and knowledge isolation.** World aggregate truth, faction beliefs, individual NPC knowledge and player-visible observations are four distinct stores/projections. A private player conversation never becomes city-wide faction intelligence merely because the Director saw the transcript in a GM context.

## 1A. Weighted transient detail → recurring world identity → canon (required integration)

**Product decision:** Narrative invention is allowed to become canon organically. Reuse the *existing* weighted, fictional-time salience lifecycle rather than creating a competing short-lived entity store or requiring a human GM to promote every incidental person, neighborhood or faction. Weight determines *relevance and readiness to establish*; source-bound native proof determines *what is actually true*. Ordinary new world details may canonize **automatically** when the established proof boundary is satisfied, without a feature toggle or discretionary manual approval.

### Existing source behavior, and the addition needed

- `bot/src/narrative-salience.js` already saves `narrative_interest`/`narrative_salience`, weights player mentions/interactions and GM reuse, decays them with fictional ticks and returns `incidental` (<4), `supporting` (4–9), `recurring` (10–19), or `anchor` (≥20, or pinned). After sufficient neglect an unpinned profile becomes `prompt_archived`; this **does not delete** the entity or change its truth. Existing weighted profiles are audience-scoped. Current source explicitly labels salience **retrieval/prompt selection only**, so *automatic canon establishment is an implementation delta*, not a present behavior.
- `bot/src/memory-lifecycle.js` already supports source-scoped identity and epistemic revisions (`observation`, `testimony`, `inference`, `claimed_result`, `native_fact`, etc.), expirations, corrections and retractions. It does **not** currently accept `faction` or `district` as memory kinds; add those through an additive versioned schema/reader instead of reusing `npc`/`location` improperly.
- `bot/src/autonomous-world.js` already creates **real source-backed ordinary `npc` and `location` entities**, with identity collision checks, presence and zero-capability NPC state. Preserve this route. New **faction, organization and district** identities need bounded native adapters that can initially hold only name, aliases, parent/area, ordinary description, visibility, source and identity. No automatic granting of territory, jurisdiction, agents, wealth, encounters, membership or secret knowledge merely from a name.

### Lifecycle, automatic transitions and authority

| Weighted/fiction state | Director behavior | Persistence and truth |
|---|---|---|
| **Fleeting** scene detail | Narrate a passerby, rumored syndicate, or place detail with an entitled scene source; prefer unnamed ambient description unless identity needed | Existing narrative unit/source or in-memory candidate; do **not** automatically create full simulation actor or repeated rows |
| **Supporting** (score ≥4, or meaningful native source) | Stabilize/reuse entity alias and parent; keep a sparse source-bound continuity identity | `memory_identity`/revision or native existing `autonomous_entity` pointer only when actually materialized |
| **Recurring** (score ≥10) | Prefer same identity across scenes, select it for bounded L1/L2 world opportunities; consider upgrading NPC/faction/district narrative role | Compact aggregate salience and a qualified ordinary identity; any real location/NPC creation uses its native establishment adapter |
| **Anchor/canon eligible** (score ≥20 or proven native anchor) | **Automatically promote independently GM/native-established or duly hook/relationship/canon-authorized, nonconflicting mundane identities and qualified facts** into persistent canonical world references. Pin if consequential player/scene relationships or obligations depend on them | Source-verified native `world_identity_promotion`/equivalent receipt with fact scope and identity version; no model-only `canonical:true`, no fabricated governing powers/authority |
| **Dormant/archive** (low weight after fictional time) | Remove from prompt shortlist and detailed NPC/faction simulation; retain a compact rediscovery identity and aggregate history | Existing `prompt_archived` pattern; source/canon/accepted knowledge and immutable effects **stay**. A genuinely canonical identity may become inactive, never retroactively unreal |

These cutoffs reflect the **existing source ranking tiers** and are provisional promotion triggers, not proof that current code already writes canon. Calibrate against real replay cases. A valid direct GM-established NPC or place **need not accumulate 20 points before existing in fiction**: native `establishNarrativeEntity` can immediately establish its limited identity and presence. High accumulated weight makes a detail enduring and strategically relevant; it does not substitute for native establishment.

**Two axes, not one:** Track `narrative_significance` (weighted salience, can fade) independently from `truth_authority` (`proposed`, `attributed_claim`, `observed_fiction`, `native_established`, `canon_committed`). A rumor mentioned 20 times becomes a prominent **canonical rumor**, not verified proof that its alleged faction actually exists. An independently established mundane faction identity may become canon once legitimate GM fiction/scene events and unambiguous source proof support it. Changing protected global canon, overwriting an established conflicting fact, PC-controlled membership, major supernatural law or granting mechanics still needs the *appropriate native resolver*; unsupported cases enter a scoped review, while ordinary canonical continuity needs **no human approval**.

**Audience isolation:** Existing salience is per recipient/subject. Private interest can make a character-private NPC, clue or rumor sticky for that audience, but does not publish it to party/global readers. A GM-owned factual entity can exist without a public disclosure. An unapproved private player assertion cannot become a GM-private hook merely because it is spoken in a private channel. Recheck listener knowledge and publication visibility independently from the weight score.

### Weight events and database/API cost rules

1. **Earn weight only after authoritative existence:** owner-authored repeated references to an **already GM-established or otherwise duly authorized entity**, meaningful interactions, verified reappearances, resolved native effects, source-validated story hooks. An unverified new name/claim can be interesting conversational input but cannot bootstrap an entity or promotion score. Reward distinct scenes/actors and causal commitments more than self-generated filler. Native/GM-authored dialogue may contribute a modest reuse signal, not independently prove its content.
2. **Anti-feedback:** the same source/scene/model-produced paragraph cannot repeatedly re-award importance by Director→narrator→Director echo. Deduplicate by original cause and audience, cap incidental reuse per scene, and do not treat writer outputs as second independent proof.
3. **Sparse storage:** no row per background mention, every tick, or every speculative candidate. Reuse existing event/source IDs; aggregate accumulated weight and last-meaningful-tick in a versioned salience profile, with bounded milestone/proof references. Persist new identity/promotion receipts only at actual transitions or source-backed meaningful changes; preserve historical immutable records and legacy readers.
4. **Pin actual commitments:** canonical ledger ancestry, current PC/NPC occupancy, active scenes/encounters, witness-dependent memories, relationships, clues, obligations, active investigation/strategy, resolved mechanical consequences and pending outbox/native choices. High narrative weight alone can expire; irreversible outcomes remain stable.
5. **Resurrection/reuse:** a returning archived nickname/alias resolves to its original parent/audience-scoped identity when authorized; restore prompt presence and weighted interest instead of silently creating another NPC, faction or district. On source retraction, recompute eligible weight and remove unsupported newly claimed facts **without deleting previously committed independent native outcomes**.

### Must-pass synthetic acceptance examples

- An **AI-GM/native-created** market NPC becomes recurring across **independent** player conversations, is eventually anchored by real source-grounded actions, and later returns under the **same identity** without GM prompts or approval.
- An invented neighborhood/district receives a stable scoped name and reference, but has no invented jurisdiction, map connectivity or economic power until its native district/location adapters validate those effects.
- An NPC rumor about the “Ash Lantern Circle” becomes a significant remembered rumor after repeated references; the Circle is **not** silently created as an objective active faction without independent credible in-world establishment.
- Three narrator retries of one passage, or a Director→writer→Director loop, count at most one qualified salience contribution; idle offscreen entities consume no extra model requests and no per-tick actor rows.
- After six+ fictional ticks of genuine disuse (subject to existing exact decay/retirement rule), an unpinned supporting extra leaves routine prompt context but remains recoverable. A consequential canonical NPC can go dormant without erasing witnessed interactions or saved facts.
- A private player's interest cannot disclose the NPC/rumor to another audience or global faction. A revoked original source suppresses unsupported new publication and weight without rerolling or reversing previously legitimate effects.

## 1B. Player authorship boundary — no world creation by assertion (required)

**Product decision:** A player may declare only their character's own intended actions, speech, questions, perceptions-as-claims, and proposals. Their ordinary input **cannot establish, summon, name into existence, own, equip, relocate, staff or authorize** an NPC, faction, institution, organization, district, location, clue, artifact, safehouse, contact, relationship, or world fact. This is true even if the player repeats an assertion, includes it in a semantic intent, uses a plausible key, or appears in a private chat. Audience-First may faithfully quote the assertion as a **claim**; it cannot project it as an observed objective truth. The AI GM may independently decide to invent an appropriate thing after source-grounded world/scene reasoning, but a direct echo of the player's proposed fact is not independent establishment.

### Narrow sanctioned authorship pathways

| Origin / pathway | Permitted effect | Required proof / restrictions |
|---|---|---|
| `owner_input` (ordinary speech, typed intent, query, character narration) | Player action/request, NPC-attributed hearsay if actually spoken/heard, or hypothesis; may *request* that the AI GM search or introduce something | **Cannot mint** `world_additions`, `autonomous_entity`, canonical reference, faction/district records, world weight on a nonexistent subject, relationship truth, equipment or public fact |
| `native_ai_gm` (GM-created fiction / Director decision) | GM invents a bounded ordinary NPC, place, background faction/organization/district identity; may mature via weighted salience | Independently minted native GM scope/proposal, source/current scene/identity checks, recipient rights; NPC starts without combat template, wealth, new secret knowledge or powers |
| `gm_private_hook` (authorized structured GM hook or import) | Establishes a **GM-private premise/seed** or source for subsequent native GM materialization; may anchor a hidden relationship or entity | Genuine authenticated hook/import provenance; permission/visibility and character scope; GM-private seed is not automatically public truth or participant knowledge |
| `authorized_relationship` | A player may explicitly author/propose an allowed relationship/backstory connection through the existing relationship workflow; accepted edges may become established continuity | Native actor/endpoint existence, owner permissions, any needed GM acceptance, source proof, directional scope; does not invent the other party's independent actions, feelings, allegiance, resources or control |
| `approved_canon` | Explicit player-authored canon proposal may become binding world canon via the existing canonical resolution route | GM/native canon acceptance/receipt, conflicting-fact resolution and appropriate visibility; private player proposals cannot directly write global canon |
| `native_effect` | A real action may establish an observed consequence, discovery, fact or result | Committed native receipt, rules/source/owner/target proof; player input alone is not the receipt |

**Implementation boundary:** Introduce a small server-owned `authorship_origin_v1` authorization classification or equivalent closed native check **at both candidate creation and materialization**. No model JSON value, natural-language confidence, `gm:true`, `actor_type:'gm'` string, in-chat roleplay or suggestion can mint a trusted origin. `WorldNarrativeBridge` accepts owner-origin inputs only as non-authoritative `declared_intent`, `query`, `reported_claim`, `hypothesis`, or `proposal_request`. It emits candidate world creation only from genuinely GM-native proposals or approved scoped authoring receipts. The canonicality/authority field is computed by native code, **never supplied by a model**.

### Close the existing same-turn promotion loophole

`bot/src/entity-memory.js:tierWorldAdditions()` currently retains model-proposed `world_additions` as durable when their names appear in *authenticated player text*, are a same-turn intent target, are targeted by a scene action, or appear in model narration. These are **relevance/durability heuristics, not proof of world authorship**. Refactor this adapter to require an independently authorized native AI-GM invention or sanctioned authored-source receipt **before** player naming/targeting may increase its durability. Preserve a direct path for legitimate AI-GM invention to answer open-ended needs (e.g., “I seek a document forger”), but **do not** automatically materialize an asserted contact (“My friend the document forger is waiting here”). Also verify `typed-intents.js` same-turn `world_additions` references, `autonomous-world.js` identity creation, `scene-intent-board.js`, `narrative-salience.js`/memory pinning, and delayed reader/restart paths obey the same trust split.

### Weighted salience without a player-fact injection path

1. **Existent GM-owned entity:** unique subsequent player interactions and independently verified native outcomes may increase salience, move incidental→supporting→recurring→anchor, and trigger source-qualified mundane canon/persistence automatically.
2. **Unproven asserted identity:** player repetition never creates a salience identity, true world target, new faction or canonical relationship. A claim can be recorded as *that speaker's report* only when an existing authenticated speech/memory adapter qualifies it, never as a new object for weighted auto-promotion.
3. **Private hooks, relationships, canon:** when a supported authorship process approves/commits an identity or connection, **its native receipt becomes the establishment source**. From that point ordinary weighted lifecycle can operate, under its original audience and epistemic scope.
4. **GM choice from player need:** an owner says “I look for work”; AI GM may choose to invent a recruiter. Creation is justified by separately authenticated native GM opportunity/decision, not by treating the player's words “there is a recruiter” as a canonical fact. These paths must be distinguishable in audit/replay.
5. **Truth vs. belief:** even a highly weighted rumor is canon only as *a rumor that was actually said/heard*. The alleged faction, culprit, injury, secret or supernatural phenomenon needs its own independently qualified establishment proof.

### Must-pass adversarial cases

- Ten repeated assertions “The Ashen Circle runs this district” → no new faction/district, canonical claim or weight sufficient to establish one; if actually spoken to an eligible NPC, that NPC may remember it as a report.
- “I arrive at my unregistered private headquarters” → no location creation, placement, access or ownership; established-location checks still run.
- An owner uses a same-turn `world_additions` name in their text; a model echoes it → no native GM creation source means no identity persistence.
- “I'm looking for a forger” → independently authored/qualified GM scene may invent an ordinary NPC with bounded identity; later real interaction weights the **GM-established** identity.
- Authentic approved relationship introducing a sister named Mara → eligible scoped relationship/native identity established **once**; does not invent Mara's actions, knowledge or affiliation. Unapproved narrative claim about Mara does not.
- Private GM-hook import mentions a rival faction → GM-private seed remains private; only validated Director materialization creates any active-world actor. Neither hook nor player sees a public promotion merely from high private interest.
- Explicit player canon proposal → proposal only until canonical acceptance; approved receipt can establish truth without extra *routine world-simulation* approval. Original conflict and privacy checks still apply.
- Forged `gm:true`, model-authored `authoritative:true`, fake hook ID, stale relationship acceptance, source retraction, wrong owner or cross-recipient promotion → no creation/projection; other independently valid native effects remain intact.
- Director→narrator→Director loops and narrated mentions do not accrue fresh independent weight, create new actors or inflate background DB writes.

## 2. Bidirectional Director ↔ Audience-First contract

Add a small shared `WorldNarrativeBridge` (server-only native broker), **not** a second freeform chatbot. The player-to-world direction carries **intent/claims**, not player-authored existence; all world creation comes through the separately source-qualified native AI-GM or sanctioned authoring workflows described in §1B. All messages use versioned closed schemas, current source fingerprint, campaign/session/scene, actor/recipient audience, idempotency key, reason and explicit authority disposition. The broker validates provenance in both directions. Materialized world effect and prepared narration may be separate jobs, but they refer to the **same** authoritative native receipt.

### Audience-First → Director (`narrative_signal_v1`)

| Signal | Producer evidence | Permitted effect |
|---|---|---|
| `resolved_player_intent` | Accepted authenticated player intent + committed receipt | Update relevant world/actor opportunity ranking; may schedule native response |
| `witnessed_or_heard_event` | Current source, real listener/presence and audience entitlement | Update only **eligible witness/actor** knowledge; not global factual promotion |
| `conversation_development` | Verified NPC/PC attributed dialogue receipt | Inform eligible speaker's goals, offers, suspicions or relationships; allegations are not factual or consent proof |
| `scene_transition` | Native scene/placement receipt, not writer text | Promote relevant district/actors and re-evaluate pending local consequences |
| `unresolved_narrative_task` | Native `narrative_task_coverage`/`narrative_completion` diagnostic | Request an eligible scene hook, response or local opportunity; **coverage diagnostic is not a fictional event** |
| `player_discovered_clue` | Entitled clue/read/source event | Advance story relevance; propagate only to NPC/factions via real hearing, surveillance or transfer evidence |

Audience-First may *request* a Director opportunity; it cannot claim that a faction acted or a threat appeared by issuing the request. An attributed NPC rumor is a possible motivation, not world-established objective truth.

### Director → Audience-First (`world_beat_v1`)

| Beat | Required proof | Audience-First behavior |
|---|---|---|
| `established_world_change` | Committed native actor/world revision and source IDs | Narrate only entitled visible/known parts |
| `npc_intention_or_offer` | Current NPC actor/source/opportunity; no completed effect claimed | Compose offer/question/action attempt without committing PC acceptance |
| `scene_opportunity` | Valid scene/venue/actor access and world pressure basis | Add one playable, non-compulsory hook; no inferred PC movement |
| `encounter_candidate` | Native eligibility, participants, actor/template/scene/target evidence | Prepare/activate only through verified encounter and arbitration adapter; narrate after relevant stage commits |
| `world_consequence` | Completed native action/clock/resource/relationship effect | Surface observable effect and warranted witness knowledge; retain hidden consequences as hidden |
| `pacing_hint` | Bounded coverage/cadence diagnostics | Influence emphasis only; cannot grant world truth, resources or player choice |

Native broker decisions are `accepted`, `deferred`, `needs_native_adapter`, `stale_source`, or `rejected`, each with a truthful reason. **No producer may mark its own proposed task as answered or consequence resolved.** `world_beat_v1` is not directly a public message; Audience-First runs existing task/unit/reader checks before outbox delivery.

### Timing and transactional staging

```text
Authenticated player declaration or actual fictional-time advancement
    → existing semantic intake + accepted typed intent/source
    → WorldNarrativeBridge gathers ONLY verified signals
    → compact world-pulse context + local scene board
    → ONE existing GM planning/arbitration pass when required
         ├─ current PC task/roll proposals (owner controls choices)
         ├─ source-bound NPC immediate action proposals
         └─ world-scope opportunity candidates
    → native adapter validates and commits eligible actions/changesets
    → Director emits source-linked established world beats
    → Audience-First authoring uses actual receipts + verified speaker knowledge
    → audience-specific validation + prepared outbox + acknowledgment
    → witnessed narrative events generate NEXT bounded Director signals
```

**Prevent feedback loops:** Each signal has `causation_ref`, `world_cycle_ref`, `depth` and `origin_kind`; do not translate a Director-authored beat back into an independent new world event. Only a **new committed native fact, actual human action, authenticated disclosure, or real newly witnessed event** advances the causal graph. Exact deduplication keys are based on original source+scope+operation+cycle, not model request IDs. Enforce bounded depth and event budgets.

**No extra mandatory model round-trip.** The Director contributes a compact schema segment to the existing GM planning call where possible. The writer can narrate pre-established nonmechanical beats in the current call; whenever an outcome must wait for native RNG, owner Armor, death, or Fear choice, narrate only the actual result after that receipt is committed. Do not fabricate a success because the planner expected it. Any second provider call must be justified by measured improved coverage and counted toward existing latency/cost ceilings.

## 3. Unified autonomous authority (removing routine toggles and approvals)

Retire **routine operational feature toggles as required gameplay steps**. `institutions`, `emergent_goals`, `strategies`, `emergent_groups`, `consequences`, `audience_influence`, `minor_npcs`, `encounter_intelligence`, `tactical_memory`, `activity_density`, `narrative_relevance` and ordinary city/faction/organization/NPC routing become capabilities available **when their native adapters and actor-source predicates are satisfied**. Do not simply set flags to true and bypass the existing validators; migrate producer and every reader/continuation. Keep old configuration records readable for historical replay. Expose one campaign `director pause/resume` operational control and diagnostics, not fifteen switches needed for normal fiction.

Replace human-reviewed routine operation states with explicit **native GM authority** for supported actions. A faction may autonomously investigate, negotiate, recruit, contest, change posture, spend bounded resources, propose policy, trigger ordinary encounters, and issue native consequences if current, rule-grounded and source-verified. A high fictional impact alone is **not** a reason to require human approval if exact mechanics, actor capability, costs, target rights, scope and state transition are genuinely supported. Missing/ambiguous adapters create a **scoped hold** or a safe alternative, not model `gm:true` impersonation or generalized unrestricted writes.

Retain authenticated **player control** over voluntary PC choices (Hope, Armor, reactions, death, surrender, travel, Help, player organizations, consent and proxies); independent out-of-game safety/admin/retcon/production permissions; and canon/secret disclosure proof. These are **not** fictional-world microapprovals. Do not merge the future PvP policy change into this migration; preserve the existing consent contract until the separately qualified PvP/Fear release.

A player's privately held organizational interest is not automatically an autonomous NPC institution that can transfer player-owned property, change player commitments or spend a PC resource. Define `owner_control_type` for every candidate (`ai_world`, `player`, `proxy`, `admin`) and enforce it at both proposal and commit.

## 4. Native service reuse and suggested modules

**Do not build competing databases or rewrite all domain services.** The new coordinator should call existing services by stable adapters:

- `director.js`: existing scene/round cadence and blocked-action context; add world opportunities on real native trigger, not elapsed real time.
- `simulation.js`, `simulation-motivation.js`, `simulation-strategy.js`: L0/L1 actor/goal/strategy adapter, with batched significant updates and bounded promotion.
- `city-core.js`, `city-civic.js`, `city-groups.js`, `city-consequences.js`: L0/L1 city, institutional, faction and organization state adapters.
- `ai-intents.js`, `delegation-catalog.js`: migrate source-specific GM authorities and remove redundant `manual`/`suggest_only` requirements only for newly qualified `ai_world` operations. Retain manual/historical reader contracts and actual admin policies.
- `encounter.js`, `native-encounter-relations.js`, `gm-unified-arbitration.js`: L2→L3 validated encounter admission, native NPC opportunities, target/feature/defense owner rights. No fake combatant from ambient prose.
- `scene-intent-board.js`, `narrative-director-source.js`, `narrative-tasks.js`, `narrative-completeness.js`, `narrative-writer-v9.js`, `narrative-context.js`: typed bidirectional opportunity/coverage bridge and per-audience source-verified narrator. Extend with a **versioned additive sidecar**, never mutate historical v8/v9 saved payload hashes.
- `context-planner.js`: small source-entitled, relevance-ranked compact summaries and explicit omission diagnostics.
- `publication-outbox.js`: delivery state; uncertain sends never invent witness knowledge or trigger world changes.

Proposed new service boundaries (names provisional): `world-director-coordinator.js` (one cadence/orchestration), `world-resolution.js` (tier selection), `world-pulse.js` (aggregate revision and consequential changeset), `world-narrative-bridge.js` (typed two-way broker), `world-opportunity-adapters.js` (native domain routing), and `world-director-metrics.js` (cost/write observability). These are **small service interfaces**, not separate model agents.

## 5. Quality, performance and persistence acceptance

Test on disposable SQLite, fake provider and fake Discord, and preserve all old native security/authoring assertions:

1. **Background scale:** 100+ offscreen NPC entries/faction references produce no per-actor LLM requests, no per-tick per-NPC event spam; only aggregate changed scopes are persisted. Report actual row/write/token counts against baseline.
2. **Single-scene integration:** witnessed clue triggers eligible faction reaction; unobserved private secret does not. Director emits one source-bound offer; Audience-First publishes one valid NPC response, with no extra compulsory provider call.
3. **Two-way causality:** resolved player conversation affects only NPCs with verified hearing; a later faction reaction needs an actual communication/intelligence transfer, never a GM-context shortcut.
4. **Lazy promotion:** remote pressure→local operation→NPC scene→legitimate native encounter; demotion retains character identity, wounds/death outcomes, clocks, unresolved obligations, source refs and accepted disclosures.
5. **No duplicate effects:** retry/restart/source retraction does not replay resource costs, world decisions, native dice, player-owned options or Discord sends. Different actors' legitimate results survive an unsupported sibling.
6. **No feedback loops:** re-projected narration cannot generate another independent world event; cyclic director→narrative→director attempts terminate with an exact logged reason.
7. **No blanket approval:** properly supported institutional/faction/NPC action completes with native source and no human review. This does **not** remove the existing GM/native acceptance for player-authored canon or relationship creation. Forged principal, stale scene, unsupported template, wrong actor, missing resource, player-controlled organization and proxy cases fail closed.
8. **Narrative expressiveness:** no mandatory menus, no out-of-scene NPC speech, no false NPC fact claims, no private-to-public leak, no invented PC action/death/movement, and no dropped multi-task responses.
9. **Budgets:** measure DB rows/writes per fictional-time step, archived source size, per-turn prompt tokens and model calls, p50/p95 local resolution latency, active/dormant scopes, spillover holds and meaningful generated opportunities. Compare equivalent story traces, not a zero-work benchmark.
10. **Release:** finish UA14/UA15/native coverage/semantic gates, integrate OpeningDirector, qualify entire core tree UA17–UA19 before redesigning PvP/Fear runtime. Later PvP/Fear work uses the same source-typed bridge but receives an independent compatibility/CI/live gate.

### Initial budgets (provisional, benchmark-required)

- `background L0`: 0 model calls per advancement; changed aggregate scopes only; no routinely created NPC individual receipts.
- `active L1`: use current GM planning model pass if one occurs; otherwise at most 1 batched AI world decision pass per significant **fictional** director opportunity (not one call per NPC).
- `scene L2`: one scene board; current bounded proposals, one existing writer path; no unconditional new judge/writer call.
- `encounter L3`: native computations and owner choices; model only for GM-owned decisions that cannot be chosen deterministically; never one model call per combatant automatically.
- `new opportunity proposals`: default cap 4; visible active named actors default cap 8 per packet; relevance-ordered omitted items remain eligible later, not silently deleted.

## 6. Multi-agent execution placement

Preserve coordinator + six existing development agents; **runtime service architecture is NOT six autonomous LLM actors**.

- **Coordinator:** owns bridge contracts, integration budgets and gating; audits cross-track producer/reader dependencies and source pins.
- **Agent A — Semantic/Audience:** player-claim vs GM-world authorship proofs and tests, typed inbound signals, task coverage, weighted `narrative-salience` and memory-lifecycle integration, entitled projection, source-based world beats and narrative quality tests.
- **Agent B — OpeningDirector:** automatic session lifecycle consumes Director scene opportunities; never creates separate simulation loops.
- **Agent C — Unified arbitration/authority:** `authorship_origin_v1` source classification, World Director coordinator/native actor authority, source-verified automatic ordinary identity/canon transitions, UA14/UA15 migrations, source/reader proofs.
- **Agent D — Native mechanics:** source-bounded new faction/organization/district identity adapters, actor abstraction adapters, L2/L3 encounter/features, partial/promotion/demotion receipt integrity.
- **Agent E — Deferred PvP/Fear:** **contract/test design only** until authorized post-UA; later integrate into same GM world/scene arbitration, keeping distinct Fear protocols.
- **Agent F — Independent quality/performance:** hostile player-fact-injection corpus, source audit, weighted-identity/canon/rumor/privacy/decay/redelivery test fixtures, write/API baseline, malicious/negative tests, migration/legacy parity, frozen-tree offline + CI/deployment checks.

**Wave placement:** WD0 inventory and bridge contract in W0; WD1 tier/store abstraction and WD2/WD2S read-only bridge + weighted identity contract in W1 parallel with semantic and UA design; WD3 native world authority and WD4 encounter integration in W2 alongside UA14/UA15 and OpeningDirector; WD5 performance/compaction and full qualification in W3. Defer feature exposure if native adapter incomplete. PvP/Fear semantics change only in W4/W5 after core release gates.

## 7. Decisions / non-goals

- **No** city-wide per-agent chain-of-thought or per-NPC agent process.
- **No** independent duplicated canonical narrative/world DB.
- **No** global world advance on clock-wall elapsed time.
- **No** generic `json_patch` execution from model suggestion.
- **No** automatic conversion of player-private utterances into faction intelligence.
- **No** player-authored fact, narration or repeated claim converted into a new world object or canon without independently qualified GM/world-origin authority or accepted hook/relationship/canon source.
- **No** weakening of source/agency/private proof to achieve lower latency or remove review.
- **No** physical deletion of old native receipts, source ancestry, or compatibility readers just because their projection has been condensed.

This specification is a proposed engineering contract, **not** proof of production release, completed model/Discord integration, or a tested cost reduction. Recheck actual branch/worktree/owner edits before implementation; only separately authorized CI push/merge, DB access, installation, paid calls or live pilot can occur.
