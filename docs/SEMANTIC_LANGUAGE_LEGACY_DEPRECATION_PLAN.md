# Semantic language: legacy deprecation and removal plan

Planning baseline: `6de758c95f94fa5895f9d14bc05970922b050b44`, `codex/semantic-language-robustness`, application10.2.0/schema460. Read [the gap audit](SEMANTIC_LANGUAGE_ROBUSTNESS_GAP.md) first. **Implementation is not started by this document.** Reconcile actual HEAD and dirty files before any subsequent work.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Objective and boundary

Remove duplicate language interpretation and unreachable freeform interceptors, while retaining native authority, useful current projections and historical campaign readers. First establish one coherent source/task/actor/audience contract for current production. Then stop obsolete producers, extract still-used native services, and remove functions only after reachability and assertion-level equivalence are demonstrated.

No blanket deletion of files named `legacy`, `fresh`, `scene-entry` or `player-language`. No fixed English catalog expansion, phrase exceptions, model safety judge, unconditional second writer, inferred consent, or weakened PC/privacy guard. Native version4 outcome projection is **current**, not obsolete because its version is below8.

## Current consumer and disposition crosswalk

This is a verified source/consumer inventory, **not** a certificate that external operator scripts do not exist. `index.js:routeNativeSpans()` uses `routeGameplayIntake()` rather than the old freeform routes. Literal/symbol searches covered runtime, tests, package scripts, CI and relevant historical deprecation contracts; the only runtime dynamic import found is the literal PDF dependency in `rules-srd.js`, not these adapters. Future deletion still needs a refreshed graph and explicit treatment of unknown consumers.

