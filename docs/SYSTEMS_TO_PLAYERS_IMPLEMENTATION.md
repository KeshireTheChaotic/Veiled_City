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
