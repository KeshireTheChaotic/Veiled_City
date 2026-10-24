/** Existing source bindings; exact feature policy lives in Daggerheart. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {createNativeEnvironmentThreeVectorsContext} from './frameworks/daggerheart/environment-rule-contexts.js';
let nativeContext;
function context(){return nativeContext??=createNativeEnvironmentThreeVectorsContext({nativeEnvironmentInstanceForScope:(...args)=>nativeEnvironmentInstanceForScope(...args),environmentProposalContract:(...args)=>environmentProposalContract(...args),featureDisposition:(...args)=>featureDisposition(...args),nativeFeatureRuleContext:(...args)=>nativeFeatureRuleContext(...args)});}
export function projectNativeEnvironmentThreeVectorsContext(...args){return context().projectNativeEnvironmentThreeVectorsContext(...args);}
export function nativeEnvironmentThreeVectorsSituation(...args){return context().nativeEnvironmentThreeVectorsSituation(...args);}
