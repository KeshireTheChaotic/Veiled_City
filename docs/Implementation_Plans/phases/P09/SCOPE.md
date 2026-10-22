# P09 — AI-first feature interpretation and native mechanical validation

**Repository:** `KeshireTheChaotic/Veiled_City`  
**Target branch:** `codex/clean-ai-gm-2026-10`  
**Reference SHA:** `81569d08699343e401fc11ba1eaed0f10b4fd37a`  
**Status:** COMPLETE — targeted delta only; F05 owner rule implemented with local end-to-end holds; release remains unqualified

## Governing authority and placement

- Owner behavior authority: [OWNER_AI_GM_BEHAVIOR_SPEC.md](../../OWNER_AI_GM_BEHAVIOR_SPEC.md). Complementary native authority: `content/ENGINE/AI_GM_CONSTITUTION.md` and relevant SRD/house rules.
- Follow [`README.md`](../../README.md), [`CODEX_START_HERE.md`](../../CODEX_START_HERE.md), [`DECISION_GATES.md`](../../DECISION_GATES.md), [`TEST_PROTOCOL.md`](../../TEST_PROTOCOL.md), and [`TEST_EXECUTION_NO_POLL.md`](../../TEST_EXECUTION_NO_POLL.md).
- P09 is an additive follow-on plan. P07/P08 were absent at P09's original reference SHA and were subsequently supplied and completed on the target branch; they do not create a P09 dependency. Do not rewrite historical phase outcomes.

## Goal

Make Veilkeeper interpret adversary/environment feature meaning from verified GM-private authored content while reserving all mechanical effects, PC choices, dice, and persistent state for source-authorized native services. Do not require a per-feature executable JavaScript handler merely to inform GM narration. Preserve previously validated native paths while developing a reusable typed proposal/validation boundary.

## Reference snapshot (verify again at actual execution HEAD)

At `81569d08699343e401fc11ba1eaed0f10b4fd37a` the catalog has **153 descriptors: 61 `supported`, 92 `review_only`**. A descriptor marked supported may still be a **context-only GM cue**, not a fully executing effect. Specifically `Professional Entry` is cue-only; `Pack Pressure` and `Feedback` already have dedicated native execution paths. Source of truth: `bot/src/native-feature-definitions.json`, P06 occurrence ledgers, and actual native modules. Counts are not acceptance thresholds and are not automatically updated by this plan.

## Core responsibility contract

- **GM content (JSON + Markdown):** verified ability descriptions, narrative meaning, authored source, GM secrets. Existing mechanical source precedence rules apply; model inference never silently overrides rule conflicts.
- **AI GM:** interprets context, chooses GM/NPC actions, describes threats and atmosphere, proposes rulings/operations and preserves narrative freedom. It may not assert uncommitted success or own a PC decision.
- **Native validation:** authenticates actor/source/scene/target, computes exact legal modifiers/rolls/costs/choices/effects, enforces privacy and approval, and generates idempotent receipts.
- **Persistence/publication:** exactly-once mutations and audience-safe narration of committed outcomes; tentative fiction and GM-private plans are not effect receipts.

## Independent features

- [P09-F01 — Current-HEAD audit and responsibility map](../../features/P09-F01/SCOPE.md)
- [P09-F02 — Targeted GM Private rule and feature retrieval](../../features/P09-F02/SCOPE.md)
- [P09-F03 — Narrative freedom without implied mechanical authority](../../features/P09-F03/SCOPE.md)
- [P09-F04 — Typed generic mechanics proposal boundary](../../features/P09-F04/SCOPE.md)
- [P09-F05 — Pilot: Professional Entry via ordinary advantage](../../features/P09-F05/SCOPE.md)
- [P09-F06 — Pilot: Pack Pressure via verified position](../../features/P09-F06/SCOPE.md)
- [P09-F07 — Pilot: Feedback reaction and equipment consequence](../../features/P09-F07/SCOPE.md)
- [P09-F08 — Freeze, evidence, and bounded retirement decision](../../features/P09-F08/SCOPE.md)

## Sequence and bounded ownership

1. P09-F01: verify actual HEAD/worktree and produce migration matrix; no runtime code edits.
2. P09-F02: retrieve relevant verified GM context securely without wholesale compendium injection.
3. P09-F03: separate fiction readiness from mechanical execution authority.
4. P09-F04: integrate a bounded typed proposal with existing native services, not another engine.
5. P09-F05 → F06 → F07: one feature pilot at a time; keep specialized implementations until functional parity is evidenced.
6. P09-F08: freeze, verify only changed-code fresh tests, measure what is measurable, record retirement candidates. P09 does **not** auto-retire all native features.

