/** Transitional immutable native source loader. Catalog rules are implemented in Daggerheart; old consumer integration remains recorded debt. */
import fs from 'node:fs';
import {createNativeFeatureCatalog} from './frameworks/daggerheart/public.js';
const read=relative=>JSON.parse(fs.readFileSync(new URL(relative,import.meta.url),'utf8'));
const catalog=createNativeFeatureCatalog({definitions:read('./frameworks/daggerheart/native-feature-definitions.json'),authoredRules:read('./frameworks/daggerheart/native-house-errata.json'),readAdversaries:()=>read('../../content/GM_PRIVATE/ADVERSARIES/adversaries.json'),readEnvironments:()=>read('../../content/GM_PRIVATE/ENVIRONMENTS/environments.json')});
export function inspectNativeFeatureOccurrence(...args){return catalog.inspectNativeFeatureOccurrence(...args);}
export function compileNativeFeatures(...args){return catalog.compileNativeFeatures(...args);}
export function featureDisposition(...args){return catalog.featureDisposition(...args);}
export function executableNativeFeatures(...args){return catalog.executableNativeFeatures(...args);}
export function compileNativeFeatureRuleContexts(...args){return catalog.compileNativeFeatureRuleContexts(...args);}
export function nativeFeatureRuleContext(...args){return catalog.nativeFeatureRuleContext(...args);}
export function nativeFeatureRuleContextsForTemplate(...args){return catalog.nativeFeatureRuleContextsForTemplate(...args);}
export function compileNativeActors(...args){return catalog.compileNativeActors(...args);}
export function nativeActorTaxonomy(...args){return catalog.nativeActorTaxonomy(...args);}
export function nativeSignalFeatureTarget(...args){return catalog.nativeSignalFeatureTarget(...args);}
