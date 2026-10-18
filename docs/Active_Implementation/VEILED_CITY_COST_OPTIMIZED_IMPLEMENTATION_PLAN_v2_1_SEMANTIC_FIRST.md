# Veiled City — Cost-Optimized, No-Deferrals Codex Execution Plan

**Version:** 2.1 — 2026-10-17 (semantic-first revision)  
**Purpose:** Supersede v2.0 with a mandatory **semantic-first** critical path while retaining the low-usage/no-deferrals execution model of the consolidated plan.  
**Repository:** `KeshireTheChaotic/Veiled_City`  
**Integration baseline:** `codex/audience-first-narrative-v9` (last independently inspected head: `47c5d35f90df2e5a69e406e857bbc946ce0957bf`; **Codex must refresh** the branch and working tree).  
**Complementary architecture:** `VEILED_CITY_WORLD_DIRECTOR_BIDIRECTIONAL_DESIGN_v1_2.md` (must be provided alongside this plan).  
**Status:** Plan only. No Git changes, tests, CI runs or deployments are claimed.

> **Executive instruction:** **Semantic improvements are Priority 0 and the first implementation track.** After a single local baseline inventory (W0), implement, test and merge remaining Audience-First language/semantic improvements (W1), then pass the **Semantic Qualification Gate (S-GATE)** **before implementing** World Director, OpeningDirector, arbitration expansion, mechanics catalog, or PvP/Fear changes. Finish every requested nonsemantic system in the same effort, with one coordinator + at most two active, purpose-built subagents, often fewer. **Do not use the former semantic deferral allowance:** semantic improvements are required work, not an optional late quality pass. Genuine missing source or safety failures are blockers, never presumed passes or re-labeled deferrals. Minimize model usage through deterministic fixtures, capped optional real-model sampling, and prompt reuse.

## 0. Nonnegotiable scope and authority

1. **No implementation deferrals, including semantic improvements.** Supersede previous “post-UA”, “after rollout”, “long tail”, “future iteration”, “optional later” and split-release instructions for the requested implementation. Implement semantic improvements first. PvP/Fear code begins after S-GATE as an isolated versioned workstream and merges when native dependencies/tests permit. OpeningDirector and all native-feature coverage remain in this same effort. Do not declare complete while a requested track is pending.
2. **Semantic work is the first delivery gate.** Reuse already-qualified S0–S6 and R0–R6/D0–D3 implementation; do not rewrite working components. Audit and address open N05/N06 and NC20–NC22 referential/attribution/physical-POV false holds, N13 mixed OOC/IC interpretation, N14 long-horizon semantic relevance and N15 owner-authored appearance/disclosure, plus any currently failing security/agency/task-completeness fixtures. For each, classify the exact requirement, implement the scoped solution or record a true authoritative/owner-policy blocker. **No blanket semantic-quality deferral** or weakening of safe holds merely to improve fluency.
3. **Preserve player authority.** A player’s dialogue, repetition, hypotheticals or narrated wish cannot invent NPCs, factions, organizations, districts, access, gear, relationships or canon. Existing authorized GM-private hook, relationship and canon **workflows** may establish their permitted scoped facts. The native AI GM can independently invent eligible world details. Semantic interpretation, provider JSON and salience weights are never substitutes for authority.
4. **Keep exact native mechanics.** Hope/Fear duality dice, natural matching criticals, adversary d20 rules, actual resources, consent to voluntary optional costs, player-selected death moves, owner/reaction windows and provenance are native; generated prose cannot roll, alter or retroactively approve them. Autonomous PvP removes **redundant bilateral per-attack opt-in** only after its versioned replacement contract is implemented; preserve explicit owner choices, refusal of voluntary commitments and out-of-game safety controls.
5. **One writer and one source of truth.** Director can propose, native arbitrator commits, Audience-First verifies and publishes. Both directions use the same typed source evidence. Do not grant writer prose/feedback a fresh GM authorization or create a second world truth store.
6. **Release safeguards remain.** Never circumvent mandatory validation, exact-tree CI, protected branches, external push, production DB safety, human operating policy, or live deployment approvals to meet “no deferrals”. Scope completion and deployment authorization are separate. No user database access without separately authorized read-only connection; use disposable DBs for tests.

## 1. Usage budget: reduce model calls before reducing correctness

### 1.1 Agent economy

