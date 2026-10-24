/** Existing source bindings; exact feature policy lives in Daggerheart. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {createNativeEnvironmentConsensusEngineContext} from './frameworks/daggerheart/environment-rule-contexts.js';
let nativeContext;
function context(){return nativeContext??=createNativeEnvironmentConsensusEngineContext({nativeEnvironmentInstanceForScope:(...args)=>nativeEnvironmentInstanceForScope(...args),environmentProposalContract:(...args)=>environmentProposalContract(...args),featureDisposition:(...args)=>featureDisposition(...args),nativeFeatureRuleContext:(...args)=>nativeFeatureRuleContext(...args)});}
export function projectNativeEnvironmentConsensusEngineContext(...args){return context().projectNativeEnvironmentConsensusEngineContext(...args);}
export function nativeEnvironmentConsensusEngineSituation(...args){return context().nativeEnvironmentConsensusEngineSituation(...args);}
