# P08-F05 — Living-world agenda, cognition and continuity at openings

**Phase:** [P08](../../phases/P08/SCOPE.md)  
**Status:** SUPPORTED BY EXISTING NATIVE CONTEXT — NO PRODUCTION DELTA  
**Reference:** `KeshireTheChaotic/Veiled_City` · `codex/clean-ai-gm-2026-10` · `81569d08699343e401fc11ba1eaed0f10b4fd37a`  
**Dependencies:** P08-F03; can proceed independently of unrelated P08-F04 holds

## Governing authority

Read `docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md` in full. Apply `README.md`, `TEST_PROTOCOL.md`, `TEST_EXECUTION_NO_POLL.md` and `DECISION_GATES.md`. The owner behavior specification is authoritative for narrative intent; `content/ENGINE/AI_GM_CONSTITUTION.md` is complementary. Native state alone validates and commits rules; each player owns all PC choices, speech, thoughts, emotions, dice and resources. Source/audience proofs, secrets, canon and exactly-once delivery are nonnegotiable.

## Goal / deliverable

Give OpeningDirector bounded **current world pressure**—existing NPC objectives, faction moves, witnessed environmental cues and weighted acknowledged continuity—without allowing a planner read to advance clocks or expose omniscient secrets.

## Source entrypoints — inspect HEAD; do not assume all require edits

`bot/src/opening-world-bridge.js`, `world-narrative-bridge.js`, `npc-cognition.js`, `narrative-salience.js`, `narrative-authority-context.js`, `gm.js`, and P08-F03 brief adapter

## Ordered implementation steps

1. Inspect existing `openingWorldOpportunities()` (at reference SHA it returns at most three beats), `worldDirectorBridgeBeats()`, NPC `speakerBrief()`, native faction/world records and disclosed weighted narrative memory. Prefer these over a second full `runWorldDirector()` simulation at startup.
2. Compose a bounded GM-internal `WorldOpeningContext` with source-bound current agenda options and conflict cues; separate objective GM truth, each NPC subjective belief, owner-entitled observation and public observable signal.
3. Provide a **filtered** subset to P08-F03's certified writer brief, not the whole GM truth list. A world beat is an opportunity to portray pressure, not authority to claim an NPC perceived/learned secret or to mutate an event.
4. Choose active pressures consistent with the session/scene and acknowledged continuity; use the existing weighted-memory selector and invalidation rules. Handle empty data gracefully with ordinary creatively grounded scene invention through the current validated fiction-delta system.
5. Preserve actor-local speaker cognition and established NPC identities, relationship histories, knowledge and campaign canon; do not promote provisional invention into established persistent fact from mere mention.
6. Any clock advancement, movement, Fear expenditure, faction resource use, NPC action requiring rules, consent or source facts continues through its existing native producer/receipt. Opening context collection remains read-only unless it invokes separately authorized established native workflow.
7. Confirm no additional provider roundtrip in the ordinary opening hot path merely to summarize already available state; document real calls if any.

## Brand-new affected-code tests

Create `bot/tests/ai-gm-2026-10/p08-f05.test.mjs`: conflicting GM objective truth vs NPC's sincere false belief; private faction objective; witnessed public clue; distinct owner clue; continuing unfinished plot and current faction pressure. Assert each brief sees only its projected material; speaker uses actor-known references, unacknowledged fiction is not asserted, read-only context leaves clocks/canon/effects untouched, and a native-authorized incidental NPC can later enter weighted memory without automatic canon promotion. Test empty world context.



## Source reconciliation

The live code contains the scoped components that the older static audit missed: `openingWorldOpportunities()` selects only current scene/scope-bound director beats; `buildNarrativeContext()` adds current location NPCs and `speakerBrief()` filters active subjective knowledge, memories, sourced goals and public/party relationships through actor evidence and visibility; `selectDisclosedNarrativeMemory()` requires complete acknowledged outbox delivery; `rankNarrativeMemory()` applies continuity salience without mutating world state. `gm.js::planAssembly()` also receives bounded existing world opportunities and GM-only planning context, while the writer gets only the audience projection. This satisfies the F05 integration boundary without another provider roundtrip or startup simulation.

## Acceptance / exit

Openings feel causally connected to current NPC/faction affairs with sound epistemic scope and no world-effect escalation. Existing flexible GM creativity and ordinary minor invention remain available.

## Scope, hold and rollback constraints

- Preserve native receipts and existing historical saved readers, principal/roster bindings, audience grants, uncertainties, acknowledged fiction and publication identity. Do not rewrite a delivered opening or send an uncertain part again.
- Use wholly new Node tests under `bot/tests/ai-gm-2026-10/` named for this feature, importing only **currently modified production code**, Node libraries, and newly written local fakes. No inherited tests, fixtures, golden outputs, broad validation or paid provider calls. For a documentation-only change, **no test is required or permitted solely to cover unchanged production**.
- Freeze source and fresh tests, run one targeted batch in one blocking call (or follow the repository's supervised no-poll alternative), collect the completed exit code, and document SHA/fingerprint, test hashes/counts, failures/skips and actual costs in [LEDGER.md](LEDGER.md). Rerun only after a batched repair; no watching.
- Before any *new creative limitation* (mandatory template, dialogue length cap, NPC invention ban, new fixed pacing, weaker model), ask the owner a concrete question and hold only that limitation. Enforcing existing player agency, privacy and mechanical authority does not require reapproval.
- If one item has missing source/rule or a noncritical hold, mark it locally and continue independent safe work. Stop unsafe critical work rather than fabricating proof. Reverse only this feature's scoped changes if rollback is necessary; retain owner edits and all authenticated history.
- Offline targeted passes are not release certification. No push, merge, deploy, service restart, production DB, provider spend or CI without separate approval.
