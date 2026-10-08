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
