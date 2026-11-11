# R3 — native group-feature policy dependencies

Implementation slice complete. All R0–R8 acceptance gates remain incomplete.

Ported the deterministic policy dependencies needed by historical group-feature inspection: native-resource-plan.js, feature-cost-plan.js, group-feature-rules.js and group-feature-outcomes.js. Source bodies match the audited 15a8f44671f227c6bec69bf30744e03c5692809b modules (feature-operation-plans.js resource function, feature-costs.js planner, group-feature-rules.js and group-feature-outcomes.js); only local imports/error construction and trailing whitespace differ. No legacy runtime imports, resource writer, specialized AI tool or generic state patch was added.

Preserved fixed trait/Difficulty/range/duration rules for All Lanes Stop, Flashbang, Command the Blood and Null Foam. Retained Flashbang critical immunity and owner choice on ordinary success, Command the Blood's exact Hope/Stress/command alternatives, Null Foam's untracked-Stress rule, separate feature/additional-spotlight/Experience Fear expenses and bounded resource arithmetic. Pure plans do not establish source authority, paid costs, actual dice, command compliance or owner consent. Missing/unknown choices retain required_choice; callers must hold until exact native owner evidence exists. Null Foam area outcomes remain a separate unported validator, not a fallback branch.

10 fresh independent native policy checks passed, Node v26.13.0, 67.1756 ms. Coverage includes all four fixed policy definitions, success/failure/critical outcomes, pending/unknown owner choices, proposal overrides, exact cost categories, insufficient Fear/Stress, Null Foam zero-capacity Stress and rejected malformed/out-of-capacity arithmetic. Source/test hashes and affected list accompany this report. Static import closure selects only the new test; unchanged passing tests were not rerun. No provider/Discord/production calls or human-quality claim.

Modified files: four new pure rules modules; r3-group-feature-policy.test.mjs; this report and hashes/affected list. Existing runtime paths, source databases and unrelated dirty files remain untouched.

Migration/rollback: additive, currently uncomposed native rule dependencies. No data/schema or gameplay state changed; removing the modules leaves persistence unchanged. No old code/tests retired or full migration qualification. No major-phase merge/push.

Known holds: historical parent GM decision/feature-source, paid cost, mixed NPC reaction and original owner-reaction/effect inspectors still need real native assembly. Root roll authorization, area outcomes, atomic consequences and full rules parity remain incomplete. This pure policy slice cannot make fabricated model-supplied outcomes authoritative.

Next exact R3 work: port the historical decision/group-feature/effect dependency closure using these native policies and real source readers; compose original condition validation with clear/expiry readers, then qualify condition modifiers and owner dice/Fear/outcome flow. Continue R0–R8; computer use remains forbidden.
