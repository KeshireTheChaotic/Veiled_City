/** Existing source bindings; exact feature policy lives in Daggerheart. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {createNativeEnvironmentContainmentShuttersContext} from './frameworks/daggerheart/environment-rule-contexts.js';
let nativeContext;
function context(){return nativeContext??=createNativeEnvironmentContainmentShuttersContext({nativeEnvironmentInstanceForScope:(...args)=>nativeEnvironmentInstanceForScope(...args),environmentProposalContract:(...args)=>environmentProposalContract(...args),featureDisposition:(...args)=>featureDisposition(...args),nativeFeatureRuleContext:(...args)=>nativeFeatureRuleContext(...args)});}
export function projectNativeEnvironmentContainmentShuttersContext(...args){return context().projectNativeEnvironmentContainmentShuttersContext(...args);}
export function nativeEnvironmentContainmentShuttersSituation(...args){return context().nativeEnvironmentContainmentShuttersSituation(...args);}
