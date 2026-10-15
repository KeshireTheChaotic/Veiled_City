# Veiled City — Narrative Authority, Emergent Fiction & Production Implementation Plan

**Codex execution handoff | 2026-10-14**  
Repository: `https://github.com/KeshireTheChaotic/Veiled_City`  
Verified foundation: `codex/playable-narration-repair` at `da29994d117ecf298126bd32ebf11bd783a60ee4`  
Prior proposal: `VEILED_CITY_EMERGENT_WORLD_MEMORY_PLAN.md`  
**Status:** Instructions for implementation. This document does **not** claim implementation, tests, production access, backups, push or deployment have happened.

## 0. Execution mandate and authorization

**Primary objective: REMOVE NARRATIVE-AUTHORITY BOTTLENECKS FIRST.** Veilkeeper is an improvisational, self-developing GM. It may invent ordinary setting details, places, people, NPC behavior, motives, rumors, hooks, and ongoing fictional developments without requiring preexisting environmental facts or a per-sentence permission slip. Authoritative memory captures the fiction that is actually established, with audience and epistemic boundaries. Narrative validation protects the game without routinely reducing playable turns to administrative receipts.

**Explicit owner authorization for this work:**

- Implement the complete sequence **continuously**, with a meaningful **local Git commit after every phase**, without stopping for ordinary clarification or intermediate approval. Push the completed feature branch and integrate according to repository permissions/process; do not force-push or bypass branch protection. A concise final handoff report is required.
- **Production deployment is authorized after qualification**, including necessary compatible schema changes and appropriately scoped production database access. Do not merely produce a proposal and stop if execution access is present. If actual host/release access is absent, report the precise blocker; never pretend deployment occurred.
- **Production database access is authorized subject to backups and safety gates.** Read operational metadata to verify schema/path/health; write only tested, necessary migrations, feature configuration, and authorized application maintenance. Do not run narrative fixtures or fabricate world events in the actual campaign database.
- **Codex subscription/agent usage is allowed for analysis, review, and online reasoning-based test assessment.** **Do not use billable OpenAI API tokens for automated tests**; do not run provider-backed bot/Discord playtests with `OPENAI_API_KEY`, purchase credits, or silently switch to API billing. Synthetic provider stubs and network-denied offline tests are the default.
- Deployed **normal production bot traffic is a separate matter**: the existing live bot uses `OPENAI_API_KEY` to serve players and can incur ordinary API charges after activation. Codex must **not generate synthetic live turns**, restart queued provider requests unnecessarily, or call the production provider to establish quality. Do not claim a live model can be tested for free through the bot. If the owner's instruction is interpreted as prohibiting *all* production API usage, leave the bot disabled rather than misrepresenting the service; document this distinction.
- **No autonomous pause between phases** if required tests pass. If a hard gate fails (backup verification, schema integrity, security/privacy, player agency, recovery fidelity, unable to identify production service, branch protection/credentials), do not bypass it to honor the continuous-execution preference. Fix and recheck, or stop **only the unsafe deployment step** with a precise report.

**Source of truth at execution:** inspect current Git refs, branch protections, deployment configuration, schema, and local working tree. The SHA above is the last independently reviewed foundation, not a promise the remote is unchanged. Preserve unrelated concurrent changes. Use a dedicated `codex/narrative-authority-emergence` feature branch or another unambiguous name.

### Invariants that remain hard constraints

1. Human players own PCs' voluntary actions, dialogue, thoughts, feelings, consent, secrecy, commitments and destination choices. No model assertion substitutes for accepted typed intent.
2. Native Daggerheart mechanics own rolls, numerical damage, conditions, armor, resource spending, inventory/custody, adjudicated travel, contested access and binding effects. Do not bypass PvP, scene action windows, or human-controlled NPC proxies.
3. Audience/knowledge isolation remains mandatory. A GM-authored secret may exist in GM memory without becoming player or NPC knowledge; disclosure requires actual authorization and appropriate delivery proof.
4. Fiction may establish an **ordinary, observable world fact** without an older fact as a prerequisite. This is *not* permission to contradict committed canon, turn an NPC rumor into objective truth, reveal hidden mystery solutions, or generate material effects.
5. Do not use model-issued `safe`, `verified`, `consent`, `canon`, or `authority` flags as independent authorization. Native identity, visibility, source, type and consequential constraints remain enforceable at all publication surfaces.
6. Durable events, source ancestry, outbox, acknowledged messages and archive history must survive restarts, backup/restore and source revocation. Never roll back a native consequence merely because its optional prose was held.
7. Never hard-delete established NPC/location identities, histories or evidence due to age or low importance. Archival means dropping from *active context*, with reversible source-backed revival.

## 1. Evidence-based baseline and exact choke points

