# Veiled City — Playable GM Narration Restoration
## Codex Development Plan — Source-Anchored, Lightweight Qualification

**Prepared:** October 14, 2026  
**Starting repository:** `https://github.com/KeshireTheChaotic/Veiled_City`  
**Starting branch:** `codex/session5-narrative-latency`  
**Inspected HEAD:** `120dccdd067700b3dcac7ff97e876b203420cb5b`  
**Priority:** P0 — tabletop playability  
**Execution status:** Plan only; no source changes, deployment, or billable testing performed.

## 1. Objective and diagnosis

Restore Veilkeeper as a responsive, improvisational tabletop GM. Ordinary scene questions must yield **specific, coherent, playable fiction**; movement must produce both its verified native result and a useful description of the new viewpoint; NPCs and the world must react within their authority. Do not allow AI output to author PC decisions, mechanical outcomes, secret disclosures, or unverified durable campaign facts.

The verified source contains a specific loss mechanism:

- `bot/src/pvp-output.js::prepareAuthorizedTurnOutput` overwrites generated `narration` with a join of eligible native-projected parts. Raw candidate prose goes to quarantine; when no part survives, the player gets `No additional character response has been established...`. This core behavior also exists on `main`.
- `bot/src/fresh-scene-authoring.js` receives only a generic setting token, audience, location name, and tightly eligible environment observations. It does not receive the user's question, location function, ongoing scene, recent visible events, or useful local NPC/activity context. Empty observations produce name-association prose.
- `bot/src/environment-observation.js` accepts only a five-subject closed environmental vocabulary. `bot/src/scene-description.js` requires exact, active, GM-sourced grammar-matching facts, making much existing freeform location lore ineligible.
- `bot/src/world-observation.js` emits `...visible details are not established...` when its limited selected-description facts are missing.
- `bot/src/pvp-output.js` renders a verified arrival as an administrative receipt without ensuring a destination scene is presented. `bot/src/assembly-state.js` can deliver administrative orientation without a playable opening.
- `bot/src/gm.js` still uses a large structured turn schema, correction/regeneration paths, and potentially an additional scenery writer call. The two Session 6 failure reference IDs cannot be diagnosed exactly from Discord excerpts alone.

**Do not treat passing offline contract tests as proof of engaging narration.** Session 5's 151-suite report is an offline correctness result, not a live qualitative or latency benchmark.

## 2. Immutable safety and implementation constraints

1. **PC agency:** Humans own PC speech, feelings, consent, actions, and choices. Text never establishes their voluntary choices or another PC's private disclosure.
2. **Native effects:** Movement, access, resource changes, damage, dice, commitments, custody, hazards with mechanical effect, and other consequential outcomes require existing authorized native processes/receipts; a narrative draft has no mutation authority.
3. **Privacy and perspective:** Build authoring context from an authenticated observer, actual active scene/presence, and audience-visible sources. Never send GM secrets, another PC's hidden position/hook, or unfiltered recent messages to a scene prose writer. Party and private views remain separate.
4. **PVP/protected scopes:** Preserve SEM06, FH40, PVP30/PVP30q/PVP30ag, OBS21, the existing candidate/claim checks, and publication revalidation. Do **not** globally whitelist raw `result.narration`, bypass `prepareAuthorizedTurnOutput`, or use a model-produced `safe=true` flag to authorize publication. New broad scene prose must be explicitly ineligible in protected or contested contexts unless an independently reviewed equivalent is implemented.
5. **Authority semantics:** GM-origin scene flavor may establish bounded, nonmechanical *scene-local* details (e.g. spatial layout, sound, light, smell, harmless objects) without first requiring a matching durable fact. This is **GM fiction authorship, not objective evidence certification**. Binding its source proves provenance and scope, not that a model's arbitrary semantic claims are safe.
6. **Continuity:** Once a player sees an interactable ordinary detail, reuse it consistently within the scene. Do not generate conflicting room layouts each question. A detail promoted into a clue, access rule, hazard, NPC fact, persistent location lore, or mechanical consequence must enter the appropriate native workflow.
7. **Deployment:** Feature flag default OFF; no changes to production configuration, database, permissions, Discord, or live API during implementation. No production SQLite reads are necessary for this fix. Treat Session 6 transcript as supplied incident evidence, not permission to access a live DB.

