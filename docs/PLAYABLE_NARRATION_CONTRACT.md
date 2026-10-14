# Playable narration repair — development contract

Base: `120dccdd067700b3dcac7ff97e876b203420cb5b`, feature branch `codex/playable-narration-repair`. Owner's supplied plan is preserved in `CODEX_VEILED_CITY_PLAYABLE_NARRATION_REPAIR_PLAN.md`.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

This is a common gameplay narration repair, not a laundromat-specific feature. Exploration, investigation, conversation, social play, combat, supernatural events, transitions and story continuity retain their existing native paths. New prose does not grant effects. An ordinary-scene author may introduce bounded local layout, sensory detail, harmless props and ambient activity; new clues, NPC decisions/dialogue, restricted access, knowledge, hazards and mechanical consequences require their existing native authority. The default-off `playable_narration` flag must not change legacy behavior.

Three lanes remain distinct: (1) established audience-visible observations, (2) source-bound scene-local GM fiction, (3) verified native consequential outcomes. Never publish raw combined GM narration, treat an empty claim list as safety, or trust a model's safe/authority/consent flag. New broad scene fiction is excluded from protected PvP, active encounters and contested local action windows; existing strict actor/receipt projections continue there. NPC conversation uses its existing isolated authoring lane.

The prose writer receives only an authenticated observation request, current native viewpoint, entitled local context and previously committed scene-local fiction. No sheets, private hooks, arbitrary GM summaries or unfiltered transcripts. Source closure, session/scene, owner/control revision, audience, placement and exact draft hash are checked before native acceptance and again before every publication/reuse. Unpublished drafts never become memory or canon. Scene-local detail is not global canon or mechanical evidence; consequential promotion must use a native adapter.

Provenance and category checking do **not** prove arbitrary generated English semantically safe. Packet isolation, a separate native acceptance gate, restrictive scopes, immutable evidence and existing agency/material tripwires reduce risk; undiscovered indirect semantic assertions remain a residual generative risk. Do not claim a finite fixture proves universal semantic detection or live narrative quality. Hold ambiguous new prose without rolling back independent committed outcomes.

## Phase ledger

| Phase | Status | Evidence |
| --- | --- | --- |
| 0 — contracts/reproductions | Complete (expected red baseline) | Focused suite 1/4 passed, 3 failed, zero skips: usable sparse-scene output absent, scoped packet service absent (two cases); raw cross-PC draft remains blocked. |
| 1 — scoped packet | Complete | Changed-area 3/3, zero skips, 813.6225 ms. Exact owner request/native viewpoint/place function; visible evidence without grammar whitelist; private/GM/ancestry negatives. |
| 2 — native authoring/output | Complete | PLAY01–08: 8/8; four prescribed security suites: 105/105; zero skips/failures. No full qualification yet. |
| 3 — gameplay/entry/assembly lifecycle | Not started | |
| 4 — provider efficiency | Not started | |
| 5 — integrated qualification/handoff | Not started | |

No production database/configuration, paid provider, Discord runtime, deployment or push is authorized. Focused fake-provider tests during development; affected security suites once per risky batch; one full offline gate at final integration. Do not reuse historical passing counts as this branch's qualification.

Phase 0 actual command: `cd bot; node --import ./scripts/offline-guard.mjs --test scripts/playable-narration-test.mjs`, exit 1, **1,114.3096 ms** (TEMP `veiled-playable-phase0-red.log`; this corrects the preliminary hand-entered elapsed time). Expected red is not release qualification. All six incident-style prompts are preserved in the fixture, with a second non-laundromat location proving the interface is generic. Existing untracked owner plan was read in full and preserved without editing. Origin was in sync (0/0) before branch creation. No prior unexecuted hotfix tests are assumed green.

Phase 1 starts `efa8160e89405646a1b3ff00ed3ebd3e183da1af`. New `scene-fiction-context.js` is read-only and uses real source/owner/presence, audience closure and existing protected-scope lookup. No fiction is accepted yet. The first packet test exposed a genuine fixture defect: reusing the same arrival source intentionally cannot update its zone. Corrected fixture creates a separate exact owner-authored native initial-arrival source with interior presence, not a state override or relaxed production check. Final command pattern `PLAY02|PLAY03|PLAY05` exit 0; PLAY01 remains the original downstream red until Phase 2. General place type is native metadata, not laundromat keyword inference. Packet excludes GM facts, private transcript and private-source laundering; known terminal/parcel/knocking are scoped freeform native facts, not grammar seeds. No full validation or production/API operation.

Phase 2 starts `a81117d707c843a77dfec5b8be9a9f6472da28fb`. Version 7 requests carry no prose or authority. A single bounded audience-isolated writer creates a GM-private immutable draft; the existing transaction consumes its exact native binding into `scene_fiction`, `native_scene_fiction` and scene-lifetime `scene_local_detail` records. Common output preparation, outbox, deferred delivery and archive validation rerender that native proof. No new SQL schema or mechanical effect adapter. Writer budget is shared with existing NPC/scene authoring; no evaluator call. `playable_narration` is allowlisted, undefined/default OFF; no runtime configuration changed. Native local fiction events are excluded from generic objective-evidence retrieval.

Original PLAY01 red is green without grammar seeding. New negative checks cover cross-PC apology/choice/injury/custody, invented evidence, source revocation, restart/private recipient and protected PvP/locked windows. Two test-harness errors (FakeResponses uses `requests`, and PvP correctly requires fixture co-location) were corrected, not security expectations. Focused command exit 0: 8/8, 3,482.1972 ms. Prescribed four-suite command exit 0: 105/105, 39,736.3775 ms. Logs: TEMP `veiled-playable-phase2.log`, `veiled-playable-security.log`. `git diff --check` passed. Both writer isolation and finite tripwires have residual semantic risk as stated above; they do not certify unrestricted PC/effect prose. No billable/live calls, production access, full validator, push or deployment.
