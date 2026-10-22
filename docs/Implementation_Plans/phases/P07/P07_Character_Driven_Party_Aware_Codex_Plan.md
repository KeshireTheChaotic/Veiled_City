# Veiled City — Character-Driven Narrative, Party-Aware Consequences
## Codex implementation handoff — medium reasoning effort

**Repository:** `KeshireTheChaotic/Veiled_City`  
**Target branch:** `codex/clean-ai-gm-2026-10`  
**Reference SHA inspected:** `81569d08699343e401fc11ba1eaed0f10b4fd37a` (recheck actual HEAD and worktree before changing anything)  
**New initiative:** `P07 — Character-Driven, Party-Aware Narrative`  
**Authority:** Existing owner AI GM behavior specification and native authority/privacy/mechanics rules. This is a *soft narrative opportunity preference*, not new player control or truth authority.

## Objective

Create a living-world narrative preference in which **character choices, established relationships, NPC/faction autonomy and causal consequences originate story developments**. Where multiple **equally eligible, similarly urgent** developments are available, Veilkeeper should prefer an **organically party-relevant** opportunity if independently supported by already established, appropriately scoped evidence. This must **never require cooperation, co-location, party membership, a specific PC response, revelation of private knowledge, or a common master plot**.

**Non-goals:** No mandatory convergence, no forced crossovers, no fixed narrative percentages, no global party score determining truth, no automatic promotion of private hooks into party-visible events, no change to Daggerheart spotlight/effects/dice, no new universal planner or extra AI model call, no schema migration unless demonstrated indispensable.

## Operating contract (read before editing)

1. Verify branch, actual HEAD SHA, working-tree cleanliness/edits. Preserve user edits; don't reset, force-push or switch away from work unexpectedly.
2. Read in full `docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md`, then `content/ENGINE/AI_GM_CONSTITUTION.md`, `docs/Implementation_Plans/README.md`, `CODEX_START_HERE.md`, `TEST_PROTOCOL.md`, `TEST_EXECUTION_NO_POLL.md`, and `DECISION_GATES.md`. The GitHub version currently contains the owner spec, but use actual HEAD.
3. Inspect relevant code first: `bot/src/world-narrative-bridge.js`, `narrative-director-source.js`, `narrative-delegation.js`, `narrative-authority-context.js`, `narrative-salience.js`, `narrative-memory.js`, `context-planner.js`, `story-continuity.js`, `assembly-context.js`, `gm.js`. Do not rewrite stable authorization, mechanics, outbox or persistence layers for this preference.
4. Add independent documentation `docs/Implementation_Plans/phases/P07/{SCOPE,LEDGER}.md` and feature scopes/ledgers under `docs/Implementation_Plans/features/P07-F0N/`; update plan index appropriately. Record actual SHAs, changed files, decisions, test commands/outcomes, limits and rollback instructions. Small steps: finish and freeze each feature before its focused test batch.
5. **Test policy:** New offline deterministic tests only in `bot/tests/ai-gm-2026-10/p07-f0N*.test.mjs`. Use Node standard libraries and new feature-local test fakes; only tests of changed production contracts. Update the fresh selector's coverage map for each touched production file; do not call inherited suites or `npm run validate`, `npm test`, provider tests, CI or production DB. Use one blocking test batch per frozen feature, without polling. Read results once after exit, then log exit and counts. Follow the repository's no-poll policy literally.
6. Do not push, merge, deploy, restart Discord bot, change production database, trigger CI, or spend on paid providers without separate authorization. Work with one agent and no subagents by default. Ask the owner **before imposing new creative restrictions**; isolate that question and keep independent safe work moving.

## Narrative decision policy

**Gate A — Hard eligibility (cannot be scored away):** Valid active source and native provenance; audience/owner entitlement; current scene/session and authorized character presence/viewpoint; committed receipt status where an actual consequence is claimed; no NPC omniscience, PC action, invented location, invented shared knowledge, proxy usurpation, or unsourced party relationship.

**Gate B — Response obligations (cannot be displaced):** Respond to the active player's declared attempt, direct NPC conversation/question, pending mechanics and real deadlines/reactions. Do not replace an immediate response with a more broadly relevant optional story beat.

**Gate C — Opportunity class:** Distinguish justified immediate consequence, active NPC/faction development, legitimate character thread/lead, and incidental atmospheric opportunity. Existing urgency and causality outrank party reach.

**Gate D — Soft party awareness:** Within otherwise similarly eligible and urgent optional developments, prefer one that already intersects multiple present characters' distinct interests, evidence, relationships or locations. Count **verified independent links**, not merely names mentioned in prose. A single-PC development remains fully valid and can win on urgency, relevance, player intent or authentic NPC motive.

**Gate E — Storytelling:** Offer a specific scene, NPC response, lead or consequence. Leave PC choices open. Never reveal why a hidden connection was internally interesting; public projection must be independently audience-entitled.