| Work type | Execution | Model / effort | Cost rule |
|---|---|---|---|
| Repository inventory, ripgrep, test discovery, manifest comparison, formatting, test running | Shell/scripts only | **No model request for the test itself** | Reuse deterministic reports and read targeted files only |
| Coordination, cross-module interface decisions, hazardous migrations, PvP/Fear authority and final integration | Main Codex coordinator | A capable coding model; begin medium effort, escalate only on demonstrable ambiguity | One coordinator; do not repeatedly ask a new agent to rediscover the repo |
| Bounded independent implementation (e.g., opening lifecycle versus PvP ledger) | 1–2 temporary subagents maximum | **Cheapest available Codex-capable model that passes focused fixtures**, low/medium effort | Spawn only if genuinely parallel and independent; send exact file paths, failing test, expected API, output contract |
| Unit, integration, fuzz/property, privacy, idempotency, replay, transport and migration tests | Local fake provider/Discord, SQLite sandbox | **No paid model** | No network calls; test artifacts are summarized, not pasted wholesale |
| Tests requiring a real LLM's output | One bounded low-cost evaluator/test worker | Prefer `gpt-5.4-mini` **if supported by the active account/runtime**; otherwise choose the cheapest available compatible small model | Never auto-upgrade to a premium model. Report skipped/unavailable provider-dependent check as a blocker for that check, not a pass |
| Production model behavior / controlled live pilot | Separate authorized operational verification | Uses the actual deployed provider, not a fake claim | Not a default test; obtain external/live authorization |

**Interpretation of “cheap models for all tests”:** Actual test scripts should be deterministic and incur zero LLM cost wherever feasible. A real-provider test, when genuinely essential, uses a **small/low-cost model** with an explicit request cap, fixture budget and logged usage. Do not run expensive model-vs-model judging, six parallel LLM reviewers, or a large paid semantic corpus. For semantic-first quality, retain and run the captured/fake corpus as part of W1. Real-provider sampling is optional as an *evaluation method*, not permission to defer the required semantic implementation.

### 1.2 Hard orchestration defaults (tunable down, not up without evidence)

- **Concurrency:** 1 coordinator + **maximum 2 simultaneously working subagents**. Root agent should perform serial tasks itself. No nested subagents, no permanent “QA agent”, no idle agents kept alive for later waves. An agent is not spawned merely because a specialist role was named in an older plan.
- **Work package:** one integration objective and **2–5 tightly related files** when practical; a precise red fixture + acceptance list + code owner. If only one independent task exists, use zero subagents. Avoid a fleet of six reading the same broad context.
- **Context:** each child gets path+commit, minimal contract and a bounded excerpt—not the entire 54 KB predecessor document, every log or full repository history. Coordinator retains a compact central status ledger; pass incremental diffs to successors. Cap verbose tool outputs; direct logs to files and show failing summaries.
- **Effort escalation:** first reproduce with shell/local test; try small model for narrow patch; use stronger coordinator only for contract/rules design, cross-module concurrency, safety-critical state transitions or after one evidenced small-model failure. Never repeatedly churn identical prompts.
- **Provider requests:** default **zero** for baseline, implementation, negative tests, security, core qualification and CI. Optional sampled inference only after offline tests pass. The paid request allowance, model and max tokens must be written to the ledger **before** any sample. Never silently use an expensive fallback.
- **Testing frequency:** touched-file targeted test on every patch; affected-component regression at each worktree merge; full `check/quality/validate` only at major merged integration checkpoints and the frozen final commit. A red mandatory safety test gates its relevant merge; do not hide failures behind “cheap model variance”.
- **Performance:** event/pulse budgets in runtime world simulation are a separate issue from Codex token use. Validate both. Proposed baseline: L0 zero per-actor model calls, narrative Director signal/writer integrated into the **existing** GM model turn, no per-NPC model loop.

### 1.3 Actual CLI/app configuration — verify your installed version

Codex versions differ in their multi-agent backend. The current open-source Codex `AgentsToml` supports `default_subagent_model` and `default_subagent_reasoning_effort`, but some `multi_agent_v2` configurations take precedence over legacy `[agents]` limits. **Do not paste both conflicting legacy and v2 concurrency keys blindly.** Check the installed Codex CLI `codex --version`, effective configuration and available models first. If supported, set the subagent default to the cheapest validated coding model and reasoning effort `low`, and enforce no more than two child workers (three active threads total including coordinator if the backend counts the root).

Example **legacy-style** settings *only for a Codex build whose effective config confirms this syntax*: 

```toml
# ~/.codex/config.toml — EXAMPLE, not universal across backends
[agents]
enabled = true
max_concurrent_threads_per_session = 2
default_subagent_model = "gpt-5.4-mini" # Only when available through this Codex runtime
default_subagent_reasoning_effort = "low"
max_depth = 1
```

On `multi_agent_v2`, use the **v2-specific effective concurrency setting** supported by the installed release instead of relying on the legacy `agents.max_threads` alias. Prefer an explicit maximum of **three total active threads** when that backend counts the coordinator. If the lower-cost model is rejected, choose another verified supported small model; do not claim that API catalog availability guarantees Codex Plus entitlement. Test the setting with one narrow child task before launching the complete initiative. Keep production DB credentials absent from subagent/test environments.

## 2. Repo, worktrees, integration and merge policy

