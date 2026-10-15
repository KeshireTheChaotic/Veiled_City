# Veiled City — Delegation Quality, Creative Briefs, and Scalable Delegation Permissions

**Codex implementation plan and acceptance contract**  
**Prepared:** 2026-10-15  
**Repository:** `KeshireTheChaotic/Veiled_City`  
**Verified implementation foundation:** `codex/narrative-authority-emergence` at `a74e73a4242177a29ad6473ed1b3cf92c1ec8735` (reported installed 10.1.0)  
**Proposed feature branch:** `codex/delegation-narrative-quality`  
**Target release:** `10.2.0` per the existing release-version policy, subject to verifying current HEAD/version.  
**Authority:** Prior user authorization permits qualified production installation and necessary production database access **with verified backups**. Never impersonate a GM or silently activate flags/start an intentionally stopped service.  

## 0. Executive instructions

Implement—not merely propose—the improvements below. Make a coherent commit after each phase, record exact commits and test evidence, push the branch, and continue through qualified production **code installation** without intermediate approval when all safety and access prerequisites are satisfied. The user prioritizes meaningful, distinctive, responsive GM fiction without weakening player agency, mechanical receipts, privacy, protected identities, or human-controlled NPC proxies. Make lean, fake-provider, network-denied testing the development default. Use Codex subscription usage if useful, but **zero paid model API tokens for automated/online tests**. Do not silently invoke the bot's API-backed models to smoke-test. Preserve the existing 10.1.0 record and rollback path.

**Do not conflate the two kinds of delegation**:
1. **Creative GM task delegation**: routing to the version-8 isolated narrative writer; improve this throughout Phases 2–5.
2. **Governed AI-intent operation delegation**: GM-defined `allow`/`private_allow` lists in `bot/src/ai-intents.js`; fix the real **40-item array cap** in Phase 1 without removing mechanical governance.

### Source-verified findings

- `bot/src/ai-intents.js` `configureDelegation` explicitly rejects `input.allow.length>40` and `input.private_allow.length>40`. `bot/src/ai-intent-contracts.js` currently defines **41 distinct feature-operation permissions** after deduplicating `intentOperations(feature)`. A complete catalog cannot be assigned using the current `allow` validator.
- `/vc-story delegation` is a **single required JSON string** defined in `bot/src/command-definitions.js`, routed by `bot/src/story-commands.js` to `configureDelegation`. Discord slash-option limits are **not** the 40-item cause. The JSON object is bounded by `cityObject` at 32,000 serialized characters.
- `configureDelegation` also constrains `max_operations` to 1–4, `max_cost` to 0–20 and `routine_delegated` expiry; `dispatchAiIntents` permits at most four intents per opportunity. **Retain these separate execution limits.** A grant does not override per-operation impact/review gates, native feature flags, consent, PC/proxy control, or security checks.
- `bot/src/gm.js` combined turns select `routineGmModel || gmModel` and pass `req.model` to `generateNarrative`. The direct read-only observation writer instead defaults to `gmModel`. Thus the creative writer's model changes according to how a request reaches it.
- `gm.js` currently relies on version-8 requests in `gm_world_parts` except selected movement and legacy NPC cases. `bot/src/narrative-authority-context.js` supplies nearby NPC name/key/role/human-control, but not a full speaker-voice/goal/relationship brief. A Director continuation gets a generic prompt instead of a narrowly sourced dramatic-event brief.
- `bot/src/narrative-authority.js` checks protected PC names in narrative-unit text (`mentions` / `materialParaphrases`) and can reject innocent *NPC vocatives* such as “Mr. Mercer, ...”. The risk of model-chosen PC actions remains real; replace blanket name veto only in clearly typed, proof-bound contexts.
- `bot/src/narrative-completeness.js` is a useful **typed coverage** check, not prose quality evaluation. Publication-bound establishment and audience acknowledgment, salience, PVP protections, native receipts and the single conditional creative writer budget exist in 10.1.0; reuse them.

## 1. Nonnegotiable contracts

