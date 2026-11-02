import {narrativeAuthorityContextSource,narrativeSourceVisible} from '../../frameworks/narrative/public.js';
import {intentNarrativeContext} from '../../frameworks/intent/public.js';
/** Forward original shared builder source and visibility; never construct another context/grant store. */
export function connectIntentNarrativeContext(){return intentNarrativeContext.bind({buildNarrativeContext:narrativeAuthorityContextSource.buildNarrativeContext,narrativeSourceVisible});}

import {intentGameplayIntakeSource} from '../../frameworks/intent/public.js';
import {narrativeIntentEngagement} from '../../frameworks/narrative/public.js';
export function connectNarrativeIntentEngagement(){return narrativeIntentEngagement.bind({explicitSilence:intentGameplayIntakeSource.explicitSilence,semanticResponseObligation:intentGameplayIntakeSource.semanticResponseObligation});}

import {intentCommunicationSource} from '../../frameworks/intent/public.js';
import {narrativeIntentCommunication} from '../../frameworks/narrative/public.js';
export function connectNarrativeIntentCommunication(){return narrativeIntentCommunication.bind({characterSourceRanges:intentCommunicationSource.characterSourceRanges});}

import {intentNarrativeDelegationSource,intentNarrativeDelegationCatalog} from '../../frameworks/intent/public.js';
import {narrativeIntentDelegationSource,delegationCatalog} from '../../frameworks/narrative/public.js';
/** Exchange only the closed operation vocabulary and Narrative's read-only permission catalog. */
export function connectIntentNarrativeDelegationCatalog(){
  narrativeIntentDelegationSource.bind({
    delegationFeatureKeys:intentNarrativeDelegationSource.delegationFeatureKeys,
    delegationOperations:intentNarrativeDelegationSource.delegationOperations
  });
  return intentNarrativeDelegationCatalog.bind({delegationCatalog});
}

export {persistAuthoredCandidates} from './authored-candidates.js';
