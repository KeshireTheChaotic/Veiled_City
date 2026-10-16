# Audience-first V9 execution ledger

## Scope and foundation

- Parent local SHA: `09ee30f42ed275a1effc6891e052d6b2eaaac803`; branch `codex/audience-first-narrative-v9`.
- Parent completed qualification is historical evidence only (123 mandatory suites, 39 optional matrices retained); not a claim that this rewrite is qualified.
- Owner requests revision `0.0.0.1`, and a fresh production DB. No production operation authorized. Native mechanics/privacy/agency/once-only security assertions remain mandatory.
- Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## F0 — dormant framework (qualified)

Four standalone adapters and original nine structural tests imported from the starter without runtime callers. Version tooling accepts the private `0.0.0.N` series alongside the unchanged legacy SemVer policy; package and lock metadata agree. No dependency changes. Superseded semantic replacement plan removed after a filename consumer scan; six referenced candidates kept. See purge ledger.

Executed `node --test scripts/audience-first-framework-test.mjs`: exit 0, 9/9 passing, 0 skipped. `npm run check`: exit 0. Neither invoked providers or SQLite fixtures. Source search confirms no production import of the scaffold. Starter ZIP SHA256: `d2762466263cb1fa566804be813aeddedbb024f66f2d765e10400895377797c44`. Normalized release sync and diff check are required before this atomic commit. No full validator at F0. No real provider/Discord calls, production access, push, merge or deployment. Rollback: return to parent source on this local branch; do not restore any database.

F0 commit: `7e2edd4d86791b50b9c1384ad93cb8de693824d3`.

## F1 — native audience wiring (qualified local adapter)

Starting SHA: `7e2edd4d86791b50b9c1384ad93cb8de693824d3`. `audience-native-v9.js` registers native context snapshots in a WeakMap, issues opaque audience capabilities from existing authenticated source/owner/session/principal/placement/zone/disclosure proof, and reconstructs proof from DB at establishment and every deferred render. A placed party owner gets `player`, unplaced party camera gets `channel`, and private owner gets only `player_private`. Model JSON cannot mint a grant or relabel private context. The writer now receives native audience constraints before generation; proof persists with new drafts/units. No provider calls added.

Red: new adapter module missing (focused runner exit 1; not a claimed production security failure). Green: `node --import ./scripts/offline-guard.mjs --test --test-name-pattern=F1 scripts/audience-first-integration-test.mjs`, exit 0, **5/5**, no skips. Existing native locality/private/revocation/hearing/payload guards: same guarded runner with `--test-name-pattern='NC01|NC02|NC03|NC04|NC05|NC06|NC07|NC28' scripts/narrative-correctness-retirement-test.mjs`, exit 0, **8/8**. Logs in OS temporary directory. Full validator deliberately deferred.

Native GM-internal framework is backend-only, not an external writer permission. No general remote communication capability exists here: remote NPCs remain held rather than minting an unproved cutaway. Registered staged contexts retain native post-move proof and are rechecked after commit. Current v8 text validators remain in place until F3; a v9 label is not a waiver. Source revocation, owner change and scope mismatch fail closed. Rollback: source revert, no DB restore; additive JSON sidecars only.

F1 commit: `6b92a4ec2b7472901dbb215e3d054a47bd2d262e`.

## F2 — mechanical input/output (qualified adapters)

Starting SHA: `6b92a4ec2b7472901dbb215e3d054a47bd2d262e`. New `mechanical-native-v9.js` bridges opaque audience grants to `consentAction`, current accepted typed source, owner/principal/scene, exact pending selection and existing native v4 outcome projection. Roll questions use `request_roll`, always nonexecuting and `needs_adjudication`. Unspecified submissions remain `needs_selection`, even with one unrelated request. Same accepted occurrence or exact owner-authored request token is required. No narrative module executes dice, costs or adjudication. Older saved native result ancestry may answer a current query; source IDs need not be identical. Native output still enforces actual saved results and explicit public disclosure.