| Candidate | Actual consumers / persistence | Proposed disposition |
| --- | --- | --- |
| `roll-language.js:rollDeclaration/routeRollMessage` | No active runtime caller found; direct callers remain in IHY, typed-routing, legacy-migration and integration tests. Same module's `reviewRollDeclaration` **is active** in `ai-intents.js`. | Retire the freeform parser/route after native behavioral coverage is mapped. Extract/retain native review and original owner preauthorization proof; do not delete the whole file first. Keep historical `roll_contribution`/request/reply readers. |
| `consent-language.js:routeConsentMessage` | No active runtime caller found. `respondConsent` serves that route and direct tests; `consentOffers` is active in `commands.js` continuity inbox. Saved `consent_reply` and exact owner terms are used by native outcome proof. | Remove freeform routing separately. Move offer enumeration and exact owner-response compatibility into the native consent layer with temporary reexports. Preserve authenticated owner/revision/expiry and manual commands; never replace exact consent with a semantic guess. |
| `continuity-routing.js:discoveryQuestion/routeDiscoveryMessage/deliverDiscoveryMessage` | Freeform routing/delivery used by historical and Discord-hardening tests, not general message intake. `formatDiscovery/discoveryDeliveryProof` are **active command helpers**. | Retire grammar/route only after equivalent private-delivery failure/revalidation coverage reaches active command/publishing paths. Retain formatter and proof in a clearly named read-only module. |
| `scene-entry.js:routeSceneEntryMessage/entryTarget` | Wrapper is test-used; `entryTarget` still participates in legacy candidate preparation. Native entry review/policy/impact/resolve are active in story commands/AI operations; `locationMatches` and entry references serve narrative context. Saved `scene_entry`, declarations, arrival/adapter receipts remain authoritative history. | Deprecate wrapper first; stop current-model legacy candidate production before retiring parser. Preserve native policy/review/resolve and read-only references. Remove compatibility execution only after every supported pending/manual path has an equivalent native route. Never auto-complete old entries. |
| `player-language.js:worldRequirements/hasCharacterInvitation/responseObligation` | Legacy evaluation harness and direct tests; no current narrative-delegation consumer. | Move historical comparison heuristics to test/evaluation fixtures; mark them historical, not current semantic qualification. Keep original assertion/ID evidence. |
| `player-language.js:interpretAuthoredText/declarationContext/captureDeclaration` | **Active** GM context; legacy candidate, dialogue and entry consumers. Many native roll tests rely on declaration creation. | Split authenticated declaration/source persistence from lexical interpretation. Replace current coarse prompt classification with existing semantic context; retain exact historical source creation/recovery APIs until proven unnecessary. Whole-file removal is currently unsafe. |
| Five-field branch in `authored-candidates.js` | Current model response schema still permits it, and native persistence can stage entry/declaration/dialogue compatibility records. V2 is already available and does not run that parallel staging. | Separate live producer schema from compatibility reader/manual API. Stop new current-model v1 production first; keep saved candidates and native pending-review recovery. V2 source offsets, principal and accepted-intent proof remain mandatory. |
| `scene-observation-route.js` | **Active** optional one-writer literal optimization in `shouldRespond/runTurn`; direct/private paths lack a separate semantic router by design. | Defer removal until semantic admission/call-budget parity is demonstrated. It is not an effect-authorizing interceptor. Do not rename the same phrase list and call it retired, add a router to every private turn, or silently increase normal request counts. |
| `evaluation-harness.js`, `legacy-authority.js` | Test/evaluation callers only in this inspection. Historical coverage tests explicitly pin some file locations and assertions. | Relocate implementation to scripts/audit fixtures after evidence review; temporary import shims as needed. Replace weak filename/regex inventory conclusions with reachable production-path security tests—not an unchecked hardcoded zero. |
| `gm-world-narrative.js`, `gm-fiction-composition.js` v1/v2 | Still in the live schema/prompt and common output renderer. `gm_world_narrative` records/outbox parts may exist. V1/v2 proposals can survive the v8 coordinator. | Stop new legacy planning proposals only in qualified new mode. Preserve closed native read-side rendering and exact historic hashes. Do not delete the v4 native outcome union. |
| `fresh-npc-authoring.js` v3; `fresh-scene-authoring.js` v6; `scene-fiction-authority.js` v7 | Conditional generators still invoked by `gm.js`, including flag-off compatibility. Persisted `npc_fresh_authoring`, `scene_fresh_authoring`, `scene_fiction`, attempts/holds and output parts require validators. | Retire **generators** after supported mode parity. Keep deterministic read/revalidation for old authorizations, queued/delivered/uncertain publications and archives. No replay or re-signing of old prose. |
| `scene-description.js` v5 / world/character observations | Live read-only projection/fallback/commands, not merely old prose generation. Native facts and truthful unknowns are unique functionality. | Keep projections while repairing N03 and per-task arbitration. Retire only a proven redundant fallback producer after expressive coverage and no-authority unknown behavior are equivalent. |
| Helpers inside older authoring modules | `hasPcReference` is also used by native hooks/outcomes and output; `quoteNpcWords` by composition/scene authoring. `sceneFictionHash/narrativeSourceVisible/failure` serve current narrative, memory, Director, salience and engagement. | Extract reusable proof/formatting utilities before any module retirement. Preserve algorithms, issuer/version/receipt semantics and hash compatibility. These utilities are **not legacy effect inference**. |

## Ordered implementation phases

Use one independently qualified local commit per phase, or a smaller ordered subphase when necessary. Do not infer push/deployment/production authorization from this planning task. No concurrent retirement across dependent contracts.

### LD0 — Pin contracts and assertion equivalence

1. Verify actual branch/HEAD/tree; preserve current work. Refresh imports/exports, symbol callers, native command/AI registry, package/CI/recursive loaders, optional modes and persisted record formats. Unknown is KEEP.
2. Create a per-function retirement ledger: old symbol, live/test callers, producer vs reader, replacement native service, stored formats, original assertions, replacement assertions, negative/mutant evidence and rollback.
3. Respect `V95_05_DEPRECATION_EVIDENCE.json` and `v95-deprecation-coverage-test.mjs`: historical assertions and registrations cannot disappear via wholesale regeneration. Intentional import/contract migrations need an explicit reviewed crosswalk, including the existing native positive/negative cases.
4. Record current measurements. Existing foundation has122 critical suites/39 optional matrices; counts may grow for unique new coverage. Do not freeze an arbitrary count or call source string checks behavioral qualification.

Exit: every proposed deletion has a known consumer/persistence classification and a test owner. No deletion yet.

### LD1 — Close locality and audience prerequisites

Address N01/N11 before relaxing fresh prose admission: exact native local viewpoint/speaker eligibility, explicit cutaway/communication scope, and effective private/party unit audience. Test direct authoring, actual outbox, restart, source revocation, changed owner/placement, Director/private/voice/memory consumers and unrelated-scene independence.

