# Veiled City — Narrative Correctness and Semantic-Legacy Retirement

**Implementation plan / Codex handoff basis — 15 October 2026**  
**Verified source baseline:** `KeshireTheChaotic/Veiled_City`, branch `codex/semantic-language-robustness`, commit `6de758c95f94fa5895f9d14bc05970922b050b44`. `main` remains separately based; do **not** silently target or merge it. Reverify branch HEAD and worktree when execution begins.  
**Application/schema at baseline:** 10.2.0 / 460.  
**Proposed work branch:** `codex/narrative-correctness-legacy-retirement` (create from the verified semantic branch, not an older main).  
**Sources:** uploaded `SEMANTIC_LANGUAGE_ROBUSTNESS_GAP.md` (N01–N15) and `SEMANTIC_LANGUAGE_LEGACY_DEPRECATION_PLAN.md` (LD0–LD7), earlier S0–S6 execution ledger and release notes, and the prior 12:09–12:11 Twenty-Four Spin live transcript. The source audit is **diagnostic**, not an implemented repair. No production database, deployed flags, or present live bot status is verified by this plan.

> **Governing invariant:** Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes. Model interpretation, narrative text, role labels, task labels, and confidence do not authorize a character effect, consent, knowledge, visibility, access, hearing, movement, or disclosure.

## 1. Review and adjustments to the uploaded plans

Both source documents correctly reject a blanket language-filter removal and a whole-file `legacy` deletion. Their N01–N15 diagnoses and LD0–LD7 consumer/reader distinctions form the worklist. The following ordering/contract refinements are required before implementation:

1. **Use two quality gates, one normal final full validation.** Complete and lock narrative-correctness repairs **first**; only then retire producers/functions whose exact replacement is demonstrated. A release of the repair group alone requires its own mandatory validation, but if work remains one unreleased branch, do not run the full 122+ registry after every phase. Run it once on the final executable/test tree; rerun only after failure or subsequent executable/test changes.
2. **Correctness before cleanup.** A green security suite does not prove expressive narration or multi-question coverage. Do not remove `scene-description.js`, `world-observation.js`, legacy output versions, or historical read paths merely because a new writer exists. Some truthful unknown projections and native outcome version 4 remain essential.
3. **Do not trust the writer's declaration that a task was answered.** The v8 `narrativeResponseSchema` and persisted draft/unit hashes use closed shapes. Introduce a native source/task/target/audience ledger and independently validate output-to-task satisfaction. If an additive writer field is needed, provide a versioned forward contract or a separate native sidecar; do not reinterpret/rewrite old v8 rows or invalidate their archived hashes.
4. **Distinguish actor cognition from audience disclosure.** A genuinely witnessed GM-private speech receipt can support what an NPC *heard*, without making all GM-private text publishable. Seed file paths are not event proofs. Introduce trusted import/source adapters with current active/retraction/owner/secret checks rather than whitelisting arbitrary strings.
5. **Fix the exact transaction boundary for N09.** The reproduced sign/menu example rejects the whole **new, uncommitted** action bundle; it did not reverse a prior committed arrival. Scope/quarantine independently authorized output parts without accepting raw-model menu/PC-agency claims or bypassing the transaction's global authority checks. If safe separation is not provable, hold the affected narrative part and report degraded coverage; independently authorized state may commit only after all relevant native checks still pass.
6. **Keep historical evidence labels truthful.** N01 and N11 demonstrate off-packet speech and mislabeled visibility, not proven private leakage. The historical 12:10 arrival-only root cause remains unknown without those turn-specific authoring and outbox records. Fake providers prove deterministic adapters, not real-world language accuracy.
7. **Avoid parallel rewrites.** Do not simultaneously delete producer and reader code, switch schema, alter flag semantics, and expand expressive permission in one unreviewable commit. Keep small, independently revertible phases and retain source/historical compatibility until each is qualified.

### Prior work that must remain intact

- `4df506d` hotfix: established identity reuse; per-unit salvage; strict audience and NPC knowledge proof; isolated narrative-health FK diagnostics; source-verified outbox and exactly-once send; creative fallback not counted as creative completion.
- S0–S6 (`6de758c`): source-bound scene arbitration and interior routing; clause offsets; accepted typed NPC hearing; semantic engagement/pacing; attributed NPC speech with **restored** retrospective PC-surrender protections; no additional provider round-trips.
- Native Daggerheart mechanics, Hope/Fear, damage/death, resource cost, contested PvP, consent, owner and NPC-proxy control, initial placement, location/zone access, and all immutable source, receipt, revision, and publication proofs.