**Base:** local `D:\Library\Development\Veiled_City`, integration starting from latest `origin/codex/audience-first-narrative-v9`. Refresh branch and inspect `git status`, user uncommitted modifications, branch SHA and test scripts before proceeding. Semantic ancestor was previously already integrated; **do not remerge or redo it**. Only current semantic residuals should be implemented and qualified. The **first feature branch/worktree** must be semantic; no competing runtime feature worker starts before S-GATE.

**Preferred simple path:** edit the coordinator’s dedicated integration worktree serially. Use extra worktrees **only** for independent code edits needing genuine parallel progress or avoiding file overlap. Keep private development under `codex/world-director-complete` (or another available branch), not directly on `main` or production.

```powershell
# Illustrative PowerShell. Execute only after inspecting local Git state.
$repo = 'D:\Library\Development\Veiled_City'
$root = 'D:\Library\Development'
git -C $repo status --short
git -C $repo fetch origin
# Use dedicated integration worktree to preserve a dirty user working tree.
git -C $repo worktree add "$root\Veiled_City-integration" -b codex/world-director-complete origin/codex/audience-first-narrative-v9

# Create ONLY if the work package has disjoint ownership and is worth parallelizing.
git -C "$root\Veiled_City-integration" worktree add "$root\Veiled_City-wt-opening" -b codex/wd-opening codex/world-director-complete
# The second temporary worktree, when needed, uses its own distinct branch/path.

# AFTER child commits + targeted tests + integration conflict review:
git -C "$root\Veiled_City-integration" merge --no-ff codex/wd-opening
# Run integration tests, record merged SHA, then clean up.
git -C "$root\Veiled_City-integration" worktree remove "$root\Veiled_City-wt-opening"
git -C "$root\Veiled_City-integration" branch -d codex/wd-opening
```

**Do not execute the illustrative commands if the integration branch/worktree already exists, a branch name is in use, or the worktree has uncommitted owner changes.** Adapt names rather than resetting/recreating. This plan **authorizes Codex to create and locally merge implementation worktrees as part of the requested implementation**, but does not authorize pushing, bypassing protected branch rules or deploying.

**Merge protocol:** (1) agree on shared closed schema and file owners, (2) child implements one bounded package, commits on child branch, runs affected deterministic tests, (3) coordinator reads `git diff --stat`/targeted diff + actual test receipts, (4) stop any concurrent edits to shared integration files, (5) `merge --no-ff` (or cherry-pick a specific tested commit if justified), (6) run affected integration tests, (7) record resulting integration SHA and delete clean worktree/branch. Never `push --force`, delete a worktree with uncommitted work, or treat child green status as proof that the merged tree is green.

## 3. Work inventory and dependency rule: no hidden deferments

Existing source already includes native scene board/arbitration, Audience-First v9, basic PvP/death, partial NPC features, group/faction simulation, assembly v2, `narrative-salience.js`, `memory-lifecycle.js`, `entity-memory.js`, and `autonomous-world.js`. Preserve them rather than rewriting.

| Track | Must complete in this effort | Dependency |
|---|---|---|
| **S — Semantic language improvements (FIRST)** | Implement all supported residual N05/N06, NC20–NC22, N13, N14, N15 and any newly exposed semantic ambiguities with grounded, secure intent/context/task handling and good playable narrative; no optional deferral category | **W0 baseline → W1 → S-GATE; blocks all other feature work** |
| **UA — Unified native arbitration** | UA14 producer+consumer migration, UA15 supported world/encounter/evidence operations; complete UA7–UA12 reaction/condition/defense gaps and full catalog coverage | Closed source contracts |
| **WD — AI World Director** | Unified authority for city/faction/org/NPC; L0–L3 coarse-to-fine pulses; bidirectional Audience-First exchange; aggregate storage; automatic native decisions; encounters; performance/replay | **S-GATE** + UA interfaces |
| **WD2A — Player authorship firewall** | Claim vs native AI GM authorship, no same-turn `world_additions` player-invention path; approved hooks/relationships/canon source exceptions | Before weighted promotion |
| **WD2S — Weighted inventions** | Temporary GM NPC/location/faction/org/district identity, deterministic salience/reuse/fading, source-qualified automatic canonicalization, scoped continuity and pins | WD2A + native sources |
| **O — OpeningDirector O0–O5** | Present-before-start, start→opening, private hooks, late/absent/rejoin, publication/recovery, party distinction | **S-GATE** + existing assembly |
| **P — Autonomous PvP and death** | No redundant per-attack bilateral consent; semantic attack/contest classification; native damage/Armor/HP/death choices; migration and recovery | **S-GATE** + UA contracts; code/test work begins after semantic qualification |
| **F — Fear redesign** | Separately funded GM pre-roll interrupt ledger, required announcement→ack→roll sequencing, existing post-roll Fear kept separate | Native action/roll receipts and P |
| **C — Complete native feature catalog** | Reconcile the documented 153 catalog occurrences (at audited checkpoint 12 supported, 140 review-only, 1 authoring-needed). Complete all source-defined adapters or surface a **specific missing rules-authoring blocker** that prevents a full-scope completion claim | UA mechanics + packaged source |
| **R — Full qualification/rollout readiness** | Full frozen-SHA offline, restart, negative safety, migration and delivery suites; same SHA CI when authorized; backup/restore and staged deploy readiness | Semantic and all nonsemantic tracks merged |