1. Human-authored PC intent, speech, consent and voluntary actions remain owned by the relevant human. Human-controlled NPC proxies retain exactly their authorized control. No model safe flag, narrative unit, invented name, or prompt instruction can grant mechanics or knowledge.
2. Native mechanics/receipts remain authoritative for dice, resources, damage, encounters, movement/access, commitments, inventory, custody, death, and irreversible effects.
3. New GM world fiction may be creatively invented **inside existing audience/source/provenance safeguards**; rumors and beliefs remain epistemically labeled. Camera framing never establishes PC location/witnessing.
4. Maintain model-output isolation: the combined planner may request but cannot directly publish or mint native receipts; the isolated creative writer produces typed independently reviewable units; native revalidation, common outbox and acknowledged-delivery memory remain the publication boundary.
5. Single conditional isolated writer per logical turn, not one provider call per NPC, objective, or unit. Do not add a model judge/evaluator or unconditional correction loop. Keep direct read-only observation one writer/zero engagement-router when eligible.
6. Preserve current live flags, running/stopped state, environment secrets, audit evidence and unsent/uncertain publication. Do not merge to main without explicit request; use qualified feature branch and `--ff-only` installation.
7. Never interpret broader AI-intent allowlists as “allow all consequences.” Major/irreversible actions that currently need human review continue to need it; no privilege escalation.

## 2. Phase 0 — Baseline and red reproductions (small setup commit only if artifacts change)

- Verify current branch/source/version and whether production still tracks `codex/narrative-authority-emergence` at `a74e73a`. Compare source changes since then; do not blindly reset or discard local edits. Record starting SHA, working-tree state, existing flags, tests and release metadata.
- Locate current operation registry via `Object.entries(INTENT_PAYLOADS)` and `intentOperations`. Compute unique full keys (`feature.op`) in a deterministic catalog utility. Confirm existing catalog length (41 at audited commit), its valid private-world subset, and exact source of the `>40` rejection.
- Add minimal failing tests: full existing delegation catalog rejected at 41; valid NPC address containing a PC surname held despite no PC action; omitted v8 request produces no creative writer on an otherwise playable eligible turn; creative model incorrectly inherits routine planner model. Keep red fixtures short and independent. Do not run the full validator here.

## 3. Phase 1 — Fix the delegation **40-permission** cap and operator experience (P0)

### Files
`bot/src/ai-intents.js`, `bot/src/ai-intent-contracts.js`, `bot/src/story-commands.js`, optionally a new small `bot/src/delegation-catalog.js`; focused new/updated tests and `docs/BOT_COMMANDS.md`.

### Requirements

- **Remove both `allow.length>40` and `private_allow.length>40` static checks.** For `allow`, accept any explicit list whose distinct entries are in the **currently registered and supported** `feature.op` catalog, even when there are more than 40. For `private_allow`, require membership in `allow` **and** the existing audited private-world feature-family subset. Do not introduce a wildcard such as `*` or silently turn on the full catalog.
- Build a single deterministic catalog derived from native intent contracts. Sort/deduplicate enum variations and provide machine-readable `all`, `private_eligible`, descriptions/risk class where safely available. Refuse unknown, malformed, disabled, legacy/unsupported, or duplicate inputs with useful errors (or normalize exact duplicates consistently with tests). Avoid inventing permissions from user-provided text.
- Preserve old full-replacement `/vc-story delegation json:{"mode":...,"allow":...,"private_allow":...,"max_operations":...,"max_cost":...,"expires_minute":...}` syntax and its lifecycle. Keep policy revision, immutable audit, source event, atomic DB transaction, expiry, cost and operational budget behavior.
- Add **read-only** `op:"catalog"` with page/filter and `op:"status"`, returning a GM-only attachment (the existing command already supports attachments). Support safe **incremental** grant/revoke using `op:"patch"` with `expected_revision`, `allow_add`, `allow_remove`, `private_allow_add`, `private_allow_remove`, and optional explicit mode/budget/expiry updates. Read/patch must be handled before legacy `configureDelegation`. All final states go through a **single shared validator**, with CAS/revision stale-write prevention and a single audit event per effective mutation. Removing a main permission must also remove its dependent private permission (or fail with a clear required removal), without leaving invalid state.
- No add-only permission patch should change `manual`/`suggest_only` to `routine_delegated`, expand budgets, or make expiry indefinite. Privilege-changing mode and budget changes require explicit authenticated GM input. Display effective policy, revised count, previous revision and changed permission IDs in a GM-only attachment; don't spill into party channels or logs.
- If command UX adds an optional page/filter to the existing JSON payload, **do not** add 41 static slash choices. Discord's independent 25-choice/option and per-command size constraints remain intact. Keep user documentation accurate. Avoid new slash schema unless demonstrably needed, since live command registration may otherwise be required.
- Maintain dormant flags: granting an operation does not implicitly enable its required `CITY_FEATURE_FLAGS` value. Disabling a feature still blocks that operation. Default policy remains manual.

