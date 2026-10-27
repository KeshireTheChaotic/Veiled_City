/** Existing source bindings; exact feature policy lives in Daggerheart. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {createNativeEnvironmentMarketNeutralityContext} from './environment-rule-contexts.js';
let nativeContext;
function context(){return nativeContext??=createNativeEnvironmentMarketNeutralityContext({nativeEnvironmentInstanceForScope:(...args)=>nativeEnvironmentInstanceForScope(...args),environmentProposalContract:(...args)=>environmentProposalContract(...args),featureDisposition:(...args)=>featureDisposition(...args),nativeFeatureRuleContext:(...args)=>nativeFeatureRuleContext(...args)});}
export function projectNativeEnvironmentMarketNeutralityContext(...args){return context().projectNativeEnvironmentMarketNeutralityContext(...args);}
export function nativeEnvironmentMarketNeutralitySituation(...args){return context().nativeEnvironmentMarketNeutralitySituation(...args);}
