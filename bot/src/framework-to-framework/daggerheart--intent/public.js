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

import {nativeArbitrationOrigin,nativeEnvironmentInstanceForScope} from '../../frameworks/daggerheart/public.js';
import {intentArbitrationOrigin,intentNativeEnvironment} from '../../frameworks/intent/public.js';
/** Native environment scenes read Intent's original arbitration origin; Intent reads native environment instances. */
export function connectNativeArbitrationOrigin(){return nativeArbitrationOrigin.bind({inspectArbitrationOrigin:intentArbitrationOrigin.inspectArbitrationOrigin});}
export function connectIntentNativeEnvironment(){return intentNativeEnvironment.bind({nativeEnvironmentInstanceForScope});}

import {intentNativeEncounter} from '../../frameworks/intent/public.js';
import {encounterProposalContext,proposeWorldEncounter,activateDelegatedEncounter,inspectNativeEncounterActivation,nativeEnvironmentBinding,EncounterLibrary} from '../../frameworks/daggerheart/public.js';
export function connectIntentNativeEncounter(){return intentNativeEncounter.bind({encounterProposalContext,proposeWorldEncounter,activateDelegatedEncounter,inspectNativeEncounterActivation,nativeEnvironmentBinding,EncounterLibrary});}