## 2. Scope and disposition matrix

| Finding | Evidence in uploaded audit | Planned treatment | Status/priority |
|---|---|---|---|
| N01 local scene / remote NPC | Reproduced off-packet remote speech | Strict native local speaker/viewpoint eligibility; explicit authorized remote/camera exception | **Guard A / P1** |
| N11 private-unit label | Reproduced wrong unit-level visibility, not a proven leak | Enforce exact effective writer audience and separately check source entitlement at every reader | **Guard A / P1** |
| N02 NPC memory and seed knowledge | Reproduced genuinely heard record omitted from creative brief | Two-stage actor-knows vs audience-can-hear projection and trusted seed/import receipt adapter | **Guard A / P1** |
| N07 contextual NPC listeners | Reproduced unique public-role target lost among multiple occupants | Resolve a unique grounded public/scene conversational referent, then native hearing | **Guard A / P1** |
| N10 unplaced camera | Reproduced unrelated alphabetic location anchor | Verified request/assembly-based anchor or honestly unlocated camera opening; never PC placement | Guard A / P2 |
| N03 NPC description collision | Reproduced creative coat description + false unknown | Native task/target-specific same-answer arbitration, no blanket suppression | **Guard A / P1** |
| N08 two NPC questions | Reproduced one answered, second missing, `complete` reported | Source/target/task ledger; independently proven per-obligation dispositions | **Guard A / P1** |
| N09 sign + move rejection | Reproduced whole-turn rejection before new arrival committed | Certified nonbinding in-world artifact boundary and unit-local hold; preserve valid native effects | **Guard A / P1** |
| N04 NPC offers/allegations | Reproduced overbroad words such as `accept` | Source-proven attributed offers/claims distinct from asserting actual PC decision | Guard A / P1 |
| N05 PC name fragments | Reproduced `Rain` weather false hold, limited entitled references | Ground identity and referential role; block assertions of agency/secret, not all shared words | Guard A / P1 |
| N06 sensory 2nd person | Reproduced safe-looking sensory sentences held | Bounded sensory POV on verified character binding; camera/internal emotion/action unchanged | Guard A / P2 |
| N12 current legacy producers | Source-confirmed current v1 producer/schema/hints | Retire current producer, keep read/manual recovery interfaces | **Gate B / P2** |
| N13 literal one-call optimization / mixed OOC | Source-confirmed tradeoff, not an established defect | **Defer** deletion and mixed OOC policy pending source/call-budget parity or owner decision | Deferred |
| N14 older memory salience | Source-confirmed retrieval truncation; no live miss reproduced | Separate bounded product ticket; not default cleanup scope | Deferred |
| N15 rich player-controlled appearance | Source-confirmed product limitation | Separate owner-authored disclosure design; no inferred GM PC appearance | Deferred |

## 3. Architecture — minimal, native-proven additions

### 3.1 Locality and effective audience

Extend native `buildNarrativeContext`/`validateUnit` proofs, not merely the text prompt. Establish one local `viewpoint` binding (`session, scene, source, mode, character/camera, location, zone, placement revision`) and verify each scene and speaker unit is local to that binding. A public remote NPC in another room cannot respond live merely because its NPC state and narrative unit agree with each other. A genuinely new NPC may be established locally through the existing authenticated creation/presence path. Treat remote talk, cutaways, intercoms, calls, reports and omniscient Director scenes as separate explicitly scoped native capabilities, never guessed from text; if there is no supported capability, hold/omit that part, not all unrelated local fiction.

Private writer output must create units labeled `character` and bound to that current recipient/character; party writer output creates party units. Public facts may be cited privately if independently entitled, but new private units must not be relabeled `party`. Validate both establishment and delayed outbox/restart reads. No fabricated party leak claim is needed to prioritize this proof improvement.

### 3.2 Actor entitlement versus disclosure

