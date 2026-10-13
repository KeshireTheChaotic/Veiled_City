# Veiled City V96 — Revised Implementation Plan

**Status:** Proposed implementation contract; no repository changes or validation are claimed by this document.\
**Source:** [`codex/typed-intent-refinement`](https://github.com/KeshireTheChaotic/Veiled_City/tree/codex/typed-intent-refinement) at `aeffb8e3b5ec2a9bfee18af7081fea0ab49e181d` (verified 2026-10-13).\
**Application version:** 10.0.0; V96 is a work-cycle name, not an automatic version bump.\
**Predecessor:** V95-06 remains **BYPASSED**, not completed. V96-00–04 are committed and historically qualified at **137/137** suites. V96-05 is **P0 blocked**. The latest commit adds `bot/scripts/v96-semantic-output-p0-test.mjs`, default validation registration, and a detailed blocker: **2 passing / 4 failing** tests, without a production fix. The current registered suite count is **138**, but there is **no 138/138 PASS**. Commit `aeffb8e` is one commit beyond `de0c949`, not a V96-05 implementation completion.

## A. Aim and hard boundary

Enable an imaginative, responsive Daggerheart GM that can autonomously portray NPCs, improvise ordinary environments, adjudicate unexpected **supported** actions, and narrate meaningful receipt-backed outcomes, while never taking voluntary PC choices or treating generated sentences as source authority.

**Invariant:** Accepted typed intents are canonical adjudication inputs; authenticated human declarations own intent; native services/receipts own outcomes; narration is an authorized projection, not an effect executor.

A model-supplied claim list, `safe` flag, hash, or omission of a claim is **not independent proof that arbitrary freeform prose contains no material assertion**. Nor can a bounded regex or a second probabilistic model prove that absence. Consequently this plan adopts the following explicit engineering tradeoff:

- **Strict default:** only independently authorized, source-complete projections can assert consequential PC effects, voluntary choices, custody, permissions, or other protected facts. Uncertifiable generated prose is not queued as authoritative narration. Preserve unaffected native work and already certifiable fiction. Avoid universal mute/neutral fallback; create an expressive native composition lane instead.
- **Expressive GM-owned fiction:** scene atmosphere, observable ordinary details, NPC-owned words, threats, offers, attempts, and rumors may be composed from structured bounded sources and current scene permissions. Attributed NPC statements certify *that the NPC said something*, not that its assertion about a PC or hidden fact is true. Native authority, not the NPC's claim, establishes any material result.
- **Open arbitrary paragraph mode:** may be offered later only via explicit human review or an independently authorized, documented risk-accepting experimental setting. A semantic screening call could reduce risk, not offer strict proof; it is **not** authorized as a substitute for the P0 gate in this plan. No default second call per clause or turn.

**Design test:** An NPC can say “You are under arrest,” approach with restraints, or threaten seizure; only an actual native outcome/owner authorization can support “you submitted,” “you were captured,” “your case was taken,” or “you suffered injury.” Native PC effect receipts must not be stretched to imply consent, confession, equipment transfer, or unrelated behavior.

## B. Latest-commit findings and existing infrastructure

| Confirmed code or evidence | Consequence for plan |
| --- | --- |
| `narrative-integrity.js` checks declared consequential claims and finite paraphrase tripwires; `narrative_claims: []` passed both novel material paragraphs. | Require independent output coverage; retain existing declared-claim native checks. |
| `pvp-output.js` `prepareAuthorizedTurnOutput` returns raw prose in unprotected ordinary paths; `assertPvpOutput` checks only applicable protected scopes. | Generalize **proof binding**, not the closed PvP dialogue template, to every publication. |
| `publication-outbox.js` and `revalidateOutputPublication` only require bound part proof when an applicable protected representation exists. | Persist exact payload/part/source/audience proof for ordinary and deferred publication; fail closed on missing/stale proof. |
| `consequence-reconciliation.js` validates recognized intent outcomes, but a benign `other`/wait action does not certify unrelated narration. | Reconciliation alone cannot establish coverage; avoid semantic-text/regex workarounds. |
| `gm-world-narrative.js` already has native scoped parts for NPC speech and atmosphere, but uses enumerated text acts. | Build a broader **compositional** GM-owned fiction representation without globally replacing all storytelling with canned lines. |
| `gm-action-ruling.js` correctly restricts generic rulings to observation/attempt-only and sends special/material effects to dedicated adapters or review. | Add bounded native fictional-effects composition after P0 repair; never turn generic roll success into a capability. |
| `gm-action-review.js` narrowly supports missing-saved-rule retry; `personal-continuity.js`, `gm.js` canon request routing, and `npc-cognition.js` retain specific lexical decisions. | Finish source-bound semantic cleanup and documented limited GM recovery; do not reinstate V95-retired code. |
| `context-planner.js` and `prompt-budget.js` already preserve core authority but use lexical relevance/whole-record optional omissions. | Optimize with provenance/audience-aware retrieval and measured omission quality, after behavior stabilizes. |

The six P0 tests are committed as regression evidence but **remain red**. Do not change expectations simply to make a green build. The blocker document explicitly records the actual ordinary `GMService.runTurn` → preview → `commitGmTurn` → outbox reproduction, with a real typed `I wait.` source, no native effect, and a queued unsafe paragraph. Read [`docs/V96_OUTPUT_AUTHORITY_BLOCKER.md`](https://github.com/KeshireTheChaotic/Veiled_City/blob/codex/typed-intent-refinement/docs/V96_OUTPUT_AUTHORITY_BLOCKER.md) first when executing.

## C. Phase sequence (supersedes V96-05 onward; does not reopen 00–04)

| Phase | Deliverables | Acceptance IDs | Separate qualified local commit |
| --- | --- | --- | --- |
| **V96-05R — P0 publication repair** | Common exact-payload native proof; expressive, source-bounded ordinary fiction composer; private/public/Director/deferred sinks | OUT01–OUT06 and original SEM06 | `fix(v9.6-output): certify ordinary-scene narrative projections` |
| **V96-05S — semantic and legacy cleanup** | Nonbinding typed personal/canon proposals, NPC dossier inputs, obsolete lexical decision retirement | SEM04, SEM05, SEM07, SEM06 parity | `refactor(v9.6-semantic): retire obsolete lexical authority` |
| **V96-05E — creative consequence bridge** | Reusable native effect propositions, valid roll-to-fiction follow-through, bounded GM review/recovery | EFX01–EFX04 and RULE/ROLL/HOLD parity | `feat(v9.6-effects): compose verified ordinary consequences` |
| **V96-06 — context efficiency** | Source dedup, omission recovery, stable cache boundaries, schema budgeting and comparisons | TOK01–TOK04 | `perf(v9.6-context): reduce redundant context safely` |
| **V96-07 — request and Director efficiency** | Router selection, bounded retries, batch/cadence and cost fidelity | TOK05–TOK07 | `perf(v9.6-routing): qualify bounded model-call paths` |
| **V96-08 — integrated release** | Four-owner mixed replay, contrast corpus, full offline qualification, rollback/ops readiness | QUAL01–QUAL03 + OUT/EFX | `test(v9.6): qualify expressive receipt-backed GM` |

**Sequencing:** Do not begin 05S/05E or optimization while 05R remains P0-red. New 05E work is intentionally segregated from the P0 fix; if it expands beyond native reversible/scoped effects, log a separate future proposal rather than growing a new rules engine. One T2 and one independent **local** commit per fully qualified phase. There is no requirement to manufacture a green partial commit halfway through 05R.

### V96-05R — output coverage and expressive projection (P0)

1. **Map all sinks and identities**: ordinary party/private/public narration, `public_narration`, summaries, individual DM content, direct/Director/continuation/native notice publication, archival/recap, memory and voice. Identify which are generated prose versus native-rendered notices. Capture original immutable message source, scene/session, actor/control revision, output surface/recipient, referenced world/native rows, and current audience.
2. **Define a closed v1 publication-part contract** (exact names chosen from current source): `kind`, originating source and hash, claim/effect class, subject/actor, scene/session, principal revision if applicable, audience/recipient, evidence refs, native receipt refs, authorized renderer input, exact rendered output bytes/hash, render version, status, and expiry/revocation semantics. Proof must be **native constructed** after source verification; never accept model-declared authority. No automatic SQL migration; additive/versioned readers only.
3. **Separate candidate prose from authorized output**. Treat generated unrestricted narration as a candidate, not a publication payload. Use native-rendered material parts for resolved effects and source-bound owner declarations; render pending/attempted states as pending rather than committed. For harmless or NPC-owned fiction, consume bounded typed scene/dialogue proposals, validate occupancy, ownership/proxy policy, scene evidence, visibility and factual reach; render with rich combinations of actor-specific language, authorized descriptors, intent/affect/tone, and supplied **source-grounded** dialogue. NPC claims remain explicitly attributed, never objective evidence of PC behavior.
4. **Avoid a global canned-script downgrade**. Evaluate against baseline NPC voice/continuity cases. Increase authorized expressiveness by widening *structured supported story beats and composition* (not by allowing arbitrary unverified paragraphs as certified). If native source cannot establish the scope of a novel clause, hold just that clause for review; do not silently promote or rewrite it. Record a truthful limitation when expressiveness cannot be safely achieved.
5. **Bind proof transactionally** before `queueTurnPublications` and use the same validated part set through outbox chunking and deferred delivery. Validate final payload hashes, exact ordered part memberships/chunk boundaries, source/scene/owner/audience revisions, and revocation at enqueue and send. Revocation invalidates future sends; it does not undo legitimate already committed effects. An uncertain send stays uncertain, not blindly retried. No recipient/private leakage or restart bypass.
6. **Read-side continuity**: archive, recaps, shared memory and voice must consume only deliverable/delivered authorized projections at correct audience and preserve “attempt/rumor” status. A private or unproven paragraph cannot be summarized as established party canon. Native effect receipt and delivered prose receipt remain distinct.

**OUT acceptance:**
- **OUT01:** original six SEM06 fixtures unchanged, 6/6 pass (including both unreceipted injury/forced-choice paragraphs blocked from actual queue; positive declared-claim and harmless idiom retained).
- **OUT02:** new paraphrase/cross-owner/custody/consent/HP/ownership variants with empty or forged claim lists cannot publish factual outcomes; no ‘model is safe’ proof substitution.
- **OUT03:** ordinary NPC threat, conversation, environmental atmosphere, conditional danger, idiom, and legitimate owner-authored speech remain meaningfully playable; positive expressive contrast, not just empty output.
- **OUT04:** independent multi-PC actions, owned native rolls, NPC conversation and safe narration survive an unrelated quarantined passage; native effects neither replay nor disappear.
- **OUT05:** private/public/party/Director/continuation/summary/voice and restart/revocation/uncertain-send boundaries use suitable source/audience proof; no private promotion.
- **OUT06:** legitimate native roll/damage/arrival/possession/contract receipts project exactly their own authorized outcome, never adjacent PC decisions.

**Fail condition:** If the only implementation that passes P0 is global suppression of mundane GM fiction or materially degrades quality, stop with measurements and an explicit owner-level tradeoff. Do not disguise a probabilistic semantic detector as guaranteed native proof.

### V96-05S — semantic decisions, deprecation, compatibility

1. Replace the `I vow/wish/promise` regex's decision role with source-bound **nonbinding** personal commitment candidate: verify first-person owning principal, exact statement/span, declarative versus quoted/conditional/reported framing, current character scope. No automatic arc consent or goal mutation.
2. Replace lexical `looksLikeExplicitCanonProposalRequest` authority with an explicit typed `proposal_campaign_canon` (or current-compatible subtype) in the existing combined GM schema; native private source, revocable terms and authenticated review remain mandatory. Ordinary canon mention/question is not submission. No new paid classification call.
3. Replace `court/ghost/veil` NPC seed word collisions with explicit dossier attributes and conservative defaults; existing profiles stay unmodified automatically. Preserve character-knowledge versus NPC-knowledge separation.
4. Inventory old call sites (`player-language`, `continuity-routing`, `message-span-ledger`, `scene-entry`, `dialogue-continuity`, old claim helpers and fixture readers). Classify **authoritative**, **read-only heuristic**, **exact syntax/security**, **historical compatibility**, or **unreachable**. Retire only proven obsolete authority paths; do not delete legitimate parser, source, privacy, P0 tripwire, or legacy receipt reader.
5. For each deletion/behavior rewrite, retain assertion-level crosswalk in V95-05 deprecation inventory, registration/manifest parity, negative mutation test demonstrating the removed behavior no longer decides gameplay, and a documented rollback/read-compatibility path. Never resurrect previously retired test/adapter paths.

### V96-05E — supported fictional consequences and review (additive)

1. Introduce **bounded effect proposals**, not a new rules/dice engine: eligible temporary environmental obstacle, verified observation/discovery, reversible local access/position changes, relevant NPC intent/reaction, supported clocks/exposure, sourced evidence/handout, and limited scene-state shifts. Map each to **existing current native adapter** with `supported / needs_review / unsupported` disposition. Effects on PCs, inventory custody, HP/Stress/conditions, death, ownership, consent, and secret disclosure never fall back to a generic adapter.
2. Before any action roll, describe verified applicable rule, suggested trait, Difficulty/source derivation, stakes, and owner-reviewable optional Experience/trait/modifiers. Owner alone confirms spends and optional collaboration. `narrative_no_roll` remains mutation-free unless a separate eligible native world adapter commits. No invented ability or special domain effect from a high roll/Critical.
3. After a saved Duality result, use its native outcome receipt as the **precondition**, not as generalized permission. Produce a separate exact effect receipt for each authorized material consequence, with scope/reversibility/audience/idempotency/current-state checks. When an effect is unsupported, retain the original action and a bounded review; independent siblings proceed. NPC reactions must derive from authoritative NPC agency and current world state, not a PC-owner takeover.
4. Extend authenticated human GM review carefully for legitimately missing applicability/adapter/ruling, without overriding someone else's choice, changing saved dice, paying optional costs, or retroactively granting unowned features. Historical records retain original terms. Any genuinely new mechanical subsystem is deferred and separately scoped.

**EFX acceptance:** mundane diversion and a native roll produce specific supported follow-through; failure-with-Fear advances only a valid native GM consequence; unsupported shadow scouting stays held even on natural 12+12; independent actions proceed; stale/foreign/source-revoked application rejects; original Daggerheart and PvP outcomes are unchanged.

### V96-06 — TOK01–04 (quality-first token efficiency)

- Measure paired scenarios **before** refactoring. Record calls, reported input/output/cached tokens, unknown-usage counts, retries/repair, model-stage and full-turn p50/p95, context omissions and quality rubric. Injected providers supply **synthetic** timing/counts, not paid-model latency, billable cost, or real narrative quality. Existing `V96_TOKEN_PERFORMANCE_REPORT.md` remains the labeled baseline.
- **TOK01:** deduplicate by native source identity **plus guild, actor, visibility, audience and revision**, not similar prose. Preserve conflicting evidence and source trace.
- **TOK02:** retrieval before truncation; keep relevant obscure clues, pending obligations, actual NPC motives, contradiction, current episode threads, and rule authority. Provide bounded on-demand expansion with same source scope. Query-token lexical ranking alone must not make salient information irretrievable.
- **TOK03:** stable prefix for SRD/house/authority, segregated per-campaign/owner/visibility volatile material and correct cache invalidation on changes. Record actual provider cached tokens when reported; unknown stays unknown.
- **TOK04:** right-size output ceilings after tracing mandatory complete JSON and complex multi-actor examples; never strip required receipt/claim fields, narrative continuity, or active mechanics to save tokens. Keep mixed action/recall/speech complete.

### V96-07 — TOK05–07 (request/Director efficiency)

- **TOK05:** native roll/review/consent requires **0 additional provider calls**; warranted direct ordinary GM turn normally **one combined** semantic+fiction request; optional router+GM normally **two**; no per-clause classifier or automatic postroll model call. Genuine Director/aftermath work is separately counted.
- **TOK06:** preserve bounded provider and structured repair retries, one logical turn/commit, shared deadlines, no SDK retry fan-out or after-commit re-generation; classify failures and show safe status rather than silently losing responsive turns. Never send full private prompts/payloads to metrics.
- **TOK07:** Director runs on real fictional cadence/material event triggers, not each message or per-NPC model fan-out; batch compatible world work only when privacy/authority permits. Preserve NPC agendas, Fear obligations, and world continuity.
- Compare calls/latency/usage and narrative quality before claiming savings. **No automatic downgrade** of narrative model. If a reduction increases legitimate missed responses, neutral fallback, failed schema or lore omissions, restore the previous path.

### V96-08 — integrated qualification and handoff

- Reuse the existing four-owner corpus and exact native fixtures: creative mundane diversion; unsupported feature; read-only recall; NPC speech; simultaneous independent second PC; hostile third PC requiring consent; private owner optional Experience/trait; native Duality roll; qualifying Fear consequence; native damage/death boundaries; secret versus party knowledge; supported world addition. Test both clean natural narration and adversarial paraphrase/omitted-claim variants.
- Verify all immediate, deferred, restart, read-side, outbox, voice-gated, and privacy paths; preserve protected FH40, PVP30/PVP30q, OBS21, both D08 suites, resource/Armor/death, no double spending/reroll, and published-source ancestry.
- Produce **offline** qualification first. A paid Discord/real-model staging pilot with explicit spend cap, operator approval and privacy plan remains separate; neither offline fixtures nor pass counts prove live GM quality, token billing, or latency.
- Provide phase-by-phase rollback, version/read compatibility, feature flags (default safe), deployment/pilot prerequisites, observed vs estimated performance, and known expressiveness limits.

## D. Binding Daggerheart rules contract (do not rewrite)

- Current source is Veiled City's local Daggerheart SRD **2.0**, saved campaign GM rulings, campaign overrides, RAW, applicable house/homebrew rules. Do not invent `srd:` refs or use generic adjudication to bypass a missing special-rule/capability permission. Review source-selected ruling precedence and avoid an unverified claim of universal applicable-ruling discovery.
- Declare native **Difficulty, trait, eligible modifiers and stakes before action dice**. Duality uses actual independent natural Hope/Fear d12 faces; matching natural faces yield a Critical independent of total/Difficulty; native roll results and source-bound modifiers own outcome. Proficiency must not be added as an ordinary action-roll bonus. Hope/Fear/Stress/costs exactly follow native ordinary rules; a Critical does **not** enable unsupported powers or effects.
- Preserve current Veiled City **PvP** exception: no action Hope / critical Stress benefit, immediate native Fear obligations for qualifying PvP action Fear; defender/reaction rolls do not create an additional GM Fear move. Narrative Duel/Three Strikes are non-damaging; damage PvP requires exact signed target terms, current Evasion/native attack, affected owner Armor/defense and genuine lethal risk.
- Preserve native NPC incoming attack resolution, owner defense/Armor choices, thresholds, and **vanilla Daggerheart death choices**, including owner-selected Risk It All consequences. No AI death selection or silent HP damage. No mandatory initiative/action tokens; action counts are spotlight aids only. Investigation-critical clues must not be permanently inaccessible because of one failed roll.
- No passive costs, character-sheet edits, arbitrary advantage, invented features, automatic owner reaction, fabricated dice, false NPC knowledge, or unauthorized disclosure. Owner's native choices/spends are separate from GM suggestion.

## E. Lean testing, evidence, and commit policy

| Gate | When | Required activity |
| --- | --- | --- |
| **T0** | Each independent defect or scoped edit | 1–3 direct tests; the original six SEM06 tests are **never weakened**; red-first minimal proof for genuinely missing behavior. Run changed-file syntax/static checks only as needed. |
| **T1** | Native adapter/authority crossing | 3–8 genuinely impacted suites, including affected security negatives and real commit/outbox/restart adapter; no heavyweight suite per synonym. Capture concise actual pass/fail counts. |
| **T2** | Each implementation phase ready for its **local commit** | Freeze executable/test inputs, sync manifests (`10.0.0`), run **one** complete network-denied `npm run validate` from `bot`, inspect `.reports/offline-validation.json`, zero skipped/failed/not-run mandatory suites, both D08 checks, relevant P0 protections, `git diff --check`, exact hash/manifest check. Re-run only if executable/test inputs change or prior run fails. |
| **T3** | Final V96-08 release | One integrated offline qualification. Do not re-run an identical T2 matrix merely to rename it T3; separately authorized live pilot is **not** a prerequisite. |

Historical V96-04 **137/137** and current **138 registered** are not promised future counts; calculate registry and actual status locally. The committed P0 reproduction currently reports **2/6 passing**, and that failure is the proper first gate. Keep machine-readable compact evidence, bounded reviewed failures, TEMP logs, no secrets/player prose in telemetry, no tests removed to pass. If P0 remains red, stop; do **not** run the expensive full registry merely to reconfirm a known failure.

## F. Rollback and operational restrictions

- Before any modification: inspect `git status`, real local HEAD, diffs and artifacts. Preserve any unpushed/uncommitted work; never `reset --hard`, `clean`, blind stage-all, or overwrite user's source.
- One validated **local** phase commit after each phase qualifies. Progress ledger identifies starting/ending SHA, changed paths, tests, known blockers, rubric, evidence and rollback. No push, merge, deployment, production DB, migration, Discord registration, live bot/provider/voice, credentials, or paid traffic without separately explicit authorization.
- Preserve old immutable dice/consent/PvP/receipt history on upgrade and downgrade; unfamiliar new record versions become inert/read-only pending safe migration, not silently upgraded. No blindly resent uncertain outbox or altered historical native roll.
- Deprecation removes only proven obsolete execution authority; preserve required native adapters, historical readers, source offsets, command parsing and hard P0 negatives. Changes must be demonstrably non-destructive and reversible.

## G. Initial Codex execution instruction

**Resume at local branch HEAD, not the earlier V96-04 checkpoint.** The latest published anchor is `aeffb8e`. Read the blocker, test, progress, and existing V96 plan; verify local tree independently. Start with **V96-05R OUT01–OUT06**, retaining all six SEM06 reproductions. Implement the common certified ordinary-scene output boundary **and** an expressive GM-owned fiction route in one qualified phase. Do not attempt token optimization, broad lexical retirement or new effect adapters while P0 is red. If independently safe expressive composition cannot satisfy the positive tests without accepting probabilistic risk or restricting legitimate narration severely, provide explicit evidence and stop for an owner architecture decision. Do not fabricate green results, commit an unqualified phase, or claim live performance.
