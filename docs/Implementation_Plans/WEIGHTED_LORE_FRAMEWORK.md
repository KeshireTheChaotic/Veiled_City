# Weighted Lore, Facts, Canon, Locations, and NPCs — Framework Specification

> **Priority: High.** Read before modifying narrative invention, NPC cognition, factual memory, canon, location/NPC creation, salience, retrieval, secrecy, or persistence. This is a **target behavioral contract** integrated with existing native mechanisms, not a declaration that one universal weighted-lore engine already implements every category. The [owner AI-GM behavior specification](OWNER_AI_GM_BEHAVIOR_SPEC.md) remains authoritative overall. See [Audience-First](AUDIENCE_FIRST_SPEC.md), [Creative-First](CREATIVE_FIRST_SPEC.md), and [Agency-Preserving](AGENCY_PRESERVING_SPEC.md).

## Purpose

The Weighted Lore Framework lets Veilkeeper improvise freely without treating every conversational detail as permanent world truth. It records **who said or observed what**, **what the GM independently established**, **what each actor knows or believes**, and **which details matter enough to retrieve or persist**. It links ephemeral invention to durable continuity through authenticated evidence and authorized state transitions.

**Weight influences attention, retrieval, continuity, and eligible persistence. Weight alone never proves a proposition, creates a world entity, authorizes a rule effect, or promotes campaign canon.**

## Primary objectives

1. **Allow emergent invention.** Ordinary lore, people, places, rumors, clues, and social connections may arise during live play through independent GM authorship.
2. **Separate belief from truth.** NPC and PC statements, observations, hypotheses, rumors, deception, and objectively verified facts occupy different epistemic roles.
3. **Keep identity distinct from propositions.** Making a recurring vendor's identity durable does not validate every claim by that vendor or grant the vendor powers.
4. **Weight by real causes.** Repeated independent, authenticated in-fiction events can increase relevance. Model echoes, duplicate narration, OOC repetition, and copied audience projections do not create new causal proof.
5. **Support selective recall.** Retrieve what matters to the scene, actor, location, and question. Decay routine prompt salience without destroying historical state.
6. **Preserve revisions and correction.** Allow evidence to be superseded, challenged, retracted, or reconciled while retaining provenance and meaningful historical testimony.
7. **Promote only through native authority.** Ordinary identity persistence, fact creation, and campaign canon have different gates; do not confuse or collapse them.
8. **Respect audience privacy and actor knowledge.** GM-private secrets, character-private discoveries, party knowledge, and NPC subjective beliefs must remain separate.
9. **Prevent agency laundering.** Neither player nor NPC assertions may create external facts, PC commitments, player resources, or privileged NPC control automatically.
10. **Keep the living world coherent.** Reuse identities, avoid collisions, honor geography and source restrictions, and let established consequences inform future scenes.

## 1. Foundational distinction: four different questions

| Question | Answer belongs to | Example |
| --- | --- | --- |
| **What was said, seen, or attempted?** | Authenticated events, testimony and observations | “The watchman claimed a tunnel is below the station.” |
| **What does an actor believe or know?** | Actor-specific cognition and entitled disclosures | The watchman believes the tunnel is haunted. |
| **What currently exists or is objectively true?** | GM-established scene fiction, verified world state, sourced facts, native receipts | A maintenance tunnel exists, but its rumored occupant is unverified. |
| **What must endure as authoritative canon?** | Authorized canonical identity/fact workflows and canon ledger | An authenticated source establishes the tunnel's origin and continuing role. |

**Do not infer an answer to a stronger question from a weaker one.** Speech does not prove existence; existence does not prove supernatural lore; salience does not prove truth; audience delivery does not prove an NPC knows it.

## 2. Content categories and their authority

