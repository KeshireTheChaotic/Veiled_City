import {createPvpAgreementRules} from '../../frameworks/daggerheart/public.js';
import {createPvpAgreementConsumer} from '../../frameworks/narrative/public.js';
/** Exact narrative source capabilities feed native agreement authority; no policy copied to the adapter. */
export function connectPvpAgreements({capabilities,consumer=createPvpAgreementConsumer()}){
 return consumer.bind(createPvpAgreementRules({capabilities}));
}

import {nativeEnvironmentNarrative} from '../../frameworks/daggerheart/public.js';
import {narrativeSourceVisible} from '../../frameworks/narrative/public.js';
export function connectNativeEnvironmentNarrative(){return nativeEnvironmentNarrative.bind(narrativeSourceVisible);}

import {nativeNarrativeAudience,nativeEnvironmentSituation} from '../../frameworks/daggerheart/public.js';
import {narrativeAudienceSource,narrativeNativeEnvironment} from '../../frameworks/narrative/public.js';
/** Native environment provenance mints audiences through Narrative's original source; Narrative context reads native environment situations. */
export function connectNativeNarrativeAudience(){return nativeNarrativeAudience.bind({mintNarrativeAudience:narrativeAudienceSource.mintNarrativeAudience,revalidateNarrativeAudience:narrativeAudienceSource.revalidateNarrativeAudience});}
export function connectNarrativeNativeEnvironment(){return narrativeNativeEnvironment.bind({nativeEnvironmentSituation});}

import {nativeActionConsentSource,nativeTypedRollProof,nativeFearEffectSource} from '../../frameworks/daggerheart/public.js';
import {narrativeBridgeNativeSources} from '../../frameworks/narrative/public.js';
/** Pass native rules' original action, typed roll and Fear proofs to the Narrative-World bridge unchanged. */
export function connectNarrativeBridgeNativeSources(){return narrativeBridgeNativeSources.bind({completedActionSource:nativeActionConsentSource.completedActionSource,historicalActionSource:nativeActionConsentSource.historicalActionSource,typedRollProof:nativeTypedRollProof.typedRollProof,validateFearEffect:nativeFearEffectSource.validateFearEffect});}

import {nativeNarrativePvpOwner} from '../../frameworks/daggerheart/public.js';
import {pvpAgreementConsumer} from '../../frameworks/narrative/public.js';
export function connectNativeNarrativePvpOwner(){return nativeNarrativePvpOwner.bind({pvpOwnerContext:pvpAgreementConsumer.pvpOwnerContext});}

import {nativeNarrativeContext} from '../../frameworks/daggerheart/public.js';
import {narrativeAuthorityContextSource} from '../../frameworks/narrative/public.js';
export function connectNativeNarrativeContext(){return nativeNarrativeContext.bind({buildNarrativeContext:narrativeAuthorityContextSource.buildNarrativeContext});}
