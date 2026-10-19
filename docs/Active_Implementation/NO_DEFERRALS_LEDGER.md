# Semantic-first implementation ledger — current checkpoint

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

Branch: **`codex/audience-first-narrative-v9`**. Qualified implementation anchor: **`373c7d61582a99ab87879aa3a02b91fee42e8e18`**. App **0.0.0.1**, schema **460**. Overall implementation and release: **NOT COMPLETE**.

This is the single active status ledger. The [full historical evidence](NO_DEFERRALS_HISTORY_THROUGH_373c7d6.md) preserves earlier red/green results, limitations, owner amendments and rollback receipts. Do not repeatedly load it or treat its old counts as current qualification. [Reconciled execution plan](IMPLEMENTATION_RECONCILIATION.md) overlays the v2.1 scope/design without waiving it.

## Current scope and next gate

| Track | Status | Remaining executable scope |
| --- | --- | --- |
| W0/W1 semantics | Qualified bounded contracts | Preserve N05/N06, NC20–22, N13/N14 and dual-lane N15. S-GATE `009c288bb8a130b62121ee21acf1f57be58bef65`:391/391 exact-commit tests; not unrestricted semantic detection. |
| W2 authorship/authority | Partial; W2A–K qualified | Complete eligible routine-world producers **and** consumers. No player/model identity creation, inferred knowledge or fake native receipts. |
| UA14/UA15 | Partial | Supported ordinary rulings, native unarmed/alternate traits and Experience lanes exist; remaining modifiers, collaboration, source-bound weapons, environment/encounter/evidence routes need real adapters. |
| W3 World Director | Partial | Native source/result, movement/dialogue, scene and committed Fear-clock bridges exist. L0/L1 aggregates, remaining actor tiers/operations/beat classes and complete world consequences remain open. |
| W4 OpeningDirector | Bounded O0–O5/recovery qualified | Preserve attendance/arrival separation, private hooks, late entry, restart and explicit source-reviewed stale-plan replacement. No automatic semantic freshness or live narrative-quality claim. |
| W5 PvP/death/Fear | Partial | Immediate owner stops qualified; new campaign non-bilateral execution and complete pre-roll Fear lifecycle are **not** qualified. Preserve historical agreements, native damage/death and post-action Fear. |
| W6 feature catalog | **16 supported /137 review-only /0 needs-authoring**,153 occurrences,15 handler families | Implement source-defined remaining adapters; do not infer support from a source definition or rename missing execution as a policy blocker. HR13 authoring is approved; its progress/effect adapter remains absent. |
| W7/UA17–19 | Not qualified | Frozen complete scope → full offline gate → identical-SHA CI → separately authorized release. A CI repair does not complete the product plan. |

## Latest qualified packages

All figures are executed **targeted/impacted** tests on their recorded trees, not current full-registry or live results. Zero failed/skipped in each listed final run; detailed commands/logs are in history.

| Commit | Qualified scope | Final evidence |
| --- | --- | --- |
| `4be7dd84d22b8412b0e79118c378f74556cbc9ac` | Leech first-Stress passive, actual owner/native cost consumers |475/475 |
| `5ff1d03a2ce45e2f085e3b6a1a5275edb28a3799` | HR13 Break the Pattern owner authoring; **not execution** |279/279 |
| `7f3f09d1d8a5d8159cfb093acf6ad362657fa17e` | Native stale opening-plan review/replacement; acknowledgements retained |344/344 |
| `6b8a8b25e999b8222774176730f0478ab661a91f` | Established native scene metadata → Director/Opening |252/252 |
| `0881bc062bbaec03131463bf4c03cc4dd7f34ff6` | Native unarmed Strength/Finesse owner choice and saved readers |470/470 |
| `f3d40befc77a88740c9185d188aab2d53e6b5206` | Immediate owner-priority safety stop at actual hostile-effect boundaries |371/371 |
| `373c7d61582a99ab87879aa3a02b91fee42e8e18` | Committed native Fear-clock consequences → Director/Opening, no new authority |278/278; syntax472/24 roots; quality256/326 existing warnings; manifest594/594 committed view |

## Owner policies now resolved

- [Campaign PvP/Fear contract](PVP_CAMPAIGN_AND_PRE_ROLL_FEAR_CONTRACT.md): explicit GM campaign enable, default off; immediate sticky owner stop wins over unfinished hostile commitment; never reverse committed outcomes. Armor, optional reactions, voluntary costs and death choices remain owner-controlled. Policy enable alone does not activate a missing v4 executor.
- Pre-roll Fear purchases **one legal native NPC spotlight for exactly1 preexisting campaign Fear**, with any printed costs separately validated; exact announced spend/intervention must have acknowledged delivery before PC dice. No extra modifiers/actions, automatic success or PC choices. Separate from post-action Fear; cancellation/restart must not double-charge or lose reserved Fear at cap.
- [HR13](BREAK_THE_PATTERN_AUTHORING_CONTRACT.md): three distinct GM-established original-event details, each identified and deliberately disrupted by the same authenticated PC through native outcomes; one nonstacking−2 per Echo/scene. No invented progress, knowledge or added cost.

