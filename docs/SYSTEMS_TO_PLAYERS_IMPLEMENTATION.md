# Systems to players — phased implementation and operator guide

Planned releases: 7.1 P01/P02; 7.2 P03/P04; 7.3 P05; 7.4 P06; 7.5 P07; 7.6 P08/P09; 7.7 P10; 7.8 P11; 7.9 P12/integration; final major 8.0.0. A phase is committed only after its offline gate passes. See `SYSTEMS_TO_PLAYERS_GAP_ANALYSIS.md` for baseline evidence. No phase is complete merely because it appears in this plan.

## Storage, rollout and rollback

Reuse schema 440 native tables and additive city-record kinds; no live-save migration or new economy/memory ledger. Take a GM campaign backup/snapshot before enabling extensions. Logical restore includes city records, handouts, NPC memories and encounter records. Player exports must continue excluding GM-only planning and source provenance.

Flags are explicit booleans through the existing authenticated `/vc-city flags json:...` command. Missing flags mean disabled. AI proposals additionally require `/vc-story delegation`; flags alone do not grant execution authority. Human review, current source/revision, real ownership and fictional-time budgets remain mandatory. Disabling stops new extension processing, not historical records or existing native actions; inspect/cancel queued work before rollback. Restore a backup only by explicit operator choice.

