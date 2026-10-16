# Veiled City — Audience-First Narrative Authority v9

**Codex execution plan and architectural replacement contract — 2026-10-15**

Baseline: `KeshireTheChaotic/Veiled_City` branch `codex/semantic-language-robustness`, HEAD `6de758c95f94fa5895f9d14bc05970922b050b44`, application 10.2.0 / schema 460. The default `main` is not the same source baseline. Reconcile actual branch/dirty state before work. **Proposed branch:** `codex/audience-first-narrative-v9`.

**Owner direction:** Implement the v9 framework **first**, minimize early testing, then replace the production narrative authority/composition path. Purge genuinely obsolete code, implementation plans, audits and gap documents progressively with a verified consumer/evidence crosswalk; do not accumulate dead code. Mechanical output **and mechanical input** for player-requested rolls are first-class boundaries. Do not merge, deploy, restart, modify production data/flags, or run billable model tests.

**Status:** This handoff includes a standalone initial code scaffold and nine unit tests, but is **not an integrated or qualified v9 runtime**. A branch creation request through the connected GitHub app returned `403 Resource not accessible by integration`; the packaged PowerShell kickoff is for Codex/local execution. Do not describe the GitHub branch or commits as created until Codex actually does so.

## Local execution amendments (owner, 2026-10-15)

- Actual starting local HEAD: `09ee30f42ed275a1effc6891e052d6b2eaaac803`, preserving the completed correctness/native extraction fixes after the package baseline. The original starter ZIP remains untouched and untracked; extraction is outside the worktree. The exact-baseline script was not run.
- New branch: `codex/audience-first-narrative-v9`. Application revision resets to `0.0.0.1` as requested. This is a private four-part application revision, not publishable npm SemVer. Schema remains 460 until an explicitly qualified schema change.
- Owner subsequently specifies a **fresh production database**: historical v1–v8 format compatibility is no longer an acceptance obligation. This overrides historical-retention requirements below, not current native outcome/receipt recovery, agency, consent, privacy, mechanical assertions or exactly-once delivery. Existing production data is not accessed or modified. Unknown active consumers still require inspection before removal.
- F0 stays inert: no production import, flag, provider call or runtime cutover. Passing scaffold tests are not integrated v9 qualification.

## 1. Hard ownership and information-flow rules

* The native engine chooses **who the GM may address**: `channel`, `player` (direct address, party publication), `player_private` (exact owner-authorized recipient, private publication), `gm_internal` (backend only; never Discord). Neither a generated label nor an unverified model guess can mint or upgrade a recipient.
* Addressing a PC allows second-person observation, physical circumstances and direct NPC dialogue. It does **not** grant authority to choose the PC's actions, emotions, consent, inventory, HP, location or resource expenditure. Mechanics remain native and receipt-driven.
* The GM creatively owns scene atmosphere, ordinary nonmechanical props, NPC speech, attempted NPC actions and disclosed world fiction. Generated text does not by itself create permanent canon, a clue, a secret disclosure, a player commitment or a roll result.
* A secret may be passed to the private writer only after native recipient/source entitlement. **Filter at context construction and again at outbox rendering**; do not send party-scoped prompts containing hidden character information and hope a private-output tag will contain it.
* NPC knowledge (actor knows) and listener entitlement (this recipient may hear) are separate authorizations. A legitimately heard GM-private utterance is not automatically publicly disclosable; imported seed files are not native source receipts.
* An authorized camera does not imply any PC placement, witnessing or perspective. Scope local NPC speech to current authorized viewpoint/communication route; source-bound remote cutaways only by explicit native proof.
* Owner-authorized mechanical requests and native receipts, not creative writing, establish mechanical intent/outcome. Maintain exact source offsets, current principal/scene/revision, pending-request identities, Hope/Fear dice, natural matching criticals, modifiers, difficulty proofs, Fear obligations, damage/death, PvP/consent, replay and source/audience history.

**Governing invariant:** Human declarations own intent; accepted typed inputs are canonical adjudication inputs; native adjudication and saved receipts own outcomes. Narrative text never acts as a mechanical execution API.

## 2. Architecture and interfaces

