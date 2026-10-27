/** Existing source bindings; exact feature policy lives in Daggerheart. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {createNativeEnvironmentThinWallsContext} from './environment-rule-contexts.js';
let nativeContext;
function context(){return nativeContext??=createNativeEnvironmentThinWallsContext({nativeEnvironmentInstanceForScope:(...args)=>nativeEnvironmentInstanceForScope(...args),environmentProposalContract:(...args)=>environmentProposalContract(...args),featureDisposition:(...args)=>featureDisposition(...args),nativeFeatureRuleContext:(...args)=>nativeFeatureRuleContext(...args)});}
export function projectNativeEnvironmentThinWallsContext(...args){return context().projectNativeEnvironmentThinWallsContext(...args);}
export function nativeEnvironmentThinWallsSituation(...args){return context().nativeEnvironmentThinWallsSituation(...args);}