The reviewed repository already contains infrastructure to reuse:

| Existing code | What to keep/change |
|---|---|
| `bot/src/autonomous-world.js` | Existing native, audience-aware ordinary NPC/place creation and safe identity preflight. It is presently tied to real local geography and a PC location. Extend *world-camera authoring* without granting movement. |
| `bot/src/scene-fiction-authority.js` | Scoped scene-local authoring, committed receipts, hashed drafts and publication proofs. Its instructions currently forbid new NPC identities, leads, threats, NPC dialogue and even second-person descriptions; **relax these fiction categories first**, moving consequential actions into separate validators. |
| `bot/src/scene-fiction-context.js` | Useful scoped source ancestry and placement checks; currently denies broad scene fiction in active encounters, assumes a placed PC and limits fact retrieval to `gm`/`human_gm`. Separate viewpoint, audience and material-result checks. |
| `bot/src/pvp-output.js` | Original combined freeform narration is quarantined and replaced by composed verified parts; when none survive, `neutral` and `scene_fiction_review` publish administrative language. Retain source-bound publication, but make salvage/repair and substantive fiction normal. |
| `bot/src/gm.js` | Combined GM result, isolated writer, direct observation path, retry, response obligations and shared writer budget. Scene authoring currently precedes fresh NPC authoring, which can starve NPC replies. |
| `bot/src/fresh-npc-authoring.js` | Isolated attributable NPC speech, but restricted knowledge and writer-budget conflict can make social scenes sterile. Give NPCs ordinary self-knowledge and genuine own intentions without inventing PC outcomes. |
| `bot/src/entity-memory.js`, `context-memory.js`, `memory-lifecycle.js` | Durable/ephemeral discrimination; sourced identity/revision, scoping, expiry. Current entity retention can be triggered by names in **raw combined narration even if never published**. Rebase retention on actually committed fiction/delivery state. |
| `bot/src/npc-cognition.js`, `memory-clusters.js`, `context-planner.js` | Importance ranking, reversible consolidation and bounded authorized context. Reuse for campaign-scale salience rather than creating a second LLM memory judge. |
| `bot/src/scene-setup.js`, `assembly-state.js` | Owner-confirmed initial placement and attendance views. Add location-neutral camera openings and flexible but non-teleporting owner initial-position establishment. |
| `bot/src/turn-latency.js`, `operational-metrics.js` | Existing bounded timings and holds. Add narrative-specific failure attribution without logging private text. |

Current deployment facts verified from repo: `docs/DEPLOYMENT.md` documents manual Docker Compose or Node deployment; `docker-compose.yml` mounts `./bot/data` into `/app/data`; production defaults to `DATABASE_PATH=/app/data/veiled_city.sqlite`; `VeiledDB` in `bot/src/db.js` uses SQLite `journal_mode=WAL` and invokes `migrateSchema()` on startup; `docs/SNAPSHOTS_AND_ROLLBACK.md` says logical snapshots are **not** a substitute for independent host-level backups. `bot/package.json` supplies `npm run check`, `npm run validate`, and production smoke scripts. **There is no verified automatic CD pipeline** in the reviewed source; `offline-validation.yml` performs network-denied CI qualification.

## 2. Target architecture: permissionless fiction, governed consequences

### 2.1 Authority jurisdiction matrix

| Lane | AI GM may do without prior fact | Native boundary |
|---|---|---|
| Local environment | Invent observable rooms, street activity, ordinary furnishings, weather, sensory perspective and incidental objects; use natural second person when observer position is proven | Provenance, audience, continuity; no automatic PC movement or mechanical hazard/effect |
| Ordinary NPCs | Introduce, portray, converse, refuse, bargain nonbindingly, lie, misremember, move *themselves* if unopposed, develop motives/relationships and ordinary plans | Respect proxy control, knowledge perspective and consequential interaction rules |
| People and places | Introduce and name accessible or camera-only NPCs/locations, link aliases and parent geography, revise evolving circumstances | Identity collision, access, protected canon, location/actor scope; no implied PC travel |
| Soft mysteries | Create suspicious details, rumors, requests, clues-as-observed, leads, contradictions and offscreen pressure | Epistemic label; no mystery answer/canon promotion without real support |
| Combat/contested scenes | Describe established terrain, nonbinding combatant behavior/attempts, dramatic sensory changes and *verified* native consequences | Exact native receipts for damage, conditions, capture, movement, success/failure, consent, resource costs |
| PC/proxy actions | React and ask questions | Never choose PC/proxy voluntary acts, secrets, feelings or commitments |

Use **creative authority default-allow** for ordinary, source-bound fiction. Apply restrictive validation to *claims with protected consequences*, not every descriptive sentence. Store source identities even for first-time inventions; do not force every incidental prop to become high-cost structured campaign canon.