The AI may ask **"Who am I addressing?"** as an expressive framing question, but the answer is a native-scoped capability assembled before generation. No broad `safe=true` or `answered=true` fields are trusted.

```text
Authenticated Discord/command input
       |
       +--> Scoped semantic interpretation (existing router or combined GM call)
       |       |
       |       +--> Mechanical INPUT: player requests/adjudicates/submits a roll
       |       |         -> accepted typed source -> native request/selection/consent
       |       |         -> Dice ONLY in existing authoritative commit service
       |       |
       |       +--> Narrative task obligations (source/task/target/audience)
       |
       +--> Native snapshot and audience grant (channel / player / private / GM only)
                       |
              Scoped creative writer (reuse existing single writer call)
                       |
                 Narrative Acts v9
               [GM scenery / NPC utterance / perception / artifact]
                       |
               Native act verifier / per-act quarantine
                       |
       +--> Native mechanical OUTPUT from saved result/receipt proof
                       |
             Task-based answer arbitration and final composer
                       |
          Existing verified publication outbox + deferred revalidation
```

### Audience / address types

| Address | Publication | Permitted narrative frame | Enforced boundary |
|---|---|---|---|
| `channel` | Party channel | General descriptive world and NPC action/speech | Scene locality, disclosure, no invented PC consequences |
| `player` | Party channel | Address a verified PC directly, including perception | Owner/character/viewpoint; no chosen PC action or secret bleed |
| `player_private` | Exact recipient's private delivery | Entitled character-only perception, clue or NPC communication | Owner assignment, visibility, private source/context and recipient recheck |
| `gm_internal` | No external message | Planning, goals, undisclosed NPC motivations | Internal write/read only; never direct output or public archive |

One turn may have separate scoped outputs. Do not combine private and party source contexts in a single unrestricted prose payload. Use the already existing audience-isolated generation path or only an additional writer request when truly necessary; measure and justify any added request instead of adding one by default.

### Narrative Acts v9

Current scaffold: `bot/src/audience-first-capability.js`, `bot/src/narrative-acts-v9.js`, `bot/src/narrative-tasks-v9.js`, `bot/src/mechanical-boundary-v9.js`. They are **unwired adapters** and must remain inert until each production verifier is implemented. The native-issued audience grant is opaque; a model cannot construct it with JSON. Native verified act proof is required for publication. V9 acts are proposals; `kind`, speaker role, recipient and free text do **not** individually prove safety.

Suggested creative roles: `scene_description`, `player_perception`, `npc_speech`, `npc_offer`, `npc_allegation`, `artifact_text`, `gm_internal_note`. These represent **non-effect fiction** only. Authoritative outcomes use mechanical output projections. Keep existing v8 drafts, hashes and readers untouched; v9 is an additive producer contract with its own normalized task/part proof, never an in-place mutation of past rows.

Task keys must bind source span or native task, target, operation, scope and recipient. The native task ledger records `answered`, `unavailable`, `needs_clarification`, `held`, or `pending` based on **actual verified output**, not a writer-declared completion flag. Partial turns are not falsely complete.

### Mechanical INPUT (new first-class pathway)

Distinguish:

1. **Ask/offer a roll**: "Can I roll Instinct to search the room?" is a source-authenticated proposal requiring native adjudication (possibly trait, difficulty, stakes, or a refusal); no dice yet. Native GM may also offer/request a roll, but the input remains an exact player-owner authorization for any submission.
2. **Submit an exact pending roll**: "I roll this request" must match the current, owner-entitled saved request/revision or its accepted typed declaration. No arbitrary first-pending selection or inferred target. If ambiguous, return `needs_selection` and keep all requests/resources intact.
3. **Resolve and save**: existing `typed-mechanics.js`, `roll-requests.js`, `roll-collaboration.js`, `action-consent.js`, `typed-roll-proof.js`, and existing PvP/damage/roll-option services remain the only executors. Roll modifiers, Hope/Fear faces, natural double criticals, Hope/Fear obligations, costs, initiative and damage are native. Never sample dice in a narrative module.
4. **Mechanical OUTPUT**: verified request/result/receipt renders player-facing numbers and effects, with exact audience. An old saved roll's source may predate the present question; authorize via native ancestry, rather than demanding identical event IDs for result and current query.