Implement a bounded native NPC cognition projection: (a) does the NPC actually know/hear/remember this content, including provenance and current source activity? (b) may this writer for this audience use or disclose that information? Treat these as separate results. Native speech/hearing receipts and trusted package seed/import records need purpose-built proof; raw `GM_PRIVATE` labels or arbitrary file names cannot be promoted to public evidence. Convey limited, relevant knowledge with typed state (`known`, `heard_claim`, `hypothesis`, `not_entitled`) and provenance. Direct NPC speech is an attribution of what the NPC says, not proof of factual truth, new consent or an effect. Preserve retract/owner-change effects and all native quote constraints.

For multi-NPC scenes, resolve targets from **verified public descriptors**, explicit aliases, present spatial facts, and currently permitted conversational focus. A model's guessed target is advisory; the native candidate set must resolve to one actually present, audible, available, non-human-controlled listener. Ambiguity yields zero recorded hearing for that target while not blocking independent narration. Avoid English phrase catalogs.

### 3.3 Task ledger and rendering reconciliation

Construct a per-turn, non-authorizing *task ledger* from authenticated source clause offsets, current accepted interpretations, target identity, operation, audience, and principal/session/scene revisions. Derive stable task IDs from those verified fields. Include a multi-task writer brief in the **existing** writer call; do not add per-clause model calls. A proposed answer/task mapping is never authoritative on its own: validate output subject, native source, type, locality, actual text part, and audience. Work with existing v8 readers and archived hashes; prefer a new native mapping record/sidecar if possible, and only version the writer schema if genuinely required.

Reconcile `observation_answer` and creative `gm_narrative_unit` by **same task + same subject + same source + same audience**: if validated NPC/location visual narration fully covers an otherwise *empty* native read-side answer, omit the duplicate negative. Keep established selected facts, PC-owned appearance, remote unavailable subjects, distinct clauses, private scope and incomplete questions intact. One answered NPC question must never mark two distinct questions complete. A task has explicit native disposition: `answered`, `legitimately_unavailable`, `needs_clarification`, `held`, `not_attempted`. Completeness is the aggregate of real per-task dispositions and delivered/substantive output, not one `npc_speech` anywhere. Retain truthful degraded status rather than asserting an answer happened.

### 3.4 Unit-local expressive text without authority bypass

Add/extend independently validated composition roles for **GM-owned nonbinding objects and speech** (ordinary signs, documents, NPC offers, attributed reports, scene-only sensory detail). An isolated sign saying `Choose one of today's specials` is not the GM forcing a PC to pick from a menu; an NPC asking `Would you accept tea?` is not the PC accepting it. However, the same words in a narrator-issued forced-response menu or in `Mr. Raven, you agreed to surrender` must remain blocked. Role metadata alone, punctuation, or a model `safe` flag is insufficient; a structured authored part must be proven GM-controlled, located, audience-scoped and free from native effect assertions. Any valid nonbinding part bypass/exemption must be narrow and grounded in **verified native prepared output**, not raw narrative text.

Do not solve the global `predefined_narrative_choices` issue by disabling the scan or ignoring all `gm_narrative_unit` prose. A prepared/validated part may be separately handled, while unprepared/unsafe full-turn claims remain governed. An unrelated valid move may commit once **only after** the normal native preview, transactional validation, and authoritative mutation constraints pass. Never continue by rerunning a model, silently deleting a player-authored effect, consuming a roll, or bypassing a real consent/secret/PC-agency conflict. If separation cannot be proven, hold that part or the turn with an accurate diagnostic.

Permit GM-owned observable sensory circumstances for verified character POV, not player emotions/decisions, a presumed glance/choice, or camera second-person witnesses. Resolve `Rain` ambiguities via identity roles and referent grounding, not by exempting common aliases globally. Retain DQ04, PVP30/q/ag, SEM06, and protections for proxy speech and forced PC reactions.

### 3.5 Camera and history

An unplaced camera may select a location only with an active native scene/request/assembly reference and audience proof. If no entitled anchor exists, describe an honestly unlocated opening or ask a non-binding scene-framing question; never choose the alphabetically first available place or place a PC by implication.

Keep historical versions 1–8, native version 4 outcomes, queued/uncertain archives, source/recipient hashes, and all pending consent/movement/roll state readable without rewriting evidence. Current mode should stop producing obsolete formats **only after** replacements work. `scene-description`/observation factual readers can remain indefinitely; source version number alone does not establish dead code.

## 4. Ordered implementation program

### Gate A — Correctness and safe expressiveness (R0–R6)