The authoritative `resolveTypedNativeRolls` executor now shares this read-only selector; no competing execution service. Existing request/consent/option/damage behavior remains native. Typed interpretation instructions distinguish questions from submissions without an additional model request.

Red: missing adapter API (exit 1). New F2 cases then **4/4**. First native integration run exposed a refactor regression (30/31): enforcing model target equality incorrectly blocked the same accepted occurrence. Restored independent native occurrence binding, retaining exact cross-request selection proof. G12 rerun **11/11**. Final guarded run of `v9-roll-truth-test.mjs`, `v9-pvp-typed-roll-test.mjs`, `audience-first-integration-test.mjs`: **40/40**, exit 0, 0 skipped. Real saved Critical, missing Difficulty review, ordinary attack/damage, replay, tag/owner/private/forgery checks run through native services. Zero network/API/billable calls.

No schema migration; additive adapter only. Public results require the existing native owner disclosure, never a writer label. Rollback is a source revert; committed outcomes are untouched. Full validation remains deferred to F7.

F2 commit: `9e2f534556b7c9822cafa5e3d2dd6167b4bfe705`.

## F3 — scoped v9 writer and native compiler (qualified adapter cutover)

Starting SHA: `9e2f534556b7c9822cafa5e3d2dd6167b4bfe705`. The existing isolated writer now requests `narrativeResponseV9Schema`: version 9, independently task-bound acts and bounded ordinary identity proposals. No model visibility/owner/recipient/grant/effect fields. Grant task IDs are native request/task identities, sent before generation. `compileWriterV9` maps role/speaker/location/source proposals to existing native per-unit locality, proxy, actor-known/listener-entitled, material, secret, canon/identity and artifact validators. Compiler failures are part-local; unexpected programming errors propagate, never masquerade as safety success. Accepted rows bind the original act, translated unit and audience proof; deferred reads verify all three and immutable hashes.

The same existing writer call handles all acts; zero extra round trips or judge. V8 fixture/flag-off readers remain temporarily reachable pending F6, but current strict provider producer is v9. Native v4 output remains separate. Existing grounded NPC cognition/import/hearing services are reused, not model-issued evidence. An assembly/input reference still cannot grant NPC knowledge. Unknown/remote/proxy speakers stay held.

Red-first actual v9 output/outbox cases: **0/4 pass, 4 fail**, exit 1. After implementation **4/4**, exit 0: substantive empty-facts scene; safe sibling vs exact Choso apology/remote speaker; private restart/revocation; attributed local offer vs forged actor evidence. Combined guarded `audience-first-framework-test.mjs`, `audience-first-integration-test.mjs`, `semantic-language-robustness-test.mjs`: **46/46**, 0 skipped, exit 0. No real provider/Discord/network/API calls. Exact SEM/agency/arrival/replay assertions unchanged.

Residual limitation: independently enforced source/audience/actor/receipt gates are deterministic; the meaning of newly generated ordinary prose is not universally semantically provable. Existing conservative material tripwires remain; v9 role labels alone never waive them. Further expressive false holds are F5, not claimed fixed here. No DB schema migration or historical rewrite. Rollback by source revert, preserving native outcomes.

F3 commit: `fe7cbe18e0013eda25092e7ab60ad743ee7a6958`.

## F4 — task-local composition and native arrival (qualified)

Starting SHA: `fe7cbe18e0013eda25092e7ab60ad743ee7a6958`. `narrative-tasks.js` now credits a v9 act only to its exact native task ID, in addition to accepted source, actual output, target and operation. Two questions to one NPC no longer require guessing an attribution or falsely marking both answered. Existing legacy uniqueness remains conservative. `pvp-output.js` suppresses an empty legacy observation only when the specific v9 source-span/task/target is answered, not merely because a creative sibling exists.