A `mechanical_input` projection is **not** evidence that a roll executed (`executed:false`); a `mechanical_output` can only be minted by a native verifier. Both may accompany narrative acts in one turn. Do not use a writer response to fabricate a roll or a difficulty.

### Trust-boundary clarification

Public descriptive narration should not suffer irrelevant phrase/alias/second-person holds. This is **not** an exemption for arbitrary model output: a false statement like "Raven surrendered" still violates agency even without a DB mutation. Replace whole-turn lexicographic scans with trusted surface/actor/subject capabilities and independently grounded part checks, retaining conservative holds for unstructured consequential claims. No model safety judge.

## 3. Phased Codex execution — framework first, then remove obsolete material

**F0 — STARTER (provided; apply locally).** Preflight exact HEAD/dirty state and optional variants. Create branch. Introduce the four standalone code modules, this plan, one small contract test. Run Node syntax and only the nine structural tests, plus project `npm run check`. No production import or feature flag yet. After an explicit cross-reference scan, remove obsolete **plan/audit/gap** documents that are superseded and not required by current runtime, validation, operator procedures, or evidence; history stays in Git. Sync the normalized manifest and make one atomic kickoff commit. **Do not run full offline validate at F0.**

**F1 — Native audience capability wiring.** Implement native `authorize` against current owner/session/principal revision, location/zone/presence, source hashes, channel/recipient surfaces, actual private disclosure and GM-only context. Fix N01 remote NPC locality and N11 private label before relaxing text. Test stale/revoked source, changed recipient/owner, public/private separation and authorized remote communication/camera. Preserve existing outbox and archive revalidation. No provider calls added.

**F2 — Mechanical input and output adapters.** Map accepted typed `roll` (request versus immediate exact selection), owner and pending native requests into v9 `mechanical_input`; native execution remains in current authoritative services. Map saved, verified roll/damage/consequence results to `mechanical_output`; preserve player-only privacy, Daggerheart Hope/Fear, all cost and consent prerequisites, zero PvP Hope where applicable, no rerolls and idempotent publication. Test owner-correct request, private requests, ambiguous/wrong request, replay, bluff/model-spoofed result, basic success/critical and Fear. Avoid inventing new roll semantics.

**F3 — Narrative Acts v9 scoped writer and compiler.** Add v9 producer schema and isolated writer packet using the existing writer call. Bind each act to native task/source/speaker, audience and current scene. Fix N02 NPC legitimate recall/seed trust, N07 unique visible role/focus target and N10 camera anchor. Native actor-knowledge vs audience disclosure gates; no general GM-private visibility promotion. Introduce role-specific expressiveness for scenery, entitled physical perception, NPC offers/allegations and signage, but block protected PC outcome assertions without native receipts. A held act does not erase a verified sibling; don't waive text checks merely from `kind` labels. Preserve v8 readers/compatibility until cutover.

**F4 — Commit-state / narrative separation and task completion.** Preserve legitimate native commit even if a disconnected creative part is held, provided all native/global validations actually passed. Native movement updates zone, then narrates an immutable post-commit staged/snapshot viewpoint without long SQLite write lock. Task ledger checks each NPC question and subject independently; N03 NPC observation reconciliation, N08 per-question coverage, N09 certified artifact + independent arrival; same-turn observation unknown suppression only for exact answered target/task. Historic Twenty-Four Spin triad is mandatory acceptance (scene description, entry+interior, "What is the inside like?"); historical arrival-only original cause remains unknown without its records. Restart/outbox/recipient proof is authoritative; no repeated side effects.

**F5 — Qualify expressiveness, privacy and latency.** N04 tea offer vs forced acceptance, N05 Rain weather vs protected PC action, N06 sensory `you hear...` vs presumed decision/emotion. Keep DQ04 forced surrender, PVP30/q/ag, SEM06, FH40, OBS21, D08, roll/cost/death, source revocation and secret disclosures. Measure first substantive delivery, progress notices ("Veilkeeper is still processing"), writer holds, task completeness, and provider request counts. No weaker model switch or second semantic judge by default; only choose a model based on measured real traces outside billable automated tests.

