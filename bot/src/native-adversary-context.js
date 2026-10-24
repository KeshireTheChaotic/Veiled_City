/** Bound existing adversary provenance, never NPC creation, statistics, knowledge or execution permission. */
import {nativeEncounterActor} from './native-encounter-relations.js';
import {nativeActorControl} from './native-actor-control.js';
import {inspectArbitrationOrigin} from './scene-intent-board.js';
import {executableNativeFeatures,featureDisposition,nativeFeatureRuleContext,nativeFeatureRuleContextsForTemplate} from './native-feature-catalog.js';
import {createAdversaryBindingRules} from './frameworks/daggerheart/public.js';
let nativeBinding;
function rules(){return nativeBinding??=createAdversaryBindingRules({capabilities:{nativeEncounterActor:(...args)=>nativeEncounterActor(...args),nativeActorControl:(...args)=>nativeActorControl(...args),inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),executableNativeFeatures:(...args)=>executableNativeFeatures(...args),featureDisposition:(...args)=>featureDisposition(...args),nativeFeatureRuleContext:(...args)=>nativeFeatureRuleContext(...args),nativeFeatureRuleContextsForTemplate:(...args)=>nativeFeatureRuleContextsForTemplate(...args)}});}
export function nativeAdversaryFeatureContext(...args){return rules().nativeAdversaryFeatureContext(...args);}
export function inspectNativeAdversaryFeatureContext(...args){return rules().inspectNativeAdversaryFeatureContext(...args);}
export function requireNativeAdversaryFeature(...args){return rules().requireNativeAdversaryFeature(...args);}
