import {createTypedRollResolver} from '../../frameworks/daggerheart/public.js';
import {authoredTurnEnvelope,createAuthoredRollSourceCapability} from '../../frameworks/intent/public.js';

/** Accepted authored source capability -> native typed request/effect/receipt service. No rule copied into the adapter. */
export function connectTypedRolls({source={authoredTurnEnvelope},mechanics,reserveCampaignAttackNotices}){
  return createTypedRollResolver({source:createAuthoredRollSourceCapability(source),mechanics,reserveCampaignAttackNotices});
}

import {createUnifiedAdjudication} from '../../frameworks/daggerheart/public.js';
import {createUnifiedAdjudicationSourcePort} from '../../frameworks/intent/public.js';
export function connectUnifiedArbitration({source,mechanics}){
  return createUnifiedAdjudication({source:createUnifiedAdjudicationSourcePort(source),mechanics});
}

import {nativeArbitrationOrigin,nativeArbitrationOriginCreator,nativeEnvironmentInstanceForScope} from '../../frameworks/daggerheart/public.js';
import {intentArbitrationOrigin,intentArbitrationOriginCreator,intentNativeEnvironment} from '../../frameworks/intent/public.js';
/** Native environment scenes read Intent's original arbitration origin; Intent reads native environment instances. */
export function connectNativeArbitrationOrigin(){return nativeArbitrationOrigin.bind({inspectArbitrationOrigin:intentArbitrationOrigin.inspectArbitrationOrigin});}
/** Trace alone requests origin creation; both capabilities forward the original shared Intent store. */
export function connectNativeArbitrationOriginCreator(){return nativeArbitrationOriginCreator.bind({createArbitrationOrigin:intentArbitrationOriginCreator.createArbitrationOrigin});}
export function connectIntentNativeEnvironment(){return intentNativeEnvironment.bind({nativeEnvironmentInstanceForScope});}

import {intentNativeEncounter} from '../../frameworks/intent/public.js';
import {encounterProposalContext,proposeWorldEncounter,activateDelegatedEncounter,inspectNativeEncounterActivation,nativeEnvironmentBinding,EncounterLibrary} from '../../frameworks/daggerheart/public.js';
export function connectIntentNativeEncounter(){return intentNativeEncounter.bind({encounterProposalContext,proposeWorldEncounter,activateDelegatedEncounter,inspectNativeEncounterActivation,nativeEnvironmentBinding,EncounterLibrary});}

export {validateProposal,proposeIntents,acceptIntentForAdjudication,resolvePendingReferent,currentAcceptedIntent,playerIntentSchema,PLAYER_INTENT_PROMPT,validatePlayerIntents,recoverPlayerIntents,persistPlayerIntentDiagnostics,persistPlayerIntents,persistTypedDialogue,currentTypedMovement,autoCompleteOrdinaryMovements,validateIntentResolutions} from './typed-intent-service.js';

import {intentNativeAdversaryContext} from '../../frameworks/intent/public.js';
import {nativeAdversaryFeatureContext,requireNativeAdversaryFeature} from '../../frameworks/daggerheart/public.js';
export function connectIntentNativeAdversaryContext(){return intentNativeAdversaryContext.bind({nativeAdversaryFeatureContext,requireNativeAdversaryFeature});}

import {intentNativeActorControl} from '../../frameworks/intent/public.js';
import {nativeActorControl} from '../../frameworks/daggerheart/public.js';
export function connectIntentNativeActorControl(){return intentNativeActorControl.bind({nativeActorControl});}

import {intentNativeFeatureCatalog} from '../../frameworks/intent/public.js';
import {featureDisposition,executableNativeFeatures,compileNativeActors} from '../../frameworks/daggerheart/public.js';
export function connectIntentNativeFeatureCatalog(){return intentNativeFeatureCatalog.bind({featureDisposition,executableNativeFeatures,compileNativeActors});}