**F6 — Incremental producer and document purge.** Once v9 path proves parity, stop v8/current legacy planning *production* only where verified, while preserving exact versioned **readers**, historical drafts, delivery/archival proofs and flag-off compatibility. Per-function reachability and retained-assertion crosswalk before deleting freeform `roll-language`, `consent-language`, `continuity-routing`, `scene-entry`, obsolete generation helpers, lexical `player-language` producers, and five-field authored-candidate production. Extract active native `reviewRollDeclaration`, consent offers, discovery delivery proof, entry review/policy, source hashing BEFORE deleting whole modules. V4 `native_outcome` is **current**; never delete based on version number. Keep one-call literal observation fast lane until measured call-budget parity or separate owner approval.

Prune superseded `CODEX_*PLAN`, `*AUDIT`, `*GAP*`, `*KICKOFF`, and handoff documents in reviewed batches after reference scan and summarizing unique surviving constraints here or the live release contract. **Keep** mandatory assertion evidence JSON, durable release/qualification ledgers, current deployment/runbook/privacy/command docs, production operator instructions and machine-read historical formats. Git history is the archive of deleted planning prose; do not rewrite saved game records. Reconcile `docs/README.md`, root README, `MANIFEST.txt` and `manifest.json` when deleting. If a name is still referenced by tests or operators, migrate that reference first or retain the file.

**F7 — Final offline qualification and handoff.** One full mandatory `npm run validate` only after freezing executable/test tree (repeat after failures/real code changes, not results-only docs). Node check, release manifest, `git diff --check`, security/private/roll/PvP/consent/uncertain-outbox assertions, and relevant targeted original tests. Preserve all **39 optional matrices**; run them only where changes warrant. Report exact source SHA, removed/retained/deferred symbols, file deletion ledger, baseline/call delta, any semantic holds, code rollback. Push if authorized as normal source branch, CI if pushed; do not infer merge/deploy/restart/live-test permission.

## 4. Lean verification budget

* F0: **nine tiny contract tests** (already locally executed 9/9); plus syntax/check. These show only that the framework's boundaries fail closed. No complete registry, paid calls, Discord, or SQLite fixtures needed for the inert scaffold.
* F1–F6: one compact table-driven integration suite, target ~24–32 meaningful cases covering independent axes. Run **only** directly impacted originals (e.g. DQ04/SEM06/PVP30 or roll-request tests) after a risky change. Do not generate duplicated giant test matrices, and never delete/relax a negative assertion to achieve green.
* F7: **one** final full offline mandatory qualification (baseline 122 suites / 26 acceptance entries; expected count may increase) and release/manifest checks. Zero provider calls in automated tests. No unconditional extra model round-trips.

## 5. Explicit decision and stop conditions

* Scope **a**: A channel description may portray visible world/NPC fiction with less lexical rejection, but may not falsely assert a PC commitment, location, damage or secret. If safe part isolation isn't proven, hold that specific part, keep unrelated receipts, report degraded task coverage; never silently fail all narration.
* Scope **b**: A private recipient is selected **before** creative generation by the native authorization service, not by prose mentioning a name or a writer's private label.
* Scope **c**: A player roll request is a native mechanical input. Need adjudication, exact selection and saved dice outcome separate. Never reroll or spend before accepted owner input and authoritative commit.
* Scope **d**: `gm_internal` is a read/write planning context only for authenticated GM backend services and is never a Discord message; may not itself authorize mechanics/disclosure.
* Stop irreversible retirement when evidence cannot prove reader/flag-off/migration parity, negative security cases regress, unresolved imports exist, a stale DB restore would be required, or a generated role label would replace a native proof. Keeping a compatibility reader is a valid final result.

## 6. Source audit provenance, not implementation evidence

Upstream S0–S6 `6de758c`: 122/122 full offline, 24/24 compact, 39 optional preserved, no extra provider calls; repair of PC-surrender bug remains mandatory. Uploaded gap audit identifies N01–N15; these are **not** already fixed by this framework. Earlier Twenty-Four Spin live transcript included conflicting scene text, arrival-only output and contextual-inside fallback; no turn-specific historical authoring cause was established. Existing 10.2.0 native release/ledger and security contracts remain authoritative until v9 qualifies. This plan supersedes prior implementation proposals, **not** existing evidence or runtime compatibility.
