# Veiled City — P07 Corrective Follow-up
## Codex Luna Medium implementation handoff — P07-F07 through P07-F12

**Repository:** https://github.com/KeshireTheChaotic/Veiled_City  
**Target branch:** `codex/clean-ai-gm-2026-10`  
**Audited remote HEAD (2026-10-22):** `47e93e7f05711ad8671408662cee2940b7c7e645`  
**Earlier P07 completion:** `35fa2eb5510bdff14cb9648e41513cf81878efe3`  
**Execution profile:** Codex **Luna Medium** / medium reasoning, **one coordinator, no subagents by default**, bounded code reads and atomic features.  
**Scope:** Correct and complete P07 without replacing the existing native GM or changing its creative philosophy.  
**Status at handoff:** Audit-confirmed problems; **no corrections implemented or tests executed by this handoff**.

> **First action:** Check actual local `HEAD`, current branch, `git status --short`, and P07 file contents. Treat the SHA above as the audit baseline, not a command to reset to it. Preserve all changes, including any untracked plan files. If the branch has moved, reconcile each finding against actual code before editing, and record discrepancies in the new feature ledgers.

## 1. Mission and invariant

Implement **character-driven narrative with party-aware consequences**. Individual PC choices, relationships, backstories, and independent NPC/faction motives initiate developments. When **already authorized**, **similarly justified**, and **similarly urgent OPTIONAL** opportunities compete, an independently evidenced connection to multiple distinct characters may win a **soft tie-break**. No party-involvement bonus can replace an active player's question, adjudication, unresolved response obligation, committed consequence, or source-proven urgent personal lead.

**Non-negotiable constraints**

- Players alone control PC actions, speech, thoughts, feelings, intentions, disclosures, resource spending, arrival and cooperation. Do not infer participation from roster, session check-in or presumed party membership.
- Native Daggerheart mechanics and authoritative receipts own mechanical results. Selection metadata cannot create truth, knowledge, permissions, effects, salience, canon, NPC omniscience, or publication authority.
- Party-visible output uses independently entitled party/public evidence. Private/GM-only origins can influence authorized GM planning but are never re-labeled, quoted, or implicitly disclosed to a wider audience. Character-private threads remain valid as such.
- NPC and faction agency continues when a party ignores them. A justified no-op remains valid. No mechanical spotlight changes, fixed turn quotas, scene mandates, forced convergence, narrative-length restrictions, or fabricated links.
- Preserve the existing **at-most-four world bridge signal cap**, source identities/revisions, replay protections, existing Director pass cadence and at-most-one justified world response per pass. Target **zero new model calls**; do not add an AI judge.
- Do not introduce new creative-output restrictions or diminish NPC autonomy without asking the owner an exact question. Isolate the disputed restriction and continue other safe work.

## 2. Mandatory preflight reads and operating rules

Read **in full** in this order before implementation:

1. `docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md`
2. `content/ENGINE/AI_GM_CONSTITUTION.md`
3. `docs/Implementation_Plans/README.md` and `CODEX_START_HERE.md`
4. `docs/Implementation_Plans/TEST_PROTOCOL.md`, `TEST_EXECUTION_NO_POLL.md`, `DECISION_GATES.md`
5. `docs/Implementation_Plans/phases/P07/SCOPE.md`, `LEDGER.md` and P07-F01 through F06 scope/ledgers
6. Relevant production functions/tests in the precise file list below. Historical P06/P08 work is **outside scope**.

Create **new** feature scope and ledger pairs under `docs/Implementation_Plans/features/P07-F07/` ... `P07-F12/`. Update the existing P07 phase scope/ledger and plan index as necessary, **append** corrections/verification rather than rewriting P07-F01 through F06 history. The fresh-test selector recognizes `p07-fNN.test.mjs`, so do not use `P07-RNN` as the feature ID. Record baseline SHA, modified paths, new tests, exact commands/exit codes, hashes, costs or unknowns, residual risks, decisions, and rollback for each feature.