**The old “UA released before PvP code may start” gate is removed, but S-GATE is mandatory first.** After S-GATE, PvP/Fear implementation can progress concurrently **behind isolated, inactive native contract versions** while UA/WD are developed; the final merged architecture and tests gate activation. Do not let old behavior change accidentally in intermediate integrations. The completed target must include the new policy, not leave it queued for a later project.

**Source-dependent feature rule:** The 141 outstanding feature occurrences are not waived, broadly renamed “later” or made executable by generic fabricated mechanics. For each: exact source text, validated adapter and regression test; or a precise missing authoritative text/design-decision blocker requiring adjudication. An unresolved hard blocker means **not complete**, not “deferred.” Resolve supported features in source families to amortize tests and eliminate repeated work.

## 4. Implementation waves — workstream scheduling for minimal cost

A **wave** is a dependency boundary and merge/checkpoint, **not a postponement**. Unless a documented safety block prevents it, finish every wave in this same effort.

### W0 — One-time baseline, semantic inventory and scope freeze (coordinator alone; zero LLM test calls)

- Identify current SHA and actual existing work; map original tests, feature flags, stored schema versions, `package.json` test scripts, branch ancestry and changes from predecessor docs. Do not re-read every file for every wave.
- Run **one** original baseline of the actual existing mandatory suite in disposable SQLite/fake provider/fake Discord; capture failed cases and separate historical SHA-qualified results from current HEAD.
- Generate `docs/Active_Implementation/NO_DEFERRALS_LEDGER.md` with **semantic cases listed at the top**, followed by O, UA, WD, P/F, native-feature and release rows; statuses `implemented|in_progress|blocked_missing_source|blocked_authority|failed_test|merged|qualified`, exact SHA, source/reader, and test evidence. **There is no deferred status** for any requested track. An explicit product/authority issue is `blocked_*`, not a pass.
- **Freeze only the semantic source/intent/task/audience interfaces needed for W1**, preserving native arbitration and legacy readers. Record proposed later contracts (`authorship_origin_v1`, `narrative_signal_v1`, `world_beat_v1`, `world_pulse_v1`, `weighted_identity_v1`, `session_opening_v1`, `native_feature_vN`, `pvp_resolution_v2`, `fear_interrupt_v1`) but do not spend time implementing/renegotiating them until semantic qualification. Use existing APIs; no per-feature database tables.
- Identify **semantic-only** independent work packages. Spawn at most two workers and only for disjoint semantic files, fixtures and contracts. Other feature agents wait until S-GATE; never pay to keep idle subagents alive.

### W1 — FIRST: Semantic interpretation, narrative quality and Audience-First completion

**This is the first feature implementation and first merge/qualification gate. Do not start WD, O, UA expansion, special mechanics or PvP/Fear implementation until S-GATE passes.** Coordinator owns semantic source-of-truth, native guard interfaces, task coverage and merge. Spawn 0–2 short-lived semantic subagents only when file ownership is disjoint (e.g., positive-language fixtures versus safe writer/source-scoped fixes).

**S0 — Reconcile existing implemented semantics, no repeat work.** Inventory N01–N15, NC20–NC22, S0–S6 and R0–R6/D0–D3 by *current file + existing test*, rather than reopening already repaired cases. Confirm the semantic ancestor is included. Run exact current-tree semantic regressions and record failures and holds per case.

**S1 — Source-grounded language comprehension.** Correct N05 entity/reference ambiguity (including entity names that are ordinary words such as *Rain*) and N06 benign second-person physical-POV and NPC-to-PC references. Keep a strict distinction among observed surroundings, attributed NPC dialogue/claims, quoted player text, GM fiction, PC intentions, PC feelings and completed native mechanical outcomes. No unsafe heuristic blanket exemptions; use bounded native constructions/source proofs and controlled task-specific holds where proof is absent.

**S2 — Complete mixed-language and longer-horizon semantics.** Implement N13 mixed IC/OOC, quoted, conditional, reported and hypothetical language without turning narration into unauthorized player actions. Implement N14 scene-to-scene salience/retention/ranking using the existing provenance, fictional-time decay and entitled memory paths, avoiding double-counted feedback or unbounded context. Implement N15 owner-authored appearance/disclosure only with owner-source authorization; explicitly identify any owner-policy requirement that cannot be inferred from prose. These are required implementation tasks, not optional “future improvements”; ambiguous external decisions remain honest blockers.

**N15 owner amendment:** qualify both structured authoritative observation and exact owner-attributed expressive prose during W1. The latter is unverified testimony, not semantic certification or native effect authority. See `N15_APPEARANCE_CONTRACT.md`; this supersedes the earlier structured-only owner decision. Requalify the semantic gate before additional nonsemantic implementation.