### Required focused tests

1. All 41 current distinct valid operations can be assigned (including the 41st), persisted, reloaded, and displayed; a valid future synthesized 42nd catalog operation is handled without another magic cap. Don't need a database schema migration.
2. `private_allow` retains subset + audited-family check; invalid/unknown private keys and private keys absent from `allow` are rejected.
3. Patch add/remove, stale revision, duplicate input, partial malformed patch and invalid effective state fail atomically; legacy full-replace format still works.
4. Unauthorized caller cannot patch; normal `max_operations=4`, `max_cost<=20`, expiry, per-op high-risk review and native feature flags remain effective.
5. Generate one >40 permission regression test and one GM command-level test. Avoid dozens of single-permission fixtures.

**Commit:** `fix(delegation): remove static 40-operation grant limit`.

## 4. Phase 2 — Native narrative delegation coordinator and dedicated model routing (P0)

### Files
`bot/src/gm.js`, a small `bot/src/narrative-delegation.js` (or a clearly scoped existing module), `bot/src/config.js`, `bot/src/narrative-authority.js`, affected routing/unit tests.

### Requirements

- Introduce a **deterministic** coordinator which receives authenticated player intent, validated/planned native result, scene type, character/owner scope, and already proposed narrative requests. It chooses one narrative operation or multi-objective brief for the **single** v8 writer call. Cover at least observation, social conversation, focused investigation, arrivals/transitions, combat atmosphere, Director activity, and an appropriately quiet/no-op turn.
- Native coordinator must request creative output for eligible **playable** turns even when the planner forgot version 8; deduplicate conflicting/legacy requests, preserve explicit source refs and native outcome proofs, and prefer necessary NPC speech over optional atmosphere. Never delegate OOC, administrative, unauthorized audiences, false-positive direct observations, or disabled scopes. No second writer on a held/failed writer.
- Keep version-7/legacy behavior on flags OFF; preserve replay/idempotency attempt keys, prior drafts, existing writer arbitration and native projection proof.
- Add `OPENAI_NARRATIVE_MODEL` and optional `OPENAI_NARRATIVE_FAST_MODEL`, both **opt-in config overrides**. Defaults must preserve working runtime behavior and avoid unexplained price/latency jumps. Use separate selection policy for lightweight observation and socially dramatic/high-stakes scenes. `generateNarrative()` must choose the narrative model independently of `req.model` from the planner. Never change provider model IDs speculatively; rely on existing configured model IDs.
- Ensure narrative writer sees only its audience-bound packet, not the primary GM's private monolithic context. Do not send raw model private director planning to public writers.
- Add compact typed `creative_brief` (e.g., task(s), point of view, required response obligation, optional tonal/dynamic guidance, constraints and source identifiers). It remains a **task request**, not effect/receipt authority. Do not promote model-proposed plans into native effects.
- Existing one writer call normally follows one combined planner call. Routine read-only observations stay one writer only. Measure counts with fake request adapters and preserve timeout/progress handling.

### Required tests

- Planner omits v8 but authored conversational/scene response is still created.
- Scene+NPC request yields one coherent writer request with NPC answer prioritized.
- Direct observation remains writer-only with no router.
- With explicit narrative model override, combined and direct writer both use the configured narrative model; planner remains on routine model.
- Disabled feature/private/PVP/encounter rules remain enforced by native checks.

