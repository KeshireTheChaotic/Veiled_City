/** Existing source bindings; exact feature policy lives in Daggerheart. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {createNativeEnvironmentNoOrdinarySignalContext} from './environment-rule-contexts.js';
let nativeContext;
function context(){return nativeContext??=createNativeEnvironmentNoOrdinarySignalContext({nativeEnvironmentInstanceForScope:(...args)=>nativeEnvironmentInstanceForScope(...args),environmentProposalContract:(...args)=>environmentProposalContract(...args),featureDisposition:(...args)=>featureDisposition(...args),nativeFeatureRuleContext:(...args)=>nativeFeatureRuleContext(...args)});}
export function projectNativeEnvironmentNoOrdinarySignalContext(...args){return context().projectNativeEnvironmentNoOrdinarySignalContext(...args);}
export function nativeEnvironmentNoOrdinarySignalSituation(...args){return context().nativeEnvironmentNoOrdinarySignalSituation(...args);}
