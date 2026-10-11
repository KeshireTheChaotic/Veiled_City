# Source audit and defect register — v9.1 narrative PvP amendment

**Pinned head:** `26e4d6e8f0c3335a250e81952ac9c092c38450b2`

**Evidence standard:** "Confirmed" means demonstrably present in inspected source, or explicitly reproduced in the project's documented validation. "Integration gap" means a downstream production consumer is not found among inspected production paths; Codex must perform a whole-repository symbol search at its current head. "Risk/test required" means a plausible failure deserving a red-first test, not yet a demonstrated defect.

## New design amendment: PvP is deliberately narrative (user-chosen rules)

The new `V9_NARRATIVE_PVP_CONTRACT.md` specifies a **house-rule** agreement and two modes: a higher-total single opposed Duality duel, and paired exchanges to three verified strikes. Consent to the terms must be bilateral, explicit and current. There is **no normal PvP damage**. This is a new requested feature, not a claim that the original repository implemented it or that it is Daggerheart's official combat system. See PVP01–PVP32 in the expanded matrix.

Additional source-level integration hazards to fix while implementing: `bot/src/state.js:417–429` prepares `roll_required` adjudications **before** coordinating windows; a model-generated opponent attack could therefore create a normal pending attack request before PvP consent. `bot/src/roll-requests.js:61–74` resolves `attack` using an active encounter combatant (adversary) and reviewed attack provenance, not a consented PC narrative contest. `bot/src/roll-collaboration.js:97–111` applies encounter combatant HP after damage. `bot/src/state.js:115–141` has an independently callable party-scoped `resource_delta` route for PC HP, Stress and Armor; it needs provenance-sensitive prevention of player-initiated PvP harm, without breaking legitimate NPC/GM/world-origin effects. **These are design integration risks demonstrated by code placement**, not independently executed exploit tests; Codex must reproduce failures red-first.

`scene-action-window.js` consent weakness and lack of consumer remain P0 prerequisites for safe story-first PvP. The new house rules must not be treated as a general waiver of consent or source ownership.

## Baseline and release status

- 14 commits since the prior v8 review (`2dc347a...`), now at `26e4d6e...`.
- `docs/TYPED_INTENT_PROGRESS.md`, **D08** expressly says `Status: BLOCKED; incomplete and not release-qualified`. D05 completion is reopened.
- Same ledger reports a focused test `scripts/d08-window-security-test.mjs` failing as expected: stale, foreign, retracted and unrelated consent authorizes an action; red test intentionally excluded from mandatory validation.
- `scripts/validate-offline.mjs` does not register `d08-window-security-test` or `d08-observability-test`; project reports 99/99 *registered* suites, not release success.
- Previous v8 H01–H05, D01–D04, D06–D07 are described as implemented; do not recreate their designs without determining actual residual gaps.

## Findings