## 3. Proposed output architecture

### Three separate authority lanes

| Lane | Examples | Allowed source | Publication |
| --- | --- | --- | --- |
| **Established observations** | Current location, prior clues, verified arrival, existing visible activity | Active scene records, audience-visible facts/receipts | Exact verified projection; existing mechanisms retained |
| **GM-owned scene fiction** | Room geometry, machine sounds, lighting, incidental furnishings, sensible atmosphere | Bounded, scene-local GM authorship, constructed only from audience-safe packet and authenticated viewpoint | **New opt-in scoped fiction part**; independent native gate, version/hash/audience/scene validation; no effect mutation |
| **Consequential events** | An NPC accepts terms, a door is locked, a threat acts, a clue is discovered, PC acts/suffers | Existing world addition, NPC, mechanics, and event authorization | Existing native receipts and validated narrations only |

Keep the existing closed environmental grammar for proven facts and restrictive/protected situations. **Do not expand a five-noun whitelist indefinitely as the main creative writing interface.**

### New scene-local narration contract

Implement an explicit, versioned *proposal* (`gm_scene_fiction` or equivalent) that is not a trusted receipt by itself. It should contain:

- Authored description (one to three compact paragraphs) and optional scene-local incidental-detail candidates with stable identifiers/categories (`layout`, `sensory`, `nonmechanical_prop`, `ambient_activity`).
- References to any **already established** external claims, such as the frozen terminal, a known parcel, or documented knocking; those external claims must match active audience-visible source IDs.
- Location, scene and audience **not supplied as authority by the model**; native code binds those to the authenticated owner/viewpoint and revalidates them at publication.
- An optional player-facing investigative cue only if it is existing evidence or is separately accepted as a GM-owned nonmechanical scene-local observation. Nothing may assert its supernatural explanation as truth without an authoritative event.

Use an independent native gate that verifies source identity, active source ancestry, location/presence, roster/control revision, character-safe disclosure scope, exact draft hash, and allowed fiction categories. Exclude direct PC-character actions, forced mental/emotional states, dialogue attributed to protected actors, hidden identities, unapproved mechanics, new bindings/obligations, and claims of access/status/possession. Existing tripwires (`hasPcReference`, `materialParaphrases`, candidate-claim review) are useful **defense in depth**, not a formal proof for unrestricted prose. If a candidate is ambiguous, hold only that candidate and emit any independent authorized native output; never elevate a rejected clause merely by removing its annotations.

A scene-local detail becomes an authenticated fictional observation **when the new native scene-authoring event is committed**, not because its language looks atmospheric. Store scene-local details with source revision and a lifetime no longer than their scene, avoid unrelated global canon mutation, and revalidate queued delivery/recap against source revocation. Never reproduce quarantined original drafts through the new lane.

## 4. Implementation sequence

### Phase 0 — Contract and small red fixtures (P0)

**Touch:** new `docs/PLAYABLE_NARRATION_CONTRACT.md`, `bot/scripts/playable-narration-test.mjs` and a small synthetic fixture; avoid broad refactors.

- Capture six Session 6-style prompts: `Set the scene`, `What does the laundromat look like inside?`, `What else is going on currently?`, `I head inside Twenty-Four Spin`, `What does it look like inside?`, `I examine the frozen terminal`.
- Provide a sparse-location fixture with no preexisting `scene_observation` grammar facts; a separate fixture with prior terminal/parcel/knocking established; and one with deliberately conflicting private facts.
- Add red tests for authored scene detail surviving native preparation and publication, sensible context in the writer packet, arrival + destination narration, repeat-view consistency, and protected/private suppression.
- Keep tests deterministic with a fake model response (no online LLM or subjective judge). Use a short, explicitly identified expected narrative fixture, not exact prose snapshots for every sentence.

