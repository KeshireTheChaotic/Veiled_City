/** Existing source bindings; exact feature policy lives in Daggerheart. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {createNativeEnvironmentLastTrainRulesContext} from './frameworks/daggerheart/environment-rule-contexts.js';
let nativeContext;
function context(){return nativeContext??=createNativeEnvironmentLastTrainRulesContext({nativeEnvironmentInstanceForScope:(...args)=>nativeEnvironmentInstanceForScope(...args),environmentProposalContract:(...args)=>environmentProposalContract(...args),featureDisposition:(...args)=>featureDisposition(...args),nativeFeatureRuleContext:(...args)=>nativeFeatureRuleContext(...args)});}
export function projectNativeEnvironmentLastTrainRulesContext(...args){return context().projectNativeEnvironmentLastTrainRulesContext(...args);}
export function nativeEnvironmentLastTrainRulesSituation(...args){return context().nativeEnvironmentLastTrainRulesSituation(...args);}
