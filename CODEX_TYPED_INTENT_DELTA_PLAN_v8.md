# Veiled City — Typed-Intent Delta v8 / Session 2 Recovery

**Date:** 2026-10-10

**Target repository:** `KeshireTheChaotic/Veiled_City`

**Target branch:** `codex/typed-intent-refinement`

**Reviewed branch HEAD:** `2dc347a77e1fd4988856b8e578e5c148fe82cb24`

**Evidence:** `Session(1).zip` (`Chat.txt`, `Associated Errors.txt`), inspected GitHub source files, branch progress/release documentation, previously prepared v7 D00–D08 scope.
**Status:** **PROPOSED / NOT IMPLEMENTED**. No source changes, tests, deployments or production DB operations were made by preparing this package.

> **Relationship to v7.** The previously generated `CODEX_TYPED_INTENT_DELTA_v7_PACKAGE.zip` contained a 294-line plan, a kickoff, nine work packages D00–D08 and 35 regression scenarios. Its ZIP bytes are not attached/mounted in the current conversation; its D00–D08 work-package inventory is preserved here from prior context, not represented as a line-by-line file diff. This v8 plan additionally incorporates the *new Session 2 failures* and verified source-level integration gaps. Recheck v7 directly if its original ZIP is later available.

## Executive determination

T00–T08 of the original typed-intent initiative are **reported complete** by `docs/TYPED_INTENT_PROGRESS.md` and `docs/TYPED_INTENT_RELEASE_10.0.0.md`; the documents report 85/85 offline suites passing. Do not reimplement those phases. **The 85-suite report does not cover this session's failure paths or prove live Discord integration.** The new work is correctness, lifecycle wiring, recoverability, privacy-preserving UX, and adversarial live-flow regression coverage.

**Nonnegotiable invariants:** an authenticated player's unchanged message owns attempted intent; model-proposed meaning is fallible; only separately native-accepted intent can be adjudicated; native receipts own consequences; no model-generated dice, expenditure, consent, another PC's voluntary behavior, GM-only knowledge, or private-to-party leakage. Replays must never charge or roll twice. Specific source, actor, scene, audience, target and principal revision constraints must remain enforced. Realistic outcome: progress ordinary unopposed action; block/clarify genuine ambiguity, conflict, costs or access. Never make false completion claims just to keep the conversation moving.

## Evidence: Session 2 incident sequence

1. `/vc-session assemble` reported `Invalid Form Body`, `content[BASE_TYPE_MAX_LENGTH]` (2,000-character Discord limit), although a public assembly narrative appeared.
2. Jaxon declared movement toward Choso **and** a shin kick: after bot progress feedback the turn failed without committed consequences. In a multi-PC scene the attack is a contested, consent-sensitive request and must never be silently performed; the approach may be an independently valid action.
3. Choso asked Tyrell why the door should remain closed; the turn failed. Choso later walked toward the leaking parcel and that turn failed; Jaxon spoke about his lack of connections and eventually received a non-action clarification asking how he arrived even though his outside arrival had been narrated.
4. Jaxon tried `I walk into the store using the window`, then `I enter the store using the front door as I hear Tyrell ask Choso the question`, then multiple explicit approaches and confirmations (`Yes, I enter the laundromat and approach Tyrell`, `I enter the laundromat and walk over to stand near Tyrell and Choso`). Several attempts failed; another answer stated movement was not committed. An earlier exterior arrival must not be conflated with interior entry; a new owner-authored accepted entry can authorize mundane accessible entry.
5. Billy declared he was leaving the door alone and troubleshooting the frozen shipping terminal. That compound turn failed; independent dialogue / observation must not be lost when another dependent action requires adjudication.
6. `Associated Errors.txt` contains repeated `PLAYER_INTENT` exceptions for (a) span absent from immutable authored message, (b) span absent from current authored input, and (c) target ambiguity thrown from `acceptIntentForAdjudication`; plus `NARRATIVE_INTEGRITY/source_span` and `POST_TURN_REVIEW/review_without_mutation` for `references`.

The evidence has **no captured model structured response payloads**, receipts, production DB, or per-message error-ref mapping. Therefore source-location hypotheses below are strongly supported by their stack traces but cannot be assigned to a particular player turn unless additional diagnostics are collected. Do not invent a one-to-one error chronology or claim the actual game world changed when the visible bot explicitly says it did not.