**Exit:** At least one failing fixture reproduces the current empty-facts/neutral fallback and another confirms the missing context. Test failures must be attributable, not noisy.

### Phase 1 — Audience-scoped scene packet (P0)

**Likely touch:** `bot/src/fresh-scene-authoring.js`, `bot/src/scene-description.js`; add `bot/src/scene-fiction-context.js` if necessary.

- Build one validated packet with the **actual player observation request**, canonical display name and place type, confirmed current location/interior/exterior viewpoint, local established layout, player-visible recent scene beats, relevant visible NPC/activity summaries, known open leads, and existing scene-local details. Represent unknowns as unknown; do not infer other PC positions from roster/check-in.
- Separate `audience_safe_context` from GM-only planning. Include no raw player sheets, GM secrets, other players' private hooks, or cross-audience transcript excerpts.
- Permit the writer to produce vivid sensory and spatial descriptions and nonmechanical local activity. Any *new* NPC utterance or consequential event must take its own native path.
- If there is no prior description, let the GM **create bounded scene-local mundane detail**. Do not fail merely because eligible preexisting environmental facts are empty.

**Exit:** The isolated fake writer receives enough scoped context to distinguish an interior laundromat from a street, and public/private packet isolation tests pass.

### Phase 2 — Native scene-fiction authorization and publication (P0)

**Likely touch:** new `bot/src/scene-fiction-authority.js`, `bot/src/pvp-output.js`, `bot/src/gm-fiction-schema.js`, existing outbox/recap revalidation only as needed.

- Add `gm_scene_fiction` as an actual native-preparable output part. Verify a nonmechanical category plus current scene, audience and source closure, not just a model classification. Persist provenance, stable scene-local incidental details, and exact payload hash.
- Compose a response from eligible established observations, scene-local authored fiction, and independent native receipts. Never overwrite a good authorized scene part with neutral fallback or an insufficient-details duplicate. Deduplicate repeated situation/observation boilerplate.
- If an individual scene-fiction part is held, keep independent approved parts; issue a GM-visible structured diagnostic and an appropriate actionable player-facing error **rather than pretending a neutral acknowledgment answered a scene question**.
- Revalidate every queued part on delivery and recap; revocation or scene/principal change holds it, without rerunning effects. Protected PvP still follows the strict existing policy.

**Exit:** A contextual fake-produced laundromat description reaches Discord outbox; quarantine still blocks secret, PC-choice, status, damage, access, obligation, and cross-owner examples. Existing receipts remain exactly once.

### Phase 3 — Narrative lifecycle: entry, situation, assembly (P1)

**Likely touch:** `bot/src/scene-entry.js`, `bot/src/scene-setup.js`, `bot/src/assembly-state.js`, `bot/src/assembly-publications.js`, `bot/src/pvp-output.js`, and minimal orchestration in `bot/src/index.js`.

- For successful owner-authorized entry: preserve the exact native arrival receipt **and** request one perspective-correct destination description in the same logical turn. If no new scene should be created, do not invent one.
- For `describe_scene` respond with place geometry/sensory detail; for `current_situation` describe established current activity and unresolved cues; distinguish those operations, rather than producing interchangeable atmospheric fluff.
- Assembly should publish a playable GM-owned opening with scene context, while delivering private individual hooks only to their owners. Do not re-send parts marked delivered or uncertain; retain `/vc-session assemble` idempotency. Check-in itself still cannot imply fictional co-location, trust, dialogue or cooperation.
- Ordinary scene observations should never require an unrelated `/vc` administrative command or a human GM to create a trivial room description.

**Exit:** The full synthetic Session 6 sequence produces coherent scene continuity, without assigning PC actions or crossing private visibility.

### Phase 4 — Latency and provider cost (P1, after quality)

**Likely touch:** `bot/src/gm.js`, `bot/src/index.js`, `bot/src/turn-latency.js`, `bot/src/generation-feedback.js`.

