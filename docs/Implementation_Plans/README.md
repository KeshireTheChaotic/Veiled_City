# Veiled City — AI GM Reconciliation and Codex Handoff

**Initial reconciliation audit — COMPLETE.** The 2026-10-21 audit and its findings are historical; current work follows the actual checkout and active phase/feature scopes. Detailed snapshots remain in their evidence files and ledgers.

Before any major change, read the high-priority [Audience-First Purpose](AUDIENCE_FIRST_PURPOSE.md). Before AI-GM implementation, also read the [owner behavior specification](OWNER_AI_GM_BEHAVIOR_SPEC.md) and the complementary `content/ENGINE/AI_GM_CONSTITUTION.md` operational authority.

The goal is an imaginative, impartial autonomous GM running a living world, rather than a restrictive rules chatbot. Keep expressive, proactive narration and NPC/faction initiative. Players exclusively own PC decisions; native code owns mechanical resolution; audiences receive only entitled information.

## Codex operating rules

1. Start at actual checkout HEAD; preserve any dirty worktree and reconcile changed findings. Read this README, `CODEX_START_HERE.md`, `TEST_PROTOCOL.md`, `DECISION_GATES.md`, then only current phase and feature pairs.
2. Each phase has its own `SCOPE.md` and `LEDGER.md`. Every feature has its own independent pair. For catalog occurrences worked on, create a further pair by exact feature key. Maintain real status, SHA, changed paths, new tests, execution results, costs, blockers, rollback and decisions in ledgers.
3. **Only stop globally for critical blockers.** For an isolated unsupported feature, missing rule, failure or owner-decision hold: mark it locally and continue unrelated safe work. Do not conceal or invent a source.
4. Test changed code with focused replacement coverage in `bot/tests/ai-gm-2026-10/`. Do not run or reuse legacy suites, fixtures, or golden results. After replacement coverage passes for migrated code, remove its obsolete legacy test suite. Record each test run and its actual outcome as complete; rerun only when the production code under test changes. No broad `npm run validate` for this plan; a separately authorized release qualification is distinct.
5. **Never poll/watch tests.** Launch each fresh changed-code test batch once with a blocking execution tool call when possible. Otherwise detach it, do independent work, and retrieve final evidence only at a natural milestone. Do not repeatedly check session/process/log status or use short `wait` loops. Follow [TEST_EXECUTION_NO_POLL.md](TEST_EXECUTION_NO_POLL.md).
6. Minimize Codex cost: single serial agent by default, zero subagents, only an independently useful worker when justified; no paid provider tests by default. Use safe immutable caching and observed call-count metrics, not invented savings.
7. **Ask the owner before adding any new restriction to freeform narrative output, NPC/faction autonomy, world invention, or humanlike GM pacing.** Hold only that proposed restriction; continue other features. Existing mandatory PC rights, privacy, dice and source authority stay enforced without a new vote.
8. No code push/merge, deployment, live production DB access, restart or provider spend without separate authorization. The original docs/release logic may be read as archaeology, never used as testing shortcuts.

## Phases
- [RF framework isolation](Framework_Refactor/README.md): Separate architecture initiative; RF00 inventory/design precedes all runtime relocations. P-series evidence remains historical and unchanged.
- [P10 — Reliable, playable, audience-first session openings](phases/P10/SCOPE.md): Precommit revision fencing, exact-state recovery, playable private/public cameras, setup diagnostics and fresh offline qualification.
- [P00 — Reconciliation and test reset](phases/P00/SCOPE.md): Inventory actual HEAD, reconcile contradictory docs, establish new tests and change-only selector.
- [P01 — Audience-first narration](phases/P01/SCOPE.md): Improve organic engagement, creative scenes, dialogue, and safe fallbacks.
- [P02 — Agency and native Daggerheart](phases/P02/SCOPE.md): Protect PC declarations, spotlight, native dice/Fear, effects and replay.
- [P03 — Living world and continuity](phases/P03/SCOPE.md): Integrate invention, weighted memory, NPC motives and the World Director.
- [P04 — Multiplayer and private fiction](phases/P04/SCOPE.md): Protect audience perspectives, overlapping intentions, hidden hooks, assembly and proxies.
- [P05 — Latency, models and caching](phases/P05/SCOPE.md): Profile and reduce redundant model work, cache immutable inputs and improve Discord delivery.
- [P06 — Native catalog and qualification](phases/P06/SCOPE.md): Complete source-qualified features, reconcile rules and qualify the changed implementation delta.
- [P07 — Character-driven, party-aware narrative](phases/P07/SCOPE.md): Prefer verified organic overlap among comparable optional world opportunities without forcing convergence or displacing player response.
- [P09 — AI-first feature interpretation and native mechanical validation](phases/P09/SCOPE.md): Retrieve source-backed GM feature rules for creative interpretation while keeping all effects in native validators and receipts.

P07 follow-up evidence is append-only: the F07–F12 correction is in the P07 phase ledger, and the second correction (F13–F18) is tracked in [its handoff](phases/P07/Veiled_City_P07_Second_Corrective_Handoff_Luna_Medium.md) and feature ledgers. P07 remains partially verified where those ledgers name local holds; offline deltas are not release qualification.