| Category | Typical birth state | Valid development | What must never happen automatically |
| --- | --- | --- | --- |
| **Lore / folklore / interpretation** | NPC testimony, GM rumor or provisional detail | Cultural tradition, recurring story, investigative lead, later verified historical claim | Convert a popular legend into objective supernatural truth |
| **Claimed fact** | Sourced assertion, hypothesis, observed fragment | Challenge, corroborate, refute, or establish via verified evidence | Treat speaker confidence or repetition as proof |
| **Objective fact** | GM-established eligible observation or authenticated native receipt | Recall, correction, conflict review, eligible canon proposal | Be overridden by an unsupported contradictory assertion |
| **Campaign canon** | Already committed source or authorized proposal | Authorized review/promotion, versioned correction, conflict reconciliation | Auto-commit solely from salience or model text |
| **Location identity** | GM-created ordinary local place or attributed reference | Reuse, add details, discover access, eligible scoped identity persistence | Create teleportation, hidden access, property rights or travel success by name alone |
| **NPC identity** | GM-created ordinary person or attributed reference | Independent goals, memories, relationships, recurring appearances and eligible identity persistence | Create a controlled proxy, guaranteed ally, capabilities, or privileged knowledge by name alone |
| **Faction / institution** | Compatible existing faction, provisional connection or scoped organization fact | Authorized decisions, evidence-backed actions, persistent history | Rewrite major membership/history or seize PC authority by NPC claim |
| **Object / clue / evidence** | Scene description, lead or authenticated observation | Investigation, verification, custody and eligible persistent record | Create inventory custody or mechanical bonuses without native cause |
| **Relationship / hook** | GM-private hook, NPC attitude or authorized character linkage | Directional continuity, discovery, changed behavior | Impose PC feelings, romance, debt, consent or commitment |
| **Mechanical feature / state** | Applicable Daggerheart/house rule and valid native action | Validated effects and committed receipt | Become true through fictional popularity or prose |

### Canon is not a universal label

Use separate concepts for **canonical identity** (this ordinary NPC/place persists), **objective established fact** (an observed or source-supported proposition), and **campaign canon** (a proposition in the authoritative canon ledger). An identity can be enduring while rumors about it remain false. A fact can be well established without being promoted to a special canon record, depending on native source policy.

## 3. Core record model (conceptual, not a new mandatory database schema)

A qualifying lore or continuity item should preserve or derive the following information from existing services:

| Field / dimension | Meaning |
| --- | --- |
| **Stable identity and category** | The entity or proposition concerned; aliases, parent location, and kind where applicable |
| **Originating event / authorship** | Authenticated source, independent GM world-authoring event, verified native result, or named testimony |
| **Claimant / observer** | Who spoke, witnessed, learned, or proposed the content |
| **Epistemic kind** | Observation, testimony, inference, attempt, claimed result, or native-established fact as appropriate |
| **Claim content and status** | Exact or bounded proposition, disputed/active/superseded/retracted state, and correction lineage |
| **World authority** | Provisional detail, GM-established ordinary fiction, source-backed fact, durable identity, or committed canon |
| **Audience visibility** | Public, party, character/player-scoped, or GM-private; subject identity where needed |
| **Actor knowledge** | Which NPCs/PCs are entitled to the knowledge and how they acquired it; do not infer from global state |
| **Narrative relevance** | Causal interest, weight/tier, fictional recency, pins, prompt-retirement state |
| **Evidence references** | Distinct attributable causes, verified observations, native action receipts, and any conflict sources |
| **Consequential authority** | Whether a specific action, effect, handout, publication, or promotion is valid; never implied by weight |

Use existing project identifiers and records where available. Do not introduce a parallel unvalidated source of canonical truth simply because a new interface is easier to write.

## 4. Creation and NPC-assertion pipeline

This process is normative. The repository may implement its stages in separate native modules.

