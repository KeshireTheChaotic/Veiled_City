/** Existing lazy source/condition composition shared by request and saved-roll readers. */
import {nativeConditionSource,nativeWorldEvents,EncounterLibrary} from './frameworks/daggerheart/public.js';
import {createFeatureRollConditionRules,featureRollSource} from './frameworks/daggerheart/feature-roll-source-rules.js';
let nativeRules,library;
function rules(){return nativeRules??=createFeatureRollConditionRules({
  resolveFeatureRollSource:(pc,input)=>featureRollSource(library??=new EncounterLibrary(process.env.CONTENT_ROOT||'../content'),pc,input),
  activeNativeConditions:(...args)=>nativeConditionSource.activeNativeConditions(...args),
  validateNativeCondition:(...args)=>nativeConditionSource.validateNativeCondition(...args),
  indexWorldEvent:(...args)=>nativeWorldEvents.indexWorldEvent(...args)});}
export function rollConditionContext(...args){return rules().rollConditionContext(...args);}
export function persistRollConditionContext(...args){return rules().persistRollConditionContext(...args);}
export function inspectSavedRollConditionContext(...args){return rules().inspectSavedRollConditionContext(...args);}
