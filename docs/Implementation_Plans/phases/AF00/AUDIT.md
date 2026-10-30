# AF00 source and compatibility audit

This is source inspection at the HEAD and worktree pinned in BASELINE.json. The amendment is an architectural disposition, not an executable specification or proof of runtime coverage. MIGRATION_LEDGER.json carries all 153 exact occurrences; no feature was removed or enabled.

## Source of truth

| Layer | Current source / consumer | Preservation requirement |
| --- | --- | --- |
| Printed feature and actor | `content/GM_PRIVATE/ADVERSARIES/adversaries.json`, `content/GM_PRIVATE/ENVIRONMENTS/environments.json` | Exact indexed string and full actor-template JSON hashes must match the native descriptor. |
| Original authored references | Adjacent `ADVERSARY_COMPENDIUM.md`, `ENVIRONMENT_COMPENDIUM.md` | Files pinned separately; Markdown is not a replacement runtime authority or proof of JSON equivalence. Resolve an actual wording conflict before changing mechanics. |
| Runtime inventory | `frameworks/daggerheart/native-feature-definitions.json` | Status/handler identify a bounded native path; they do not prove full printed-effect execution. Preserve each row's stated limitation. |
| Owner rulings | `frameworks/daggerheart/native-house-errata.json` | Preserve every ID/version/hash, explicit authored-rule binding and source hashes. Preserve `SIGNAL.md` for signal-card errata. |
| Current validation | `feature-catalog.js`, `house-errata.js`, exact operation validators | Catalog membership, a model citation or context object cannot commit effects. |
| Historical authority | Saved source/feature/template/erratum hashes and native effect readers | Never replace historical proof with today's mutable actor state or latest erratum. |

Paths in the last four rows are relative to `bot/src/`. All source bytes and their HEAD counterparts are separately pinned. No historical campaign records were opened.

`nativeFeatureReviewContract` selects the highest linked erratum version for diagnosis. `nativeHouseErratum(id, version=1)` instead selects an explicit version and defaults to v1. Do not conflate those behaviors. HR03 v1 remains review-only while v2 supports a bounded same-zone alliance aura; cross-zone range remains held. HR06/HR07 retain historical review-only descriptors although Flashbang/Command the Blood now have bounded native paths. These facts require preserving operation-specific checks, not blanket replacement of statuses. HR13 explicitly pins Break the Pattern's authored interpretation while execution remains held.

## Context bridge and live authoring paths

1. `native-feature-catalog.js` at the root re-exports the Daggerheart loader, which wires JSON sources into `createNativeFeatureCatalog`. `compileNativeFeatureRuleContexts`, `nativeFeatureRuleContext` and `nativeFeatureRuleContextsForTemplate` provide information only. The template-scoped provider includes verified review-only printed rules without granting execution.
2. `native-adversary-context.js` wires `adversary-binding-rules.js`. It verifies current GM ownership, eligible actor, encounter/control/presence, scene, session, source revision and template. It emits both `authored_feature_rules` and the 27 specialized adversary `feature_rule_contexts` from `adversary-contexts.js`.
3. Environment `environment-context.js` wires `environment-binding-rules.js`. Profiles retain activation/template/source and audience scope. `environment-rule-contexts.js` implements 22 specialized environment contexts, exposed through `native-environment-*.js` wrappers. `environment-capabilities.js` and `environment-capability-catalog.js` also constrain handler/type/trigger/target/protocol and proposal entrypoints.
4. `scene-intent-board.js` consumes bound adversary/environment context. `gm-unified-arbitration.js` wires `unified-adjudication.js`; `gm.js` and environment situation consumers remain prompt/authoring integration points. Environment dispatch and ordinary roll-modifier routes are separate from informational context.
5. The v9 `gm-mechanical-proposal-rules.js` route accepts a qualified standard adversary attack only. Named paths elsewhere do not make that route a generic all-feature executor. AF02/AF05 must extend the existing coordination boundary without treating a context receipt as effect authority.

See DEPENDENCIES.json `symbols` for declaration/reference lines, `imports` for module edges and re-exports, and `reverse_import_closure` for potentially affected callers. Factories inject capabilities rather than importing every callee directly; both symbol references and import edges must be inspected. The graph intentionally does not claim to resolve arbitrary JavaScript dynamically.

### Important exception: Professional Entry

`professional-entry-rules.js` establishes source-bound prepared positions, qualifies breach/restrain/surprise, tracks the first qualifying encounter roll and commits a native use receipt. `unified-adjudication.js` selects it separately; `gm-execution-rules.js` and `incoming-attack-rules.js` consume its actual Advantage and historical use proof. `native-professional-entry.js` supplies the existing wiring.

Retiring its context projector must preserve this mechanical path and its first-use identity. The catalog's context limitation describes the projector, not the entire application. Keep the amendment disposition `RETIRE_CONTEXT`, with that narrow meaning; do not delete the native executor or rewrite the printed rule.

## Other 29 supported occurrences: dependency families

The per-occurrence ledger records the exact handler and all feature-key/handler references. These are the main execution and proof families to retain:

