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