| ID | Severity | Status | Source and verified behavior | Fix owner |
| --- | --- | --- | --- | --- |
| G01 | P0 / release blocker | Reproduced red in repo | `bot/src/scene-action-window.js:34-42`: `consent()` checks accepted status, subject, decision only. D08 security fixture shows stale unrelated authorization. | V9-01 |
| G02 | P0 / release blocker | Explicitly documented integration gap | `scene-action-window.js:76-111,114-144`, `state.js:428-430`: window open/join and compound suspension wired; no production lock/resolve/consent-response consumer. Progress D08 acknowledges this. | V9-02 |
| G03 | P1 | Confirmed source contract mismatch | `commands.js:1368-1369` treats `(await postPlayMessage(...)).ok` as boolean; `publishing.js:167-176` returns a Discord `Message` (or null), not `{ok:true}`. A successful post can be interpreted as failed; shared-roll receipt can remain pending and repost. | V9-05 |
| G04 | P1 | Confirmed source gap | `typed-roll-outcomes.js:29-34` returns newly ready dependency nodes; `roll-collaboration.js:293-295` discards return. Ready descendants lack an actual native execution/scheduled continuation. D06 test checks readiness, not completion. | V9-03 |
| G05 | P1 | Confirmed unsafe rule | `typed-roll-outcomes.js:14-16`: null/undefined Difficulty is a success branch. Roll requests can exist without disclosed difficulty (`roll-requests.js:35-48,89-110`), so require verified difficulty before success classification, or a separate authorized no-Difficulty terminal disposition. | V9-04 |
| G06 | P1 | Confirmed crash-window risk | `roll-requests.js:176-188` leaves `roll_publication` pending until after Discord send. A process failure after successful send permits blind duplicate on retry; unlike `assembly-delivery.js` or turn-outbox, no uncertain state. | V9-05 |
| G07 | P1 privacy | Confirmed overbroad projection | `roll-sharing.js:6-9` includes `row.data.attempt`. `roll-requests.js:89-96` takes `attempt` from complete authored source message, possibly containing other clauses or private content. Shared result is owner-approved but text disclosure is not minimized to selected intent. | V9-06 |
| G08 | P1 | Confirmed stable-key mismatch | `scene-action-window.js:18-19` keys by `[scene.key,input.key]` and returns prior even if closed, so reusing a beat key in a continuing scene cannot open a fresh window. | V9-02 |
| G09 | P1 | Confirmed incomplete publication parity | `roll-menu.js:107-125` commits Experience/roll and edits the private interaction; unlike `/vc-roll contribute` (`commands.js:1361-1369`), it does not invoke roll amendment/party-disclosure publisher after a successful native change. Related participants or notification channels may miss updates. | V9-06 |
| G10 | P2 | Confirmed null guard | `roll-requests.js:151-157` uses `session.id` without checking the active session; `/vc-roll pending` dispatch (`commands.js:1345-1350`) can enter this path without requiring an active session. | V9-07 |
| G11 | P2 | Confirmed text-limit gap | `index.js:131-136` uses a direct `message.author.send(value)` for native-route discovery rather than shared chunking/delivery. A result >2,000 UTF-16 units can fail. | V9-07 |
| G12 | P1/P2 | Risk/test required | `typed-mechanics.js:16-25` chooses the *unique* current owned pending request, rather than a request explicitly linked to the new declaration/accepted roll intent. Test attempts with multiple eligible requests and context changes; decide explicit binding UX. | V9-04 |
| G13 | P1 | Risk/test required | `scene-action-window.js:18-23` trusts a model-supplied beat key to colocate concurrent intents; test two independently authored posts about the same scarce native resource with distinct inferred beat keys. A resource collision must not silently bypass arbitration. | V9-02 |
| G14 | P1 | Risk/test required | `roll-sharing.js:16-23` has same send-then-delivered crash window as G06; integrate with shared publication outbox and uncertain recovery. | V9-05 |
| G15 | P2 UX | Risk/test required | `roll-menu.js:25-46` slices assembled menu text at 1,900 code units, potentially hiding option terms, blockers and decision context. Add pagination/summary access instead of blind truncation. | V9-06 |

## PvP-specific work ownership

| Finding | Severity | Work package |
| --- | --- | --- |
| PVP-G01: no shared, mutually accepted best/worst stakes, prohibitions, withdrawal, ownership or mode contract | P0 (feature gap) | V9-PVP-A |
| PVP-G02: missing distinct two-party narrative duel and three-strikes resolution; no paired/sealed roll/outcome receipts | P0 (feature gap) | V9-PVP-B |
| PVP-G03: current normal roll-request adjudication precedes scene coordination, risking premature adversary-style attack request | P0 (integration risk; test required) | V9-PVP-B |
| PVP-G04: standard adversary damage and party-scoped PC `resource_delta` must not become an unconsented PvP fallback | P0 (integration risk; test required) | V9-PVP-B |
| PVP-G05: no native winner-authored success/loser-authored reaction or bounded environment complication and audience approvals | P1 (feature gap) | V9-PVP-B, V9-06 |

## What should remain intact

- Current source-span authenticity, independent-intent quarantine, pending referent clarification, deterministic post-turn review, exact output-claim checks and existing Discord chunking.
- Rule catalog provenance, native roll receipts and Daggerheart duality/critical semantics.
- Private-by-default modifiers, experiences, Help and Tag Team consent, owner-authored spend decisions, version-checked roll interaction tokens.
- Scoped memory boundaries, actor/principal/source/session/scene revision checks, transactional roll persistence, no fabricated successes.
- Existing outbox delivery semantics for authored GM turns and assembly; extend rather than introduce a second incompatible scheduler.

## Limitations

Only static connector file inspection was performed in this audit. Confirmed code-path mismatches should be demonstrated red-first against a local checkout before patching. Production-scale concurrency, Discord outage behavior, actual model variability, migrations, and API economics were not directly measured. GitHub may advance: Codex MUST re-pin the head and reconcile this report with any new commits before work.
