# P10 — Codex Luna (Medium) implementation handoff

**Repo:** `KeshireTheChaotic/Veiled_City`  
**Branch:** `codex/clean-ai-gm-2026-10`  
**Planning reference:** `08e965bbfb1920ac2492a2350a17e5f9785d253a` (observed October 22, 2026; verify actual checkout).  
**Phase:** **P10 — Reliable, playable, audience-first session openings**.  
**Nature:** Additive planning package. Nothing is implemented, tested, pushed, or deployed by this package.

## Paste into Codex (Luna, reasoning Medium)

```text
Implement P10 — Reliable, Playable, Audience-First Session Openings, against the CURRENT checkout of KeshireTheChaotic/Veiled_City on codex/clean-ai-gm-2026-10. Planning reference: 08e965bbfb1920ac2492a2350a17e5f9785d253a; do not reset to that SHA or overwrite owner edits. Model: Codex Luna, Medium reasoning. One serial worker; no subagents by default.

First verify branch, git HEAD, status, current source and file collisions. Read docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md IN FULL, content/ENGINE/AI_GM_CONSTITUTION.md as complementary authority, docs/Implementation_Plans/README.md, CODEX_START_HERE.md, DECISION_GATES.md, TEST_PROTOCOL.md, TEST_EXECUTION_NO_POLL.md, P08/P09 phase scopes/ledgers (relevant sections only), and the accompanying P10 SCOPE, FAILURE_MATRIX, ACCEPTANCE_MATRIX, LEDGER. Read only the active P10-Fxx SCOPE/LEDGER while implementing its slice.

Goal: make /vc-session start and /vc-session present produce playable, audience-authorized openings even with 0 initial attendees, player check-in during a slow planner/writer, stale uncommitted source, or unavailable initial location. Preserve PC agency, GM secrets, hidden hooks, Daggerheart native receipts, historical readers, transactional outbox and exact Discord acknowledgment status. The world may invent ordinary nonbinding NPCs, locations, signs and leads; never place or decide for PCs or claim a narrative/mechanical outcome without authority.

Implement serial P10-F01→F08. F01 audit and specify a deterministic reproduction (execute under changed F02 paths) and classify errors; F02 fix snapshot/revision races BEFORE publication commitment; F03 safe uncommitted recovery vs uncertain/committed delivery; F04 independently playable public-camera and additive-cohort opening; F05 owner-private creative entry authoring, truthful fallback/error retention; F06 initial-position diagnostics and unplaced-character scene support; F07 observability, command UX and latency; F08 frozen evidence, rollback and hold matrix.

Critical boundary: a changed input during AI await may safely supersede ONLY proven unsent/uncommitted work by an authenticated, revision-bound native record and bounded regeneration. NEVER republish or overwrite any committed turn, uncertain Discord send, delivered message, action/roll/resource outcome or player-authoritative declaration. Preserve the two-attempt/manual-refresh receipts' semantics; do not forge attempt 2 or silently mutate immutable source evidence. If safe no-send proof is absent, hold only the affected artifact, report its actual reason and continue independent work. Use transactional claim/fencing across processes, not just in-memory WeakMap flight dedupe.

Never expose GM-only source text, full private entry_hooks, another player's secrets, model prompt/body or provider error content. Suppress raw hook-list fallback as the NORMAL narrative experience, but retain an honest bounded orientation only where creative authoring cannot be safely certified. Do not lie that fallback is an authored scene. Source-bound fiction remains provisional unless promoted through existing native workflows. Never impose a new creative-output restriction, fixed-script narration, compulsory location, or model downgrade without an owner decision recorded in the feature ledger.

Implement small reversible diffs, document each changed module and state transition in its feature ledger. Add ONLY brand-new changed-code-targeted offline Node tests under bot/tests/ai-gm-2026-10/p10-fNN.test.mjs, with new fixtures; mocked provider and Discord, disposable SQLite, deterministic synchronization barriers, no paid model, production database or network. Never use/invoke/import/copy/modify inherited tests/fixtures, old suites, npm test, npm run validate, existing CI or goldens. Freeze a feature before ONE blocking targeted test batch; NEVER POLL OR WATCH. Check syntax on changed JS/MJS. Run one frozen union of newly authored P10 tests. Record exact actual terminal exit, counts, hashes, duration, model-call counts/cost or UNMEASURED in both feature and phase ledgers.

Production database access, even read-only, requires a separate explicit authorization for this run. If authorized, use an explicitly read-only SQLite URI (`mode=ro`) or a separately authorized read-only snapshot, with `PRAGMA query_only=ON`, a minimal scope and redacted logs; never mutate, checkpoint, vacuum, attach writeable DBs, or infer live causal evidence not returned by queries. No push, merge, restart, deploy, paid model tests, production commands, or release without separate owner approval.

Done means no regression to PC control, privacy, dice/Fear, outbox replay, or memory; a fresh changed-code test demonstrates the initial no-attendee/start and during-planner check-in pathways, and a separate test demonstrates safe shared opening despite failed uncommitted original. Keep unproven live Discord, narrative quality, provider speed and production recovery as NOT QUALIFIED. Finish with changed paths, implementation and test evidence, exact SHA, known unknowns, rollback, owner questions and RELEASE NOT AUTHORIZED.
```

## Installing this additive package

Copy `phases/P10/` and `features/P10-F01/` … `features/P10-F08/` to `docs/Implementation_Plans/` in the checkout. Refuse to overwrite existing P10 files silently; reconcile them instead. Then add this Phase index entry to `docs/Implementation_Plans/README.md` without rewriting older status claims:

```md
- [P10 — Reliable, playable, audience-first session openings](phases/P10/SCOPE.md): Recover safely from precommit snapshot drift, improve opening/cohort reachability and authored private scenes, preserve exact Discord receipts, clarify initial location and measure failures/latency.
```

The phase documentation is the work order. It is **not** approval to execute production recovery or release.