Testing: **wholly new, feature-local, deterministic offline Node tests only** under `bot/tests/ai-gm-2026-10/p07-f07.test.mjs` ... `p07-f12.test.mjs` when source changed. Tests import currently modified production modules, Node standard libraries, and new disposable mocks/fixtures—not historical test launchers or golden outputs. Existing P07 tests within this same *new* test directory may be included in a **final focused changed-contract regression batch**; do not run inherited `bot/scripts/*-test.mjs`, broad `npm run validate`, legacy workflows or live-model tests. Test runner policy: freeze each feature, launch its batch **once**, use a blocking call with adequate timeout, **never poll/watch/stream logs**, inspect output once after completion, batch any repairs, and record actual results. No retry simply because a test is slow.

Do **not** push, merge, deploy, restart services, trigger CI, change/read-write production DB, or spend on live providers without separate authorization. Keep one coordinator and avoid unnecessary broad searches/subagents. Lack of approval for one risky action is a **local hold**, not an excuse to abandon independent safe corrections.

## 3. Audit findings to close (grounded at `47e93e7`)

| ID | Priority | Audited source | Problem / acceptance obligation |
| --- | --- | --- | --- |
| A1 | HIGH | `bot/tests/ai-gm-2026-10/coverage.json` | Duplicate root JSON keys `bot/src/world-narrative-bridge.js` and `bot/src/gm.js`. JSON.parse silently retains the **last** mapping, dropping P07 test associations. Merge complete mapping and reject future duplicates. |
| A2 | HIGH | `bot/src/world-narrative-bridge.js` `rankEligibleWorldSignals()` | `unresolved_narrative_task`, `opening_opportunity_request`, `resolved_player_intent`, and `conversation_development` all receive `mandatory_response`, after which same-NPC party-overlap changes their relative order. With >4 candidates, a requested unresolved response can be displaced. **Never apply party overlap to mandatory work**; correctly prioritize and retain required work. |
| A3 | MEDIUM | `bot/src/narrative-opportunity-policy.js` comparator | If both candidates have **different nonempty** overlap keys, comparator can return `-1` in **both directions**. Fix antisymmetry/transitivity; equally qualified overlaps retain stable original order. |
| A4 | MEDIUM | `bot/src/world-narrative-bridge.js` evidence classification | Overlap detection supports only distinct PCs with accepted `speak` intents linked to same NPC. `autonomous_world` and `personal_opportunity` classes are not populated by current caller. Broaden only with verified existing native causal evidence; document exact remaining unprovable categories without inventing them. |
| A5 | MEDIUM | `worldDirectorBridgeBeats()` and Director/writer dispatch | Source-selected optional signals may be crowded out by earlier beat categories under the downstream four-beat cap. Demonstrate that ranked eligible optional signals actually influence the existing Director/writer when enough optional capacity exists—without displacing required effects and consequences. |
| A6 | MEDIUM | `p07-f0{2,3,4,6}.test.mjs`, P07 ledger | Previous 13 reported test passes are **unit/contract-level**, not true end-to-end verification. Some tests assert prompt substrings or call a pure function without validating arrival/presence, public/private projection, persistence, snapshot replay, downstream selection or delivery. Add focused, realistic offline integration evidence. |
| A7 | LOW | P07 phase ledger | F06 completion is reported but an older phase line still says 'F06 pending'; reconcile status and distinguish prior claimed passes from new verified results. |

**Do not overclaim:** The previous P07 ledger reports 13 passing offline tests, but these results were not independently run in the audit; there was no matching GitHub Actions run for the audited head. No conclusion about live quality, latency, privacy, or release authorization follows from the historical test totals.

## 4. Feature-by-feature correction plan

### P07-F07 — Coverage registry integrity (A1)

**Change location:** `bot/tests/ai-gm-2026-10/coverage.json`; if necessary, `bot/src/ai-gm-test-selection.js` or `bot/scripts/ai-gm-delta.mjs` *only after assessing the minimum safe parser/validator change*.

