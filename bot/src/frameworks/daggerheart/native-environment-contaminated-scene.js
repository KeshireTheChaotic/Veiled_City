/** Existing source bindings; exact feature policy lives in Daggerheart. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {createNativeEnvironmentContaminatedSceneContext} from './environment-rule-contexts.js';
let nativeContext;
function context(){return nativeContext??=createNativeEnvironmentContaminatedSceneContext({nativeEnvironmentInstanceForScope:(...args)=>nativeEnvironmentInstanceForScope(...args),environmentProposalContract:(...args)=>environmentProposalContract(...args),featureDisposition:(...args)=>featureDisposition(...args),nativeFeatureRuleContext:(...args)=>nativeFeatureRuleContext(...args)});}
export function projectNativeEnvironmentContaminatedSceneContext(...args){return context().projectNativeEnvironmentContaminatedSceneContext(...args);}
export function nativeEnvironmentContaminatedSceneSituation(...args){return context().nativeEnvironmentContaminatedSceneSituation(...args);}