Existing native preview already stages successful movement/zone and snapshots the verified context before the awaited writer, outside the SQLite write lock. Commit revalidates that snapshot; local writer holds do not reverse a valid arrival or reroll an effect. The current v9 adapter reuses this path, not a second effect executor. Artifact output uses native local prop attribution, never a player-choice waiver.

Initial four new cases: **2 pass / 2 fail**. Two fixture issues were identified explicitly: contextual `What is the inside like?` is not the retained literal one-call lane, so the fake must supply the existing combined + writer responses (2 calls, not 1); conversation was incorrectly labeled a physical `interact` with conversational resolution, so corrected to an exact `speak` utterance. Corrected repeated-question reproduction remained red (`needs_clarification` vs `answered`) before implementation. Temporary synthetic diagnostics removed. After task binding, **4/4**. Final affected F4 + NC11–16 native composition/arrival/replay group: **10/10**, exit 0, 0 skipped.

Verified Twenty-Four Spin arrival text and substantive interior prose in the actual outbox; exactly one arrival receipt. Follow-up contextual interior query answers current interior (2 fake calls, no contradictory unknown). Held apology leaves arrival committed and `destination_fiction_missing`. A certified nonbinding sign survives independently of held forced surrender. One answered NPC task leaves its distinct sibling incomplete. The historic live arrival-only cause is still unknown, not retrospectively claimed fixed by this fixture.

No new model calls, schema migration, production operation or full validator. Source rollback does not restore DB or replay committed actions.

## Owner GM-mechanics addendum (received during F4)

F2 is already committed; apply as a separate follow-up before final qualification, not a restart. Consult official SRD v2.0 dated 2026-08-25, printed pp.47–48 / 86–90. User now requires separate native GM/adversary/environment proposal and outcome authority, d20 families and critical/multitarget/spotlight/cost correctness. A label cannot mint GM authority. Existing player/native/PvP protections and zero extra model calls remain binding. Implementation/status pending native service inspection; do not call an envelope a complete mechanic.

F4 commit: `e2737f8189f6ba5795b4d4d13158c4e371b0be50`.

## F2-GM addendum — IN PROGRESS, uncommitted

Current parent: F4 SHA above. Read the owner's full addendum and consulted [official SRD v2.0](https://www.daggerheart.com/wp-content/uploads/2026/08/DH_SRD_2_2026_08_25.pdf), printed pp.47–48 and 86–90. Current source audit: `pc-incoming.js` already uses one d20 vs native PC Evasion, natural-20 hit and full dice-maximum critical bonus; defender review, Armor, HP and death paths are native. It already blocks proxies and invalid encounter bindings/presence/stat blocks. **No critical-damage defect was found.** Generic `combat.js` builds adversaries/thresholds, not an autonomous GM turn engine. Encounter spotlight counts track PCs; they are not a proved GM opportunity/additional-Fear payment ledger.

Uncommitted additions: guarded `gmD20Roll` / `gmAttackDamage` arithmetic in `dice.js`, reused by the actual native incoming standard attack; reaction/attack critical distinction; two-d20 high/low helper (not yet exposed as an authorized live modifier); typed character/adversary/environment output subjects; read-only `incomingRollProjection` and private adversary receipt adapter with real saved roll/damage/disposition/fingerprint. Separate GM proposal projection can inspect only an already selected native autonomous PvP Fear incoming attack; it cannot promote a human offer to AI authority, choose a different target or execute dice. No unconditional model call. Unsupported routes throw an explicit review reason, not fabricated completion; durable GM review integration is **not implemented** yet.

### Actual supported / missing mechanical scope

