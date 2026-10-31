# AF04 interface reuse decisions

Before adding another interface, inspect the current implementation and its callers. Extend an existing interface where its authority and persistence contract fit. New interfaces must fill a demonstrated gap and apply to more than one source feature.

| Need | Existing interface | Integration decision |
| --- | --- | --- |
| PC reaction invitation, authenticated dice and optional choice | `prepareGroupFeature`, `inspectGroupFeatureChild`, `groupReactionState`, `applyGroupReactionOutcome` | Reuse the existing owner submission path; do not add another PC dice or choice interface. |
| Area footprint and affected cohort | `planNativeAreaCohort` in `group-target-rules.js` | Reuse for native range/presence/cohort proof. Intent area references supply semantic identity only. |
| Independent PC/NPC routes and settlement | `prepareMixedReactionCohort`, `settleMixedReactionCohort` | Extend the existing coordinator with source-qualified host callbacks; no additional reaction coordinator. |
| PC condition persistence and inspection | `pc_native_condition`, `validateNativeCondition`, `activeNativeConditions` | Mixed PC failures now use version 2 of this existing contract and its readers. The native source inspector must be composed before activation. |
| Movement restriction | `nativeMovementConditionIssue` and `movementConditionIssue` | Feed validated active conditions into the existing consumer. |
| Owner action clears a condition | `clearNativeConditionFromOutcome`, `inspectNativeConditionClearAncestry` | Extend source-qualified clear semantics and preserve historical receipts; do not add a second owner release command. |
| Scoped roll odds | `rollTraitBreakdown`, `rollBreakdown`, `rollModifierSources`, `inspectOrdinaryRollModifier` | Extend existing native modifier preparation/inspection after source-qualified Spellcast identification. A matching trait alone is insufficient to classify a Spellcast Roll. |
| GM-controlled NPC state | `updateCombatant` and existing native effect/mutation receipts | Reuse the state writer and generic condition operations. NPC reaction/condition ancestry still needs the mixed host connection. |

The mixed condition writer now feeds the established PC condition contract, active/movement readers and authenticated owner recovery path. The distinct `native_mixed_condition` record applies only to GM-controlled NPC state. Tests connect the actual factories using SQLite and injected native proof inspectors; production host composition, Spellcast consumers and NPC/ally release remain incomplete. No Null Foam activation or completed phase is implied by this audit.