1. Count all top-level keys in the **raw** coverage JSON, since `JSON.parse` hides duplicates. Specifically reconcile duplicate `bot/src/world-narrative-bridge.js` and `bot/src/gm.js` entries. Scan for any others.
2. Replace each duplicate with **one key containing the deduplicated union** of all intended test paths, preserving earlier P03/P05 mappings as well as P07. Do not blindly replace the older mappings with only P07 tests.
3. Add a fresh test which rejects raw duplicate root mappings, verifies the **effective parsed registry**, and calls `selectFreshTests()` on each changed module to assert the expected union. Do not only assert that JSON parses.
4. Where a reusable, minimally invasive validation hook fits the current runner, make the runner fail closed on duplicate mapping keys **before parsing**; otherwise document why the feature-local test is the accepted gate. Do not introduce a new generic parser framework.
5. If production test selector/runner code changes, update its fresh test mappings and write fresh tests for those new contracts; keep the offline-only/no-poll rules.

**Exit / tests:** No duplicate top-level keys; production-module coverage maps include all relevant P07 and pre-P07 fresh tests; selector returns the union when `gm.js` or bridge changes; source test mapping is no longer silently lost. Evidence in F07 ledger.

### P07-F08 — Comparator correctness (A3)

**Change location:** `bot/src/narrative-opportunity-policy.js`.

1. Keep only authorized classification and native urgency as primary sort keys; overlap is a tie-break among **optional** candidates of the same class and urgency. Do not let a verified-overlap flag alter required or causal precedence.
2. Fix comparator: `hasOrganicOverlap(a) && !hasOrganicOverlap(b)` precedes; reverse case follows; when **both** have validated overlap, preserve original input index (do not lexically rank distinct NPC/PC identifiers); with neither, likewise preserve source order. Normalize malformed metadata deterministically.
3. Add fresh tests with **different, nonempty** validated overlap sets A and B, three-way sorts, permutations, repeated calls, and tie stability. Test that class/urgency still beat overlap and signals are not mutated. Use hard assertions for returned order, not just string matching.
4. Preserve signal cap 4, scope/refs/IDs, and zero state mutations.

**Exit:** Comparator yields a lawful deterministic total order relative to original indices for all supported metadata; no inconsistent comparator outcomes.

### P07-F09 — Mandatory response precedence and cap behavior (A2)

**Change location:** `bot/src/world-narrative-bridge.js`, with narrow support in `narrative-opportunity-policy.js` only if required.

1. Trace the real source semantics for `unresolved_narrative_task`, `opening_opportunity_request` (including delivery/recovery), `resolved_player_intent`, `conversation_development` and `scene_transition`. Record what requires a **response now** versus what is merely a later scene opportunity. Do not equate all accepted speech with an obligation to answer twice.
2. Implement a **hard separation**: required/active response obligations and established immediate consequences cannot be reordered or removed *because of party overlap*. Apply party overlap only to optional signals after those obligations. Respect validated operation-specific source order and any existing opening/recovery precedence.
3. Exercise **5–8 signal** inputs where a required unresolved task is in position 4 or later and two verified same-NPC conversation signals compete. Assert the required task cannot be pushed out by the overlap bonus. If >4 required obligations themselves exist, preserve truthful backlog/omission reporting and established authoritative precedence; **do not mark anything answered or resolved merely because omitted**.
4. Test `eligible` / `omitted` counts, unchanged signal shape/hashes, no duplicate signal, private scope exclusions, and exact current replay selection after source revocation.
5. Do not alter accepted PC intent, session state, native Daggerheart resolution, or outbound publication mechanics.

**Exit:** Party relevance does not displace required narration even under cap pressure; verified opening recovery and active user questions are not subordinated to optional overlap.

### P07-F10 — Source-grounded organic intersections beyond same-NPC speech (A4)