Exit: off-packet remote speech and mislabeled private units cannot obtain unintended authority; legitimate local/new-native NPC fiction and deliberate scoped camera openings still work. No new PC effect or combatant is created.

### LD2 — Unify actor entitlement and contextual references

Address N02/N07/N10: bridge genuine heard/seeded native knowledge into a bounded audience-safe NPC brief; resolve unique grounded conversational roles/focus; use a request/assembly-bound camera anchor instead of alphabetical selection.

Actor knowledge and permission to tell this audience remain different checks. Keep subjective utterances/rumors unverified; require trusted import receipts, not model-issued file-path evidence. Preserve public/private contrasts, ambiguous listeners, proxy control, hidden NPCs and owner initial placement.

Exit: heard/known context is actually present in the writer packet where entitled; no cross-character or private-to-party promotion. No extra provider request.

### LD3 — Make output tasks and quarantine local

Address N03/N08/N09: native source/task/target IDs connect interpretation, the single creative brief, output units, actual native projections and final coverage. Same-task NPC descriptions cannot receive a contradictory unknown; separate questions/remote negatives remain. Two inquiries require two truthful dispositions, not one category boolean.

Quarantine unsupported signs/artifacts/clauses at the smallest safe part boundary; retain independently validated actions and receipts. If safe separation is not provable, hold the affected part and report why—never fabricate a response/outcome. Later delivery revalidates the actual payload and evidence, not a model coverage flag.

Exit: sign+arrival and multi-NPC replay satisfy real adapter/outbox assertions without repeated dice, spending, obligations or sends. Existing legacy fallback is not removed until this replacement is proven.

### LD4 — Refine expressive admission, not mechanical authority

Address N04/N05/N06 with scoped GM-owned utterance/reference/sensory composition. Add red contrasts for offer vs forced choice, attributed allegation vs committed action, common-word name collision vs PC reaction, physical sensation vs internal emotion, and character POV vs camera.

No larger phrase catalog or probabilistic safety judge. Reuse native source, speaker/name entitlement, output-part and receipt machinery. Preserve exact DQ04, original SEM06, Choso apology/PVP30q/ag, privacy and proxy assertions. Where arbitrary English cannot be safely separated, document the remaining hold or obtain an explicit architecture decision; do not remove the guard to satisfy a positive.

Exit: measured positives improve with all mandatory authority negatives intact. Historical S5's retrospective-guard regression is a required regression, not an invitation to repeat that relaxation.

### LD5 — Stop obsolete producers and extract native cores

Address N12 and the applicable part of N13:

- Make current-model candidate production v2/source-exact; retain a separately scoped legacy read/manual recovery API rather than inviting current-model fallback staging.
- Remove coarse lexical classification from current GM context only after equivalent semantic response/referent context exists.
- Make new-mode planning guidance unambiguously v8 plus current native projections; remove conflicting legacy catalog instructions from that mode. Do not silently remove support for existing flags/modes.
- Extract native roll review, owner offer/response, discovery format/delivery proof, entry review/policy/resolve and shared source/hash/projection helpers. Temporary reexports preserve imports while consumers migrate.
- Keep exact current native command syntax and permission/revision checks. A low version number is not evidence that a native receipt projection is obsolete.

Exit: no new legacy candidate/authoring record is produced in the qualified current mode; native/manual pending recovery and flag-off behavior remain supported. Producer retirement is separately testable from reader retirement.

### LD6 — Remove proven unreachable routing and test-only heuristics

After LD0/LD5 evidence, remove freeform `routeRollMessage`, `routeConsentMessage`, `routeDiscoveryMessage`, `routeSceneEntryMessage` and their parser-only dependencies **where no live caller remains**. Move historical comparison logic out of runtime modules. Remove unused imports/exports and packaging entries deliberately.

Port unique native tests to actual native services/Discord adapters, keeping original source/consent/cost/privacy/delivery assertions. Historical language examples may remain in test-only compatibility fixtures, labeled historical rather than current runtime behavior. Do not replace behavioral coverage with export checks or delete old mandatory/optional suites to reduce runtime.

The literal fast route is a separate DEFER item: remove it only after demonstrating natural-language lane/call-budget parity, or an explicit owner-approved tradeoff. Ordinary pure/mixed/private/mention-only/OOC behavior must remain responsive and non-authorizing.