**Commit:** `feat(narration): centralize creative task delegation and model routing`.

## 5. Phase 3 — Speaker briefs, stronger NPC portrayal, and authorized PC references (P1)

### Files
`bot/src/narrative-authority-context.js`, `bot/src/narrative-authority.js`, `bot/src/gm-fiction-schema.js` if versioned format strictly requires it, NPC cognition/portrayal selectors, focused tests.

### Requirements

- Pass a **speaker brief** for relevant active unproxied NPC(s), not an unrestricted NPC dossier: native identity, personality/voice mannerisms, current local objective, subjective emotional stance, relevant own memory/beliefs, established relationship, local public context and legitimate witness/delivery evidence. Use `portrayalPacket`, actor-relative NPC cognition selectors, scene presence and disclosure boundaries already implemented where applicable. Bound and rank the packet, generally prioritizing the addressed speaker; never feed a proxied human-controlled NPC an AI-generated voluntary action.
- Give writer small dramatic-response guidance such as *answer actual question*, *make a concrete offer*, *voice disagreement*, *respond to prior exchange*, *provide a player-facing opening*; allow the speaker to decline, lie, speculate or dodge. Don't impose one repetitive question/menu format. Preserve subjective/rumor distinctions.
- Fix blanket PC-name suppression **for typed NPC dialogue**. Allow an NPC to address a known/visible PC using an independently validated name/alias (e.g. “Mr. Mercer, ...”) without asserting that the PC answered, consented, moved, felt, was injured, or surrendered. The evidence for name familiarity and entitlement must be native; a generated allow flag or self-certified speaker knowledge is insufficient. Keep conservative checks for ordinary narrator units and unseen/excluded PCs. Avoid brittle regex which strips valid whole units where an independently safe fragment is available.
- Preserve stable entity IDs, writer result-unit validation, scoped disclosure, NPC proxy control, ownership, roll/damage/custody rules, and source/audience hashes. If schema changes are needed, version and migrate the **contract**, not the live SQLite schema; accept old on-disk v8 drafts or hold them consistently. Do not silently reinterpret old queued content.
- Fit detailed characterization inside the existing creative fiction context budget. Prefer ranking/caching native reads over another model request.

### Required tests

- NPC addresses an established PC by full name or surname, naturally, and passes.
- NPC attempts to speak on behalf of the PC, assert a PC decision/consent, or reveal unrelated GM/private knowledge: held, while a valid sibling NPC line survives.
- Same prompt to different NPCs carries different portrayal/intent evidence; test packets rather than subjective prose scores.
- Returning NPC remembers only valid own knowledge; human-proxied NPC never has voluntary speech generated.

**Commit:** `feat(narration): enrich speaker portrayal and permit safe PC address`.

## 6. Phase 4 — Director dramatic briefs and multi-beat output (P1)

### Files
`bot/src/gm.js` Director integration, `bot/src/narrative-director-source.js`, `bot/src/narrative-authority-context.js`, coordinator, perhaps `bot/src/turn-orchestration.js` for authoritative receipt read-through.

### Requirements

- Replace the Director writer's generic context request with a **validated dramatic-event brief** assembled from recognized source events, accepted native receipts, or narrowly bounded rollback-preview evidence. Clearly distinguish proposed/attempted events from resolved, receipt-backed outcomes. Never render an uncommitted roll/damage/arrival as resolved just because the Director model proposed it.
- Include `dramatic_purpose`, authorized event references, involved NPC portrayal, local scene change, existing tension, narrative opportunity, unresolved outcomes, viewpoint and audience. Allow coherent narrative continuation that ends with an actionable player opportunity, without forcing an action.
- When scene context has a confirmed NPC and consequence, allow a dialogue+environment+dramatic beat within the **single writer call**. The existing `narrative_units` can remain capped (8) unless a targeted test proves a ceiling problem; avoid increasing max output tokens by default.
- Ensure no Director private trigger prose, GM notes, private NPC motives, or source metadata leak to party/private recipients. Preserve authoritative Director cadence, at most one world move per appropriate cycle, and native event publishing.
- Keep quiet/no-op Director passes quiet; do not invent changes solely to produce text. Preserve idempotency after restarts.