**S3 — Audience-First expressiveness and per-obligation completeness.** Address NC20–NC22 and other proven false holds, multiple overlapping requests and exact actor/target-specific coverage. Verify narration remains substantive when only some sibling tasks are held; no blanket empty response, forced PC speech/emotions/actions, false knowledge, clue discovery, travel, or canon. Retain existing approved native narrator construction, speaker and memory layers, fake/provider fixtures and legacy reader compatibility.

**S4 — Cheapest-first semantic tests.** Run deterministic curated fixtures/adversarial paraphrases before any real model evaluation. Cover entity alias collisions, audience secrets, narrative player-authorship firewall, agent-attributed questions, sensory statements, 0/1/N NPC turns, mixed quoted/OOC, conditional directions, unresolved sibling tasks, private/public crossover, replay, source retraction, historical producers and flags-off. Apply focused code corrections with exact red/green tests. If a genuine provider sample is required, use only the cheapest compatible small model with a declared cap; measure coverage, false holds and safety separately. **Do not weaken authority guards to satisfy a prose-quality test.**

**S-GATE — Required semantic-first qualification.** Merge the tested semantic branches into the integration worktree; freeze a **single semantic SHA**. All mandatory semantic/security/agency/replay and source-bound Audience-First tests must pass at that SHA; new semantics must have positive and negative tests and no unexamined `review_only` or hidden “semantic deferred” entry. Mark any truly missing authorized player-appearance/product semantics as a named blocker, not a completed task. Record fixture coverage, hold rates, test exit codes, model requests and source proofs. **Only after this gate is satisfied may W2–W7 implementation proceed.**

### W2 — Native authority and player-authorship correctness

**Coordinator** fixes/pins native authority and source schemas; **Worker A** implements authorship firewall and weights on a disjoint memory/world path; **Worker B** writes OpeningDirector O0/O1/O2 acceptance fixtures or starts PvP v2 fixture/contract as available after S-GATE without overlapping files.

- Enforce GM-native minting before materialization in `autonomous-world.js`, `entity-memory.js`, same-turn typed-intents and all readers. No authenticated player claim/target/repetition becomes an entity or weighted truth. Hooks, accepted relationship and canon processes must keep their scope/authority requirements.
- Support GM-native provisional **NPC, location, background faction, organization, district** identity without immediately allocating full NPC statistics, institution procedures, jurisdiction, economy or combat templates. Promote only justified state layers when active.
- Implement source-verified, deduplicated interest; a referenced *rumor* can become significant as rumor but cannot establish the alleged culprit/faction. Weighted GM identity may automatically become durable/canonical in a **bounded eligible mundane sense**; stronger contested facts and mechanics require existing native outcome evidence.
- Eliminate routine city/org/faction/NPC review toggles for **supported** native actions; retain true GM-only admin policy and human/proxy owner rights. Use native actor/resources/knowledge/capacity constraints, not model-selected `approved` booleans.
- Merge each finished child worktree immediately; run targeted ancestry, privacy, negative authorship and legacy-reader tests.

### W3 — World Director ↔ Audience-First + native feature coverage

- Build one `WorldNarrativeBridge` or equivalent small in-process service; use **already present GM call** for scene proposals. Audience-First→Director sends authenticated action outcome, witness event, legitimate memory/knowledge change, unresolved task and prior native source; Director→Audience-First returns sourced scene beats, eligible NPC goals/intents, world clocks, committed world effects and encounter candidates.
- Reject feedback of narration as a second independent observation; dedupe by source+scene+audience+causal root. Every published unit revalidates source, owner, visibility, audience and scene. Offscreen private knowledge must never become a global fact without native transfer.
- L0 aggregate pressure by relevant region/faction/time tick; L1 lightweight active actors/operations; L2 instantiated scene NPCs; L3 exact encounter combatants. Promote/demote with narrative weight, local interest, active conflict and pins; compaction drops *simulation granularity*, not committed identities, obligations, sourced world facts or receipts.
- Integrate native encounter proposing/binding/resolution with AI GM arbitration instead of manual approval; do not create a combatant without a valid template and legal presence. NPC goals, factions, institutions and city consequences feed encounter generation and observed aftermath feeds world simulation.
- Complete UA14/UA15 and remaining UA7–UA12/source-based feature families. For catalog items, batch exact-source families with low-cost scripted red/green tests. No generic JSON mechanic bypass, no self-declared feature permissions.
- Merge smaller completed partitions instead of waiting for an enormous all-at-once branch. Run targeted performance counters: DB rows per world pulse, max relevant actors, model calls per GM turn, CPU/time and replay records.

### W4 — OpeningDirector end-to-end O0–O5 (may code in parallel after S-GATE, when its interfaces are stable)