| Route | Actual state |
| --- | --- |
| Owner PC asks/submits; saved Duality output | F2 qualified; existing exact native executor |
| Standard single-target NPC attack + base defense/Armor/HP/death | Existing authenticated native service; shared GM d20 helper wired and focused-tested |
| AI-selected immediate PvP Fear attack | Existing trusted selector/executor retained; new proposal adapter's positive selector integration still unqualified |
| GM reaction / advantage / exceptional action | Dice-family helpers only; native trigger, spotlight, Experience payment and live adapter **not yet implemented** |
| General normal/additional adversary spotlight and additive Fear costs | **Not yet implemented/proved** as a v9 native turn ledger; no model permission fallback |
| Multi-target one-roll feature | **Not yet implemented**; never pretend independent single-target attacks are one feature |
| GM-initiated PC reaction request without prior player declaration | **Not yet implemented**; existing prepareRollRequest requires real owner source, which must not be forged |
| Environment feature / specified countdown triggers | **Not yet implemented** by this addendum; no default environmental d20 or free feature cost |
| Party disclosure of new private adversary roll projection | **Not implemented**; exact affected owner only |

Red-first GM group initially failed import of missing helper. After implementation, final `--test-name-pattern='F2-GM' audience-first-integration-test.mjs`: **9/9**, exit 0. One fixture incorrectly omitted required `intent_kind`, corrected; a separate fixture required native `narrative_encounters` enabled. Tests exercise d20 vs Duality, no natural-1 auto failure, 3d6+2 critical bonus 18, two-d20 selection, reaction critical without attack damage, native miss/restart no RNG, real private adversary output awaiting owner Armor, revoked source, forged AI promotion and unsupported environment hold. These nine passes are **not** full GM-mechanics qualification.

Affected complete native batch `v94-pc-effect-authority-test.mjs` + `v9-pvp-hope-fear-test.mjs`: **56/56**, exit 0, no skips. Earlier filtered `FEA05` selection in `v95-autonomous-fear-test.mjs` selected no individual cases: explicitly NOT FEA05 evidence. Final original high-value `FH40|PVP30q|PVP30ag|OBS21|DQ04` in original authorship/NPC/delegation suites: **10/10**, exit 0. Standalone D08 security and observability: both exit 0. No original assertions changed. No automated real provider/Discord traffic or paid tokens.

## F5 — expressive authority gate: BLOCKED, reproductions uncommitted

New v9 production/outbox AF27–AF29 retain both positive and negative assertions. Guarded `--test-name-pattern=F5 audience-first-integration-test.mjs`: exit 1, **0 pass / 3 fail**. The negatives passed before each positive assertion failed:

| Positive withheld | Negative still held | Actual missing proof |
| --- | --- | --- |
| `Rain beads on the window.` | `Rain apologizes for losing.` | Native public place/viewpoint grant cannot prove whether the generated word Rain denotes weather or the protected PC alias |
| `You feel warm air from the dryers.` | `You feel afraid and decide to run.` | Verified character presence permits sensory address, but the generated perception label does not independently certify physical sensation rather than emotion/decision |
| `Have you seen Raven?` | exact `Mr. Raven, you agreed to surrender.` | NPC-known name and local audible speaker prove reference entitlement, not the meaning/agency of arbitrary freeform cross-character clauses |

These are the same unresolved expressive tradeoffs preserved on the reconciled parent, now reproduced through the **actual v9 writer/compiler and queued outbox**. Existing native receipt/source/audience proof fixes locality and disclosure, but does not prove free-text meaning. No code relaxation was attempted that would use a writer kind/safe flag as authorization, waive original agency tests, or add phrase exceptions/sentence catalogs. The two variants in each pair share the relevant native grant; discriminating their meaning still requires additional independent construction/evidence or acceptance of a wider semantic risk. The plan's role-label/PC-agency boundary is retained.

Owner architecture decision required before F5 can qualify: either use source-/owner-verified clause or typed construction for ambiguous PC-referential/physical-POV text (keeping other GM prose expressive), or explicitly define an acceptable broader semantic-risk policy for such newly generated clauses. The latter cannot be described as deterministic PC-agency proof. No extra judge/provider pass is presumed authorized. Existing approval for source-bound ordinary fiction remains in force; this is specifically the residual PC-reference/agency ambiguity, not an attempt to require approval for every mundane description.

