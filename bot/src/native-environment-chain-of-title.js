/** Existing source bindings; exact feature policy lives in Daggerheart. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {createNativeEnvironmentChainOfTitleContext} from './frameworks/daggerheart/environment-rule-contexts.js';
let nativeContext;
function context(){return nativeContext??=createNativeEnvironmentChainOfTitleContext({nativeEnvironmentInstanceForScope:(...args)=>nativeEnvironmentInstanceForScope(...args),environmentProposalContract:(...args)=>environmentProposalContract(...args),featureDisposition:(...args)=>featureDisposition(...args),nativeFeatureRuleContext:(...args)=>nativeFeatureRuleContext(...args)});}
export function projectNativeEnvironmentChainOfTitleContext(...args){return context().projectNativeEnvironmentChainOfTitleContext(...args);}
export function nativeEnvironmentChainOfTitleSituation(...args){return context().nativeEnvironmentChainOfTitleSituation(...args);}
