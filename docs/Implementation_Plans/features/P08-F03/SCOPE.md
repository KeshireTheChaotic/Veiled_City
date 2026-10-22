# P08-F03 — Certified dramatic brief to the audience-first writer

**Phase:** [P08](../../phases/P08/SCOPE.md)  
**Status:** COMPLETE — CERTIFIED OBJECTIVE PROJECTION; SEMANTIC QUALITY UNQUALIFIED  
**Reference:** `KeshireTheChaotic/Veiled_City` · `codex/clean-ai-gm-2026-10` · `81569d08699343e401fc11ba1eaed0f10b4fd37a`  
**Dependencies:** P08-F02

## Governing authority

Read `docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md` in full. Apply `README.md`, `TEST_PROTOCOL.md`, `TEST_EXECUTION_NO_POLL.md` and `DECISION_GATES.md`. The owner behavior specification is authoritative for narrative intent; `content/ENGINE/AI_GM_CONSTITUTION.md` is complementary. Native state alone validates and commits rules; each player owns all PC choices, speech, thoughts, emotions, dice and resources. Source/audience proofs, secrets, canon and exactly-once delivery are nonnegotiable.

## Goal / deliverable

Connect the certified OpeningDirector convergence intent to the audience-first writer through a versioned **source-bound `AssemblyNarrativeBrief`**, without leaking private planner notes or letting model prose bypass native authority.

## Source entrypoints — inspect HEAD; do not assume all require edits

`bot/src/assembly-context.js`, `pvp-output.js`, `narrative-authority-context.js`, `gm.js`, `narrative-authority.js`, possible new `assembly-narrative-brief.js`

## Ordered implementation steps

1. Reconcile `planAssembly()` fields `convergence_goal`, `character_entries`, `stay_reason`, `bonds`, `public_opening`, `public_parts`, `private_hook`, `private_parts` and current certification rules. These are GM-private planning proposals, not inherently permitted public/private text.
2. Build a small deterministic projection/adapter (e.g. `assembly-narrative-brief.js`) pinned to certified plan fingerprint, session, scene, roster, audience, owner/control revision and source permissions. **Public** gets only permissible observed shared situation; **owner-private** gets its own source-safe opportunity/thread; **GM-internal** can evaluate dramatic coordination without automatic disclosure.
3. Define minimal narrative intent fields (nonbinding): shared incident/opportunity, pressure, unresolved dramatic question, appropriate public cue, owner-relevant objective/ref, NPC offer, agency warning, permitted source refs and plan revision. Treat bonds/stay reasons as potential cross-threads—not facts about PC intentions, allegiance, acquaintance or arrivals.
4. Replace the silent dramatic disconnect where dedicated v2 `assemblyNarrativeCandidate()` supplies generic `describe_scene` and `assemblyWriterBrief()` omits convergence semantics. Keep native validated `gm_narrative_unit`/`fiction_delta` as the authority path; **never** inject raw `public_opening`, `private_hook`, or GM-private planned `gm_world_parts` directly into transport.
5. Thread packet into the existing `narrative-authority-context.js` assembly branch. Use existing `reference_rules`, audience grants, location identity, speaker briefs, prior acknowledged fiction and source permissions rather than weakening validation for a well-written scene.
6. Revalidate the fingerprint and principal after authoring awaits and at publication. Explicitly reject stale/cross-recipient packets. Respect absent owner, no permitted source, manual mode, current independent position and returning party.
7. Keep the writer free to compose natural dialogue, sensory detail, proactive complications and ordinary native-authorized invention; the brief is a creative objective, not a fixed template or quota.

## Brand-new affected-code tests

Create `bot/tests/ai-gm-2026-10/p08-f03.test.mjs`: two unrelated PCs with separate player-entitled thread plus GM-private canary, a public incident, an NPC and one current location; assert same **dramatic direction** appears in authorized packets with distinct visibility, no private fact crosses the boundary, and neither PC arrival, feelings nor consent is invented. Test zero/one attendee, stale fingerprint, returning party, and rejection/quarantine of raw planning parts. New test cases must exercise changed writer/adapter modules.



## Acceptance / exit

The actual writer receives useful certified dramatic purpose and permitted context; produces source/visibility-compatible scene units; no raw GM plan is published; authoring does not auto-establish relationships or mechanical effects. No mandatory prose formula.

## Scope, hold and rollback constraints

- Preserve native receipts and existing historical saved readers, principal/roster bindings, audience grants, uncertainties, acknowledged fiction and publication identity. Do not rewrite a delivered opening or send an uncertain part again.
- Use wholly new Node tests under `bot/tests/ai-gm-2026-10/` named for this feature, importing only **currently modified production code**, Node libraries, and newly written local fakes. No inherited tests, fixtures, golden outputs, broad validation or paid provider calls. For a documentation-only change, **no test is required or permitted solely to cover unchanged production**.
- Freeze source and fresh tests, run one targeted batch in one blocking call (or follow the repository's supervised no-poll alternative), collect the completed exit code, and document SHA/fingerprint, test hashes/counts, failures/skips and actual costs in [LEDGER.md](LEDGER.md). Rerun only after a batched repair; no watching.
- Before any *new creative limitation* (mandatory template, dialogue length cap, NPC invention ban, new fixed pacing, weaker model), ask the owner a concrete question and hold only that limitation. Enforcing existing player agency, privacy and mechanical authority does not require reapproval.
- If one item has missing source/rule or a noncritical hold, mark it locally and continue independent safe work. Stop unsafe critical work rather than fabricating proof. Reverse only this feature's scoped changes if rollback is necessary; retain owner edits and all authenticated history.
- Offline targeted passes are not release certification. No push, merge, deploy, service restart, production DB, provider spend or CI without separate approval.