F6 destructive producer purge and F7 final qualification have **not begun**. Do not run/report a green final validation with these missing acceptance cases or call the GM addendum complete. All uncommitted code/tests and original starter input remain preserved. No new schema migration, production DB, flags, startup, push, merge or deployment. No live performance claims. Framework and v9 producer calls remain the prior 1-call literal or 2-call combined lanes; routed lane unchanged, no extra semantic judge. Rollback uncommitted work by deliberate review/revert only, never a DB restore; qualified branch rollback anchor is F4, original foundation `09ee30f42ed275a1effc6891e052d6b2eaaac803`.

### Final stopping receipt (not release qualification)

- Current branch/committed HEAD: `codex/audience-first-narrative-v9` / `e2737f8189f6ba5795b4d4d13158c4e371b0be50`; app revision `0.0.0.1`, schema 460. F2-GM source + F5 reproductions + this ledger remain uncommitted. Original `docs/rework/` input retained. No unqualified phase commit.
- Current focused `node --import ./scripts/offline-guard.mjs --test --test-name-pattern='^F[1-4]' scripts/audience-first-integration-test.mjs`: **26/26**, exit 0, no skips. Includes nine F2-GM foundation cases, **not** the unimplemented live initiator routes. A prior loose pattern `F1|F2|F3|F4` also matched AF27–AF29 and correctly reported **27 pass / 3 fail** (including a test-file wrapper); it is not a passing run.
- Current F5 `--test-name-pattern='^F5'`: **0/3**, exit 1. Native saved fates for all three positive/negative pairs are exactly `held_material`; assertions inspect real queued payloads. No positive assertion changed to accept fallback or silence.
- `npm run check`: exit 0, **402** JS modules/scripts and **24** root command schemas. PowerShell decorates npm's stderr notices as NativeCommandError records; the actual process exit is 0 and both checks completed. Final `git diff --check`: exit 0.
- Mechanical request/output adapters now also reconstruct the current audience from DB at use; a world-input source retraction invalidates a previously minted grant even when its authored-turn sibling remains active. Test AF08 verifies request remains pending/unrolled.
- Full `npm run validate` **not run**: F5 is red and GM addendum incomplete; final freeze/F7 was not reached. New suites are not yet added to final mandatory registry; F7 must register them and must not omit these red acceptance cases to claim green. Existing mandatory and all 39 optional registrations/assertions remain untouched. CI not triggered; no push/merge/install/restart/flag/live-test action.
- Production code files deleted: **zero**. One superseded implementation plan deleted at F0 and recoverable from Git; six referenced candidates retained. Native service extractions on the parent are reused; no unknown native consumer removed.
- Automated real model/provider/Discord calls **0**, billable tokens **0**. Fake writer counts measured in new outbox tests: combined **2**, no added judge; direct/routed lane logic unchanged, not a new live latency measurement. Public SRD read only; no production DB or secrets inspected.

## Forward-only owner decisions, 2026-10-15

The prior stopping receipt above is historical, not current qualification. Owner now explicitly chooses **structured native clause construction for F5**, no broad semantic relaxation. The unified AI GM arbitration addendum also supersedes any assumption that supported GM-owned decisions require routine human approval. Players still exclusively authorize/initiate their own dice. Continue on the actual local F4 HEAD, preserve dirty GM foundation work, and do not restart F0–F2 or access production.

## F5 — structured clause repair (focused qualification passed)

Starting local HEAD `e2737f8189f6ba5795b4d4d13158c4e371b0be50`. Added `narrative-clauses-v9.js`: closed semantic primitives for non-effect environmental weather, character physical senses, and a locally audible NPC's native-known PC query. The renderer—not model text—constructs the complete clause. Construction requires **empty model text**, no injected prose/source refs, current native place/viewpoint/audience, and separate actor-known/listener-entitled name proof. Proxy, remote, hidden and unavailable NPCs remain denied. Every commit/render rebuilds the clause and checks the original act/unit/audience/event hashes. Unknown fields, compelled reactions and camera witnessing cannot enter the renderer.