1. **Encounter a source.** A GM-authored NPC speaks; a PC reports a memory; the GM narrates an ordinary scene detail; a verified action resolves; or an authorized source is discovered.
2. **Resolve authorship and audience.** Verify who controlled the speaker, who witnessed the event, which scene/time it belongs to, and what visibility applies. Do not treat a player request as independent GM authoring.
3. **Classify the proposition.** Separate a speech/observation event from the claim it contains; determine whether it is testimony, hypothesis, attempt, observation, independently GM-established fiction, or a native-established fact.
4. **Reuse existing identities.** Search entitled existing NPCs/locations by stable identity, aliases, parent geography, and protected names. Do not clone an already established person or silently replace committed canon.
5. **Optionally author ordinary fiction.** If the GM independently chooses to make a compatible incidental person/place real, use the verified native world-authoring path. Ordinary creativity requires no blanket human promotion, but must satisfy source, scope, access, and collision rules.
6. **Store the appropriate record.** Record significant testimony as attributable testimony; store a new identity or objective observation only if its separate authority checks succeed. GM-only inventions stay hidden until a legitimate reveal.
7. **Present the right fiction.** Audience-First may narrate what the listener actually hears or witnesses. A statement alone does not imply all listeners believe it or any other audience knows it.
8. **Accumulate causal interest.** Eligible independent interactions, genuine discoveries, returns, and GM reuse can raise salience. Deduplicate source echoes and never treat narration recaps as new evidence.
9. **Recall and challenge.** Retrieve relevant, entitled history and actor cognition. New independent facts may corroborate, narrow, contradict, or retract claims while preserving original testimony.
10. **Evaluate persistence by category.** Native scoped mundane-identity promotion may occur when its verified evidence gate is met. Objective facts and campaign canon require their own evidence and authorized procedures; do not reuse the identity threshold as a generic canon rule.
11. **Audit and continue.** Keep provenance and status transitions. If a conflict cannot be resolved safely, hold the protected change but continue other independent scene developments.

### Critical rule: NPCs can invent without canonizing

An NPC can sincerely say, “My uncle owns the last locksmith shop in the district,” even when the GM has never defined the uncle or shop. This creates an **attributed statement**. Veilkeeper may separately create a plausible uncle and shop if doing so is coherent and authorized. It may instead preserve a false belief or deliberate lie. A subsequent visit, witnessed encounter, and independently sourced activity can produce new evidence. The original sentence never becomes a truth-granting receipt merely through repetition.

## 5. Weighted salience, not weighted truth

### Interest signals

Useful evidence may include independently resolved PC encounters, meaningful direct interactions, in-fiction returns, accepted GM-established leads, consequential NPC or faction developments, and active unresolved situations. The native system is responsible for authentication, weights, deduplication, decay, and pins.

- **Causation matters:** Two projections of one event are one cause, not two independent confirmations.
- **Source boundaries matter:** An OOC instruction, unsupported player assertion, NPC lie, cross-audience transcript copy, or repeated assistant recap cannot mint truth or additional promotion authority.
- **Fictional time matters:** Routine interest can decay as campaign time advances, not merely because real-world users have been absent from Discord.
- **Pins matter:** Relevant live PCs, active encounters, unresolved actions, applicable canon and other native dependencies can keep entities from disappearing from retrieval.
- **Salience tiers guide context:** Incidental, supporting, recurring and anchor-like importance should inform what is recalled, not who wins an argument or what is canon.
- **Retirement is not deletion:** A low-priority item may leave the normal prompt context and later be recovered by direct inquiry, location relevance, or renewed events.

### Existing implementation boundary (verified from a connected repository read)

At the reviewed default-branch snapshot, `bot/src/narrative-salience.js` describes itself as **retrieval only**, with source-bound evidence, fictional-time decay, prompt retirement, and causal deduplication. `bot/src/world-identity-persistence.js` has a **score >= 20** path for scoped **mundane NPC/location identity persistence** with native proof requirements and *no* execution or publication authority. This threshold is **not a general rule for promoting rumors, propositions, secrets, abilities, or campaign canon**. `bot/src/npc-cognition.js` ranks subjective NPC knowledge and memories without turning them into objective truth.

These are source observations, not a statement that every feature flag or path is operational in a given deployment. Verify the target revision and runtime enablement before implementing changes based on these internals.

## 6. Epistemic correctness and independent verification

A claim can become an objectively established proposition only if the appropriate native source accepts evidence for **that proposition**, not merely for the speaker's existence or delivery of the sentence.

- **Testimony:** “I saw a woman leave the station at midnight.” Establishes the testimony, not automatically the woman, time, location, or identity.
- **Observation:** A character legitimately witnesses a person leave. Establishes the witnessed observation with its actual vantage, limitations, and scope; identity or motive might remain unproven.
- **Inference:** “She must be the faction leader.” Remains an inference until independently substantiated.
- **Authenticated record:** A legitimate record may establish the fact or provide evidence depending on its source reliability; forged documents remain possible within fiction.
- **Committed action receipt:** A validated action or mechanical event can establish a supported consequence; narrative scoring cannot supersede it.

