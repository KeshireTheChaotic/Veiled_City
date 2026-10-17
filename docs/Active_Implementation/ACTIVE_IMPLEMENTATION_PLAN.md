# Active engineering implementation plan — remaining work only

**Target tree:** `codex/audience-first-narrative-v9` at pinned source `014bc39dadd4035b43649c2c24ef3508939b1c40`. This is a **forward-looking work plan**, not a claim that future behavior is implemented or authorized for production. Reconcile actual new HEAD, remote and any local work before making code changes.

## Nonnegotiable invariants

- Player owns intent, Duality Dice, consent, optional Hope/Armor/Help/Experience/Stress choices and death/surrender/proxy control.
- GM-origin permission is native and source-specific, not a forged human attestation. Target/range/actor/rules/visibility/cost are checked before any RNG and again at read/publish time.
- Independent valid native outcomes survive held unrelated prose or another owner's incomplete child.
- No secret-to-public or model-text-to-canon/effect shortcut. Unsupported features produce **scoped review**, with zero invented costs/dice/effect.
- Existing native historical/legacy readers, negative tests, exact outcome/cost and outbox receipts remain intact.
- No production database write, service restart, flag change, command registration, push, merge, CI or paid provider test without an independent authorized release gate.

## Workstream A — finish bounded native feature protocol (UA7–UA12 partial)

**A1: unresolved native reaction and condition semantics**

Implement only independently source-qualified feature subfamilies, starting with current named holds where the rules are actually specified. Prioritize safe condition clearing, exact range/movement step proof, manual-GM spotlight expiration, full Stress overflow constraints, unproved pre-existing condition reconciliation and remaining same-native-zone reaction variants. Preserve the native Flashbang Critical v3, Regent v2 choice and historical v1/v2 readers. Do not interpret a choice to obey Regent as actual commanded PC speech/movement until an exact player declaration and command payload have a permitted native effect adapter.

**A2: shared/composite odds and defense**

Finish Stack Formation plus Tag Team historical remaining-HP transition proof and combined Local Mesh/aura odds without rewriting the sealed initial request or changing saved individual-owner rolls. Determine and encode explicit target-specific Vulnerable odds for shared Coordinated Volley before admitting that variant. Reject an unproved delta instead of resetting RNG, damage, costs, Armor or another target's independently resolved result.

**A3: remaining special feature and environment families**

The 140 review-only and one unauthored occurrence need content-specific trigger, timing, cost, owner choice, range, feature/target and readback contracts. Priorities include Route Around powered-destination and before-terminal-HP proof, Signal-Touched suppression choice, Spend Forecast player-selected single-d12 reroll, Invitation Revoked communicated hospitality breach, Blackout/Three Vectors, remaining group/alliance/condition and environmental clauses. Do **not** implement a blanket "roll d20 and apply effect" fallback.

**Acceptance for each A increment:** precise original source pin; real actor/control/scene/source check; positive native event/cost/roll/effect/owner-proof path; wrong-owner/secret/stale/invalid-cost alternatives; pending-vs-committed replay and outbox failure; focused tests green on the final executable/test tree. Update catalog status only for the exact qualified handler.

## Workstream B — AI-GM authority migration (UA14)

Use [AI_GM_AUTHORITY_MIGRATION_MATRIX.md](AI_GM_AUTHORITY_MIGRATION_MATRIX.md). Replace redundant **human-review-only GM rulings** with sealed native source/permission at all producer *and* consumer sites for supported modifiers, owned PC attack eligibility, alternate traits, Help/Tag Team feasibility and conditional Experience/feature effect mapping. Current source-specific normal rules and owner decisions remain unchanged. Non-grounded/ambiguous source mapping must yield a specific review record.

**Acceptance:** a real native positive case reaches saved result and later replay/owner output, while forged `gm:true`, stale source, altered equipment/target/trait, hidden source, wrong owner, cost choice and historical human receipts each behave as required. No model-only role marker may authorize mechanics.

## Workstream C — bounded routine world authority (UA15)

Reuse existing delegated/Director policy for supported mundane travel, exact encounter proposal/activation, evidence analysis, NPC goals and causal service effects. Distinguish AI-GM ordinary adjudication from explicit **admin delegation**. Preserve manual/suggest/routine policy, caps/expiry, no inferred PC movement or proxy consent, private evidence/custody and major faction/canon/operator controls. Implement each only with its authoritative native adapter and independent actor/source proof.

**Acceptance:** positive supported policy case plus real no-op/manual/denial, source/role/scene/cost/budget/knowledge, restart and existing state-reader contrasts. Administrative content approval and contested custody never auto-execute.

## Workstream D — assembly/publication hardening follow-up

The current branch contains assembly v2 source-freshness and owner-entitled hook publication with targeted passing tests. Do not reimplement its completed source selection, import normalization or fallback/refresh flow. Carry out **only** newly reproduced regressions: unknown content schema changes, additional consent/source-recipient revocations, strict writer privacy in combined cases and live usability under separately authorized canaries. Do not treat fallback delivery counts as the personal-hook success metric. Maintain no-duplicate-outbox guarantees.

## Workstream E — final release (UA17 / UA18 / UA19)

1. **UA17** freeze exact source+test tree, run all mandatory offline validation and current acceptance inventory; run syntax, quality, format, normalized manifest integrity and security suites. Never rely on earlier partial test counts.
2. **UA18** push only as explicitly authorized; obtain remote/same-commit CI evidence for the exact UA17-qualified SHA. Divergent remote ancestry or failed gate = no installation.
3. **UA19** separately authorized preflight, consistent backup+restore proof, exact checkout/dependencies/flags/command schema comparison, safe install/restart and staged live observation. Preserve DB/native proof and uncertain outbox; no forced new feature flags.
4. **Post-UA** only after UA17–19: revisit any proposed broader autonomous PvP/Fear redesign under a new explicit contract, without silently changing existing bilateral consent or immediate native Fear.

## Implementation loop for Codex

Inspect actual HEAD and clean/dirty state; inventory every caller/reader for the selected native handler; write an intentional red-first positive/negative test; make the minimum source change; run targeted original security plus new tests; snapshot exact tests/evidence/limitations in [ACTIVE_IMPLEMENTATION_LEDGER.md](ACTIVE_IMPLEMENTATION_LEDGER.md); commit one independently qualified subfamily without committing unrelated owner files; update final inventory and normalized manifest before final release. Do not call any phase "complete" merely because schemas compile or the model generates plausible prose.