**Change locations (inspect first):** `bot/src/world-narrative-bridge.js`, `world-narrative-bridge.js` consumers; evaluate existing source-bound read-only inputs in `bot/src/narrative-director-source.js`, `world-simulation-receipts.js`, `world-encounter-beats.js`, `scene-intent-board.js`, `context-planner.js`, `story-continuity.js`. Modify **only** production modules needed for verified current evidence.

1. Inventory native evidence that can safely connect **two distinct characters' actions or interests** to the *same established* incident, source/provenance chain, observed faction operation, effect receipt, evidence record, or location event. Links must be independent and verifiable against current authorized source, owner, scope, session, scene, and character presence as appropriate.
2. Distinguish **common backdrop** from **causal convergence**. Same location, names, attendance, rumor, importer GM hook, latent character relationship, or model-generated similarity alone are **not proof**. In particular, a shared NPC does not automatically imply the same interest; preserve the narrower semantics unless stronger evidence supports it.
3. Implement **at least one additional safely evidenced non-conversation intersection** if the current data model supports it. Example: separate authenticated characters have independently established public typed actions/evidence referencing the same **verified public incident or world consequence**. Use existing readers and hashes, not invented labels or owner-unapproved schema/DB migrations.
4. Characterize verified optional personal/world consequences with actual caller metadata, rather than leaving the new helper's `personal_opportunity` and `autonomous_world` classifications permanently unused. Do not attach narrative priority labels unsupported by native evidence.
5. If a category cannot be safely established with current native readers, **hold that category locally and document the exact missing contract**, rather than fabricating relationships or broadening permissions. Continue other safe work. No extra model calls or background NPC scans to manufacture group links.
6. Fresh tests for independently verified convergence vs. coincidence; private-only evidence stays private; split locations and absent PCs do not create participation; genuinely urgent isolated consequences can win; unproven links preserve order.

**Exit:** At least one grounded non-speech party-aware optional ranking path where supported; or an explicit, evidence-based local hold with no false proof. State which of Carl/Choso/Raven/Elias causal patterns is *actually executable*, not just named in a test.

### P07-F11 — Director/downstream projection and privacy (A5)

**Change locations (inspect first):** `bot/src/world-narrative-bridge.js` `worldDirectorBridgeBeats()`, `bot/src/narrative-director-source.js`, `bot/src/narrative-authority-context.js`, `bot/src/gm.js`, `bot/src/narrative-opportunity-guidance.js`; publication only for **testing existing contracts**—do not rewrite outbox.

1. Trace one selected world signal through `worldNarrativeBridgePacket()` → current snapshot binding → `directorBriefForAudience()` / `worldDirectorBridgeBeats()` → the existing Director and writer inputs → authorized publication or held output. Write the verified path in the ledger.
2. Construct an offline fixture where the top-ranked optional world signal has enough eligible downstream capacity to appear. Assert its source-bound identity reaches the creative prompt/beat packet; assert no generated effect or public truth is implied.
3. Construct cap-pressure cases. Committed native consequences, live response obligations and audience-safe established observations retain appropriate precedence. An optional signal must not be silently lost **solely because the downstream collector ignores upstream optional rank** when comparably optional beat slots are available. If downstream beats and bridge signals serve different intentional priorities, explicitly document and test that boundary rather than blindly re-sorting all beat types.
4. Exercise private/GM-only secrets, revoked source, stale hash, private owner scope, shared camera/absent presence and same-incident public consequences. Public beat text and metadata must contain **no inferred private motivation, undisclosed clue, secret relationship, or personal hook**. Writer instructions never gain authority to relabel audiences.
5. Verify **no additional provider call** via offline injected request stub/call counter, rather than merely observing a string constant in a guidance module. Preserve `act:false`, independent NPC world movement and no forced cliffhangers/cooperation.
6. Do not tamper with native receipt, dice, spotlight, replay/outbox, or established past narrative event serialization. Where tests expose a real safety defect outside P07, isolate it and report before changing unrelated authority code.