### Required tests

- A committed/revalidated Director arrival or social consequence is narratively described and source-bound.
- A merely proposed Director effect is described as an attempt/possibility, not an outcome.
- Private Director pass stays private; party prose cannot expose GM trigger/secrets.
- One planner + one creative writer maximum in ordinary combined Director scenarios, not one writer per beat.

**Commit:** `feat(director): bind dramatic narration to native world developments`.

## 7. Phase 5 — Narrative quality diagnostics and bounded recovery (P2)

### Files
`bot/src/narrative-completeness.js`, `bot/src/operational-metrics.js`, diagnostics/health tools, focused fixture test.

### Requirements

- Extend **typed** completeness checks by request class: NPC speech when conversation requires it, anchored physical situation for scene setup, accessible investigation observation/obstacle/roll request, destination framing after verified arrival, reactive combat fiction when appropriate, and meaningful Director continuation after a visible change.
- Track quality *proxies* not unverifiable semantic certainty: player-facing answer missing, absent speaker line, administrative fallback, unit-local holds, repeated generic scaffolding, camera/placement misframing, source retrieval misses, and p50/p95 receive-to-substantive-delivery timing when actual samples exist. Include categorical reason and scope; GM-only counters/reports never leak private text.
- Salvage validated siblings and native receipts on a failed/held unit. Avoid unconditional retries, always-on model judges, fabricated prose facts, or falsely claiming metric-based literary quality. Use bounded local repair when grounded, otherwise produce an appropriate scoped clarification only when really necessary.
- Add deterministic golden scenario fixtures: sparse setting, first-time NPC introduction, recurrent NPC, PC surname vocative, missing placement camera, investigation of an improvised clue, active combat atmosphere, Director NPC refusal/consequence, protected private scene, stale draft and failed Discord acknowledgment. Evaluate factual coverage and continuity, not a fake universal prose-quality score.

### Required tests

- Narrative completeness passes appropriate successful authored/native output and flags exactly missing responses.
- Valid sibling units survive blocked assertions without leaking secrets.
- No additional model requests triggered by routine health reporting.
- No changes to native action/roll/consent/PVP security contracts.

**Commit:** `test/feat(narration): qualify typed completeness and narrative-health visibility`.

## 8. Phase 6 — Lean qualification, release, backup and production installation

### Development qualification

- After each phase, run **only focused changed-module tests** plus narrow relevant protected-security tests; commit and proceed. Do not run the full suite after each edit/commit. Fix real regressions, don't delete tests or weaken assertions to green.
- At final executable freeze: `npm run check`, one `npm run validate` (current **119 critical suites** at audited HEAD; registry may legitimately grow), affected D08/PVP/authority/delegation checks if not already included, and `git diff --check`. `npm run validate:extended` preserves **39 optional historical matrices**; run only a focused optional subset if directly touched, or the extended set once if justified by observed regressions; accurately report what was actually executed. Network-denied fake provider by default; **zero paid API tokens** for tests. GitHub Actions CI completion must be verified before code installation.
- Release `10.2.0` using actual `bot/scripts/sync-release.mjs 10.2.0` after executable freeze and docs. Preserve manifest/source and package-lock integrity. Do not blindly bump if current repo advanced; follow `bot/scripts/release-version.mjs` policy.

### Production protocol — Windows direct Node, not Docker (as verified at 10.1.0)