This is an additive native construction transport, not an English phrase exception or a sentence allowlist applied to raw prose. Original AF27–29 positive/negative **assertions remain unchanged**; positive fake proposals now use structured fields as the owner requested. Previously 0/3; initial green 4/4 includes new AF30 injection/camera/restart/retraction negatives. Ordinary freeform v9 and all original security tests keep their strict existing checks. The nine prior GM tests/helper were relocated intact to the single compact `gm-unified-arbitration-test.mjs` to preserve the uncommitted arbitration work without mixing it into this narrative phase commit.

No extra model request, semantic judge or weaker model. Freeform narrative residual semantic risk remains disclosed; structured clauses do not certify arbitrary prose. General warmth/weather are ordinary GM-owned nonmechanical fiction, not PC conditions, knowledge or receipts for effects. Remaining parent F6/F7 and new AR0–AR5 still require qualification.

Executed guarded framework + compact audience suites: **30/30**, exit 0; original `DQ04|PVP30q|PVP30ag|FH40|OBS21` group: **10/10**, exit 0; final `npm run check`: exit 0, 404 modules/scripts (includes preserved uncommitted GM files), 24 command schemas. No skipped tests in the selected groups. Actual queued strings include `Rain beads on the window.`, `You feel warm air from the dryers.`, and native-attributed `Have you seen Raven?`. Original raw forced-choice and cross-actor statements remain held; AF30 also verifies restart/source revocation before transport. Full validator and normalized manifest release qualification remain deferred to final AR5/F7 freeze. This commit stages only F5 source/tests/docs; GM foundation and its relocated test table stay uncommitted.

F5 commit: `a36de32bca83aa6c6c0cbd87e1a8e36301cc1fb8`.

## AR0 — contract skeleton and preserved native foundation (focused qualified)

Actual start F5 SHA above; no restart or reset. `gm-arbitration-contract.js` defines strict decision/NPC proposal taxonomy, with no model owner/principal/dice/receipt fields. `UNIFIED_GM_ARBITRATION.md` records the revised owner discretion contract and source/native boundaries. Preserved GM d20/input/output/incoming work and its ten assertions are incorporated as the framework foundation, not as claims that AR1–AR4 are integrated. Existing PC ruling/roll services, NPC simulation and incoming combat services were traced; simulation target-PC denial remains intact. The prior F2-GM adapter's positive normal AI-GM route must be replaced by the upcoming native arbitration capability, not relaxed globally. Current default provider schema is still unchanged at AR0.

Guarded `gm-unified-arbitration-test.mjs`: **11/11**, exit 0; targeted syntax checks for contract, GM proposal bridge, mechanical projection, incoming attack and dice: exit 0. Preserved prior red evidence for missing helpers and narrow output supports remains recorded above. No full validator, added model request or live API operation. Final manifest sync deferred until all intended executable files are frozen/staged.

AR0 commit: `086fe89835a1f2a665826eb4d3f0d112c11748ed`.

## AR1 — immutable scene input board (adapter qualification)

Start `086fe89835a1f2a665826eb4d3f0d112c11748ed`. Added `scene-intent-board.js`: opaque in-process native origins, revalidated current owner/source/scene/control, bounded local AI NPC candidates, independently sourced NPC proposals and immutable GM-private board receipts. Player aliases use original accepted occurrence indices, not a compacted list index. The pre-prompt packet excludes private sheets and motives. Forged origin objects, withdrawn sources, private foreign-owner inputs, unavailable/proxied/remote NPCs and unentitled knowledge cannot gain board authority. Production model wiring belongs to AR2; this is not yet an end-to-end arbitration claim.

