# R3 — historical committed GM decision reader

Implementation slice complete. All R0–R8 acceptance gates remain incomplete.

Added rules/committed-gm-decision.js, extracting the committed=true branch of inspectDecision from audited upstream 15a8f44671f227c6bec69bf30744e03c5692809b gm-capability-rules.js lines28–51. Preserves native decision and scene-board publications, proposal and entry hashes, historical origin, version2 actor control class, NPC material/source/input hashes and active original source. Current discretionary mode, actor location, controller, proxy and audience checks belong to future action/publication validators; they cannot rewrite already committed historical source authority. The new module has no legacy imports or injected proof callbacks.

This reader is a dependency for inspecting an already committed effect. It does not prove by itself that an operation committed or was paid, and cannot authorize execution, disclosure or a new NPC action. Historical board data is read as legacy evidence; no typed-intent/board classifier was revived for conversation.

12 fresh native SQLite checks passed, Node v26.13.0, 859.0007 ms. Fixtures include actual source rows for v1/v2 decision→board→NPC proposal→original input, read-only source hash, no dependency on current calendar/scene/control tables, revoked/missing sources, exact guild scope, native publication identity, mismatched resealed proposal/origin, original player/proxy control and altered NPC material. Source/test hashes and static affected list accompany this report. Only the new test imports this new module; no unchanged passing suite rerun. No model, Discord, production or human acceptance claim.

Modified files: committed-gm-decision.js; r3-committed-gm-decision.test.mjs; this report and hashes/affected list.

Migration/rollback: additive unused read-only dependency. No persistence/schema or gameplay changes, old code/test retirement, populated migration qualification, major-phase merge/push or production operation. Removal leaves stored state unchanged.

Known holds: actual group-feature execution, paid cost/spotlight, owner roll/reaction, effect/condition and mixed-NPC source validators still require composition. Root ordinary rolls and new GM operations remain gated. Historical NPC authority does not establish current AI control over a human proxy.

Next exact R3 work: compose this actual decision reader with group-feature execution and reaction-effect inspectors, including original feature definitions, saved rolls and mixed NPC proofs. Then combine original condition validation with clear/expiry readers before enabling source-qualified condition modifiers. Continue R0–R8; computer use remains forbidden.