## Verified source-level diagnosis / remediation boundaries

| ID | Verified code / issue | Consequence | Planned fix |
|---|---|---|---|
| F01 | `bot/src/typed-intents.js:205–246` requires intent `source_span` to be `source.includes`; `:186–203` legacy adapter uses `indexOf` and throws if no exact match | Model paraphrase or synthetic second clause aborts entire generated turn | H01 deterministic exact occurrence ledger, targeted correction, independent-intent handling |
| F02 | `bot/src/typed-intents.js:132–172, :269–279` rejects ambiguous/candidate movement at acceptance, even when declared intent should be staged for clarification | Unresolved referent becomes fatal transaction error, not a playable clarification | H02 `needs_clarification`/pending referent lifecycle; do not loosen acceptance |
| F03 | `bot/src/gm.js:625–656, :670–738` retries model output with corrective prose; final replacement still can fail | Expensive broad regeneration; recovery can discard valid independent actions | H01–H04 bounded field-level recovery and fail-closed partial handling |
| F04 | `bot/src/narrative-integrity.js:97–124` requires a claim's `source_span` to occur **in the actual output surface**; attached error uses Jaxon's input sentence | Model confuses player-input source with GM narration source | H04 separate `authored_source_span` vs `output_claim_span`; keep existing output-surface validation |
| F05 | `bot/src/director.js:2–39` checks `references=changed` only when `events` contains `npc_update` or `location_update` | Hallucinated metadata vetoes an otherwise sound response | H03 compute review from staged mutations; schema checked but not model-authoritative |
| F06 | `bot/src/commands.js` `/vc-session assemble` calls `interaction.editReply()` with unbounded assembled status; `/vc-session end` also edits with a full recap | Can exceed Discord's response content limit, as observed | H05 common interaction-safe chunk/follow-up + tests; inspect other command paths |
| F07 | `bot/src/index.js:60–82` registered private channel chunks, DM fallback does not | Long private texts can fail even with safe-channel fallback | H05 all private sinks chunk and preserve delivery status |
| F08 | `bot/src/roll-requests.js:83–96` uses `cityKey('roll:' + source.event_key)` | Two independent roll-required intents in one message alias to same request | D01 stable per-accepted-action roll request ID + migration-safe lookup |
| F09 | `bot/src/rules-arbitration.js:25–39` checks source namespace syntax but not existence/applicability of `srd:`, `override:`, `house:` refs | Mere prefixed strings can appear 'grounded' | D01 verified reference lookup, version, scope and bounded provisional review |
| F10 | `bot/src/roll-requests.js:150–157` publication scans `mutation.intents` with roll feature, whereas new `state.js:415–425` creates `mutation.nativeAdjudications`; `index.js` calls `publishRollRequests` | Typed adjudication pending requests may not reach private delivery path | D01,D03 publish idempotently from actual committed pending requests, never model text |
| F11 | `bot/src/commands.js` and `bot/src/index.js` do not dispatch button/select interactions; `formatRollRequest` is plain text | v7 private bonus selection UX absent | D02–D04 authenticated, private, revision-scoped Discord component UI |
| F12 | `bot/src/scene-action-window.js` exports open/join/lock/resolve; reviewed `index.js` and `turn-orchestration.js` have no calls | Multi-actor native service not integrated into live message flow | D05 wire actual scene-conflict orchestration; preserve consent |
| F13 | `bot/src/turn-orchestration.js:32–33` invokes `reconcileConsequences(...,strict:false)` | Incomplete action dispositions can escape the stricter promise | D06 enforce complete receipts/pending/blocked/clarified outcomes on action-bearing turns |
| F14 | `bot/src/action-dependency.js` persists graph; `bot/src/typed-mechanics.js` resolves existing rolls but no resume-and-reconcile wiring seen | Descendants can remain suspended after prerequisite resolution | D06 transactional continuation service invoked after native receipts |
| F15 | `bot/src/memory-lifecycle.js` supports scoped revisions; `gm.js` uses context-memory retrieval but does not directly use `retrieveMemoryRevisions` | Lifetime/epistemic memory records not necessarily available to live referent recovery | D07 integrate bounded safe retrieval and action resumption, never promote rumor to fact |
| F16 | `bot/src/roll-requests.js` and `roll-collaboration.js` already implement some conservative native modifiers, Experience, Help and Tag Team | Avoid duplicating spend / dice services | D02–D04 extend UI and arbitration using existing native APIs and receipts |