Red-first AF03 reproduced `immutable_board_changed` (0/1, exit 1): hashing mutable adjudication status made a valid saved board unreplayable. The fix fingerprints immutable source/span/principal, not outcome status. Final guarded `--test-name-pattern='^AR1' scripts/gm-unified-arbitration-test.mjs`: **3/3**, exit 0, no skips. Syntax check exit 0. No full validator, provider round-trip or native effect added. Public shared-scene aggregation beyond the current triggering owner's accepted spans is not yet implemented; NPC source is native GM origin, never a fabricated owner declaration.

AR1 commit: `7df2c9f` (full SHA available from Git; later AR2 adds source-validated public shared inputs).

## AR2 — same-call autonomous rulings and owner pending requests

Start AR1 commit above. Added `gm-unified-arbitration.js`, scoped public shared-input projection, GM request schema/packet wiring and transactional state integration. Supported mundane owner actions and genuine `request_roll` questions reuse `adjudicateGmRuling` and `adjudicateAcceptedIntent`; no human approval or RNG is added. Native current placement/scene geometry can ground a ruling context locator without inventing a world event. It does not prove danger, grant a capability or establish success. Existing raw-context checks and unsupported-feature review remain intact. NPC ordinary fiction gets a non-effect no-roll disposition, not movement or knowledge authority. Shared dependencies/PvP retain their native gates. Unsupported GM attack/reaction/feature executors remain explicit review until AR3; this commit does not claim those routes complete.

Red-first AR2 import failed for the absent common service (exit 1). Initial new pending request case also exposed absent native-scene grounding (1/2); now **3/3** AR2 cases, exit 0. Actual combined GM adapter used exactly **2 fake requests**, not an extra arbitration pass; pending roll exists with no `roll_operation`. A fixture's incorrect `mutation.mutations` accessor was corrected, not its security expectation. Original rules-discretion + action-review batch **30/30**, exit 0, no skips. AR1 replay group **3/3** passed before production wiring. Full final qualification remains deferred. No production or paid operations. Remaining AR3–AR5/F6–F7 must be qualified before release.

AR2 commit: `b741aa6`.

## AR3 — rightful native execution (supported routes qualified)

Start AR2 above. `gm-action-capability.js` revalidates native board/decision events, source hashes, owner, scene, current local NPC/control/knowledge/objective and GM discretion. `pc-incoming.js` gains a **distinct opaque native AI path**, not a `human_reviewed` forgery: current active encounter/template/binding, range/Evasion, owner defense review, secure GM d20, actual damage and existing owner Armor/death pipeline remain mandatory. Normal standard attacks need an exact native looking-to-GM opportunity. A mere NPC proposal or a search input cannot mint spotlight. Immutable decision batches prevent retry reordering; separately selected additional actions and a verified stat-block Experience have additive pre-roll Fear receipts. First normal spotlight costs zero; no d20 metacurrency is created. Civic simulation is not reused as combat proof.

`gm-native-rolls.js` bridges exceptional independent NPC tasks (current native objective/template; no PC target or automatic PC effect), final-commit-only RNG, and pending owner reaction invitations. Only the authenticated exact owner `/vc-roll window` submission creates a verbatim source and invokes existing reaction Duality execution. Review alone does not roll. Native attack defense confirmation may continue the GM-owned roll; Armor remains a separate owner choice. Costs/RNG/results are transactional and replay-safe. Unsupported execution is held locally in a GM-private review, not cosmetically completed or charged. No provider is invoked inside transactions.

Closed `stakes_kind` distinguishes attempt-only requests from actual native attack/feature consequences. Freeform arbitration reasoning/stakes remain **GM-internal** and cannot be copied into owner notices or native request terms; native attempt-only requests explicitly adjudicate the declared attempt, not an invented injury/custody/access consequence. Feature-specific stakes require their own native adapter. This is an authority restriction, not silent success or a model safety waiver.