- Unified attendance, including pre-start presents; session start schedules **one** durable opening job even with zero players; use existing assembly/entitled private hook/shared camera machinery. Manual `assemble` becomes inspect/recovery fallback rather than mandatory startup ritual.
- Present, late arrive, absent, leave, rejoin and owner/proxy changes cannot force PC travel, dialogue, acceptance, faction association or party creation. `/vc-party establish` remains voluntary.
- Exactly-once source-bound opening/outbox identity with explicit prepared/queued/acknowledged/uncertain/held states; crash recovery never blindly resends uncertain Discord output. One owner's pending intro must not block another player's committed turn.
- OpeningDirector both **requests** appropriate world/scene opportunities from the World Director and sends verified event/attendance developments **back** through the same sourced bridge, without elevating attendance to fictional co-location.
- Merge and run O0–O5 scripted 0/1/N-player scenarios, restart, privacy, late-arrival, stale source and hook/fallback tests.

### W5 — Implement autonomous PvP, player death and Fear **inside this effort**

**This is implementation, not a future design-only phase.** The PvP worker may start the versioned implementation in an isolated worktree after S-GATE during W2/W3 and is merged here once the required UA native contracts are available.

- Classify authenticated PvP hostile intent as native harmful attack versus fictional contest, based on actual player words, actor/target, consent to **voluntary choices**, scene reachability, configured out-of-game safety rules and Daggerheart mechanics. Remove the **extra bilateral per-attack approval requirement**, not actual source/owner protection.
- Preserve correct native Evasion, attack results, armor, thresholds, Stress/HP, reaction ownership, lethal result and player-chosen *Risk It All / Avoid Death / Blaze of Glory* paths. Never automatically choose a death move or reroll. Keep historical PvP receipts readable and old pending actions safely reconcilable.
- Implement Fear spend ledger as `reserved → announced_and_verified → committed_or_cancelled`, with exactly one debit. Announce the cost and allowed intervention **before the player may roll**. If announcement fails or is uncertain, do not silently apply the interrupt or open the roll; reconcile delivery. Existing post-action/Fear consequences remain a distinct process with their own idempotency keys.
- Test multiple PCs, FFA, simultaneous attacks, absent/late owner, race/restart at every spend/message/action boundary, cross-audience secrecy, armor/death, no fabricated player consent, PvP negative cases and old-version compatibility.
- Merge to integration and run broad **PVP30 / FH40 / OBS21 / D08** and native roll/PC-state suites before continuing.

### W6 — Finish all nonsemantic source-defined features, eliminate remainder of integration defects

- Query the **current** packaged catalog; previous checkpoint 12/140/1 is a historical inventory, not guaranteed latest. Group remaining exact-feature families into bounded implementation packages; source pin + native contract + state persistence + reader/recovery + positive/negative tests. Retire `review_only` classifications only when genuinely implemented.
- For entries with missing original rule definitions, prepare exact source-gap and obtain lawful GM rule-authoring input; do **not** assume the problem is solved by a cheap model's guess. Such items are an explicit **blocker of full project completion**, not deferred scope. Record those source gaps during W0, then resolve them as soon as S-GATE completes so they do not surprise W6.
- Sweep all stale manual enable/approve/flags routes for ordinary world actions and encounter initiation; maintain compatibility/migration and operator pause/recovery controls. Apply automatic native authority only where runtime actor/source/effect contracts support it.
- Verify model-call reduction did not remove NPC autonomy or scene responsiveness; rank and cap world relevance without database/API sprawl. No unbounded per-NPC prompts and no per-tick per-actor receipt spam.

### W7 — Frozen exact-tree qualification and authorized release steps (no scope left to future implementation)

- Coordinator makes all merges into one integration SHA, stops agent work, snapshots source and tests. Run **one full offline frozen-tree** `npm` check/quality/validate/format (only supported scripts), original mandatory modules, added end-to-end negative tests, outbox failure injection, migration, replay, source retraction and backcompat; no paid model calls.
- Tests must prove authored player inputs never mint world facts; native GM provisional details fade/revive and weighted canon is source-qualified; lore/belief are distinguished; Director ↔ narrator does not amplify its own feedback; opening and PvP/Fear behave correctly in the **same code tree**.
- When push/remote CI is explicitly authorized, run same-SHA remote CI, capture exact matching commit and report. When live rollout is explicitly authorized, backup/disposable restore, staged configuration and small pilot with real provider/Discord at a separate capped operational budget. Don't conflate off-line fake model results with production acceptance.
- Final output must list **all** workstream statuses, actual merged commits/SHAs, actual executed tests and exit codes, unsupported rules-authoring blockers (if any), skipped tests with reasons, real model request count, remaining **semantic blockers (if any)**, and any outstanding external approvals. Do not claim full implementation if a required track is blocked or a mandatory test fails.

## 5. Acceptance / negative-test matrix (non-negotiable)