## Preserved uncommitted work — not release eligible

The development checkout contains unfinished pre-roll Fear changes in `db`, arbitration schema/producer/cost, roll contribution/publication and native notice paths; new `fear-reservations.js`, `pre-roll-fear.js`, `pre-roll-fear-notice.js` and `pre-roll-fear-test.mjs`. They are **not in373c7d6 or the CI reconciliation qualification tree**. Last local development smoke:5/5; not phase qualification. Preserve them; do not stage them into a CI/documentation repair.

Remaining review includes raw reservation-status tamper versus reserved-pool accounting, exact pending request revision through completion, owner death workflow, source/owner changes, Tag Team/secondary consumers, scoped recovery/cancellation and actual provider-turn integration. The unrelated-ack substitution failure was corrected locally; do not infer that every gate is green. No pre-roll feature-completion commit or deployment exists.

Owner edits to the v2.1 concurrency examples and untracked `.gitignore` are retained. Previously reconciled worktrees are not cleaned again. Any temporary CI worktree is isolated from the above work.

## CI and validation reconciliation

- Remote failing run: [39257396716](https://github.com/KeshireTheChaotic/Veiled_City/actions/runs/39257396716), exact373c7d6, Ubuntu/Node24.9.0. Fails `v95-protected-narrative-test` NAR05/NAR14: legacy player-triggered additions have no independent native GM identity receipt. Production firewall is correct; fixture setup is obsolete.
- Repair preserves original apology/privacy/resource/movement assertions. Explicit native GM authoring and native starting-position receipts supply setup; raw creation remains a negative. Do not globally enable a fixture helper or weaken production authority.
- [Validation policy/crosswalk](VALIDATION_RECONCILIATION.md): prune **execution**, not unique assertions. Default/full critical remains mandatory; extended keeps all optional/historical suites. Docs-only and registered-test-only CI may select a bounded profile; unknown/shared executable/rule/fixture/dependency/workflow changes always select full. Partial reports explicitly show unselected suites and cannot qualify release.
- Current repair validation is recorded at completion below; previous130/130 reports are historical, not results for this tree.

### Maintenance repair checkpoint

Isolated from the unfinished Fear checkout at parent373c7d6. Original protected-narrative red25/27, two expected fixture-authority failures. Final affected **5 scripts /63 tests,63 passed**,0 failed/cancelled/skipped/todo,16567.5661ms (`ci-repair-focused-final.log`). After adding conservative dirty-tree fallback to the optional selector, selection/reporter/registry **8/8**,0 failed/skipped,2180.3661ms (`ci-selection-final.log`). Syntax **474 modules/scripts /24 command roots**, exit0 (`ci-repair-check-final.log`). Manifest **599/599**, relative links **51/51**, diff check exit0. All191 prior suite registrations remain; new selector suite makes153 critical/192 extended.

The local broad validator was launched before the final selector-only refinement; no exact-final-tree full-pass claim is made from an in-flight run. Push/CI verification must record its actual tested SHA and result. A maintenance full-critical PASS still does not qualify missing product scope or the uncommitted Fear feature. Ledger shrank210442→approximately8600 UTF-8 bytes (96%); historical body verified unchanged after the archive preface. Owner concurrency edits are preserved in the reconciled plan, not discarded to permit integration.

## Resume and safety

Finish the CI/doc/test-relevance repair first. Then resume the earliest safe missing adapter under [the current reconciled plan](IMPLEMENTATION_RECONCILIATION.md), preserving the uncommitted Fear checkpoint. Knifewalker `Never Where Recorded` is blocked on an actual source-backed pairwise PC→NPC range producer; location-relative zones or weapon reach do not prove “beyond Close.” Most137 review-only occurrences still need implementation, not owner rulings.

No production/credentials, live Discord, paid provider, model change, merge to main or deployment. Normal branch pushes require standing owner authorization and qualified selected source. Deterministic application test requests/billable tokens0; coding-agent usage unavailable, never guessed. Two workers hit account limits during the preceding feature work; no automatic restart is promised or configured here.

Rollback: keep immutable source/mutation/cost/dice/effect and acknowledged outbox history. Disable new preparation rather than erase native outcomes, reset once-keys, refund, reroll or blindly resend uncertain publications.
