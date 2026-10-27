import {createPvpAgreementRules} from '../../frameworks/daggerheart/public.js';
import {createPvpAgreementConsumer} from '../../frameworks/narrative/public.js';
/** Exact narrative source capabilities feed native agreement authority; no policy copied to the adapter. */
export function connectPvpAgreements({capabilities,consumer=createPvpAgreementConsumer()}){
 return consumer.bind(createPvpAgreementRules({capabilities}));
}

import {nativeEnvironmentNarrative} from '../../frameworks/daggerheart/public.js';
import {narrativeSourceVisible} from '../../frameworks/narrative/public.js';
export function connectNativeEnvironmentNarrative(){return nativeEnvironmentNarrative.bind(narrativeSourceVisible);}
