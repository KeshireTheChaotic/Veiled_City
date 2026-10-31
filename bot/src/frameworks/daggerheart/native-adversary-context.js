/** Bound existing adversary provenance, never NPC creation, statistics, knowledge or execution permission. */
import {nativeEncounterActorSource} from './contracts/encounter-actor-source.js';
const {nativeEncounterActor}=nativeEncounterActorSource;
import {nativeActorControl} from './actor-control-source.js';
import {nativeArbitrationOrigin} from './contracts/environment-sources.js';
const {inspectArbitrationOrigin}=nativeArbitrationOrigin;
import {executableNativeFeatures,featureDisposition,nativeFeatureRuleContext,nativeFeatureRuleContextsForTemplate} from './native-feature-catalog.js';
import {createAdversaryBindingRules} from './adversary-binding-rules.js';
let nativeBinding;
function rules(){return nativeBinding??=createAdversaryBindingRules({capabilities:{nativeEncounterActor:(...args)=>nativeEncounterActor(...args),nativeActorControl:(...args)=>nativeActorControl(...args),inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),executableNativeFeatures:(...args)=>executableNativeFeatures(...args),featureDisposition:(...args)=>featureDisposition(...args),nativeFeatureRuleContext:(...args)=>nativeFeatureRuleContext(...args),nativeFeatureRuleContextsForTemplate:(...args)=>nativeFeatureRuleContextsForTemplate(...args)}});}
export function nativeAdversaryFeatureContext(...args){return rules().nativeAdversaryFeatureContext(...args);}
export function inspectNativeAdversaryFeatureContext(...args){return rules().inspectNativeAdversaryFeatureContext(...args);}
export function requireNativeAdversaryFeature(...args){return rules().requireNativeAdversaryFeature(...args);}