| ID | Required proof | Expected invariant |
|---|---|---|
| S01 | Multi-NPC / multi-question narrative tasks with source IDs | No sibling task is silently marked answered |
| S00 | Semantic first in ledger/commits and qualification | No new World Director/OpeningDirector/PvP/Fear runtime work before S-GATE |
| S03 | N13 mixed OOC/quoted/conditional and N15 owner appearance | No accidental world creation, owner speech, movement or appearance claim |
| S04 | N14 long-horizon meaning, memory and salience | Correct scoped continuity; no echo amplification or unbounded recall |
| S02 | N05/N06 + NC20–NC22 nuanced reference/POV cases | Positive language cases work where source-proven; unsupported cases are explicit held tasks, never invented authority |
| WD01 | Unknown player's “my safehouse exists” and repeated faction claim | No world creation, placement, ownership, weight-based truth or invented canon |
| WD02 | Authentic GM world addition followed by recurring player interactions | Same stable scoped identity gains weight and eligible mundane persistence |
| WD03 | Faction rumor repeatedly referenced | Important rumor ≠ objective proof of alleged faction facts |
| WD04 | Director/writer mutual feedback and retry | One source-scoped weight/commit; no narrative echo self-reinforcement |
| WD05 | Idle offscreen city pulses | Aggregate operations with zero per-actor LLM calls and bounded DB rows |
| WD06 | Confidential private hook and NPC knowledge | No cross-character leak or model-prose-based disclosure |
| O01 | Zero/one/many pre-start present, start, late join, reentry | One authorized opening without compelled PC presence/party |
| O02 | Opening send uncertain and restart | No duplicated Discord messages or retroactive proof of delivery |
| UA01 | GM-owned NPC action and source-proven normal ruling | Native effect without redundant human-review approval |
| UA02 | Forged model `gm:true`, unsupported special feature | Reject/hold; no invented costs/damage/access or authority |
| UA03 | Entire original feature catalog, grouped families | Every source-defined occurrence mapped/tested; missing source surfaced early as blocker |
| P01 | PC hostile action vs another PC | No separate bilateral PvP ceremony; true owner actions protected |
| P02 | NPC/PC lethal HP and death move | Native damage exactly once; death choice belongs to owner |
| F01 | Pre-roll Fear spend | Reserve→announce/verify→apply→roll; exactly once |
| F02 | Action-Fear vs reaction/post-roll Fear | No conflation, double charge or late silent interrupt |
| R01 | Complete integration at frozen SHA | All mandatory original + new regressions pass; no mandatory skipped cases |
| R02 | Worktree merges / replay | No lost user changes, merge conflicts unresolved, version downgrade, or stale receipts |

## 6. Test model routing and spend ledger

**Standard tests** run with provider/Discord fakes and a disposable SQLite DB. Treat `npm run check`, `npm run quality`, `npm run validate` and other scripts as **commands to verify against `bot/package.json`**, not assumed present. Test discovery is done once; maintain a command manifest, then select by changed files.

**Provider-required test policy:** Only a test genuinely checking stochastic language behavior may call a real model. First reproduce from a saved fixture on fake output. For an unavoidable sample, record: purpose, exact model (a **cheap supported small model**, such as `gpt-5.4-mini` if available), maximum requests (e.g. **3**, a provisional cap per validation batch), max output tokens, expected result, actual token/request count and observed cost/usage. No automatic retry with a stronger model. A failure remains a failure requiring a coding decision or a documented blocker; semantic quality is not waived as deferred work. Never treat a cheap model's judgment as native rule/canon authorization.

```text
COST_LEDGER columns:
wave | worktree | agent_role | model | reasoning_effort | model_requests | input_tokens | output_tokens | local_test_count | failed_count | actual_duration | integration_sha | notes

Source_of_truth:
- Shell/local deterministic test requests = 0 LLM calls.
- Report test scripts + exit codes, not speculative API dollar estimates for a ChatGPT Plus account.
- Do not infer Codex plan allowance from public API pricing.
```

**Budget stop conditions:** repeated equivalent small-model failures; two agents changing the same shared file; provider call count exceeding the predeclared sample cap; world simulation spawning unbounded models; UI/DB tests requiring production credentials. Pause **that task** with an actionable diagnostic while unrelated implementation continues. Do not use expensive retries to brute-force a missing contract or a missing rule source.

## 7. Coordinator dispatch / communication contract

**Spawn decision:** Spawn a subagent only if (a) at least ~two independent code paths exist, (b) their file ownership is disjoint, (c) a concrete bounded task/test acceptance exists, and (d) the speed benefit outweighs repeated context. Otherwise coordinator runs serially. **Never spawn six automatically.** At most two are active at once; reschedule another specialty role as soon as a worker completes and its branch is merged.

**Each subagent receives exactly:** integration parent SHA; its branch/worktree location; *specific* paths it may modify; 1–3 contracts and their test names; minimal relevant file excerpts; required negative assertions; allowed test commands; output format (`commit`, paths, tests pass/fail, gaps). Child must not edit outside ownership or spawn child agents.