Corroboration should be evaluated for **independence and relevance**. Multiple NPCs who learned the same rumor from one source add evidence of rumor propagation, not independent proof of its content. A truthful NPC may be mistaken; a habitual liar may occasionally report something true.

## 7. Locations and NPCs: independent identity lifecycle

### Ordinary NPCs

- Create an NPC through authorized GM world authoring when a scene warrants an actual new person; otherwise leave the person as a referenced or alleged entity.
- Use identity collision checks, existing names/aliases, location, protected PC/proxy rules, and consistent portrayal.
- Maintain motives, beliefs, goals, and memories as **actor-specific** state; a global fact or GM secret is never automatic NPC knowledge.
- Treat identity durability, independent agency, relationship significance, and mechanical capabilities as **different decisions**.
- A persistent NPC identity can remain passive/background; persistence does not force that NPC to recur in every scene or provide new stats.

### Ordinary locations

- A named place may start as a rumor or provisional description. GM establishment requires plausible placement and local/geographic continuity.
- Creating a location does not move any PC, open a sealed route, bypass an access condition, grant ownership, or reveal everything inside.
- Maintain parent location, aliases, accessibility, relevant witnessed details, and visibility; private places remain private until revealed.
- A recurring location can gain durable identity while its alleged history, hazards, and occupants remain individually contested.

### High-impact content

A new faction leader, ancient city origin, supernatural law, protected hidden route, unique NPC power, major campaign mystery solution, or other high-impact proposition is not simply an “ordinary NPC/location” promotion. Use existing canon/source authority or an explicit authorized review/promotion procedure for the relevant kind of change.

## 8. Canon, conflicts, corrections and reversibility

- **Proposed is not committed:** A draft fact, candidate canon entry, or model suggestion is not campaign truth.
- **Evidence is type-specific:** The fact a district or NPC exists does not validate a claim about its past, allegiance, or abilities.
- **Only specific conflicts escalate:** When proposed new world truth contradicts an identifiable existing canonical record, preserve the proposal and source for reconciliation; do not silently overwrite it. Missing information or uncertainty alone does not require human review.
- **Correct attribution, not history:** If an NPC lied, preserve that they lied or made a false claim. If a factual memory was mistaken, supersede/retract the proposition without deleting the original speech event.
- **Keep secrets scoped:** A private canonical truth may exist in GM state while players know only a rumor. Never use global canonical truth as permission to narrate a private clue to everyone.
- **No mechanical escalation by lore:** A recurring talisman story cannot grant an ability; a recurring creditor cannot grant a debt; a recurring adversary does not gain an unapproved combat feature.
- **Audit every consequential transition:** Preserve source IDs, actor/scope, old/new values, justified reasons, and native receipts in existing transaction/audit services where supported.

## 9. Information boundaries and disclosure

| Boundary | What may be stored | Who may use it as knowledge |
| --- | --- | --- |
| **GM-private** | Hidden hooks, mystery truths, proposed canon, NPC motives, unpublicized inventions | Veilkeeper's authorized GM planning path only; no automatic player or NPC disclosure |
| **NPC-specific** | That NPC's memories, biases, beliefs, secrets and sources | That NPC within its cognition boundaries; other NPCs only after valid communication or observation |
| **Character-private** | Direct observations, messages, entitlements and confidential discoveries | That PC's authorized viewpoint; no automatic party sharing |
| **Party** | Properly published shared observations, scenes and discoveries | Entitled party recipients; not automatically every NPC or absent PC |
| **Public** | Broadly available world information | Actors who could reasonably access it within fiction; availability is not omniscience |

A successful write to the GM's story state is **not** a publication receipt. For material whose knowledge depends on delivery, only a completed, acknowledged, entitled disclosure establishes that the audience received it. A spectator view is not a character witness event.

## 10. Authority and ownership matrix