**Inspect the actual current worktree and HEAD before editing.** Prior branch source snapshot is evidence, not an instruction to reset a newer branch.

## Scope and ordering

Execute in this order, with one tested commit per unit:

`D00 -> H01 -> H02 -> H03 -> H04 -> H05 -> D01 -> D02 -> D03 -> D04 -> D05 -> D06 -> D07 -> D08`

D00–D08 **preserve v7 identifiers**. H01–H05 are **new Session 2 repair phases**. Crosswalk is in `V7_V8_DELTA_MATRIX.csv`.

### D00 — Rebaseline and red-first Session 2 replay

- Confirm branch/HEAD/status, dependency lock and manifest consistency. Save latest base SHA; do not modify production secrets/data.
- Convert extracted `Chat.txt` and `Associated Errors.txt` into sanitized, deterministic dialogue and failure fixtures, with mocked provider responses and **real native preview/transaction code**. Preserve exact punctuation, apostrophes, Discord mentions, multi-action sequencing and source offsets.
- Capture before-change red tests for F01–F06, F08–F13. Record which are provable from source versus require mocked UI/GM result. Start from `npm ci --ignore-scripts`, `npm run check`, `npm run validate`; never rewrite baseline expectations to make them green.
- Add `scripts/session2-replay-test.mjs`, `scripts/session2-message-contract-test.mjs`, `scripts/v7-delta-baseline-test.mjs` to default offline validation after implementation.
- **Gate:** reproduced failing categories; source/fixture hashes, expected authority results, exact commands and pre-fix failures documented. No external request, bot startup or campaign DB read.

### H01 — Exact source-span identity and recoverable semantic parsing (NEW)

- Replace legacy blind `indexOf` promotion with an immutable occurrence table from the authenticated `authored_turn` envelope: source event, UTF-16 start/end offsets, exact text, actor/principal, framing, consumed-span exclusion and source hash. Model can propose meaning, but offsets are rebound only to unique exact occurrences that actually exist.
- For a missing span: reject that **proposal**, produce `unmatched_source_span` diagnostic including intent index + nearby safe offsets (avoid exposing private text in public errors). Do **not** invent an action, silently fuzzy-match to another clause, or return success.
- Validate author spans *before* optional narration fields; support exact repeated phrases as different occurrences; preserve owner/speaker identity and direct quotes.
- Distinguish original immutable `sourceText`, bot-mention-cleaned `messageText`, and native-consumed clauses. No declaration from unconsumed-only input may get an offset in a consumed source occurrence.
- If one proposal fails but unrelated accepted intents are valid, finish only safe independent outcomes and return a scoped clarification for the failed clause. Retain a durable per-clause status for resumption; never commit a half-applied unsafe compound action.
- **Gate:** no fatal `PLAYER_INTENT` from malformed *optional* secondary span; unauthorized or absent spans still cannot execute; replay does not duplicate action receipt.

### H02 — Contextual referents, accessible movement and meaningful clarification (NEW)