Use a small, deterministic tie-breaker with stable ordering, rather than opaque LLM-generated rankings or arbitrary numerical bonuses. If there is insufficient evidence to compare, preserve current order. Never create new truth, commitments or salience evidence simply by selecting a candidate.

## Phase P07-F01 — Baseline, specification and failure cases

1. Check actual branch HEAD, `git status`, and recent changes. Read the authority and current phase/test protocols.
2. Map candidate sources to selection, prompt, publication and replay: `worldNarrativeBridgePacket()` -> `bindDirectorNarrativeSource()` / `dramaticBrief()` -> `worldDirectorBridgeBeats()` -> narrative writer/output authority. Identify where the first-four cap currently applies and where first-match order stands in for ranking.
3. Write `P07/SCOPE.md`, `P07/LEDGER.md`, `P07-F01/SCOPE.md` and `P07-F01/LEDGER.md`, including the policy above and a data-flow diagram in Markdown.
4. Document explicit *non-interference* rules: player-declared responses first; existing native adjudication, hidden ownership, Daggerheart spotlight, narrative memory and accepted actor cognition unmodified.
5. Record baseline source/test plan. No behavior change in this feature; do not present existing historical tests as new certification.

**Exit:** Source-specific design notes, baseline SHA, approval boundaries, precise list of changed functions, and testable decision examples. No speculative new engine.

## Phase P07-F02 — Pure, bounded opportunity characterization

1. Create a *small pure helper* only if needed, e.g. `bot/src/narrative-opportunity-policy.js`, for ranking already eligible native signal metadata. Do not introduce a new database table or model call.
2. Inputs: existing signal kind, native source refs, established scene/session/scope, audience-proven causal links, verified actor references if available, and existing deterministic urgency/response classifications. Keep candidates and resulting metadata bounded.
3. Classify: `mandatory_response`, `causal_consequence`, `autonomous_world`, `personal_opportunity`, `ambient`; use these as ordering hints, not automatic proof of event significance. Don't downgrade unresolved obligations to make a crossover possible.
4. Detect `organic_overlap` only when **two independent currently entitled source relationships** already point at distinct involved PCs/interests. Do not infer co-location from roster, secrets from a GM hook, participation from absence, or group membership from session check-in. If such a link is not currently exposed by a safe verified reader, classify as `unknown` and preserve order. Do not fabricate links.
5. Deterministic ordering: protect mandatory obligations; preserve genuine temporal urgency and source precedence; use organic overlap as a bounded tie-break among comparable optional candidates; break final ties using stable original index and/or source ID. Keep the present first-four cap and unchanged native signal schema/identifiers.
6. Add fresh tests for equal-tier comparison; private-only evidence exclusion; single-character win; missing evidence; stable ties; no fabricated crossovers; bounded selection.

**Exit:** Read-only pure ranking logic with explicit reasons for decisions; no visible prose or authority changes.

## Phase P07-F03 — Integrate with source-bound world opportunity selection

1. Integrate the helper into `worldNarrativeBridgePacket()` **after** current entitlement/source verification and deduplication, **before** `signals.slice(0,4)`. Do not insert unverified candidates or alter `signal.id`, provenance, scope or saved receipt formats.
2. Preserve the existing prioritization of required opening/delivery recovery and unresolved narrative tasks. Verify any ranking changes against `revalidateWorldNarrativeSignal()` so queued/replayed snapshots cannot silently gain new authority after ranking changes.
3. Keep `eligible`, `omitted`, `signals.length <= 4`, and source/owner/scene validation accurate. If candidate rationale would contain private details, keep it out of player-visible signal envelopes and transport.
4. Maintain at-most-one Director beat per normal pass and `act:false` when no appropriate development exists; no scanning background NPCs merely to inflate group relevance.
5. Fresh tests: more than four equally valid signals; two organically overlapping candidates; private/GM-only refs cannot win a party selection; unchanged source hashes and revalidation; source revoked/replayed/restarted; no duplicated effect or narrative signal.

**Exit:** Party-aware *selection* of preexisting eligible opportunities, without authority or publication drift.

## Phase P07-F04 — Director and narrative writer guidance

1. Read `bot/src/narrative-director-source.js`, `gm.js` Director layer rules and `narrative-delegation.js` before editing. Prefer minimal instructions placed in the existing **GM-private** narrative brief / Director prompt, not a second provider call.
2. Add concise guidance: 'Follow active character goals and justified autonomous NPC motives. If equally compelling opportunities exist, notice organic links to the party. Portray consequences without presuming knowledge, cooperation or arrival. A personal lead is sufficient when it has the strongest cause. A quiet world is allowed.'
3. If passing ranking explanations to the Director, use at most a few source-bound, nonauthoritative descriptors that obey its current private/public scope. Do not create a model-owned `party_score` field or let the writer set recipient/visibility/effects.
4. Do not change `creativeBrief()` response-obligation logic: player asks an NPC a question -> answer the NPC question, even when another plot beat affects more PCs.
5. Preserve the Director layer semantics (round/scene/downtime/manual), including one justified world move at most, existing model selection and false/no-op options. No fixed pacing or forced cliffhanger.
6. Fresh tests validating public/private prompt projection, zero added model calls, active-player response wins, autonomous personal development, NPC actions conditional on their own goals, and no invented PC choices.

