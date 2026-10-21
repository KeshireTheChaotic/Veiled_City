# Veiled City — AI GM Reconciliation and Codex Handoff

**Static audit date:** 2026-10-21. **Audited `main` SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`. **No runtime edits, CI, legacy tests or live services were executed.**

**MANDATORY OWNER SPEC:** Read [OWNER_AI_GM_BEHAVIOR_SPEC.md](OWNER_AI_GM_BEHAVIOR_SPEC.md) in full before P00. The [unaltered source text](OWNER_AI_GM_BEHAVIOR_SOURCE.txt) is preserved alongside the clean Markdown. This full specification was supplied in chat, NOT committed to the GitHub repo. `content/ENGINE/AI_GM_CONSTITUTION.md` defines operational authority; it is complementary but not an interchangeable replacement for this owner behavior specification.

The goal is an imaginative, impartial autonomous GM running a living world, rather than a restrictive rules chatbot. Keep expressive, proactive narration and NPC/faction initiative. Players exclusively own PC decisions; native code owns mechanical resolution; audiences receive only entitled information.

## Important verified findings

- Current default branch is `main`. The documented `codex/audience-first-narrative-v9` GitHub ref returned 404, yet multiple active docs still use that branch and historical SHAs.
- At audit-plan intake, `bot/src/native-feature-definitions.json` had **153 occurrences = 16 supported + 137 review_only + 0 needs_authoring**. P06-F04 through P06-F42 have enabled thirty-nine exact source-qualified native handlers or adapter expansions; current inventory is **55 supported + 98 review_only + 0 needs_authoring**. Historical scope documents may retain their older snapshot counts.
- `.github/workflows/offline-validation.yml` runs `npm run validate -- --changed`; `bot/scripts/validation-selection.mjs` explicitly reuses the inherited suite registry and falls back to full on shared code changes. This violates the newly requested test policy for this initiative.
- Existing code already has a substantial native architecture: `gm.js`, `gm-unified-arbitration.js`, `autonomous-world.js`, `npc-cognition.js`, `narrative-salience.js`, `world-narrative-bridge.js`, scoped audience validation and native/outbox receipts. Build on these; do not recreate the whole subsystem.
- `gm.js` can make a router call, unified GM call, writer call and correction/recovery calls. `config.js` defaults `GM_PROGRESS_ENABLED=true` and `GM_PROGRESS_AFTER_MS=20000`. These are concrete performance targets, **not proof of real latency**.
- Old docs contain historical no-deferrals/phase-freeze/testing conventions; this clean plan overrides obsolete sequencing and legacy-test usage but never gameplay mechanics, PC consent, privacy or saved-state compatibility.

## Codex operating rules

1. Start at actual checkout HEAD; preserve any dirty worktree and reconcile changed findings. Read this README, `CODEX_START_HERE.md`, `TEST_PROTOCOL.md`, `DECISION_GATES.md`, then only current phase and feature pairs.
2. Each phase has its own `SCOPE.md` and `LEDGER.md`. Every feature has its own independent pair. For catalog occurrences worked on, create a further pair by exact feature key. Maintain real status, SHA, changed paths, new tests, execution results, costs, blockers, rollback and decisions in ledgers.
3. **Only stop globally for critical blockers.** For an isolated unsupported feature, missing rule, failure or owner-decision hold: mark it locally and continue unrelated safe work. Do not conceal or invent a source.
4. **Only test currently changed code, using wholly new tests. Never reuse, copy, import or execute legacy tests, fixtures, golden results or suites.** Default tests go in `bot/tests/ai-gm-2026-10/`. No broad `npm run validate` for this plan; a separately authorized release qualification is distinct.
5. **Never poll/watch tests.** Launch each fresh changed-code test batch once with a blocking execution tool call when possible. Otherwise detach it, do independent work, and retrieve final evidence only at a natural milestone. Do not repeatedly check session/process/log status or use short `wait` loops. Follow [TEST_EXECUTION_NO_POLL.md](TEST_EXECUTION_NO_POLL.md).
6. Minimize Codex cost: single serial agent by default, zero subagents, only an independently useful worker when justified; no paid provider tests by default. Use safe immutable caching and observed call-count metrics, not invented savings.
7. **Ask the owner before adding any new restriction to freeform narrative output, NPC/faction autonomy, world invention, or humanlike GM pacing.** Hold only that proposed restriction; continue other features. Existing mandatory PC rights, privacy, dice and source authority stay enforced without a new vote.
8. No code push/merge, deployment, live production DB access, restart or provider spend without separate authorization. The original docs/release logic may be read as archaeology, never used as testing shortcuts.

## Phases
- [P00 — Reconciliation and test reset](phases/P00/SCOPE.md): Inventory actual HEAD, reconcile contradictory docs, establish new tests and change-only selector.
- [P01 — Audience-first narration](phases/P01/SCOPE.md): Improve organic engagement, creative scenes, dialogue, and safe fallbacks.
- [P02 — Agency and native Daggerheart](phases/P02/SCOPE.md): Protect PC declarations, spotlight, native dice/Fear, effects and replay.
- [P03 — Living world and continuity](phases/P03/SCOPE.md): Integrate invention, weighted memory, NPC motives and the World Director.
- [P04 — Multiplayer and private fiction](phases/P04/SCOPE.md): Protect audience perspectives, overlapping intentions, hidden hooks, assembly and proxies.
- [P05 — Latency, models and caching](phases/P05/SCOPE.md): Profile and reduce redundant model work, cache immutable inputs and improve Discord delivery.
- [P06 — Native catalog and qualification](phases/P06/SCOPE.md): Complete source-qualified features, reconcile rules and qualify the changed implementation delta.