- Introduce a persistable `awaiting_referent` proposal state separate from `accepted_for_adjudication`. Only a known fully grounded destination may be accepted to execute. A genuine ambiguous referent is a concise question attached to exact source/principal/scene/target candidates, not a global transaction throw.
- Resolve antecedents such as `the store`, `the front door`, `walk over to Tyrell`, `Yes` from audience-visible current scene and preceding pending clarification **without** inventing interior access. A previously narrated exterior arrival is objective position only if backed by native arrival/presence receipt.
- Reuse same-turn ordinary generated locations and candidate keys only after origin + target grounding. A window entrance is not equivalent to door entry; actual locks/wards/occupied paths, encounter movement and dice retain native adjudication.
- A subsequent short owner response may supply missing target/entry authorization. It must carry **new current source ancestry** and re-check principal revision/scene/position; do not retroactively approve an obsolete source.
- Unowned-PC statements (`Choso walks over...` by Jaxon's controller) remain narration/testimony at most. A player may self-correct to a first-person action; no other PC is moved.
- **Gate:** Jaxon exterior → accessible laundromat interior → approach works once when the access rules permit; unexplained or contested access remains pending/blocked; prior unrelated social responses are preserved.

### H03 — Deterministic post-turn state review (NEW)

- Treat `state_review` as a model explanation, **not the authoritative source of whether a mutation occurred**. Derive category change flags deterministically from validated event/relationship/handout/NPC operations and receipts. Native world additions/movement are their own event categories, not fabricated `references` updates.
- Enforce explanation/confidence schema but rewrite only mechanically derivable `decision` flags and annotate `review_normalized` in a private audit receipt. Conflicting proposed effect descriptions remain blocked; this is not a way to conceal failed mutations.
- Generate human-GM attention only for genuine low-confidence unresolved consequences, not purely because a harmless model summary mislabeled `references`.
- **Gate:** model `references=changed` without `npc_update`/`location_update` cannot trigger endless retries; no synthetic `npc_update`/`location_update` is invented; actual mutations still require review consistency.

### H04 — Narrative claim evidence separation and reconciliation (NEW)

- Make two distinct fields/contracts: `authored_source_span` (input occurrence) and `output_claim_span` (actual text within the specific narration or allowed private-message surface). For compatibility, old `source_span` in a narrative claim continues to mean **output** until migrated; never silently reinterpret input text as output.
- Validate claimed output spans against exactly one published surface and correct visibility/recipient; validate factual consequences only after staging authoritative world mutations.
- Deterministically reconstruct/refine a redundant claim annotation only if its visible output occurrence is exact and unique; otherwise request bounded correction or omit unsupported material prose, never fabricate native facts or arbitrary player dialogue.
- Pair every completed movement/access/possession/damage/disclosure claim with the matching committed native receipt. Tentative intent uses conditional language without asserting success. Preserve private knowledge boundaries.
- **Gate:** attached Jaxon `NARRATIVE_INTEGRITY/source_span` case produces safe output or a specific recoverable failure; tests forbid fake completed travel and leaked NPC knowledge.

### H05 — Discord payload limits, session assembly and delivery idempotency (NEW)

- Implement a reusable UTF-16-safe Discord content chunker respecting ≤2,000 character **per message**, conservative headroom (e.g. 1,850–1,900), well-formed surrogate pairs, Markdown fences and mentions. For slash commands use one valid initial `editReply` plus bounded `followUp` messages; do not exceed interaction lifetime. Registered private channels and DM fallback must use the same utility.
- Apply to `/vc-session assemble`/`assembly-status`/`end`, private delivery, GM logs, long roll requests, transcripts and other direct `interaction.reply`/`editReply` paths after audit. Avoid duplicate public opening if the ephemeral response fails.
- Keep the transactional outbox and delivery-part keys for party and private publications, marking *each chunk* idempotently. If payload publication fails after commit, resync output rather than rerunning the model/mechanics.
- **Gate:** long assembly with 4+ PCs, private hooks and recap succeeds with no `BASE_TYPE_MAX_LENGTH`, duplicate broadcast, secret exposure or rollback of committed scene.

### D01 — Unique roll identity, actual rules grounding and pending lifecycle (v7)

- Derive request key from `(source_event, accepted_intent/proposal occurrence, action type, stable revision)` instead of source event alone. Use durable compatibility alias only for historical requests; never collide two same-message rolls or re-roll replayed action.
- Resolve known `srd:`, `override:`, `house:`, `homebrew:` references through actual versioned authoritative source/catalog and contextual applicability; prefixes alone are insufficient. Apply saved GM rulings by exact campaign/scene scope. Unsupported source → provisional human review **without a fake request**.
- Distinguish `pending`, `needs_review`, `awaiting_selection`, native outcome and reconciled completion. `needs_review` must not masquerade as actionable `pending`; include reason and owner/private receipt.
- Wire typed native `mutation.nativeAdjudications` to persistent `roll_request` publication; the source must be committed native request records, not legacy `mutation.intents` alone.
- **Gate:** two different roll-required intents in one message produce two independent IDs, correctly private request deliveries, isolated selections, and independent exactly-once receipts.

### D02 — Source-grounded private bonus/feature arbitration (v7)

- Create candidate modifier registry from authoritative owned sheet, equipped domains/cards, traits, Experiences, assets, conditions, party-aid rulings and valid SRD/house/campaign refs. Compute relevance from declared action + persisted rule metadata; do not guess ownership or bonus values.
- Define states `available`, `requires_owner_choice`, `requires_additional_authorization`, `blocked`, `applied`; show all *genuinely applicable* alternatives, including mutually exclusive ones. No automatic Hope/Stress payment or bonus stacking.
- Preserve advantage/disadvantage cancellation and separate experience costs, feature frequencies, attack/damage phases, and net disadvantage Help exceptions requiring human GM ruling.
- **Gate:** modifier choices show all valid options, correctly disclose cost and source, and never charge/spend until explicit owner confirmation. A rejected option leaves request usable.

### D03 — Private Discord interactive roll menus (v7)

- Render a screenshot-style selection surface in the **owning player's private registered channel or DM**, or an ephemeral command interaction. Keep provenance, option details, expected final bonus and costs visible only to the authorized actor until explicit share. Never post other players' sheet options publicly.
- Implement authenticated `ButtonBuilder`/`StringSelectMenuBuilder` handlers in interaction routing, with compact signed custom IDs or opaque DB-backed tokens bound to guild, session, user, character, request key and revision. Buttons/modal/subsequent selection must compare-and-set revision under lock.
- Support select/deselect, review formula, confirm/cancel, alternate trait choice, Experience, Help/Tag Team invitations and status refresh. Where component limits apply, paginate privately and provide accessible slash-command fallback; buttons do not replace ordinary roleplay declarations.
- **Gate:** another player cannot click/use a private menu, stale controls cannot spend, double clicks cannot double-charge, reloaded bot presents a fresh view of pending request, and private sheet details never enter party logs.

### D04 — Alternate trait, Experiences and owner-controlled party sharing (v7)

- Allow explicit owner arbitration where applicable SRD or GM ruling presents multiple traits/approaches; show Difficulty/risks/stakes and recalculated native breakdown per alternative. No arbitrary model-chosen trait switch to gain a higher bonus.
- Integrate paid Experience selection (1 Hope each as actually permitted), source-backed relevancy, exact-spend receipt and zero-cost preview. Preserve the existing collaboration service and conservative consent gates.
- Sharing is an **independent affirmative owner decision**: publish only a redacted disclosed attempt/result or accepted aid invitation, never undisclosed Experiences/cards/traits/GM secrets. Withdrawal cannot erase an already-public result.
- **Gate:** voluntary share generates audience-scoped disclosure receipt, verified helper consent and native aid; default remains private; denied/expired consent creates neither spend nor party participation.

### D05 — Live multiplayer action windows, contests and PC agency (v7)

- Wire `scene-action-window.js` into actual party turn orchestration after separately accepted intents are grounded. Open only for meaningful shared-Beat overlap (same exclusive item, contested door/access, attack/reaction, opt-in Help/Tag Team, spotlight); ordinary messages must not block.
- Use resolved `read`/`write` resource IDs and location/audience scope, scene revision/optimistic concurrency, and owner-supplied current consent for direct PC conflict. Introduce explicit pending reaction windows; never infer that Discord timestamps grant precedence.
- Distinguish **move near Choso** (potentially independent) from **kick Choso** (consent-sensitive conflict). Narration can acknowledge an attempted kick without rolling/damaging Choso or choosing Choso's response.
- **Gate:** two PCs cannot both claim unique parcel custody; contested action waits for valid native window; direct PC conflict never coerces consent; late action cannot undo committed earlier outcomes.

### D06 — Compound continuation and strict consequence reconciliation (v7)

- Persist per-node `ready/pending/suspended/blocked/clarification/resolved/failed` with exact source, receipts and dependencies. On native roll/access/consent completion, transactionally reevaluate descendants and resume *only now-authorized* ready nodes, without rerunning completed ancestors.
- Restore `reconcileConsequences(..., strict:true)` for all accepted consequential turn actions after ensuring native no-roll completions, real pending requests, explicit blocks/clarifications have canonical records. Do not change to strict mode until all ordinary action paths emit these records.
- Narration projection must pair each materially completed claim with native receipt and support independent partial acknowledgments. Prevent roleplay conversation from being silenced by an unrelated pending action.
- **Gate:** Billy speaks, leaves the door alone, and starts troubleshooting; mundane parts persist, uncertain technical outcome waits for real roll if needed, and replay neither loses dialogue nor double-applies consequence.

### D07 — Scoped memory, lore and referent/continuation integration (v7)

- Inject bounded `retrieveMemoryRevisions` + `contextMemoriesForScope` into live scene context, prioritizing active current-scene source, alias/parent/location, prior owner-authored clarification, pending action and applicable rules/lore. Keep epistemic labels `testimony`, `inference`, `attempt`, `claimed_result`, `native_fact` intact.
- Connect pending action/resolution records to durable memory identity and alias continuity; same named business/parcel across distinct locations is not automatically one entity. Use fictional ticks for decay, protect pending causal dependencies.
- Party public retrieval can never read character/player/GM-private memory; NPC cognition requires actual NPC witnessed/told/inferred evidence, never just GM prompt visibility. No turn should turn a claimant's assertion into objective world fact.
- **Gate:** `the front door`, `the store`, `the terminal`, Tyrell/Choso positions are resolved when authorized by scoped evidence; another character's private clue stays unreadable.

### D08 — Regression, observability, release & rollout gates (v7)

- Keep 85-suite historical report as baseline claim and run the **full current offline suite** after each phase. Add Session 2 replay fixtures and D01–D07 edge-case tests to default network-denied CI. Update manifest, checked command schema and contract/release docs.
- Track errors by `code`, `diagnostic.category`, turn/source-event, action key, GM attempt count and recovery strategy in **GM-private** logs. Summaries/metrics must exclude player private text and secrets; make production error references match immutable source / execution attempt receipt.
- Add offline adversarial tests for fabrication/overreach, privacy leakage, broken consent, duplicate dice/costs, exhausted roll controls, offline long Discord messages, scene concurrency, correction-after-failure and restart-safe continuation.
- Run `npm ci --ignore-scripts`, `npm run check`, `npm run validate`, manifest integrity and `git diff --check`. Verify no required tests skipped, 0 live requests / billable tokens during qualification.
- Optional live-model semantic playtests can be a **separately owner-approved** gate; do not run them by default. Deployment, bot startup, production DB access, paid API calls, merges and Discord command registration remain explicitly out of scope until owner signoff.
- **Gate:** all baseline + newly registered suites pass; every F01–F16 has a linked test and documented code/commit; no high-severity release blocking metric regresses.

## Development constraints, stop rules and rollout

1. **Do not bypass safeguards to make logs green.** No `includes`/fuzzy substring accepting invented source, `strict:false` indefinite workaround, blanket `scene_actions` omission to hide movement, premature `model success`, silent consent, public disclosure or broad memory promotion.
2. **Preserve branch history.** If new work already landed, mark its task complete by source+green test proof and do not duplicate. If prior v7 ZIP becomes accessible, independently reconcile its exact checklist before closing D08.
3. Each phase: red-first fixture → bounded change → focused suite → `npm run check` → complete `npm run validate` (offline) → progress ledger entry → commit → next. Do not pause for approval between safe offline phases; stop on real source/ruling ambiguity, unexpected destructive migration or unresolvable test failure.
4. For addition of interaction handlers or persistence, include backwards-readable adapters and exact idempotency migration notes. **Never** touch `.env`, `veiled_city.sqlite`, WAL/SHM, production Discord, real campaigns or player identifiers in test artifacts.
5. Before release, test a staging copy with sanitized session fixture in this order: assemble 4 PCs; Jaxon arrival + ordinary entry; Tyrell question + Choso response; Jaxon's attempted shin kick (consent-scope); Billy compound troubleshooting; two same-message roll requests; private bonus menu; shared-scene parcel conflict; publication-retry/restart. All mechanics remain offline until explicit separate deployment authorization.

## Definition of done

- No `PLAYER_INTENT`, `POST_TURN_REVIEW` or `NARRATIVE_INTEGRITY` whole-turn failure from the exact Session 2 fixtures **unless a genuinely unauthorized consequential act is attempted**; then deliver a scoped, useful noncommittal response.
- Jaxon's mundane authorized movement has a native arrival/presence receipt; a window/locked/restricted entry does not auto-succeed. The unowned Choso movement never commits. The attempted shin kick never damages a PC without accepted native conflict/consent.
- Billy's compound message does not disappear because troubleshooting requires native uncertainty adjudication.
- At least two simultaneous same-message pending rolls have distinct request IDs and independently deliver private roll/bonus selections. No duplicate spends, rolls or receipts on replay.
- Real Discord session assembly and private messages conform to the 2,000-character limit without duplicate send, lost private delivery or public leak.
- Live shared-scene windows are wired to the producer/consumer pipeline, and `strict:true` reconciliation is active on consequential action paths.
- All completed work is proven by audited source and passing default offline tests, with precise SHA/commands in the progress ledger. The owner controls rollout.