**Exit:** A verified current-world source signal affects the appropriate existing creative surface when qualified; downstream limits cannot invert intended optional preference; no private/public bleed or extra call.

### P07-F12 — Acceptance fixtures, final correction delta and sign-off (A6–A7)

**Change locations:** Fresh tests and coverage registry, P07 ledgers/index; only production modules if a specific new test demonstrates an unresolved P07 defect.

Create **fresh realistic offline fixtures** showing source provenance and causal independence, not simply character-flavored labels or prompt substring matches:

- **Carl:** private anomalous hunting job; separately established public pumping-station/infrastructure disturbance; party selection uses only independently entitled public result, not Carl's private employer or secret assignment.
- **Choso:** private forensic insight; a witness's independent, sourced behavior; a second PC's public investigation genuinely intersects only where proven.
- **Raven:** spectral trace and separate verified waterfront/faction consequences; do not assume other PCs know the trace or share her location.
- **Elias:** a **visible** shadow tell can affect an NPC's legitimately witnessed behavior, without asserting Elias's feelings or imposing mechanical penalties.
- Active PC direct question versus optional multi-PC opportunity: required response first.
- Two optional leads mentioning the same NPC/location but having no independent shared causal link: no fabricated connection.
- One present PC, absent PC, split locations, noncooperative characters: no invented attendance/participation/travel or secret sharing.
- Urgent character-specific native consequence vs optional group overlap: causal precedence.
- No justified world response: `act:false` remains legal.
- Four-signal overflow and downstream beat-limit selection; current snapshot revalidation after source/hash change; no duplicated effect or delivery.
- Cross-owner/GM-private/public projection; stale source and NPC knowledge boundary.

Test as far through the actual modified source path as feasible with **new disposable SQLite DB**, deterministic clock/dice, and fake provider/Discord where truly needed. Do not claim end-to-end proof from a synthetic ranking array. Separate proven unit, cross-module, and unverified real-Discord semantics in the ledger. Build **at least one full offline candidate-to-Director handoff test**. If actual publication requires unaffected complex infrastructure, document the unverified seam rather than adding risky unrelated refactors.

After code/fixtures are frozen, execute one **blocking, focused correction batch** for all new P07-F07..F12 tests and relevant existing *fresh P07* tests mapping to modified contracts. No legacy test runners, broad validation, CI or provider spend. Record test count, failures, skips, commands, fingerprints, final commit SHA, diff and rollback route. Reconcile the P07 phase ledger's stale 'F06 pending' language. Maintain explicit `NOT DEPLOYED / NOT FULL RELEASE QUALIFIED / NO LIVE NARRATIVE QUALITY VALIDATION` until separately authorized.

**Exit:** Audit finding closure table A1–A7 with `FIXED`, `PROVEN LOCAL HOLD`, or `OPEN`; cited test and source for each. Do not report `COMPLETE` if a high-priority defect remains, a core test is still running, or no actual evidence supports it.

## 5. Acceptance gate: minimum matrix

| Case | Required behavior | Evidence |
| --- | --- | --- |
| Coverage duplicate | No duplicate root keys; union P07 + historical fresh feature mappings; selector chooses P07 tests | Raw JSON + selector test |
| Comparator with two different overlap sets | Both qualify equally ⇒ original stable ordering; class/urgency remain higher priority | Pure property-like permutations test |
| Mandatory task beyond position four | Optional overlap never drops the task | World bridge cap regression test |
| Native opening recovery | No displacement by optional crossover | Current scoped-source test |
| Solo/private active lead | Retained when strongest fiction/cause; no forced group | Source-scoped integration fixture |
| Multi-character sourced overlap | Prefer only **verified distinct** actor evidence at comparable optional urgency | At least one non-speech evidence fixture or explicit held limitation |
| Mere same setting/name/roster | No artificial causal link | Negative integration fixture |
| Director downstream cap | Qualified optional candidate can reach existing creative surface when comparably optional space exists | Real source-to-Director packet test |
| Private/public | Personal secret cannot appear in a party signal/beat/prompt/publication | Dual-scope projection test |
| Replay | Stale/revoked source never resurrects selection or duplicates an effect/message | Snapshot validation test |
| Model cost | No additional provider calls from policy; report offline call count | Stubbed request-count test |
| Daggerheart/player authority | Dice, effect receipts, PC consent, Daggerheart spotlight unchanged | Diff review + targeted boundary tests |