All new deterministic lookup/advisory work uses no provider call. Model proposals ride existing bounded requests. Structured contracts remain closed (`additionalProperties:false`, all properties required, nested `anyOf`) following [official OpenAI documentation](https://developers.openai.com/api/docs/guides/structured-outputs); application validation is still required. No API key or paid smoke test is needed for the offline gate.

## Acceptance matrix

Pending phase evidence will be added here with named tests, production entry points and explicit limitations. All P01–P12 remain partial or absent until their behavioral criteria are verified.

## Phase 1 — 7.1.0 (P01/P02)

Starting HEAD: `6856e21bffff304352d5447e6099664f2537f8f5`. Rechecked encounter composition, combat start/end/aftermath, scene occupancy, actor-owned sources, native intents and normal GM turn parsing/commit. Existing BP rules, randomness, combat state and post-turn review are unchanged.

Before: encounter construction could choose templates without world actor provenance; adjudication guidance was prompt-only. After: explicit actor/template bindings, bounded source-driven AI proposals, GM planning approval, attendance/position/template revalidation at start, private actual-result history, replay-safe aftermath guard, and closed GM-private decision advice in normal turns. Advice is validated again at authoritative commit and recorded in the GM audit, never directly published. This is support, not a second rules engine or proof of semantic judgment.

Enable (GM only): `/vc-city flags json:{"scene_continuity":true,"encounter_intelligence":true,"decision_advisory":true}`. Establish real scene occupancy first. Bind a **single-body** approved template:

```json
{"op":"bind","actor":"existing-npc-key","template":"Exact library name","information_key":"owned-knowledge-key","source_event":"active-source-id"}
```

Submit using `/vc-encounter world json:...`. A source must be legitimately known to that NPC. Minion/Horde bindings are deliberately rejected until individual/group bodies can be explicitly grounded; one actor must not create additional bodies. Propose using `{"op":"propose","key":"stable-key","source_event":"active-source-id","actors":["existing-npc-key"],"location_key":"established-location","objective":"negotiation","environment":"Exact tier-appropriate environment"}`. Other objectives: `escape`, `protect_evidence`, `containment`. Accept/decline: `{"op":"accept","key":"stable-key"}` or `decline`. Acceptance creates a native **planned**, not active, encounter; normal `/vc-encounter start` remains a separate human decision. A changed scene, source, binding, attendance or composition requires a fresh review. No reinforcements are invented to spend unused BP.

AI: allow `encounter.propose` in existing delegation configuration if desired. Suggest-only leaves an AI review receipt; routine delegation only creates a GM-private encounter proposal, never combat. Use the existing AI inbox/review, then the explicit native encounter review. Missing flags preserve legacy behavior. Decision advice adds no provider request and never supplies a Difficulty, modifier or die value.

Acceptance IDs: `SP1` in `bot/scripts/systems-to-players-1-test.mjs` traverses fake Responses → real `GMService.runTurn` → `commitGmTurn` → dispatcher → persisted proposal → native GM review → encounter/combat result history → restart. It checks real command authentication, no auto-combat, absent PC exclusion, changed attendance, duplicate receipt/outcome replay, foreign guild isolation and bounded advisory classifications including reaction/silence. Existing combat, clue fairness, roll outcome, consent, privacy, restoration and publication fixtures remain mandatory.

Limits: outcome history records actual combat HP/status but does not interpret defeated as dead or automatically move survivors, grant witness knowledge, invent clues or force faction retaliation. Actor-specific tactical/social memory extensions belong to phase 2. Natural-language appropriateness, contradictory user rule requests and truthful voice remain model/human judgment; the advisory validator only proves structural constraints. Standalone advice is not a mechanical adjudication or guarantee that narration semantically follows it. No live API/Discord/TTS smoke test is claimed.

## Phase 2 — 7.2.0 (P03/P04)

Starting HEAD: `c92421b`. Existing native NPC memories, ownership, sound-path checks, cognition retrieval, goals and strategies are retained. Added no new transcript or tactical state ledger. Enable `/vc-city flags json:{"scene_continuity":true,"dialogue_history":true,"tactical_memory":true}`. Tactical outcome capture also needs `encounter_intelligence` and a reviewed world encounter.

Players explicitly author speech as `say: "Your exact words"` or `say to npc-key: "Your exact words"` in an active, owner-controlled, attended scene. Only actually present, non-proxied NPCs with an unobstructed hearing path receive native memories (at most 12 per utterance). Private scenes require the addressed form; unaddressed private messages are not broadcast. Hypotheticals, plans, ordinary prose and proxy speech are not inferred as owned PC utterances. Source events are GM-private and retain exact quoted text plus authenticated author/listeners. A quotation establishes speech, not truth, consent, spending, affiliations or supernatural binding.

Optional delegated `dialogue.interpret` appends a bounded, explicitly subjective native memory for an actual recorded listener; confidence is capped at 70. Topic vocabulary includes promise, offer, refusal, boundary, address, argument, joke, apology and disagreement. Interpretations/corrections never erase earlier quotation/history or force the NPC's next decision. Existing relevant-memory ranking and packet bounds apply; no extra provider call. Default manual/suggest-only delegation remains inert until reviewed.

Native encounter start now atomically binds each world actor to one combatant ID, including repeated templates. End creates a GM-private own-result source, native episodic memory and actor-owned knowledge; actual HP/status are read from combat tables. It never applies HP again, turns defeat into death, moves actors or grants knowledge of other actors' results. Existing goal/strategy adapters can subsequently use that own-result knowledge key (`combat:<encounter-id>`) for sourced preparation/retreat proposals. Particular witnessed PC tactics still need established observations/reports through existing native cognition; no omniscient tactic extractor is claimed.

Acceptance IDs: `SP2` in `systems-to-players-2-test.mjs` covers listener isolation, private addressed speech, two interpretations, forgery, absent witnesses, correction history, retrieval, source-scoped native intent commit, actor-specific outcomes, duplicate replay and snapshot/restart/restore. `SP1` and all earlier fixtures remain release gates. Source retraction blocks later interpretation; prior original memories remain historical evidence. Disabling flags stops new capture, preserving history. No live data or settings changed.

## Phase 3 — 7.3.0 (P05)

Starting HEAD: `148c2ed`. Native handout metadata now owns physical custody; cases/facts/canon are not replaced. Enable `/vc-city flags json:{"evidence_custody":true}`. Read `/vc-handout evidence id:<exact-handout-id>` for a scoped current revision. Mutate through `/vc-handout custody json:...` with `op`, exact `id`, stable operation `key`, `source_event`, `expected_revision`. No caller-supplied GM/owner/permission fields are accepted. Owner operations require current owned attendance; collection additionally requires sourced actual scene presence (`scene_continuity`).

GM first registers `{"op":"register","id":"...","key":"register-original","holder":"location:archive","source_event":"...","expected_revision":"absent"}`. Holder types are established `location`, `npc`, `institution`, or explicitly consenting `character` after collection/transfer; initial GM registration cannot choose PC ownership. An active GM-indexed source's `details.evidence` must establish `handout_id`, `from`, `to`, and optional `copy` (`original` by default). Use existing `/vc-city event` indexing; it records human-established fiction, not a new mechanical resolver.

Owner `collect` moves an original/copy from an actually occupied location to that character. `transfer` with explicit `to` requires current controller and matching physical source. A PC recipient receives only a **pending** transfer; their own `accept`/`decline` command, fresh operation key and current revision answer the exact same source. Ignoring/declining costs nothing and never changes original holder. Access and physical custody are distinct: transfer does not publish sealed contents or grant handout visibility. `copy` explicitly creates a separately identified copy using the operation key (max 20); source `operation` must be `copy`. Copies never create a second original.

GM `status` records `held`, `analyzed`, `disputed`, `altered`, `missing`, `destroyed`, `archived`; source proof `operation` must equal that status and identify the exact copy. Missing/destroyed clears physical holder but preserves provenance. Closed evidence cannot be duplicated/resurrected through this workflow. `resolved-transfer` records an already human-adjudicated external theft/seizure only: source kind `evidence_transfer`, proof operation `resolved_transfer`, `human_reviewed:true`, exact `from`/`to`, and bounded `resolution` provenance are required. It establishes physical change, not voluntary PC consent, guilt, warrant authority or legal title. No AI custody transfer intent exists.

AI `evidence.analyze` always requires human review even if allowlisted for routine delegation; it can only record an actual source with `operation:"analyzed"` and a bounded **unverified interpretation**. It cannot invent laboratory procedures/results or alter canon. Physically resolved source events cannot be replayed under fresh operation keys. State/review/receipts/history commit atomically; failed publication never reruns effects. Latest 100 metadata history entries are retained; full audit/receipt provenance remains in campaign storage and backups.

Acceptance ID `SP3` (`systems-to-players-3-test.mjs`) covers native metadata/controller/recipient operations, source replay, mandatory AI review, private sealed data, zero-write player command, public handout export sanitization, logical backup/restore and restart. Player evidence view exposes only owner-authored or authorized-source history, not hidden custodians or private analysis. Ordinary artifact exports omit all custody metadata/canonical-fact internals. No rule, PC resource, fixed mystery truth or essential clue route is modified. Rollout is manual; disabling stops new operations without deleting history.

## Phase 4 — 7.4.0 (P06)

Starting HEAD: `c9771dd`. Enable `/vc-city flags json:{"audience_influence":true}`. Establish directed `/vc-city connect` channels from `npc:<key>` to an existing `institution:<key>`, `community:<key>` or named `audience:<key>`. Existing source-owned NPC knowledge, contact-compatible goal, native resources/position, non-proxy availability and explicit fictional opportunities remain prerequisites. This adds no extra scheduled/model work or wall-time progression.

Existing native `contact`/`negotiate` actions may target these civic types while the flag is enabled. They pay the existing influence resource exactly once, resolve through the native application-owned mechanism and capture their actual knowledge source/content. They **do not** automatically grant a civic recipient the claim or infer assent. Actions completed before this source-capture feature was enabled cannot be retrospectively repurposed; use a new legitimate opportunity. Ordinary NPC/faction contacts and legacy transmissions retain their earlier paths.

Then `/vc-city transmit json:...` supports:

```json
{"op":"attempt","key":"stable-attempt","source_event":"owned-source","from_key":"npc-key","to_type":"audience","to_key":"readers","information_key":"owned-knowledge-key","mechanism":"media","action_id":"actual-native-action-id","response":"refuse","interpretation":"This audience doubts this account.","prior_key":"","dissent":[]}
```

Responses: `accept`, `refuse`, `correct`. Actual native failure remains failed regardless of requested response; established zero recipient capacity forces refusal. Corrections require that recipient's own prior report/message key; original report/history is never rewritten. Dissent keys must identify actual personnel of the recipient institution. Audience interpretations/credibility remain subjective, not canon or PC modifiers. An NPC may not publish hidden knowledge or GM/private evidence through an audience response. Institutional/community delivery remains scoped through the existing reports/messages.

AI `influence.attempt` uses the same closed fields (the target key supplies `key`) and existing source/revision/policy checks. It always requires human review, even under routine delegation. Inspect pending proposals with the existing AI inbox and review command. A resolved native action can be used once only; retries cannot spend its cost again or fan it out across audiences. Independent audiences need independent actual contact opportunities. Persistent refusal/correction explains what occurred without implying legal guilt, votes, affiliation or PC assent.

Acceptance ID `SP4` (`systems-to-players-4-test.mjs`): divergent audiences, persistent refusal/correction/failure, native resource conservation, human review, hidden evidence refusal, stale evidence snapshot, channel denial before costs, original history, no canon promotion and restart/restore. Existing institutional authority/capacity tests remain mandatory. No live flags/data/deployment changed; disable to stop new influence processing while preserving native history.