| Phase | Work and files to examine | Acceptance at phase exit |
|---|---|---|
| **R0 Contract / red baseline** | Refresh HEAD/consumer inventory; freeze v8/v4 record schemas, native invariants, current call budgets; implement one lean regression table from original N probes; map exact output+task/source evidence. | Negative examples red **for the expected defect**, security controls green; untouched first-party assertions preserved. No production or live requests. |
| **R1 Locality / audience** | `narrative-authority.js`, `narrative-authority-context.js`, `narrative-speakers.js`, scene presence, deferred readers. N01/N11. | Remote Mara speech held; local/proven new NPC speech allowed; private unit correctly labeled; revocation/restart blocks mis-scoped output. |
| **R2 NPC cognition / contextual reference** | `npc-cognition.js`, trusted import/seed records, `narrative-speakers.js`, `dialogue-continuity.js`, current native scene focus. N02/N07/N10. | Real hearing/seeded entitled knowledge supplied with purpose-limited proof; private/cross-NPC memory excluded; unique role target recorded, ambiguous/proxy/remote not; unplaced camera grounded. |
| **R3 Task ledger / arbitration / completeness** | `semantic-engagement.js`, `narrative-delegation.js`, `gm-fiction-schema.js` only if necessary, `pvp-output.js`, `world-observation.js`, `narrative-completeness.js`. N03/N08. | No accepted creative NPC description plus conflicting empty unknown for identical task; two NPC questions require two dispositions; false `complete` impossible; restart/outbox stable. |
| **R4 Part-level artifact safety and independent effects** | `narrative-integrity.js`, `narrative-authority.js`, `pvp-output.js`, `state.js`. N09. | Accepted in-world sign + independently valid native move can both survive appropriately; forced menus/raw unprepared text still blocked; no duplicate arrival/spending; isolated held parts recorded honestly. |
| **R5 Scoped offers, names, sensory POV** | `narrative-authority.js`, `narrative-speakers.js`, `narrative-integrity.js` and existing proof utilities. N04/N05/N06. | NPC offers/allegations, common-word weather aliases and local sensory prose improve; actual forced PC surrender/acceptance, proxy reply, remote/mis-scoped knowledge, camera witnessing remain held. |
| **R6 Correctness checkpoint** | Freeze verified task ledger and native part protections; compact integration + targeted original security suite, record which positives remain held. | All selected reproduced defects either repaired and asserted or explicitly retained/deferred with reason; zero added provider calls; exact scene/recipient/effect proof. **Stop before cleanup if unsafe.** |

**Important:** R6 is a focused checkpoint, *not* permission to claim full-release qualification. If Gate A must ship separately, run a complete mandatory validation for its exact executable tree before that release. Otherwise continue to Gate B, then run the full gate once.

### Gate B — Proven producer retirement and native-reader preservation (D0–D3)

This gate implements the *safe, relevant parts* of source plan LD0/LD5/LD6/LD7. LD1–LD4 concerns were discharged in Gate A; the old numbering is retained in the removal ledger as provenance.

| Phase | Work and boundaries | Exit requirement |
|---|---|---|
| **D0 Deletion eligibility / crosswalk (LD0)** | For every candidate function, enumerate current runtime, command, optional flag, test, persisted record, archive, historical recovery and external-unknown consumers. Crosswalk each old assertion to an actual replacement adapter. `Unknown = KEEP`. | Explicit `RETIRE PRODUCER`, `RETAIN READER`, `DEFER`, `NO CHANGE` per symbol; unchanged historical negative assertions. |
| **D1 Stop active legacy production (LD5)** | Current model authored-candidate five-field emission; coarse `declarationContext`; conflicting v1–v7 narrative instructions in v8-enabled mode. Retain native v4 projection, flag-off behavior, pending/manual legacy readers. | No new obsolete producer records in qualified **current mode**; both supported modes and pending recovery still work. No effect-schema/permission expansion. |
| **D2 Extract and retire proven freeform routes (LD5/LD6)** | Extract native roll review; exact owner consent offer/reply; read-only discovery/delivery proof; entry review/policy/resolve; shared hash/source/privacy helpers. Then retire unreachable freeform `routeRollMessage`, `routeConsentMessage`, `routeDiscoveryMessage`, `routeSceneEntryMessage` only where proven. Use compatibility reexports as needed. | Current commands and native service readers preserved; old assertions migrated, no dangling import; no unreviewed delete of an entire module. Literal single-call scene fast route **deferred** unless owner explicitly approves a measured cost tradeoff. |
| **D3 Conditional generator retirement and qualification (LD7)** | Retire current **generator** v1/v2/v3/v5/v6/v7 only where v8 mode parity and supported flag-off behavior are proven. Retain all versioned historical read/revalidation, archives/outbox and pending/replay proof. Run final checks and publish removal ledger. | Obsolete new-mode production absent; old receipts render byte-equivalently when appropriate; private/revoked/uncertain rows remain protected. `KEEP` is an acceptable outcome for inseparable readers/generators. |

