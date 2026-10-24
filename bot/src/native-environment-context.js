/** Exact encounter environment provenance. Planning/eligibility only, never an effect or disclosure grant. */
import {EncounterLibrary} from './encounter.js';
import {currentScene} from './scene-continuity.js';
import {executableNativeFeatures,nativeActorTaxonomy,nativeFeatureRuleContextsForTemplate} from './native-feature-catalog.js';
import {inspectNativeEncounterActivation} from './native-encounter-activation.js';

/** A template name alone, manually fabricated source object or model actor label is insufficient.
 * The existing encounter review establishes the template/location. It does not establish any
 * feature-specific device, clue, target, owner decision or consequence described by that template.
 */
import {createEnvironmentBindingRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentBindingRules({capabilities:{EncounterLibrary,currentScene:(...args)=>currentScene(...args),executableNativeFeatures:(...args)=>executableNativeFeatures(...args),nativeActorTaxonomy:(...args)=>nativeActorTaxonomy(...args),nativeFeatureRuleContextsForTemplate:(...args)=>nativeFeatureRuleContextsForTemplate(...args),inspectNativeEncounterActivation:(...args)=>inspectNativeEncounterActivation(...args)}});}
export function nativeEnvironmentBinding(...args){return rules().nativeEnvironmentBinding(...args);}
export function inspectNativeEnvironmentBinding(...args){return rules().inspectNativeEnvironmentBinding(...args);}