| Operation | May initiate | Must validate / commit |
| --- | --- | --- |
| Speak an NPC claim or tell a rumor | Authorized NPC controller / Veilkeeper | Speech authorship, audience, and provenance; no automatic truth mutation |
| Speak a PC belief or declare an attempt | Controlling player | Actual source, valid character ownership; no automatic external fact |
| Create an ordinary NPC or location | Autonomous Veilkeeper with eligible authoring context | World authorship, identity collisions, geography, private scope and native persistence |
| Record a claim or memory | GM/native evidence path | Epistemic type, active source, visibility and corrections |
| Raise or decay narrative interest | Verified narrative events | Native salience, causal deduplication, fictional time and pins |
| Make an ordinary identity durable | Authorized native identity workflow | Eligible cause-backed score, scope, identity proof; no powers or canon propositions |
| Establish an objective fact | GM/source-specific authenticated path | Relevant evidence and the native fact/receipt authority |
| Propose/promote campaign canon | Authorized GM/human/native canon path | Existing canon ledger, evidence, collision/conflict and review policy |
| Apply mechanical effects or change PC state | Authorized actor and native rule workflow | Native legality, dice/results, consent, resources and committed receipt |
| Disclose to players | GM publication path | Audience rights, actual delivery acknowledgement and secrecy |

## 11. Interplay with the three behavioral frameworks

| Framework | What it supplies to weighted lore | What weighted lore supplies back |
| --- | --- | --- |
| **Audience-First** | Actual entitled viewpoint, delivered testimony, discoveries, meaningful scene context | Relevant scoped memory, continuity, recurring details and reliable secrecy boundaries |
| **Creative-First** | New plausible fiction, actor motivations, ordinary world identities, leads and consequences | Stable identities, causal history, selective recall, corrections and legitimate routes to durable continuity |
| **Agency-Preserving** | Authorship, player control, consent, action resolution and rules authority | Evidence that cannot overwrite PCs, launder assertions or silently create effects |

**Direction of authority:** Creative invention proposes or establishes only what it is authorized to; weighted systems remember, rank, and potentially promote supported material; Audience-First shows entitled consequences; Agency-Preserving and native rules constrain every step. No circular dependency may turn “the model said it,” “the audience heard it,” or “it was remembered frequently” into independent truth.

## 12. Worked examples

### Example A — A fictional person mentioned by an NPC

A shopkeeper says, “My cousin Selene is the only watch repairer still working after midnight.”

1. Store the claim as shopkeeper testimony if significant.
2. Independently decide whether a plausible watch repairer should exist. If so, create/reuse Selene through native GM world authoring with ordinary role, location and limited knowledge.
3. A subsequent actual encounter with Selene supplies a separate causal event, not evidence that every shopkeeper claim is true.
4. Meaningful encounters can raise Selene's salience and eventually support **ordinary identity persistence** if eligible.
5. Her claimed uniqueness, family relation, and schedule remain separately supported or contested propositions; no automatic canon.

### Example B — A rumor spreads through the city

A street preacher says a sealed subway platform houses the “First Choir.” Other witnesses repeat the story.

1. Preserve each speaker's testimony and the social reality that the rumor spread.
2. Deduplicate shared source chains; retelling is not independent evidence for the alleged Choir.
3. The GM may independently establish a plausible closed platform if coherent and authorized; doing so does not establish what lives there.
4. Players may investigate; authentic discoveries can affect objective facts, campaign secrets, and later canon procedures.
5. The GM does not change an already-established mystery answer merely because a theory is popular.

### Example C — An NPC alleges a PC promise

A fixer says, “You agreed to give me two favors.”

1. Record only the fixer's claim and any resulting NPC attitude or plan.
2. Check existing player-owned commitments or native receipts before establishing any debt.
3. Repetition by the fixer may become narratively salient but never creates the PC's consent or obligation.
4. Players remain free to deny, investigate, bargain, or make a new commitment.

### Example D — A private discovery later becomes public

One PC hears a secret address; a later authorized action exposes a street sign to the whole party.

1. The first testimony/discovery remains character-private.
2. The second event is a distinct party-entitled observation, not an upgrade of all private thoughts or hidden GM notes.
3. Reuse the same location identity only where audience and source conditions permit, without disclosing private attached information.

### Example E — A contradiction with committed canon

An NPC claims a known destroyed archive reopened yesterday.

1. Preserve the statement as testimony; it may be mistaken, false, a cover story, or a lead.
2. An independent GM world change cannot silently overwrite an exact conflicting canon entry.
3. Escalate the protected proposition only if a real contradictory canonical fact is proposed for commitment.
4. Continue unrelated play; possible new clues or NPC actions do not depend on accepting the contradiction.