**Deferred outside this default implementation:** N14 long-horizon salience retrieval, N15 owner-controlled rich PC appearance, mixed OOC/IC policy, removing the one-call literal read-only route, general remote cutaway mechanics, live-provider evaluations, new game mechanics. A targeted prerequisite can be authorized only if blocking an actual replacement; record it separately.

## 5. Lean testing plan (Codex usage conservation)

**Default strategy:** one compact *table-driven* test module (aim ~24–30 distinct scenarios, not one file per defect), reusing the existing native fixtures, `FakeResponses`, offline network guard and fake Discord outbox. Include **only unique, discriminating cases**: combine related positive/negative assertions within a scenario. Do not duplicate all upstream suites as newly authored tests. Port the best N01–N11 probe cases into red/green assertions, not mere observations. Baseline commands and expected reds go into the phase ledger.

**Minimum compact behavior matrix:**

1. Local vs remote public NPC; authorized local newly created NPC and source revocation.
2. Exact party/private unit visibility, owner change/restart/delayed outbox.
3. Genuinely heard player utterance, fake/retracted hearing and secret/private contrast.
4. Trusted seeded known evidence vs unsupported arbitrary file ref/secret seed.
5. Unique public role listener among two; truly ambiguous pair; proxy and unheard/remote listener.
6. Unplaced camera with entitled named anchor vs unrelated `aaa-parking` and no anchor.
7. NPC appearance creative+empty-native same-task collision; independent PC appearance/remote negative retained.
8. Two separate NPC questions; one answered and other missing, both answered, truthful unsupported answer.
9. In-world sign/menu plus automatic interior entry: exactly one native arrival and valid output; narrator forced choice/unsafe raw text rejected.
10. `Would you accept tea?` as verified NPC offer vs `You accepted`/`Mr. Raven, you agreed to surrender` as forced PC outcome.
11. Alias `Rain` as weather vs genuinely protected PC reference/reaction.
12. Character physical sensory second person vs feelings/action vs camera second-person.
13. Current-mode no new five-field candidate / v1–v7 authoring; flag-off compatibility and historical output parts still render.
14. Native roll/consent/discovery/entry pending source and unknown/uncertain send remain unchanged.
15. Baseline Twenty-Four Spin scene → entry/interior → follow-up; accepted description never followed by same-task `nearby` contradiction; if destination writer intentionally held, arrival persists and `destination_fiction_missing` is explicit.

Implement these through 24–30 purposeful cases, not 15 new standalone suites. Original FH40, PVP30/PVP30q/PVP30ag, SEM06, DQ04, D08, OBS21, NPC proxy, native damage/death, consent, Fear/zero PvP Hope, ownership, and exactly-once publication tests remain **untouched and mandatory**. Preserve all **39 optional matrices** and their unique assertions; they need not all execute for every local phase.

**Execution cadence:**

- **At R0:** run *only* the compact red baseline + 2–4 most relevant pre-existing native security controls. Capture expected red categories without redefining them as pass.
- **During each R/D phase:** run changed compact cases by test-name pattern, plus the single most relevant original security suite or a small combined directly affected batch. No full registry per phase. If any high-impact proof changes, run a focused combined native/privacy/publication batch once before moving on.
- **At R6:** a focused checkpoint on all compact cases and targeted security suites, without the full registry unless Gate A will be independently released.
- **At final D3 (or terminal R6 if Gate B is stopped):** freeze executable/test inputs, run `npm run check`, `git diff --check`, release manifest integrity, **one** `npm run validate` mandatory offline registry. Rerun full only if it fails or executable/tests change after qualification. Result-only ledger/manifest docs do not require redundant full reruns. Preserve CI as an independent final SHA qualification if push is later authorized.
- Zero live OpenAI/Discord provider requests, zero billable automated tokens, no live production test, no extra semantic classifier/judge, no per-clause writer. Compare the existing direct literal route (1 call), routed pure scene observation (2), combined/direct (2), routed mixed (3) and report real counts from fakes. Never promise live latency gains from synthetic timings.

