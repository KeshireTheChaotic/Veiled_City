# Evidence and source audit — Reviewed 2026-10-10

**Branch:** `codex/typed-intent-refinement` at `2dc347a77e1fd4988856b8e578e5c148fe82cb24`; commit link: https://github.com/KeshireTheChaotic/Veiled_City/commit/2dc347a77e1fd4988856b8e578e5c148fe82cb24

- `docs/TYPED_INTENT_PROGRESS.md` reports original T00–T08 complete; `docs/TYPED_INTENT_RELEASE_10.0.0.md` reports 85/85 default offline suites and explicitly limits semantic confidence to synthetic fixtures. There are stale deferred-finding paragraphs at end of progress ledger that contradict earlier completion; clean them in D00 without changing substantive status.
- `bot/src/typed-intents.js`: `validatePlayerIntents()` validates exact substrings, `legacyProposals()` uses `indexOf()`, `acceptIntentForAdjudication()` throws on material ambiguity, `persistPlayerIntents()` converts the legacy shape and requires current owner/source.
- `bot/src/authored-turn-envelope.js`: authenticated raw source and consumed span annotations exist; preserve them; exact offsets and active ancestry are required.
- `bot/src/gm.js`: model result validation and preview occur before native commit; bounded corrective regenerations can still fail; no deterministic per-clause recovery is apparent in the reviewed source.
- `bot/src/director.js`: post-turn review category `references` is tied to `npc_update`/`location_update`; independent world additions and scene actions do not count.
- `bot/src/narrative-integrity.js`: claim `source_span` means a substring of the narrated **output**, not the player's raw declaration.
- `bot/src/commands.js`: `/vc-session assemble` final ephemeral edit includes a potentially long assembled status; `/vc-session end` uses full recap in `editReply`; likely 2,000-char error site is still a hypothesis until the exact interaction is instrumented.
- `bot/src/index.js`: registered private channel path chunks text; DM fallback uses `member.send(text)` directly. `interactionCreate` forwards to `handleCommand`, which in reviewed commands has no button or select-menu handler.
- `bot/src/roll-requests.js`: `prepareRollRequest()` keys by source event only, not individual accepted action. `publishRollRequests()` loops old `mutation.intents` typed-roll receipts, not the new `nativeAdjudications` array.
- `bot/src/rules-arbitration.js`: `selectRuleBasis()` validates namespaced string forms, not actual source existence/relevance for most refs. Its `roll_required` flow does create native pending request records.
- `bot/src/turn-orchestration.js`: commits transactions and outbox; runs typed native roll resolution; uses `reconcileConsequences(...strict:false)`.
- `bot/src/action-dependency.js`: action DAG and statuses exist; native continuation after a later roll is not visibly wired through production.
- `bot/src/scene-action-window.js`: service contains `openActionWindow`, `joinActionWindow`, `lockActionWindow`, `resolveActionWindow`; none were imported/invoked by inspected `index.js` or `turn-orchestration.js`.
- `bot/src/memory-lifecycle.js`: has audience-scoped identity, revision and retrieval. Live `gm.js` uses `contextMemoriesForScope` pathway rather than direct revision retrieval; memory integration must be traced, not presumed absent in every indirect path.
- `bot/src/roll-collaboration.js`: native Experience, Help and Tag Team spend/consent behavior partially exists. Reuse it instead of rebuilding resource operations.

## Observed error codes (verbatim from attached errors)

- `PLAYER_INTENT`: `Intent span must occur in the immutable authored message.` (indices 1 and 2 in attached failures).
- `PLAYER_INTENT`: `Intent span must occur in the current authored message.` (index 1).
- `PLAYER_INTENT`: `Material target ambiguity requires clarification, not acceptance.` (repeated).
- `NARRATIVE_INTEGRITY`: `source_span` references a player-input sentence rather than actual output narration.
- `POST_TURN_REVIEW`: `review_without_mutation` for `references`; model said `changed`, no `npc_update` / `location_update` was emitted.
- Discord: `content[BASE_TYPE_MAX_LENGTH]: Must be 2000 or fewer in length.`

**Unverified and not asserted:** which specific player turn corresponded to each stack trace; actual underlying paid model response; production receipts, world position and DB state; deployment CI outcome for the exact reviewed HEAD (no PR-triggered workflow run was returned for that SHA); completion of any v7 item not independently proven by inspected source.
