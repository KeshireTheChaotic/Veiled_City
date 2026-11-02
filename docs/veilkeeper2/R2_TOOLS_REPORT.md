# R1/R2 — provider-neutral generic tool loop

Completed native tool-loop composition slice; full R1/R2 and live provider acceptance remain open.

`tool-contracts.js` exposes exactly four closed generic schemas: context_read, action_propose, state_inspect and knowledge_propose. No move, damage, roll, NPC speech or canon-specific AI tool was added. `model-gateway.js` accepts provider-neutral tool-call batches and returns native results in a continuation history. Ordinary prose still takes one call. Limits are six provider calls, four calls per batch and sixteen tool calls per generation. Usage accumulates across successful provider calls. Unknown capabilities return bounded refusal; repeated call IDs replay a prior result, while changed arguments under one ID abort. Native exceptions do not expose diagnostics.

`kernel.js` allows a native context-reader binding per source handle. `rehearsal.js` uses that binding to retain every additional lookup grant. Initial and additional contexts are checked between calls, after inference and again during publication inspection. A correction or revocation after optional retrieval invalidates the draft; an unauthorized reference supplies no secret body. Tools remain optional, and their output does not claim committed game effects. No R3 rule handler is installed yet.

## Evidence

Fresh tool-loop tests plus changed kernel/rehearsal checks: **25/25 passed**, zero failures/skips, 107.7787 ms. The private-planner boundary suite also exercises the changed audience gateway, so its six cases were run separately; see R2_TOOLS_PRIVATE_TEST_OUTPUT.txt for actual outcomes. Neither batch reran an already-passing suite without a tested-code change. New tests cover exact tool inventory, one-call prose, optional continuation, aggregate usage, duplicate/conflicting IDs, unknown tools, exhausted budgets, bounded diagnostics and extra-context invalidation.

Execution/output: R2_TOOLS_TEST_* and R2_TOOLS_PRIVATE_TEST_*. Exact hashes: R2_TOOLS_HASHES.json. Providers are injected doubles; counted calls are not live inference or latency evidence. The generic response contract still needs vendor SDK adapters and production error/timeout qualification.

## Holds and recovery

No provider network call, Discord send, production data change, legacy runtime removal, deployment or push occurred. No migration was run; rollback is to leave this opt-in path unused. In-memory tool-call deduplication is scoped to one generation, not durable turn replay. R7 must reconcile complete turns and operation delivery. Private plans remain on their separate path without execution or publication authority. Action consequences, consent/dice, semantic prose review, NPC autonomy and full command compatibility remain later gates.

**Next exact work:** native scene/context and recall adapters plus a concrete provider adapter, then R3 deterministic rules. R0–R2 remain incomplete and R3–R8 outstanding; this checkpoint does not trigger phase publication.