Avoid expensive broad exploration loops. Read the two source documents and exact touched modules first, then use saved reproduction fixtures and short test-name filters. Do not repeatedly re-audit code already inventoried in the source reports unless HEAD changed materially.

## 6. Operations, latency and live acceptance

**No production authorization is implied.** This task produces a plan; Codex implementation is a separate invocation. Do not merge, deploy, restart Veilkeeper, change flags/delegation, open/write production SQLite, run live tests, or resend historical messages without explicit permission. If later authorized read-only production inspection, obtain the exact failing turn/source refs and inspect: `scene_authoring_attempt`, `narrative_draft`, `narrative_unit_fates`, `narrative_unit_review`, `narrative_coverage_review`, `narrative_health`, native arrival/presence, current zone, outbox publication/chunks and operational/latency traces. **Do not invent** the cause of the prior 12:10 arrival-only response.

Use current `turn-latency.js` counters to isolate `router`, `gm`, `scene_writer`, native commit, outbox, pre-director and progress-notice timing. The repeated “Veilkeeper is still processing this turn” remains an operator UX issue; first establish production distribution and progress-notice threshold. Do **not** automatically swap to a cheaper model or disable protective generation/retry paths to conceal missing narration. Favor reducing duplicate read/model work and false validation retries while preserving the zero-new-call guarantee. Any model/threshold change requires separate evidence and approval.

A future authorized controlled live pilot should check exact paid/live-request budget approval and four observable flows: Twenty-Four Spin description → interior entry → contextual follow-up; two-NPC exchange using a unique role; native NPC offer versus forced PC agreement; sign + actual valid movement. Confirm final Discord text, evidence/fates/coverage, source/zone/owner invariants, NPC hearing and latency; do not blindly replay already committed turns.

**Windows production release only after separate approval:** verified exact SHA, WAL-aware SQLite backup + integrity/FK checks + disposable restore, config/flag capture, code-only rollback point, runbook deployment and opt-in restart. Schema change or data rewrite requires an explicit revised plan, not silent cleanup. Rollback preserves histories, native receipts, publication archives and uncertain sends; do not reroll, restore stale DB over current player state, or automatically resend an uncertain Discord publication.

## 7. Stop conditions and deliverables

Stop unsafe relaxation/deletion if any protected PC statement publishes without receipt, any audience/private source is promoted, offscene/camera falsely grants perception, an uncommitted state effect executes, a pending native reader becomes unreadable, `narrative_authority=false` gains creative authority, or a retired symbol lacks test/consumer parity. Record a precise `KEEP/DEFER` decision instead of forcing removal. No global bypass of lexical risk scanners and no format/hash migration to make tests green.

Produce:

- One phase commit per small logical change, with red/green evidence and exact source/test deltas. Documentation-only final receipt may follow without altering qualified executable tree.
- An updated **finding disposition** for N01–N15 (`fixed / retained guard / deferred / unresolved`), with N01/N11 evidence labeled correctly.
- A **symbol-by-symbol retirement crosswalk** for LD0–LD7 mapping old producer/function → active/archived consumer → native replacement → original/replacement assertion IDs → removal/keep decision → rollback.
- Real task-level coverage and outbox examples, including two-inquiry incomplete and sign+arrival positive/forced-agency negative.
- Exact fake request counts and measured test commands, output/CI status, final SHA, version/schema/flag changes (or none), remaining risks and code-only rollback.
- Separate statuses: **committed, pushed, CI qualified, merged, installed, restarted, flags enabled, live tested**. Never collapse these into a generic “complete.”

**Success criterion:** Player requests that are authorized and answerable receive consistent, expressive, locality- and audience-correct narration; each independent task has an honest disposition; safe fiction no longer nullifies independently valid native actions; old active phrase producers are retired where demonstrably redundant; all historical authoritative readers remain valid. The runtime remains secure and testable with **no new model round-trips**.