**Exit:** The existing creative model can use the preference without overriding response obligations or inventing party involvement.

## Phase P07-F05 — Continuity, multiplayer and privacy verification

1. Check `narrative-salience.js` and `narrative-memory.js`: selecting or narrating a party-relevant possibility cannot by itself increase canonical interest, bypass disclosure receipts, or promote private clues to shared truth. Avoid modifying historical salience weights or persistence thresholds unless a **specific proven defect** requires it.
2. Check `context-planner.js` retrieval: retain character-specific arcs as legitimate context; never give them automatic lower rank merely because no other PC is affected. Keep audience filtering *before* ranking.
3. Check `assembly-context.js` and existing opening instructions. Shared incidents create optional opportunities; character-specific hooks remain independent. Do not force arrivals, party establishment, private disclosure, relationships or participation.
4. Check `story-continuity.js` fairness and `scene-intent-board.js` simultaneous intents. Personal narrative focus is not Daggerheart spotlight distribution; don't turn least-recently-heard into initiative or impose equal plot beats per player.
5. Write fresh cross-boundary tests only where this initiative modified production contracts; otherwise document inspection conclusions in ledgers without editing stable modules.

**Exit:** Private origins remain private; party-visible consequences require independently authorized public sources; individual threads stay viable and player response rights remain intact.

## Phase P07-F06 — Acceptance, measurement and handoff

1. Build brand-new deterministic scenarios: (a) Carl's private assignment, party-visible infrastructure consequence; (b) Choso's evidence with an NPC's independent response; (c) Raven's spectral trace affecting waterfront interests; (d) Elias's observable shadow tell without reading his internal feelings. Fiction is test fixture data only, not new campaign canon.
2. Cover opposing cases: (e) player directly questions an NPC while a party hook is available -> NPC responds first; (f) overlapping hooks with no independent evidence -> no forced connection; (g) one PC active/others absent -> no inferred participation; (h) two PCs at different locations -> no fabricated co-location; (i) GM/private source behind a public consequence -> no source leak; (j) genuinely urgent single-character consequence beats optional group-relevant opportunity; (k) no justified beat -> Director may choose `act:false`; (l) deterministic replay/selection and no double delivery.
3. Freeze changed files; update `bot/tests/ai-gm-2026-10/coverage.json` for **each changed production file**. Run only `node --check` on changed JS/MJS and one blocking `node --test tests/ai-gm-2026-10/p07-f0*.test.mjs` batch (from `bot/`) or repository's approved fresh-delta selector with exact scoped inputs. No test polling and no inherited suite execution.
4. Record actual SHA, changed paths, test counts, failures/skips and exact exit codes. Record prompt sizes/model-call counts for the changed path using offline instrumentation if feasible. Target **zero added model calls**, **no added network/prod DB**, and original cap of four signals. Do not invent latency or cost measurements.
5. Inspect the diff for accidental writer/audience/outbox/mechanics changes; roll them back if outside approved scope. Update P07 feature/phase ledgers and docs with precise status and rollback steps.
6. Return a concise owner report: implementation summary, branch + exact HEAD, focused tests actually run, evidence paths, unverified behavior, owner decisions still needed, and explicit `NOT DEPLOYED / NOT FULL RELEASE QUALIFIED` status. No push or deployment.

## Required acceptance criteria

- Character-origin narratives remain narratively worthwhile without party intersections.
- Verified, naturally overlapping optional opportunities may beat comparably urgent isolated opportunities; coincidence or mere roster membership is insufficient.
- Player-authored actions, direct requests, urgent causality and real native mechanics cannot be displaced by preference scoring.
- Private knowledge never becomes public through selection, prompt context, NPC knowledge or published narration.
- One-character/private scenes and split-party play remain supported, without invented PC placement or decisions.
- Daggerheart spotlight remains flexible; no forced turn order, quotas, or player action authoring.
- NPC/faction motives continue independently, even when the party ignores their developments.
- Deterministic bounded selection, replay safety, preserved signal IDs, signal cap <=4, unchanged authoritative outcomes and zero added model calls.
- Passing new offline tests means **targeted delta verification only**, never live narrative quality assurance or production release approval.

**If a safeguard conflicts with creativity:** retain all mandatory player/privacy/mechanics protections, but *do not add new prose/creativity restrictions without asking the owner*. Keep the restriction as a local hold and proceed on independent safe work.
