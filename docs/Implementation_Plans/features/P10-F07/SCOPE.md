# P10-F07 — Redacted operational status, command experience and measured latency

**Phase:** [P10](../../phases/P10/SCOPE.md)  
**Repository/branch:** `KeshireTheChaotic/Veiled_City` / `codex/clean-ai-gm-2026-10`  
**Planning reference:** `08e965bbfb1920ac2492a2350a17e5f9785d253a` — verify actual execution HEAD  
**Status:** OFFLINE DELTA PASS / 2 FEATURE CASES; execution evidence is in this feature's LEDGER.md. Original requirements below remain the work order.
**Executor:** Codex Luna, Medium; one worker, default zero subagents

**Mandatory governance:** Read full [owner behavior](../../OWNER_AI_GM_BEHAVIOR_SPEC.md), P10 [phase scope](../../phases/P10/SCOPE.md), [failure matrix](../../phases/P10/P10_FAILURE_MATRIX.md), [acceptance matrix](../../phases/P10/P10_ACCEPTANCE_MATRIX.md), [decision gates](../../DECISION_GATES.md), [test protocol](../../TEST_PROTOCOL.md) and [no-poll policy](../../TEST_EXECUTION_NO_POLL.md). Protect PC agency, secrets, canon, mechanical/native state and Discord exactly-once receipts. Do not add narrative restrictions without owner decision.

**Objective.** Replace ambiguous generic `SESSION_OPENING` and false equivalence between fallback transport and playable narrative with stage-specific, privacy-safe observability. Preserve fast Discord interaction acknowledgments without routine spam.

**Implementation.** Store a structured diagnostic envelope for native opening and entry jobs: stable category, stage, source/epoch hash, attempt/turn/slot/part identifiers, commit and delivery-state flags, model call count, timestamps/duration and retry eligibility (never raw model output, private hooks or hidden GM goals). `sessionOpeningStatus` and `/vc-session assembly-status` should explain state separately as `planning`, `authored`, `scene accepted`, `committed`, `delivered`, `fallback`, `uncertain`, `needs operator review`. The `/vc-session start` text must not assure a playable automatic opening until one is actually scheduled and entitled; operational acknowledgments should not masquerade as fiction. When work is safe-but-pending, player-facing command response should remain concise. Avoid extra 'still working' posts for routine quick turns, but preserve Discord interaction deadlines and safe deferral.

Measure at the same stage boundaries as existing `operational-metrics.js`, including queue time, planner, authoring, source validation, commit, outbox send, check-in→first playable message and fallback rate. Collect measurable provider call count; compare like-for-like baseline only. Without live provider/Discord authorization mark true user latency and narrative quality `UNMEASURED`. Any model swap or cap on story length/pacing/expression is a DECISION_GATES owner question.

**Tests.** New `p10-f07.test.mjs`: redacted error mapping, status says fallback not authored; internal diagnostic does not leak canary secret; command start/present remains responsive and does not call writer when recovering exact unsent payload; metrics distinguish stage outcomes, including multiple writers and zero accepted units.

**Gate.** Operator can identify precise recovery action without accessing private prose; user sees appropriate concise message; no unapproved provider configuration change and no fabricated latency improvements.

**Protocol:** New fresh test `bot/tests/ai-gm-2026-10/p10-f07.test.mjs` ONLY if production changed; brand-new feature fixtures; original production imports; offline/mock/no provider/prod database. One frozen blocking batch with no polling. Record actual run ID, source/test hashes, command, terminal result and rollback in this feature's ledger. No push, merge, deployment, CI trigger, live access or release by this scope.