- Preserve the existing typed intent and consequential-action path. For **unambiguously read-only** scene-description requests, evaluate a direct, single-call, scene-scoped narrative path *only if it shares the exact capture/authentication/outbox/idempotency gates*. Do not create lexical shortcuts for movement or action adjudication.
- Target **one generation request for simple observational turns**; avoid the current full GM turn followed by a second scenery writer where possible. Preserve the full structured turn for actions requiring world consequences.
- Do not add auto-retry loops or a second evaluator LLM. Allow at most one bounded structured repair on malformed provider output, only when it is cheaper/safer than a controlled hold. Keep existing deadlines and truthful progress behavior.
- Use existing metrics to record route chosen, model calls, output authoring/projection holds, empty-answer incidence, initial substantive publication, and known usage. Never log raw player text or secrets. Avoid arbitrary model switching until direct quality evidence warrants it.

**Exit:** Synthetic tests establish the direct observation path uses one provider call and does not use more calls than before; report latency stages, without claiming a live SLA.

### Phase 5 — Playability acceptance, canary protocol and handoff (P1)

- Add a lightweight deterministic *usable-response* checker for fixture scenarios. For an open scene description: correct location/perspective, at least two **specific** physical/sensory details, no administrative-only language, and no invented PC actions. For an ongoing-situation response: at least one grounded current activity/cue or an honest, in-world explanation that there is no further established activity. Do not game acceptance by forcing arbitrary word counts or canned nouns.
- Require repeat descriptions not to contradict scene-local established details. Require relevant prior knocking/terminal/parcel cues to survive when those are current and visible, while hidden PC origins/faction hooks remain absent.
- Provide a short opt-in staging/canary checklist with user authorization required for any billable models or Discord calls. Keep production data and state untouched during offline implementation.
- Record exact tests actually run, elapsed time, pass/fail, known quality limitations, and whether a live canary occurred. Never label offline fake-model results as live quality proof.

**Exit:** Complete the fixture sequence with substantive, source-safe narrative and publish a short operational handoff with flags/rollback.

## 5. Strict lightweight testing policy (Codex usage conservation)

**Primary optimization is Codex context and iteration cost, not weakening critical safety validation.** No external API calls, model-graded tests, or live server launches during development. The repository's `npm run validate` is an **offline** ~151-suite run that previously took about 465 seconds; it does not itself use billable OpenAI tokens but is expensive to run repeatedly and to interpret.

| Cadence | Execute | Budget |
| --- | --- | --- |
| On each substantive edit | New targeted fixture file only | Prefer 6–15 scenarios in one file; fake provider; seconds, not minutes |
| At end of each phase | Changed-area tests only | One targeted command; avoid repeated full suites |
| Before a protected-output refactor is considered complete | Targeted existing security tests | Run `narrative-contract`, `session5-narrative`, `v9-pvp-authorship`, `v95-protected-narrative`, plus new negative fixtures **once per relevant high-risk change batch** |
| At final integration / CI | `npm run check` and **one** `npm run validate` | Run once only after implementation settles; prefer CI for 151 suites |
| Live quality comparison | No default run | Separate explicit approval for a very small canary (at most 6 scripted turns), only after offline pass |

Example commands (run from `bot/`):

```bash
node --import ./scripts/offline-guard.mjs --test scripts/playable-narration-test.mjs

node --import ./scripts/offline-guard.mjs --test \
  scripts/narrative-contract-test.mjs \
  scripts/session5-narrative-test.mjs \
  scripts/v9-pvp-authorship-test.mjs \
  scripts/v95-protected-narrative-test.mjs

npm run check
# CI or final integration only, not after every patch:
npm run validate
```

Rules for Codex:

- Read only identified entrypoints and directly related dependencies; do not load the whole 10.0.0 repository, entire 358KB typed-intent progress report, or every test just to begin.
- Limit repeated source searches, verbosity, and massive terminal dumps. Prefer focused diffs, line ranges, and a one-page phase checkpoint. Do not run every historical benchmark.
- No autonomous paid LLM comparisons, no hidden live A/B tests, no production database queries or backups, and no upgrade solely for SDK novelty.
- Do not eliminate any existing security assertion to make narrative tests pass. If a new safe-prose pathway is blocked by a genuine invariant, document and isolate the exact conflict rather than using a blanket bypass.
- Defer manifest/sync-release chores to the final integrated tree according to repo rules; do not perform them after every file edit.
- Treat a qualitatively empty scene response as an actual test failure, even if its source/projection was valid.

## 6. Acceptance matrix (minimum)

| Case | Must succeed | Must never happen |
| --- | --- | --- |
| Sparse laundromat, no prewritten grammar facts | Establish coherent interior with at least two specific playable details | Name-based wordplay, `insufficient details`, neutral acknowledgment |
| Laundromat with prior terminal/parcel/knocking | Respect established cues and location | Reveal secret explanations or invent PC knowledge |
| Tyrell enters | Native arrival exactly once; immediate destination description | Implicit consent, invented roll/success, duplicated movement |
| Follow-up scene inquiry | Repeat consistent layout and answer new focus | Contradict previous details; treat same room as unseen |
| `What else is going on?` | Observable current activity or genuinely quiet in-world reply | Policy/administrative message alone |
| Two distinct PC viewpoints | Audience-scoped, independently useful answers | Leak hidden party member locations/hooks |
| Protected PvP and secret fact attempts | Hold only inadmissible prose; retain independent safe receipts | Raw prose laundering, damage/status/consent or disclosure claim |
| Assembly resume/restart | One opening and correctly scoped hooks, idempotent delivery | Duplicate uncertain messages; force party formation |
| Retries/restart/source revocation | No double mechanical effects; stale scene output held | Backdoor replay of quarantined drafts |

**Quality outcome required:** A live player should be able to ask what a place looks like and decide what to investigate without invoking GM admin commands or encountering implementation disclaimers. Player-safe narration must be expressive **and** operationally reliable.

## 7. Deliverables and definition of done

- Source changes isolated on a new feature branch forked from the verified Session 5 branch; stop if remote HEAD has moved and reconcile before editing.
- A versioned scene-fiction contract, scoped context builder, native authoring/validation/publishing path, scene-local continuity, and entry/assembly integration.
- One compact synthetic playable-narration fixture plus targeted privacy/authority regression coverage; no large new matrix of duplicated tests.
- A feature flag default OFF and an explicit opt-in/rollback procedure preserving existing receipts, deliveries, and campaign history.
- A short evidence report stating: exact base/head SHAs, changed files, changed-area tests, final CI result if run, tests **not** run, runtime flags, residual safety/quality risks, model request counts in fixtures, and whether any live/billable call happened.

**Do not declare completion** if the strict output projector still discards the new narrative, if the sparse-location fixture still returns a non-answer, if player agency/privacy gates weaken, or if the only passing proof is fabricated/seeded exact environmental grammar.

## 8. Codex kickoff (paste directly)

> Work in `KeshireTheChaotic/Veiled_City`, starting at `codex/session5-narrative-latency` HEAD `120dccdd067700b3dcac7ff97e876b203420cb5b` unless it has advanced. Read this plan before changes. Create a new feature branch. Implement Phases 0–5, preserving native PC/mechanical/disclosure/PvP authority. Restore expressive GM-authored, scene-local narration for regular scenes; do not simply publish raw narration or rely on a model-declared safety flag. Make an empty-facts laundromat question produce a specific usable interior description, and make successful scene entry render the destination. Keep new behavior behind an OFF-by-default flag. Be frugal with Codex usage: inspect only relevant files, write one deterministic fake-provider acceptance suite, run focused tests while developing, run impacted security tests once per risky batch, and defer the single full offline suite to final CI/integration. Never run paid OpenAI calls, touch production SQLite, start Discord, deploy, or alter runtime configuration. Report completed phases, residual gaps, test counts, base/head SHAs, and rollback procedure.