Red-first AR3 failed on missing native executor export (exit 1). Latest guarded AR2–AR3 table **9/9**, exit 0; includes six AR3 cases: real defense-gated AI attack/miss/restart, actual owner reaction/critical with no metacurrency or Stress reward, exceptional d20, missing spotlight/unsupported feature, hidden-commentary isolation and additive spotlight+Experience payment before RNG. Earlier complete compact/native PC-effect/PvP-Fear batch **76/76**, exit 0 (before the final additive-cost and closed-stakes cases; final mandatory qualification remains outstanding). No original negative assertions were changed. No live provider/Discord request or billable token.

Explicitly **not implemented** by this bridge: generic adversary reaction-feature execution, multi-target feature mapping, arbitrary environment features, automatic special defenses or exceptional task PC effects. They remain `needs_rules_review`; the pure reaction/natural-20/two-d20 helpers alone are not end-to-end feature support. Existing specialized native/Fear services remain intact. These limitations must remain visible in F7; no all-feature claim is permitted. AR4 still needs durable private notices/terminal recovery/outbox proof; AR5/F6–F7 are not qualified yet. Rollback source only; never rewrite native outcomes.

AR3 supported-route commit: `7a0d924`.

## AR4 — native private notices, continuations and Director integration

Start AR3 above. Red-first AF13 reproduced saved pending request with **zero private outbox rows** (0/1, exit 1). `gm-arbitration-output.js` now renders only independently verified native owner terms, request/result ancestry or incoming defense/Armor status; no freeform GM rationale/stakes/motives are copied. Private notices use current assignment/principal and normal persisted output parts. Actual payload/recipient/source/revision is rechecked at deferred delivery. Notices are not creative-fiction completion. Native ordinary reaction requests commit their own legal GM move/spotlight payment before inviting the owner; the subsequent PC reaction creates no extra GM opportunity or metacurrency.

Added exact owner-private `gm-reaction-review`, `gm-reaction-roll`, `gm-reaction-withdraw` operations through existing `/vc-roll window json`. Submission captures **verbatim authenticated command input**, not model-authored PC speech. Withdrawal has an immutable neutral terminal path; committed dice cannot be erased. `gm_action_continuation` resumes only from the exact successful native public prerequisite receipt. Private numeric results are **not** promoted into NPC knowledge or public prerequisite authority; those dependencies remain review cases. Existing PC DAG and native roll services remain authoritative, and independent tasks remain available.

NPC proposals now have distinct immutable `native_npc_scene_intent` GM-origin events, not player declaration sources. Source/identity/control/knowledge and original GM context are revalidated. The existing Director request can use the same board and capabilities without another provider pass; its fiction scope alone does not grant an attack spotlight. A verified current non-PvP action Fear/failure may supply an optional, once-used GM opportunity; reactions and PvP never enter that ordinary path. Expected native eligibility failures hold the affected decision, preserving a valid sibling. No broad exception suppression or replay of dice.

Latest complete compact arbitration + audience + original publication batch **72/72**, exit 0; then new AF18 real native action-Fear opportunity case **1/1**, exit 0. Earlier original publication/roll-truth batch **53/53**, exit 0. AR4 five-case selected batch plus AR3 six cases **11/11** before AF18; actual Director adapter separately **1/1**. No skips in these selections. Actual fake transport delivered the private Finesse/Difficulty 14 terms once; repeated drain sent nothing. Restart + source retraction produced **zero sends**, no rolls. `SECRET DO NOT DISCLOSE` never appeared in any payload. Owner withheld reaction created no failed response/HP effect. Source syntax and `git diff --check` exit 0. Combined and Director lanes still **2 fake provider calls**, no extra arbitration or judge; no live/provider billing/production access.

AR3's explicit unsupported feature limitations still apply. Manifest sync/full mandatory validation remain deferred to AR5/F6–F7 executable freeze. The old arrival-only historical incident is still not root-caused without its production turn records.