| Family and occurrences | Native modules | Required parity |
| --- | --- | --- |
| Pack Pressure | `adversary-attack-passive-rules.js` | Current bound allies/zone and capped attack modifier; no invented pairwise range. |
| Blood Rush, Feedback | `feature-window-rules.js`, trigger/choice/cost modules, `feature-effect-rules.js`, reaction stakes/outcomes | Actual causal receipt, current actor/target snapshot, once-only reservation/cost and actual owner reaction; Blood Rush's current-position subset remains bounded. |
| Taste the Fear | `stress-passive-rules.js` | First verified scene Stress mark and one local Leech recovery; no replayed clearing. |
| Stack Formation, Plausible Denial, Consensus Pressure, Local Mesh | `defensive-feature-rules.js` | Remaining HP, campaign Veil Exposure, native alliance/range, nonstacking and immutable saved attack odds. |
| Sentence Carried Out, Horde | `standard-damage-passives.js`, `incoming-attack-rules.js` | Sealed Vulnerable proof, HR11 remaining-versus-marked HP and immutable damage provenance. |
| Contingency Stack | `adversary-damage-defense-rules.js` | First actual Severe hit before damage, once per actor/scene. |
| Many Deaths | `adversary-hit-rules.js`, incoming/stress consumers | HR01 exact eligible Fear opportunity and standard hit, remaining-HP gate, capacity/suppression checks. |
| Flashbang, All Lanes Stop, Command the Blood | `group-feature-rules.js`, execution/outcome/condition/recovery modules | Shared GM cost once; isolated per-owner reactions; exact player-owned consequence/resource choice; silence stays pending. Regent compliance remains held outside supported resource choices. |
| Coordinated Volley | `incoming-attack-rules.js`, unified adjudication, scene board | One shared roll with independent owner defenses and target effects; keep exact house-rule proof. |
| Sirens Outside | `environment-arrival-rules.js` | Printed Fear spend and source-qualified ordinary arrival, no invented combatant/PC effect. |
| Code Blue, Emergency Cascade, Maintenance Memory, Automatic Correction | `environment-scene-rules.js` | Current scoped profile/source, printed costs, compatible bounded scene changes and immutable historical receipt validation; memory needs established GM fact. |
| Upload in Progress | `environment-countdown-rules.js` | Native countdown creation/advance/terminal receipt, relevant source action and replay identity. |
| Too Loud to Think, Local Memory | `environment-acoustic-rules.js`, `environment-odds-contract.js`, `roll-modifier-rules.js` | Exact declared action, hearing/offering relevance and sourced pre-roll modifier; context alone supplies no bonus. |
| VIP Threshold | `environment-access-rules.js` | Acting owner's credential/deception evidence and scoped admission; no inferred travel. |
| Door Chain, Something in Imaging, Everybody Saw Something Different | Door-chain/imaging/witness rules and environment dispatch | No assumed PC explanation; scoped clue provenance; distinct native witness accounts and no truth promotion. |
| Everything Logs | `environment-trace-rules.js` | Pre-dice intrusion risk, actual failed action, trace-specific authenticated optional Hope payment or credible suppression; no payment from silence. |

## Compatibility and owner authority

- Preserve root `native-feature-*`, `native-group-features.js`, `native-house-errata.js`, adversary/environment façades and their import/re-export consumers until replaced consumers are verified. RF05/RF06 relocation does not authorize deleting these compatibility paths. The graph pins actual current paths rather than relying on old README paths.
- Preserve `native_feature_window`, reservations, `gm_action_cost_receipt`, `gm_feature_effect_receipt`, group/incoming attack records, environment receipts, prepared-position/use records and their source events. DEPENDENCIES.json `records` lists candidate writers/readers with source lines. A context's `receipt_kind: native_environment_feature_context` is informational, not a mechanical effect receipt.
- Historical inspectors and observe/output routes must still read settled outcomes without spending again, rerolling, reauthoring world facts or blindly redelivering. Audience/outbox acknowledgment remains separate from source and effect authority. Graph reverse dependencies identify publication integration; this audit does not execute delivery.
- GM selects NPC/environment intent and permissible tactics. Engine validates compulsory sourced consequences. Players own rolls, optional expenditures, voluntary movement/commitments and source-granted choices. Each ledger row binds this split to the exact printed rule, linked owner rulings, costs and native limitation.
- The five judgment-led features authorize source-permitted NPC behavior/offers only. Perfect Surface does not grant copied PC abilities or memories; Paid in Full needs actual obligation proof; Perfect Offer and Terms of Surrender do not imply acceptance; Older Than the Street does not create property/world effects without validation. Preserve costs and factual prerequisites from each exact rule.
- The 42 shared-operation and 28 domain-proof occurrences remain review-only. Existing printed rules and recorded owner rulings define the future contract; missing proof is a local hold, never invented consent, dice, debt, secret knowledge or network topology. Any newly discovered ambiguity needs an explicit design-time ruling before its implementation, while unrelated play remains available.

## AF01 handoff

Reconcile BASELINE.json against the current checkout. Work with RF05/RF06 ownership at the file boundary; do not overwrite their dirty edits. Use the existing template-scoped provider as the starting point. Prove exact printed text, applicable errata, current actor/profile binding, GM-private audience and ordinary Difficulty/source evaluation for all 49 contexts. Preserve Professional Entry's separate native mechanics. Only then retire bespoke projectors, duplicate literals and wrappers whose consumers have migrated. No native effect handler or historical reader is scheduled for deletion in AF01.