Each feature's ledger must document actual touched modules, evidence, questions, holds, decisions, rollback and current SHA. Isolated source/owner holds must not block independent safe features.

## Phase acceptance

- Relevant source-backed feature context reaches AI GM without leaking GM-private material or treating source snippets as execution permissions.
- Narrative descriptions can use unexecuted features plausibly without inventing committed mechanical results, PC choices or established canon.
- Typed mechanical proposals cannot bypass existing native eligibility, exact source, dice, costs, owner choices, privacy, receipts or replay.
- `Professional Entry` now has an owner-defined prepared-position evidence contract, native source-bound qualification and per-encounter use receipts. Fresh delta tests pass; full database-backed incoming-defense/output and native preparation-producer integration remain local unverified work, not release qualification.
- `Pack Pressure` and `Feedback` prove no functional degradation relative to their existing qualified native paths, or safely retain those paths and record the hold.
- No automatic mass catalog promotion, new per-feature registry, unsupported generic effects, historical receipt deletion or full-release claim.
- Actual new tests, execution results, source hashes and model-call/cost evidence recorded. Any planned but unverified work remains `PLANNED / UNQUALIFIED`.

## Out of scope

Mass enablement of the 92 review-only descriptors; automatic addition of all abilities to execution; redesigning Daggerheart; replacing NPC/faction initiative or weighted memory; unrelated DB migrations; changing release/CI policy; production access; or deleting legacy proof readers. No new narration or autonomy restriction without owner gate.

## Mandatory implementation protocol

- On execution, verify actual branch/HEAD and `git status` before editing; reconcile any source drift without discarding user changes. The reference SHA is the **planning snapshot**, not permission to reset the worktree.
- Read `docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md` fully; `content/ENGINE/AI_GM_CONSTITUTION.md` supplements mechanics and authority but does not replace the owner behavior specification. Read `README.md`, `CODEX_START_HERE.md`, `DECISION_GATES.md`, `TEST_PROTOCOL.md`, `TEST_EXECUTION_NO_POLL.md`, and the current P09 phase/feature SCOPE+LEDGER pair before execution.
- Preserve player control, Daggerheart spotlight and dice integrity, existing consent, authorized disclosure, source truth, transactional mutations, saved historical readers, pending reactions and exactly-once Discord publication. Fiction is not an authoritative mechanical receipt.
- Any **new restriction** on freeform storytelling, incidental world invention, NPC/faction autonomy or pacing requires a precise owner question before implementing *that restriction*. This does not waive established agency, privacy, mechanics or receipt protections.
- Only stop the whole run for an uncontainable critical blocker. Mark a missing rule, unsupported effect, owner-decision hold or ambiguous source **locally**; continue safe independent work. No fabricated resolution.
- Only test production code changed by this initiative, using wholly **new** feature-scoped tests in `bot/tests/ai-gm-2026-10/`. Do not execute/import/copy/repurpose inherited tests, fixtures, golden files, old suite launchers, `npm test`, `npm run validate`, `validate:extended`, or legacy CI. For changed shared contracts, author new cross-boundary tests targeting the changed surface.
- Freeze implementation and new tests for a feature; launch **one** targeted test batch using a blocking invocation with adequate native timeout. **Never poll or watch** process/test/log status. If detached, do independent work and retrieve terminal proof once at a natural checkpoint; unfinished means `RUNNING / UNQUALIFIED`. Batched repair and targeted rerun only when necessary.
- Run `node --check` on changed JS/MJS, verify changed JSON syntax as relevant. No paid provider/model-judge calls, production DB, deployment, CI triggers, code push, merge, restart or release without separate authorization. One serial Codex worker; no subagents by default.
- Update actual phase and feature ledgers with source SHA, dirty worktree, changed files, run ID, command, terminal exit, counts, hashes, costs/call counts, owner questions, holds, rollback, release status. Do not infer full release qualification from passing changed-code tests.

## Rollback and exit

Each feature must be independently revertible. Remove only its new bridge/retrieval/test changes while keeping P06 supported cues/handlers and old saved readers. P09 exit means **targeted changed-delta qualification with explicit local holds**, not whole-release, live Discord, or production certification. Phase ledger provides the final evidence and release authorization remains false absent explicit owner approval.