- Re-discover whether production is still `D:\Library\Veiled City`, direct Node v24 and bot stopped, as recorded in `docs/NARRATIVE_AUTHORITY_PRODUCTION_RUNBOOK.md`. Confirm actual host/repository paths and current state at execution; these are *prior-state evidence*, not a guarantee they remain unchanged.
- Production code installation is authorized under the user's prior instruction. Before any mutation, start/stop, or migration, take a **fresh, separate WAL-aware SQLite online backup** with `bot/scripts/production-backup.mjs` and `node --import ./scripts/offline-guard.mjs`; verify SHA, integrity, foreign keys, schema, native ledger/outbox/character counts and a **disposable restore drill**. Secure backup outside repo, avoid overwriting prior 10.1.0 backup. No raw copy of a live SQLite/WAL file. Do not print `.env` or credentials.
- Inspect preexisting production working-tree changes and stash/copy **only paths necessary**; do not discard arbitrary user edits. Compare source release manifests, verify current qualified ancestor and no branch divergence. Push feature branch normally; `git fetch` / `git pull --ff-only` exact qualified SHA, never force push. If user-installed code tracks a separate branch, handle it explicitly without overwriting unreviewed changes. Do not merge to `main` without request.
- No native schema migration expected: continue schema `460` unless an actually justified schema change is implemented and qualified; do not edit DB flags via raw SQL. No slash registration needed if only `/vc-story delegation` JSON behavior changed; if registration actually changes, document/run it only through the authorized production admin path.
- Validate production manifest, `.env` unchanged, DB integrity/FK/schema, current flag/policy values unchanged, correct executable HEAD, and outbox state. Preserve intentional **stopped** Veilkeeper status; only start/enable through an explicitly authorized authenticated operation. The prior user authorized deployment, not GM impersonation or automatic exposure of changed narrative flags.
- No automated live-provider/Discord test that consumes billable model API tokens. If a human later runs an authenticated live narrative canary, record real usage/latency and distinguish those results from fake-provider fixtures. Codex subscription processing is permitted but not a substitute for a production API-cost waiver.

### Rollback and handoff

- First response to behavior regression: authenticated flag deactivation for newly introduced behavior (if added), or revert model selection setting; avoid blindly disabling 10.1.0 campaign state. For delegation-policy issue, restore prior GM delegation policy via authenticated revision-bound update; do not reset unrelated permissions. Stop/hold affected publication and preserve receipts/outbox.
- Code rollback to last qualified 10.1.0 executable when safe, after backup and inspection. Do not roll back the production database as a routine code rollback; new legitimate events may exist after deploy. Review queued new-version narrative parts for safe compatibility and never replay dice, effects or uncertain Discord sends.
- Deliver `docs/DELEGATION_NARRATIVE_QUALITY_EXECUTION_LEDGER.md` and `docs/DELEGATION_NARRATIVE_QUALITY_RELEASE.md`: phase commits, head SHA, push branch, CI run/URL and status, test suite counts and named security tests, zero-API evidence, exact delegation catalog count, legacy+patch behavior, new env keys/defaults, DB backup hash/restore verification, production code SHA, service running/stopped state, flags and policy change state, any blockers and reversibility. Distinguish *coded*, *qualified*, *installed*, *running*, *enabled*, *live quality proven*.

## 9. Definition of done

The work is complete only when **all** conditions hold:

- The delegation-policy API accepts all **41 existing** distinct operations in a single explicit `allow` list and is future-proof when new valid operations are registered; `private_allow` still respects existing narrower audit constraints; GM command can list, show and patch permissions with stale-revision protection and no unintended privilege escalation.
- The creative writer's model is independently configurable, version-8 task selection is deterministic for eligible turns, and a multi-objective narrative brief is delivered in one creative call.
- NPCs have differentiated sanctioned characterization; known PC names can be spoken in their dialogue without the AI speaking/acting for the PC; proxy/privacy/secret barriers remain intact.
- Director fiction reflects real world developments, attempts are not mislabeled outcomes, and pending native effects remain pending.
- Typed completeness and fallback/hold diagnostics detect narrative starvation with no extra model calls.
- Every phase is committed; final critical validator and CI pass; production backup/restore and qualified installation are reported faithfully. Preserve intentionally stopped/disabled state until authenticated activation.

**If a genuine safety, source access, CI, backup-integrity, or deployment blocker occurs:** repair/retry within scope where possible; otherwise preserve completed commits, stop only the unsafe operation and report exact blocker. Do not fabricate successful deployment. All other independent phases should continue without approval pauses.