Exit: refreshed graph has no dangling production or test imports; every removed function has an assertion-equivalence receipt. Remaining files are clearly native core, required compatibility reader or historical test fixture.

### LD7 — Retire obsolete generators; retain required history; qualify

Remove old conditional provider generators only after proving new-mode and supported flag-off behavior. Disabling `narrative_authority` must not silently enable creative authority via a replacement path. If equivalent behavior requires a capability-mode change, that is an explicit owner decision—not a cleanup assumption.

Retain versioned read-only validation for all supported historical/pending records, native source/receipt chains, outbox parts, acknowledged/uncertain Discord deliveries, summaries/voice/archive and imported history. Do not rewrite old record hashes or mechanically replay drafts to migrate them. If a needed reader is inseparable from an old module, keep it until extraction is complete. **Reader retention is a valid final result.**

Run final network-denied critical qualification, manifest integrity, commands/schema and diff checks; CI only if a subsequent implementation task authorizes push. Publish a removal crosswalk and exact source SHA with rollback evidence, not a claimed deployment.

## Deferred product work, not cleanup prerequisites by default

N14 broader relevant-memory retrieval and N15 rich owner appearance deserve separate bounded tickets. They must not be smuggled in as token optimization or inferred appearance. They become deletion prerequisites only if a retiring function is the sole supported source of that behavior. Mixed OOC/IC policy and retirement of the one-call literal optimization likewise need explicit acceptance/cost decisions, not unconditional extra model calls.

## Validation and acceptance

- T0: small red-first cases for changed behaviors; actual native adapter and queued/delivered payload checks, including restart/revocation/owner/audience/zone changes. Use fake providers and disposable SQLite only.
- T1: one directly affected authority/privacy/agency/mechanics/publication batch per risky change set. Keep original FH40, PVP30/q/ag, OBS21, SEM06, DQ04, D08, damage/death, consent, immediate Fear/zero PvP Hope and exactly-once tests. Verify negative guards with targeted mutations where removal proof depends on them.
- T2: freeze executable/test inputs, sync10.2.0 or reconcile the then-current release policy, run `npm run check`, one complete `npm run validate`, inspect compact summary/failed/not-run/acceptance fields, and `git diff --check`. Repeat the full gate only after failure or executable/test changes, not results-only documentation.
- Preserve all39 optional matrices and unique assertions. Count fewer tests only after explicit assertion-level equivalence, not because a file is old, slow or overlaps by name.
- Compare standard router/GM/writer counts and truthful coverage. No new unconditional model round-trip, no automatic weaker-model switch, no billable automated tests. Synthetic results do not prove live latency or semantic accuracy.

## Persistence, rollback and stop conditions

Default implementation is code-only with no destructive migration. Keep originals in Git; restore code/compatibility exports through reviewed revert, preserving native receipts, sources, characters, histories, flags and outbox. Do not restore a stale database to undo a code cleanup, invalidate delivered message IDs, resend uncertain publications or reroll saved results.

Historical `player_declaration`, `scene_entry`, `legacy_scene_entry_adapter`, roll/consent records, v1/v2 `gm_world_narrative`, `npc_fresh_authoring`, `scene_fresh_authoring`, `scene_fiction`, publication/archive proofs and source closures must stay interpretable. Pending records cannot be declared obsolete from development fixtures. Any eventual production inspection/migration/deployment needs separate authorization, fresh WAL-aware backup/integrity/FK verification and a disposable restore drill; this audit performed none.

Stop the unsafe retirement when: native/private/agency proof regresses; a real pending/manual reader has no replacement; assertion equivalence is unproven; source/recipient proof would be weakened; a flag-off path would gain authority; irreversible state rewriting is required; or expressive positives require pretending model labels certify arbitrary prose. Record the precise decision and keep the compatibility boundary. Do not use an unrelated green suite as permission to delete it.

## Completion evidence required from a future implementation

Per-phase SHA and source status; removed/deferred/retained symbols with actual callers; original-to-replacement assertion IDs and native adapters; red/green and final compact validation counts; unchanged historical replay/uncertain-delivery proofs; provider call delta and zero API-test billing; version/schema/flags; remaining semantic risks; code-only rollback. Report pushed/merged/installed/running/enabled/live-tested separately. No such implementation or operational completion is claimed by this plan.