## 6. Recommended source focus (not a demand to edit all)

- **Core ranking:** `bot/src/narrative-opportunity-policy.js`
- **Opportunity sourcing and downstream:** `bot/src/world-narrative-bridge.js`
- **Director snapshot/brief:** `bot/src/narrative-director-source.js`
- **Creative prompt:** `bot/src/gm.js`, `bot/src/narrative-opportunity-guidance.js`, `bot/src/narrative-delegation.js`
- **Scope and existing guardrails:** `bot/src/narrative-authority-context.js`, `bot/src/assembly-context.js`, `bot/src/narrative-salience.js`, `bot/src/narrative-memory.js`, `bot/src/story-continuity.js`, `bot/src/scene-intent-board.js`
- **Test selection:** `bot/tests/ai-gm-2026-10/coverage.json`, `bot/src/ai-gm-test-selection.js`, `bot/scripts/ai-gm-delta.mjs`
- **Docs:** `docs/Implementation_Plans/phases/P07/`, `docs/Implementation_Plans/features/P07-F07/` ... `P07-F12/`

## 7. Required completion reply to owner

Return a short engineering report with:

1. Target branch and **exact resulting HEAD** plus current worktree status.
2. A1–A7 finding → fix → exact files/functions → **fresh** test evidence matrix.
3. Feature F07–F12 status and any safely held unsupported intersection classes.
4. Source-to-selection-to-Director verified behavior, including mandatory/optional cap collision and downstream/visibility results.
5. Exact blocking test commands, number passed/failed/skipped, final exit, tested SHA or worktree fingerprint; distinguish previously reported historical passes from this run.
6. Zero/new provider call evidence, performance/cost evidence **if measured**, otherwise explicitly unverified.
7. Remaining risks and required owner decisions; exact rollback commits/diff paths.
8. Explicit authorization statement: **NO PUSH / NO MERGE / NO DEPLOY / NO PRODUCTION DB / NO CI / NOT FULL RELEASE QUALIFIED**, unless separate owner approval changes it.

---

## 8. Paste-ready Codex task (attach this file)

> Implement the attached **Veiled City P07 Corrective Follow-up — P07-F07 through P07-F12** on `KeshireTheChaotic/Veiled_City`, branch `codex/clean-ai-gm-2026-10`, using **Luna Medium / medium reasoning**. Audited reference HEAD: `47e93e7f05711ad8671408662cee2940b7c7e645`—verify the *actual* checkout and preserve all local work. Read the full owner behavior spec, ENGINE constitution, clean AI GM plan rules, test/no-poll protocol and prior P07 ledgers before editing. Close A1–A7 in order: fix duplicate coverage keys; comparator antisymmetry; mandatory-response precedence under the four-signal cap; safely sourced non-conversation intersections; downstream Director handoff and audience/replay integrity; real offline acceptance evidence. Add separate new P07-F07..F12 scopes/ledgers and wholly new feature tests. Only a verified, optional, equally urgent overlap can receive a soft party-aware tie-break. Never invent group connections, disclose secrets, force PC cooperation, change native mechanics/spotlight, add model calls, or restrict autonomous fiction without owner approval. Run one blocking fresh test batch per frozen feature with **no polling**, then a focused final delta; preserve original P07/P06/P08 history and stable authoritative readers. Do not push, merge, deploy, run CI or live providers, or access/write production data without separate authorization. Return exact SHA, findings/test matrix, holds, costs, and release status. If any requested category lacks native proof, keep it as a documented local hold while completing the safe fixes.