### 2.2 Structured narrative units and native composition

Introduce/extend a versioned, bounded response schema for `narrative_units` rather than giving the model an arbitrary trusted prose bypass. A unit carries `id`, `kind` (`scene`, `npc_speech`, `npc_action_attempt`, `lead`, `rumor`, `established_observation`, `native_outcome_render`), `text`, `visibility`, source/subject/location IDs if applicable, epistemic status and references. **These are proposal fields, not proof**. Native code binds every unit to the current authenticated GM/owner request, location or camera, actual source ancestry and audience. Existing native receipts alone authorize material result units. Contextual/creative units may be newly GM-authored within delegated fiction authority.

- **Salvage independent valid units:** reject/hold a materially prohibited claim while retaining unrelated valid scene/NPC units and native receipts. If sentence-level segmentation is not reliably safe, split at **typed unit boundaries**, never naive regex sentence surgery that changes meaning.
- **No silent drop:** output composer gives each unit a fate: `published`, `held_secret`, `held_material`, `held_scope`, `superseded` or `not_applicable`, with confidential diagnostics. Each turn receives an observable `narrative_completion` status.
- **Response guarantee:** for a valid, answered game request, prefer specific surviving GM narration or a native-grounded synthesis; use `neutral` only for actual nonresponding/irrecoverable cases, not as routine narrative output. No fictional effects are invented to satisfy response guarantees.
- Allow NPC speech and scene atmosphere in a *shared single isolated writer* only if scoped inputs can be validated per speaker; otherwise prioritize the essential NPC answer and render deterministic native environmental detail, not a second provider request. Do not blanket-ban NPCs or settings inside encounters.
- **Do not claim full arbitrary-English semantics have been proven.** Preserve conservative scope/secret gates and finite PC agency tripwires (full name, surname, aliases, possessives); move broad freedom to areas delegated to the GM, and log residual semantic ambiguity.

### 2.3 Fiction/memory state is not the same as delivered knowledge

Maintain distinguishable states; model-produced text alone must not mutate world or listener knowledge:

1. `drafted_private` — candidate only; may be discarded or redacted.
2. `accepted_established` — GM-native world fiction committed, with source, stable ID, scope, location/camera, revision, category, exact text span and optional entity identities.
3. `queued_to_audience` — delivery pending; no recipient knowledge inferred from this.
4. `acknowledged_to_audience` — Discord/outbox delivery acknowledged and recipient/visibility bound; eligible as disclosed memory for that audience.
5. `retired_from_context` — not actively prompted, but historical source and identity recoverable.

Event creation and outbox publication must stay in the authoritative transaction; recognition of delivery is idempotent. Failed/uncertain sends do not generate false audience knowledge, duplicate NPCs, reexecute mechanics or erase established GM knowledge. One fiction event can be known to the GM but not yet to a player. An NPC knows a fact only via its own native witness/delivery/inference pathways, never merely because Veilkeeper invented it.

**Memory economy:** Index meaningful named people/places, local layout that must remain consistent, active leads and new facts the players engaged with. Raw complete narration lives in scoped transcript/archive; decorative adjectives need no unique identity entry. Prefer a compact, source-backed `fiction_delta` emitted in the *same writer call* as the prose. Dedup aliases, references and revisions. Fix `entity-memory.js` to use actually established/committed units, not the original quarantined combined response. Keep unknown/rumored causes epistemically uncertain.

### 2.4 Undefined locations: character, camera, and knowledge are different

Three independent concepts: `native_pc_location`, `narrative_camera_location`, `audience_observation_proof`.

