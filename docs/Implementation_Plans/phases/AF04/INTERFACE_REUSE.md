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

The existing group host now composes the mixed condition writer for both bound NPC reactions and inspected PC submissions, using the established PC condition contract, active/movement readers and authenticated owner recovery path. Parent progress records verified per-owner dispositions and NPC condition ancestry. The distinct `native_mixed_condition` record applies only to GM-controlled NPC state. Tests connect the actual factories using SQLite and injected native owner/roll/source services. Full Discord submission, ordinary-profile host/state integration, Spellcast consumers and NPC/ally release remain incomplete. No Null Foam activation or completed phase is implied by this audit.

Ordinary NPC area recipients now reuse getNpcProfile for immutable source binding and native_mixed_condition records for condition state. Their profiles remain unchanged; no combatant, resource track or parallel condition store is created. The group host and existing active-condition/movement readers consume these records. Spellcast odds, NPC/ally release and full Discord qualification remain incomplete.


Group preflight and native GM cost commitment now share groupFeatureCostPlan in the existing group policy module. It applies the source-defined Stress-track rule before using featureCostPlan and commitFeatureResources; callers cannot choose a free-form cost waiver.

NPC self-release extends the existing mixed condition writer/reader, native GM decision, commitGmActionCost, planNativeSpotlight/recordNativeSpotlight, GM executor and activeNativeConditions. The existing scene board projects a generic prepare/self-target freeing action for one eligible NPC condition. A native_mixed_condition_clear record is an immutable release receipt, not a second state store. PC owner-action recovery remains separate. No model code, PC dice, choice, spending or profile mutation is introduced.

No existing Spellcast classifier or subclass-trait registry was found in the native roll interfaces. EncounterLibrary now supplies an exact read-only domain-card lookup; feature-roll-source-rules.js derives only roll identity from the packaged source and official subclass trait. This reusable qualifier applies across printed features and grants no use/effect authority. Native roll preparation, modifier and saved-proof interfaces remain the consumers to extend; no separate roll engine or state store was created.