**At merge handoff:** Coordinator checks source provenance/reader logic and failure cases, merges with a clean integration tree, reruns affected tests and records one line in status ledger. Do not ask child to summarize entire repository or copy a 50 KB spec back to coordinator. When an agent encounters a source/rule ambiguity, return a short precise question and source ref; don't burn model tokens inventing.

**Coordinator alone:** handles integration branch, shared schema edits, final source/legacy migration and any permitted git push or deployment approvals. No subagent touches production DB, live Discord, real player records or protected branches.

## 8. Deliverables and closure criteria

1. One integration branch with **the semantic-first gate qualified and every nonsemantic track merged**; temporary worktrees removed safely after verified merges.
2. Native and audience-bound adapters, world granularity, weighted authorized invention/canon, autonomous city/org/faction/NPC encounters, complete source-defined mechanics, OpeningDirector, autonomous PvP/death/Fear, and backward-compatible readers/receipts.
3. `docs/Active_Implementation/NO_DEFERRALS_LEDGER.md` with exact semantic-first evidence, no planned deferrals, and an operations/rollback note for new live behavior.
4. Cheap deterministic test reports, sampled small-model reports only when necessary, model request totals, DB/API performance metrics, merge SHAs and release validation artifacts.
5. A clear **not-complete** status for unresolved mandatory tests, missing source-authored mechanics or authorization constraints. Do not relabel unimplemented requirements as “post release,” “next sprint,” or “future improvement.”

## 9. Codex kickoff prompt (paste into the integrating Codex session)

> Read `VEILED_CITY_COST_OPTIMIZED_IMPLEMENTATION_PLAN_v2_1_SEMANTIC_FIRST.md` and `VEILED_CITY_WORLD_DIRECTOR_BIDIRECTIONAL_DESIGN_v1_2.md`. This v2.1 policy **supersedes v2.0 and v1.3 sequencing**. **Semantic improvements are Priority 0.** Begin with W0 current-code baseline and implement W1 semantics in full (N05/N06, NC20–NC22, N13/N14/N15 and uncovered language/coverage bugs), reusing already-qualified S0–S6 and R/D code. **Do not start any other feature code before the W1 S-GATE has passed and the semantic commits have merged.** Semantic work is no longer an allowed planned deferral.
>
> Work as **one coordinator with at most two active subagents**, only for independent, disjoint work. W1 may use 0–2 short-lived **semantic-only** agents. Use the cheapest supported capable model for narrow coding tasks, low effort where sufficient, zero paid model calls for deterministic/fake-provider/fake-Discord tests, and a cheap supported small model under an explicit cap only for essential real-provider tests. Count actual requests; avoid repeating inventory and dumping full logs.
>
> Once S-GATE is qualified at a pinned merged SHA, execute **W2–W7**: player-authorship firewall and native source authority; compact autonomous World Director ↔ Audience-First with weighted GM invention and promotion; OpeningDirector; native catalog; autonomous PvP/death and pre-roll Fear; frozen-tree regression qualification. **No nonsemantic implementation deferrals.** Short-lived worktrees only when beneficial; child commits and focused tests, coordinator reviews and merges promptly, re-tests integration and cleans worktrees. Preserve legacy receipts, player choices, private hooks, relationships, canon boundaries, and outbox exactly-once semantics.
>
> Maintain one `NO_DEFERRALS_LEDGER.md` with **semantic rows first**, current and merged SHAs, tests, usage, and specific actual blockers. Do not invent missing source rules or owner authorization; do not pass unrun tests or call a blocker a deferral. Do not push to protected branches, deploy, or access production DB without separate authorization. **Begin implementation with W0 → W1 only; report S-GATE evidence before scheduling W2.**

## 10. Sources and relationship to earlier planning

- **Overrides sequencing and agent economics of:** `VEILED_CITY_COST_OPTIMIZED_IMPLEMENTATION_PLAN_v2_0.md` and `VEILED_CITY_CONSOLIDATED_MULTI_AGENT_PLAN_v1_3.md`.
- **Retains detailed World Director contracts of:** `VEILED_CITY_WORLD_DIRECTOR_BIDIRECTIONAL_DESIGN_v1_2.md`.
- **Retains full correctness/technical test inventories from:** current `docs/Active_Implementation/` and linked source files in the prior plan, until exact current branch audit demonstrates they are superseded.
- **Codex configuration source:** https://github.com/openai/codex/blob/main/codex-rs/config/src/config_toml.rs — verify your installed CLI/app variant before applying settings.
- **OpenAI worktree overview:** https://openai.com/index/introducing-the-codex-app/ — isolated worktrees and independently reviewed changes.
- **Model selection caveat:** https://developers.openai.com/api/docs/models/gpt-5.4-mini — API model availability/pricing is distinct from actual Codex account availability/usage allowance.

**Plan version 2.1 is an implementation instruction, not a claim of code completion, branch merge, subagent creation, or test results.**