- **No PC position and 'set the scene':** Veilkeeper authors an unoccupied/public establishing shot with ordinary setting and a playable hook. Do **not** state a PC is there, sees it, overhears it, or meets another PC.
- **A player clearly declares initial placement ('I'm at the bakery'):** if *genuinely unplaced*, no prior travel/history/status contradiction and no contested access/cost/encounter, treat it as owner-authored scene setup, store exact source, native location and appropriate private/public visibility; avoid a second setup menu. If ambiguity matters mechanically, ask only the smallest clarification.
- **Player enters/joins/moves:** actual entry requires existing typed movement/native access and must not auto-teleport. New camera location, even if it has interesting NPCs, is not a movement receipt.
- **Last valid placement:** reuse actual authoritative last location when current scene presence is unset, and revalidate presence through the existing process without inferring travel. If an actor is missing a physical position, environment-only world exposition is still allowed.
- **Camera-only visibility:** public opening is not a party-wide claim of immediate PC knowledge; private scenes remain separate. No shared party placement inferred from check-in or roster.
- **Engagement:** when a location issue is not material to the player's question, answer the fictional question instead of requesting coordinates.

### 2.5 Entity importance and reversible decay

Add stable records or backward-compatible fields for `narrative_salience`: entity ID/type, aliases, audience scope, creation/disclosure refs, last player mention, last native interaction, last GM mention, last scene/session, score/tier, unresolved dependency/pin reason, archival pointer. Existing `memory_identity`/`memory_revision` and NPC cognition remain sources of truth; do not duplicate them unsafely.

Deterministic example weights (adjust from observed fixtures, not an extra model judge): player distinct-turn mention +3, player interaction +5, native consequence or lead +7, cross-session player return +6, GM introduction +1, GM reuse +1 **capped per scene**. Do not reward loops, combined drafts that were never published, bot-origin repeated mentions, or ambiguous alias matches. Use fictional scene/session ticks (not real-world days) for gentle decay. Suggested score tiers 0–9 `background`, 10–24 `recurring`, 25–39 `established`, >=40 `anchor`; **these rank retrieval, not mechanical privileges or world authority**.

Never auto-retire PC, human NPC proxy, current occupant, current scene/location, active encounter participant, active lead/debt/quest/commitment, canon dependency, uncommitted continuation, custody/inventory reference, GM pin or ancestor of live receipts. Otherwise `hot -> warm -> dormant -> archived_pointer`: exclude from routine prompt budget but keep identity/history/index alive and revive on an entitled player reference. The player can engage with a background NPC immediately; salience must not delay ability to talk to them.

### 2.6 Narrative completeness and health

Implement `validateNarrativeCompleteness` **after native projection** or on the proofed prepared output (not raw generated `narration`) to identify a meaningful response, independent of mechanical validity. Minimum acceptance examples:

| Prompt type | Proof of playable response |
|---|---|
| scene request | Specific physical features + activity, tension, or an actionable affordance |
| current situation | What is visibly occurring, including substantive quiet/no-change when appropriate |
| talk to an NPC | Contextual NPC answer, credible refusal, or legitimate unavailable-person obstacle |
| examine evidence | Concrete observation, native check/obstacle or relevant genuine uncertainty |
| entry | Native arrival/access result + destination framing, or specific blocked-entry reason |
| combat/contested | Prompt native check/receipt + evocative allowed framing, never invented damage/success |
| assembly | Story-level camera opening or scoped private lead, without fabricated PC co-location |

No automatic second AI judge. Use deterministic typed completeness rules and curated fixture assertions. If a surviving native part can be combined with approved fiction, do so deterministically. Only use an existing explicitly bounded retry when genuinely necessary; track extra requests. Record `narration_hold_reason`, `neutral_substitution`, `npc_response_missing`, `camera_without_actor`, `substantive_output`, `writer_starvation`, `memory_not_disclosed`, `revisit_continuity`, and time-to-first-substantive-delivery as aggregated **non-sensitive counters**, not raw private text. Protect false-positive rate: an explicitly silent/no-response turn should not be labeled broken.

## 3. Continuous implementation and phase commit ledger

**No mid-phase user confirmation loops.** After a phase's *targeted* test gate passes, commit it and immediately proceed. Track in `docs/NARRATIVE_AUTHORITY_EXECUTION_LEDGER.md` the SHA, changed files, tests run/counts, test budget, state/data assumptions and outstanding limitations. Do not copy full verbose successful logs into source control. Prefer one main branch with one independent commit per phase, and a separate final manifest/release commit if needed.

### Phase 1 — Relax narrative authority **FIRST** (top priority)

**Edit:** `scene-fiction-authority.js`, `scene-fiction-context.js`, `gm-fiction-schema.js`, `gm-world-narrative.js`, `gm.js`, and impacted turn-contract code.

- Replace the overly restrictive instruction set and closed categories with tiered GM creative authority: ordinary places/people, believable NPC behavior, soft leads/rumors, nonbinding complications, dramatic physical environment and legitimate POV wording.
- Allow scope-safe camera-only authored fiction with no placed character; do not weaken native PC presence checks for moves, PvP, damage or disclosure.
- Provide a bounded schema for distinct fiction vs proposed native outcome units; keep raw combined freeform output quarantined until units are proofed.
- Preserve exact source/audience/scene provenance; do not treat a model claim of authority as a native receipt.
- Ensure a completed ordinary description/scene question has **substantive approved fiction**; do not silently revert to bland fixed phraseology.
- Fix the existing `gm`/`human_gm`-only scenery evidence path to include authorized, audience-visible `ai_gm` observations via provenance + epistemic checks. Extend agency name checks to aliases/surnames.
- An NPC, ordinary business or mysterious sound can be introduced on the first encounter without a preexisting ledger row; commit only validated proposals.

**Lean red-to-green gate:** new `bot/scripts/narrative-freedom-test.mjs` with 4–6 deterministic fixture cases (fresh place + NPC, scene request with no old environment facts, soft mysterious clue with unknown cause, existing AI-GM observation, alias/surname PC attempt held, cross-audience secret held). Run only this suite and directly impacted source/schema checks. **Commit:** `feat(gm): delegate ordinary narrative invention without surrendering native outcomes`.

### Phase 2 — Projection salvage, publication-bound continuity, NPC arbitration

**Edit:** `pvp-output.js`, `state.js`, `turn-orchestration.js`, outbox/revalidation/archive paths, `entity-memory.js`, `context-memory.js`, `memory-lifecycle.js`, `gm.js`, `fresh-npc-authoring.js`.

- Compose typed independently checked narrative units. Hold only the offending unit while preserving approved local fiction, NPC speech and exact native receipts. No naive English regex surgery; source/audience proof at every sink (Discord, requeue, archive, recap and voice).
- Add `drafted/established/queued/acknowledged/retired` distinctions and memory transaction integration. Stable name mentions that never reached an approved surface must not make an NPC publicly known.
- Make essential NPC reaction outrank optional scenery for the one isolated-writer budget. If a single safe packet can author both, validate separately and do not add requests. An ambient writer failure must not suppress an independently successful NPC answer.
- Generalize narrative revalidation so the new fiction remains safe in replay and receives revocation holds without reversing native actions. Keep protected source/ownership checks.
- Introduce native `narrative_completion` result only after actual projected parts are known, and preserve both source and failure diagnostics.

**Lean gate:** extend `narrative-freedom-test.mjs` with mixed NPC+scenery, one invalid material unit + two valid units, failed/uncertain delivery + audience knowledge, restart/revocation. Run the new suite and *one* affected protected-output batch, e.g. `narrative-contract-test.mjs`, `v9-pvp-authorship-test.mjs`, `v95-protected-narrative-test.mjs`, `h05-discord-delivery-test.mjs`. **Commit:** `feat(narration): salvage authorized fiction and bind memory to publication`.

### Phase 3 — Missing placement, campaign openings and scoped POV

**Edit:** `scene-setup.js`, `assembly-state.js`, `assembly-publications.js`, `scene-continuity.js`, `autonomous-world.js`, GM camera context and routing.

- Public/private establishing shot without PC placement; real scene and audience, but no PC witness/proximity claim. Spawn ordinary camera locations/NPCs with stable identities through legitimate world authoring as required.
- Owner-origin first-position declarations can establish ordinary initial native placement (source-backed, idempotent, not travel) where actual setup prerequisites allow; no silent forced starting point.
- Distinguish an empty current presence vs last verified placement vs active travel/locked access. Reuse known positions without movement; ask minimal targeted question only if the next action requires a physical location.
- Assembly should begin with meaningful playable fictional framing, not merely an attendance list. Handle split parties without shared presence/knowledge inference; don't replay already acknowledged openings.

**Lean gate:** 3–5 new deterministic fixture variations for absent location, no-co-location, direct initial location, protected travel rejection, split audience and reentrant assembly. Run `scene-entry-test.mjs`/`assembly-authority-test.mjs` once for this phase. **Commit:** `feat(scene): support camera openings and owner-authored initial placement`.

### Phase 4 — NPC agency, social play and protected-encounter narration

**Edit:** native NPC/world services, isolated speech portrayal, GM instructions, combat/contested projection and scene context.

- Ordinary NPCs autonomously form motives, respond with dialogue, refuse offers, move locally, pursue goals and create plot pressure in their own knowledge scope; human-proxy NPC voluntary control stays protected.
- Permit **narrative-only** atmospheric/attempt units in combat, PvP and contested windows, including direct audience-visible description of native action receipts. Do **not** let the wider fictional lane mint effect/success/movement/consent results. Render actual damage/results from native receipts in evocative words.
- Add explicit right-of-way: live NPC conversation and declared player intents supersede optional environment flourishes; asynchronous offscreen NPC changes require existing world-time/visibility authority.
- Maintain NPC subjective beliefs vs objective world facts vs owner entitlement. An NPC may lie or be mistaken, but cannot know unpublished GM secrets just because it was invented by the GM.

**Lean gate:** one mixed conversation/setting fixture, one NPC refusal/rumor, one native combat receipt described expressively, one protected PvP material violation held, one active proxy-control check. Run affected encounter/PvP tests **once**, not a full suite per edit. **Commit:** `feat(gm): expand NPC portrayal and protected-scene narrative freedom`.

### Phase 5 — Narrative salience, pruning, retrieval and observability

**Edit:** `memory-lifecycle.js`, `entity-memory.js`, `npc-cognition.js`, `context-planner.js`, `memory-clusters.js`, optional DB/index layer and operational metrics.

- Deterministic deduplicated per-owner-turn/session salience events, weighted player-interest vs capped bot reuse; stable aliases and audience-safe scores.
- Tier promotion and fictional-time demotion with strict dependency pins. Archive only prompt inclusion/state, not source history or native receipts; restore on entitled reference.
- Source-aware conflict handling: evolving place/NPC circumstances create revisions rather than overwriting established fiction. A disputed rumor remains disputed.
- Dynamic token budget: visible current scene and exact owner references first, active leads and native pending actions next, recurring/anchor characters after; retain a small novelty budget.
- Record audience-safe aggregate metrics for blocked/substantive output, quarantine and missing responses; don't export secret drafts or private prose.

**Lean gate:** 5–7 deterministic salience/retention tests (dedup, player vs AI mentions, decay, pin, archive/revival, private/audience isolation, continuity), plus `memory-lifecycle-test.mjs`, `memory-audience-isolation-test.mjs`, `v96-context-efficiency-test.mjs` once. **Commit:** `feat(memory): salience-rank and reversibly retire emergent fiction`.

### Phase 6 — Final qualification, release metadata, and production deployment

- Execute **one complete offline validation** `cd bot && npm run validate` (network-denied child processes). Also `npm run check`, `git diff --check`, any migration/restore drills, and release manifest integrity checks. Avoid rerunning the complete suite unless the last change invalidates the result.
- Ensure new fixture suite is registered in `scripts/validate-offline.mjs` and no old security suite was removed to make a gate pass. Require no privacy/PC/rollback/migration regression.
- Confirm no unplanned provider requests under test stubs and **zero OpenAI API usage for Codex testing**. Codex's own subscription usage for reading, adjudicating fake fixture outputs or reviewing failures is permitted; it is not an API substitute inside the bot.
- Align release/manifest files using repo `bot/scripts/sync-release.mjs` with the **current permitted next version** determined at execution (`release-version.mjs` enforces next minor or idempotent metadata rebuild). Do not hardcode an incorrect future version or unintentionally mutate manifests mid-phase.
- Commit release/integration docs: `docs/NARRATIVE_AUTHORITY_EXECUTION_LEDGER.md`, `docs/NARRATIVE_AUTHORITY_PRODUCTION_RUNBOOK.md` and user-facing change/rollback notes. **Commit:** `chore(release): qualify narrative authority and prepare reversible deployment`.
- Push feature branch; honor CI, code review/PR or repo's authorized integration process. Deploy the tested exact commit to production once verification gates pass. **Do not substitute a source push for a deployment.** Keep feature flags initially OFF until service/DB integrity checked; then enable via authorized campaign configuration and monitor non-invasive operational health. Production activation may be progressive within the same authorized release, without requiring another user prompt where an authenticated administrative path exists.

## 4. Lean testing budget and acceptance matrix

**Token economy rules:** no paid API tests; deterministic fake-provider output and offline guard. Minimize context fetches and terminal output; reuse targeted fixtures. Commit each phase after its own focused gates; run an impacted protected/security batch only when that boundary actually changes. One full `npm run validate` at final integration, not 154+ suites after each phase. Codex can use its own allocated product usage to examine fixture narratives, but should not cause HTTP requests from the bot to a provider.

**Baseline fixtures that must pass before deployment** (unit test files can share fixtures):

| # | Behavior | Acceptance |
|---|---|---|
| N01 | New empty scene | Contains specific setting detail + in-world hook; source-backed, not generic neutral |
| N02 | Invent named NPC/place | Native stable identity + scope-aware retrieval and no fake PC arrival |
| N03 | First-time clue/rumor | Genuine observed detail retained; secret cause stays unknown and rumor isn't promoted to objective truth |
| N04 | Mixed turn | NPC response survives alongside valid scenery under bounded model request budget |
| N05 | One forbidden PC decision in otherwise good scene | Only forbidden unit held; unrelated scene, NPC speech and native receipts survive |
| N06 | Protected combat / PvP | Evocative safe rendering of native result; no invented hit/damage/consent or voluntary proxy action |
| N07 | Unknown position | Camera opening works; no fabricated PC witness, move, co-location or inventory |
| N08 | Owner explicit initial position | Legally establishes new initial presence only when eligible; locked cost/encounter and prior history block shortcut |
| N09 | Discord uncertain/failed/replayed | No false recipient knowledge, cross-audience leakage, double effects or repeated intro |
| N10 | Existing AI-GM world observation | Legitimate provenance is retrieved; GM-private ancestor is not laundered |
| N11 | PC partial name/alias | Prohibited PC agency claim still rejected; normal NPC/free scene text not broadly suppressed |
| N12 | Return to an old scene | Previously established detail and NPC circumstance survive without contradiction |
| N13 | Repeated player interest | Importance rises by distinct player acts; AI loops can't self-inflate |
| N14 | Pruning | Low-priority entity disappears from routine prompt, remains historically recoverable and revives on reference |
| N15 | Pinned entity | Open plot/active custody/proxy/canon dependency cannot be pruned |
| N16 | Social NPC | Own believable nonbinding dialogue, motive, refusal and initiative; no NPC omniscience |
| N17 | Narrative completeness | Genuine gameplay question produces substantive output; intentionally silent/OOC request not forced |
| N18 | Privacy and rollback | Separate party/private views, immutable source links, tested backup restoration and archived source fidelity |

Metrics to compare in staging/fake runtime and passively after deployment: fraction of answered turns with substantive output, count of neutral/review-only substitutions, writer starvation, average model requests per observed turn, receive-to-first-substantive-delivery p50/p95, fraction of source-bound invented entities resolved on revisit, privacy/scope holds, number of unwanted new entity records. **No claims of live speed/cost gains from synthetic tests.**

## 5. Production backup / deploy / rollback runbook (explicitly authorized)

**Preflight, before any production write, Docker restart or new schema startup:**

1. Identify the actual service (Docker Compose or direct Node), active code directory/revision, production SQLite path, host filesystem/volume mapping and environment. Repo Docker default: host `./bot/data/veiled_city.sqlite`, container `/app/data/veiled_city.sqlite`. Actual `DATABASE_PATH` may override it. Never guess a different host from the docs. Do not print credentials or private campaign data.
2. Verify owner/admin access and current deployment process; inspect `git status`, outstanding turn/outbox condition, DB schema/user_version and disk space. Avoid deploying during an active live turn; stop incoming processing gracefully and allow or reconcile in-flight acknowledgments. Do not force resend uncertain messages.
3. **Back up the SQLite database as a consistent database, not a raw copy of only the live `.sqlite` file in WAL mode.** `VeiledDB` enables WAL; use SQLite `.backup` / online Backup API, or stop the service cleanly and use a proper consistent SQLite backup. Save a timestamped, access-controlled, preferably encrypted file **outside the repository and bot data directory**; preserve a copy of deployment config with secrets protected separately if needed.
4. Verify the backup opens and passes `PRAGMA integrity_check` and `PRAGMA foreign_key_check`; capture only checksum, size, safe schema metadata and backup location (not private rows) in the release ledger. Perform a disposable restore drill to a temporary path, including pending publication/outbox integrity and no automatic effect replay. **Stop deployment if backup or restore verification fails.** Keep the original database and WAL files undisturbed until a known-good backup exists.
5. Record old binary/image identifier, old Git SHA, release version, DB schema, feature flags, snapshot identifiers, restore steps and who/what executed them. Application campaign snapshots are useful but **not substitutes** for independent host-level backup.

**Concrete Docker Compose operator pattern (use only after verifying service/path/tools):**

```bash
# Run in verified production repository root; adapt paths to the real environment.
# Drain/stop the service before backup/rebuild if no validated online-backup orchestration exists.
docker compose stop veilkeeper
DB="$(pwd)/bot/data/veiled_city.sqlite"
BACKUP_DIR="/secure-backups/veiled-city"   # must exist and be protected; operator-verified
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="$BACKUP_DIR/veiled_city.pre-narrative.$STAMP.sqlite"
# sqlite3 CLI must be installed; if absent use a verified SQLite backup implementation.
sqlite3 "$DB" ".backup '$BACKUP'"
sqlite3 "$BACKUP" 'PRAGMA integrity_check; PRAGMA foreign_key_check;'
sha256sum "$BACKUP"
# Confirm integrity_check outputs 'ok' and foreign_key_check returns zero rows;
# then validate restore, deploy pinned qualified code, and restart.
docker compose build veilkeeper
docker compose up -d veilkeeper
docker compose ps
docker compose logs --tail=100 veilkeeper
```

**Important:** the snippet is a verified *pattern*, not proof that `sqlite3`, `/secure-backups/...`, Compose credentials or the prod host are available. Don't run `docker compose run ... npm run register` unless command schema actually changed, and do not expose `bot/.env`. A Node deployment uses the same backup/drain/check process followed by the documented install/restart method. Avoid running the bot on the production DB in an extra process while production is active; startup triggers `migrateSchema()`.

**Enablement after technical health check:**

- Add newly implemented narrative freedom/memory/camera/salience/completeness feature flags to the existing `CITY_FEATURE_FLAGS` allowlist, default OFF. Retain previous `playable_narration` and `scene_continuity` behavior. Prefer one coherent master flag and independently reversible subordinate flags, with validated dependencies; don't silently assume a newly coined flag already exists.
- Deploy with new flags OFF; verify startup, `PRAGMA integrity_check`, schema, migrations, log health, existing settings/commands and no unexpected outbox replay. Turn on an authenticated target campaign in a controlled order: **creative fiction first**, then publication/memory, then camera placement, then NPC encounter exposition, then salience. Use `/vc-city flags json:{...}` only with keys actually implemented. Do **not** impersonate a Discord GM or manipulate raw guild flag JSON by ad hoc SQL. If no authorized automatic admin path exists, deploy code safely and report activation as the sole manual step; do not claim feature activation.
- Production smoke must be **provider-free**: process health, command registration only if needed, database/open/migration health, readonly diagnostic projections, and safe metrics. Don't feed fabricated player messages to a live bot/provider. Observe actual organic player sessions passively and report live literary quality as unverified until real authorized play demonstrates it.
- Capture post-deploy snapshot/checkpoint/backup metadata without leaking secrets. Watch latency, neutral fallback, quarantine holds, error rates, private disclosure indicators, queue health. If errors indicate player agency/privacy leakage or DB corruption, immediately disable feature flag(s), stop affected publications, preserve receipts and enact rollback policy.

**Rollback classes:**

- **Behavioral issue, schema healthy:** switch OFF new feature flags via authenticated administrative method; hold new queued prose, retain existing event/delivery/memory receipts, continue native mechanics. No bulk data deletion.
- **Code issue, schema backward compatible:** deploy previously qualified image/SHA, leave flags OFF, verify scene/outbox revalidation and provider-free startup. Do not replay delivered Discord messages.
- **Schema/data corruption or incompatible rollback:** drain/stop, take an additional post-incident forensic backup, restore verified pre-deploy SQLite backup into a nonproduction path first, validate `PRAGMA integrity_check` / `foreign_key_check` and migration compatibility, then carefully restore in maintenance. **Restoring old DB can lose legitimate player changes after backup**; reconcile with audit/outbox before production restore, never unconditionally overwrite live state. A backup is not an automatic command to erase post-upgrade campaign history.
- Produce a concise deployment record: commit/image, schema before/after, backup verification, commands executed, actual flags, health metrics, incidents, rollback state. Do not call a push or backup an accomplished deployment if it wasn't executed.

## 6. Code review and file deliverables

Required final branch artifacts:

1. Implemented source/targeted fixtures, an updated versioned GM creative authority contract, and existing native security coverage intact.
2. `docs/NARRATIVE_AUTHORITY_EXECUTION_LEDGER.md` with SHA of every phase commit and exact tests/results, including not-run disclosures.
3. `docs/NARRATIVE_AUTHORITY_PRODUCTION_RUNBOOK.md` with actual verified infrastructure commands, DB backup/check/recovery instructions and flag dependencies, refreshed from preflight rather than copied blindly from this generic plan.
4. GM-facing release/rollout notes with new fiction policy, memory salience behavior, how anonymous/camera scenes differ from physical PC presence, and what remains undecided mechanically.
5. Final report distinguishing **committed**, **pushed**, **merged**, **deployed**, **enabled**, **backup verified**, and **live quality verified** as separate statuses, plus old/new SHAs, release version, CI/validation, test and API usage, DB schema, backup location in non-sensitive terms, rollback knobs and residual risks.

## 7. Do-not-implement shortcuts

- No simply removing `assertProtectedModelEvents`, `validateNarrativeClaims`, `revalidateOutputPublication`, PC/native rules, PvP or disclosure/role checks to make narrative tests pass.
- No blanket regex censorship or English replacement that hides valid clauses; no raw combined-model text trusted because an LLM self-certified it.
- No interpreting `stored in memory` as immediately visible to all players or NPCs, or as unquestionably objective canon.
- No auto-teleport, forced shared-party location, unchecked hidden access, fake dice or inventory/custody.
- No per-turn extra AI model simply to decide whether ordinary fiction is interesting, safe, important or worth remembering.
- No running `npm run validate` after every phase, no API-backed smoke tests, no printing secrets/private campaign text into tools/logs, no production campaign synthetic fixtures.
- No cleanup of actual historical NPC/location identities to reduce database size; prune prompt relevance and optional derived indexes only.

**Successful outcome:** a new player can ask an open-ended question and receive interesting, specific fiction; Veilkeeper can invent a meaningful NPC or lead and remember it; player attention gradually develops campaign anchors; absent character placement doesn't freeze the narrative; active combat remains evocative without inventing resolution; the native engine still governs mechanics, disclosure and player choice; production is backed up, qualified, safely deployed, and reversible.