## 13. Validation and acceptance criteria

The framework should be considered behaviorally compliant only when feature-specific evaluation can demonstrate:

1. **No assertion-to-canon shortcut:** NPC/PC statements and model summaries alone cannot commit external objective facts or canon.
2. **No salience-to-truth shortcut:** High weight never fabricates powers, NPC knowledge, PC consent or an objective proposition.
3. **Causal deduplication:** One event replayed, quoted, echoed, or delivered to multiple views does not count as independent promotion evidence.
4. **Compatible invention:** Ordinary locations/NPCs can be created and reused without compulsory approval, while protected collisions, scope leaks and illegal mechanics are blocked.
5. **Type-specific promotion:** Scoped mundane identities may persist without converting all related rumors, claims and abilities into canonical truth.
6. **Correct NPC epistemics:** False, mistaken and deliberately deceptive NPC statements remain possible without corrupting objective history.
7. **Correction lineage:** Contradiction, supersession, retraction and explicit reconciliation preserve attributable historical testimony.
8. **Audience isolation:** Private and GM-only information remains unavailable to unentitled participants and NPCs, even when salient.
9. **Prompt retirement safety:** A dormant entity can be recalled later; retirement never changes committed history, current action eligibility or active dependencies.
10. **Native mechanics preserved:** No memory or invented lore record can spend resources, move PCs, grant inventory, alter dice, or confer NPC combat features.
11. **Failure containment:** Optional retrieval/promotion failures cannot invent state or stop unrelated legitimate narrative progress.
12. **Auditability:** Every significant transition is attributable to valid source and authorized operation, with deterministic tests on the affected native path.

## 14. Implementation guidance and existing project touchpoints

The following are **observed source entrypoints**, not a claim of a completed single framework. They were read from the connected `KeshireTheChaotic/Veiled_City` default branch during specification drafting; a separate branch/deployment may differ.

| Existing source | Relevant observed role |
| --- | --- |
| `bot/src/autonomous-world.js`, `bot/src/world-authorship.js` | Independent ordinary world creation, source/scope checks and identity protections |
| `bot/src/world-identity-persistence.js` | Native, source-backed scoped mundane-identity durability; not general canon authority |
| `bot/src/narrative-salience.js` | Source-bound interest, fictional-time decay, relevance, retirement and cause-backed identity eligibility |
| `bot/src/narrative-memory.js`, `bot/src/memory-lifecycle.js` | Audience delivery/acknowledgment, epistemic memory, revision and retraction |
| `bot/src/npc-cognition.js` | NPC-specific beliefs, goals, memories and relevance-weighted retrieval |
| `bot/src/scene-fiction-context.js` | Entitled, source-backed scene observations and visibility |
| `bot/src/state.js`, `bot/src/commands.js` | Fact, event and canon workflows with validation and review distinctions |
| `content/ENGINE/AI_GM_CONSTITUTION.md` | Owner-aligned rules, secrecy, agency, mystery fairness and NPC knowledge boundaries |
| `docs/Implementation_Plans/features/P03-F01/SCOPE.md` | Planned ordinary world invention work |
| `docs/Implementation_Plans/features/P03-F02/SCOPE.md` | Planned weighted continuity and canon work; salience cannot create standalone truth |
| `docs/Implementation_Plans/features/P03-F03/SCOPE.md` | Planned autonomous NPC cognition work |

**Required design guardrail:** Reuse native provenance, audience, memory, entity and canon services where feasible. Before adding a new scoring formula, promotion threshold, content restriction, or mandatory human-approval gate, inspect current production code and the owner's explicit decision gates. Do not infer from design documentation that a feature is already enabled, or broaden an identity-persistence threshold to unrelated fact categories.

## Philosophy

**Remember what mattered, preserve what was established, and keep claims distinct from truth.** A living city needs room for invented people, unreliable stories, mistakes, secrets, and recurring consequences. Weighted lore makes that history usable without turning narrative repetition into a new source of authority.

The objective is **persistent emergent fiction with auditable truth boundaries**: a world that remembers player choices and NPC actions while remaining free to surprise its audience.

*Status: Target specification informed by the attached owner documents and limited source inspection. Runtime behavior, feature flags, unexamined code paths, and full implementation coverage were not validated.*
