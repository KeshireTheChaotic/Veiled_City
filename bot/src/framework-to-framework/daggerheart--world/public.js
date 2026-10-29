import {nativeWorldAuthoring} from '../../frameworks/daggerheart/public.js';
import {worldAuthoringContext,worldIdentityOrigin} from '../../frameworks/world/public.js';
/** Native environment provenance reads World's original verified authoring context and identity origin; World keeps every authorship rule. */
export function connectNativeWorldAuthoring(){return nativeWorldAuthoring.bind({verifiedWorldAuthoringContext:worldAuthoringContext.verifiedWorldAuthoringContext,worldIdentityOrigin});}

import {nativeActorControl,nativeWorldProxy} from '../../frameworks/daggerheart/public.js';
import {activeCityProxy,worldNativeActorControl} from '../../frameworks/world/public.js';
/** Native classification and read-only current proxy evidence retain their original owners. */
export function connectWorldActorControl(){
 nativeWorldProxy.bind(activeCityProxy);
 return worldNativeActorControl.bind(nativeActorControl);
}

import {hasOwnerConsent} from '../../frameworks/daggerheart/public.js';
import {worldOwnerConsent} from '../../frameworks/world/public.js';
export function connectWorldOwnerConsent(){return worldOwnerConsent.bind(hasOwnerConsent);}

import {nativeWorldEstablishedEvidence} from '../../frameworks/daggerheart/public.js';
import {nativeEstablishedFact} from '../../frameworks/world/public.js';
export function connectNativeWorldEstablishedEvidence(){return nativeWorldEstablishedEvidence.bind(nativeEstablishedFact);}

import {nativeWorldEvents} from '../../frameworks/daggerheart/public.js';
import {indexWorldEvent,cityAudit,cityKey,cityObject} from '../../frameworks/world/public.js';
export function connectNativeWorldEvents(){return nativeWorldEvents.bind({indexWorldEvent,cityAudit,cityKey,cityObject});}
import {nativeWorldSource} from '../../frameworks/daggerheart/public.js';
import {requireCitySource} from '../../frameworks/world/public.js';
export function connectNativeWorldSource(){return nativeWorldSource.bind({requireCitySource});}

import {nativeNpcAvailability} from '../../frameworks/daggerheart/public.js';
import {assertNpcAvailability} from '../../frameworks/world/public.js';
export function connectNativeNpcAvailability(){return nativeNpcAvailability.bind(assertNpcAvailability);}

import {nativeWorldAutonomy} from '../../frameworks/daggerheart/public.js';
import {worldAutonomousSource} from '../../frameworks/world/public.js';
/** Pass World's original autonomous authority, entity creation and input key to native rules unchanged. */
export function connectNativeWorldAutonomy(){return nativeWorldAutonomy.bind({worldAuthority:worldAutonomousSource.worldAuthority,establishNarrativeEntity:worldAutonomousSource.establishNarrativeEntity,worldInputKey:worldAutonomousSource.worldInputKey});}

import {nativeMovementAdjudication,nativeMovementCondition,nativePcActionEligibility,nativeVipAdmissionSource} from '../../frameworks/daggerheart/public.js';
import {worldNativeMovementChecks} from '../../frameworks/world/public.js';
/** Pass native rules' original movement, eligibility and VIP admission checks to World unchanged. */
export function connectWorldNativeMovementChecks(){return worldNativeMovementChecks.bind({movementAdjudication:nativeMovementAdjudication.movementAdjudication,nativeMovementConditionIssue:nativeMovementCondition.nativeMovementConditionIssue,assertPcCanAct:nativePcActionEligibility.assertPcCanAct,nativeVipAdmission:nativeVipAdmissionSource.nativeVipAdmission});}

import {nativeWorldActions} from '../../frameworks/daggerheart/public.js';
import {worldLongProjectSource,worldObservationSource,worldCityDepthSource,configureSimulationEntity,submitNpcAction,preflightNpcIdentity} from '../../frameworks/world/public.js';
/** Pass World's original project, observation, simulation and identity functions to native rules unchanged. */
export function connectNativeWorldActions(){return nativeWorldActions.bind({manageLongProject:worldLongProjectSource.manageLongProject,projectPhaseRevision:worldLongProjectSource.projectPhaseRevision,renderWorldObservation:worldObservationSource.renderWorldObservation,configureSimulationEntity,submitNpcAction,validateMinorIdentity:worldCityDepthSource.validateMinorIdentity,preflightNpcIdentity});}
import {loadEncounterLibrary,isEncounterLibrary,encounterActors,livePcRoster,partyTier,baseBattlePoints,battlePointCost,recomputeBudget} from '../../frameworks/daggerheart/public.js';
import {worldNativeEncounter} from '../../frameworks/world/public.js';
/** World encounter beats read the original native catalog, actor, roster and budget rules unchanged. */
export function connectWorldNativeEncounter(){return worldNativeEncounter.bind({loadEncounterLibrary,isEncounterLibrary,encounterActors,livePcRoster,partyTier,baseBattlePoints,battlePointCost,recomputeBudget});}

import {nativeWorldInput} from '../../frameworks/daggerheart/public.js';
import {captureWorldInput} from '../../frameworks/world/public.js';
export function connectNativeWorldInput(){return nativeWorldInput.bind({captureWorldInput});}
