/** Exact encounter environment provenance. Planning/eligibility only, never an effect or disclosure grant. */
import {EncounterLibrary} from './encounter-library.js';
import {nativeScenes} from './contracts/scenes.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}
import {executableNativeFeatures,nativeActorTaxonomy,nativeFeatureRuleContextsForTemplate} from './native-feature-catalog.js';
import {inspectNativeEncounterActivation} from './encounter-activation-service.js';

/** A template name alone, manually fabricated source object or model actor label is insufficient.
 * The existing encounter review establishes the template/location. It does not establish any
 * feature-specific device, clue, target, owner decision or consequence described by that template.
 */
import {createEnvironmentBindingRules} from './environment-binding-rules.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentBindingRules({capabilities:{EncounterLibrary,currentScene:(...args)=>currentScene(...args),executableNativeFeatures:(...args)=>executableNativeFeatures(...args),nativeActorTaxonomy:(...args)=>nativeActorTaxonomy(...args),nativeFeatureRuleContextsForTemplate:(...args)=>nativeFeatureRuleContextsForTemplate(...args),inspectNativeEncounterActivation:(...args)=>inspectNativeEncounterActivation(...args)}});}
export function nativeEnvironmentBinding(...args){return rules().nativeEnvironmentBinding(...args);}
export function inspectNativeEnvironmentBinding(...args){return rules().inspectNativeEnvironmentBinding(...args);}
