/** Existing source, native verifier and notice composition for Daggerheart feature effects. */
import {inspectNativeGmDecision} from './gm-action-capability.js';
import {inspectFeatureWindow} from './native-feature-windows.js';
import {typedRollProof} from './typed-roll-proof.js';
import {indexWorldEvent} from './city-calendar.js';
import {groupReactionState,applyGroupReactionOutcome,settleGroupFeature} from './native-group-features.js';
import {reserveGmArbitrationNotice} from './native-publications.js';
import {applyNativeStressPassive} from './native-stress-passives.js';
import {createFeatureEffectRules} from './frameworks/daggerheart/public.js';
export {nativeDeviceUseIssue} from './frameworks/daggerheart/device-use-eligibility.js';
let nativeEffects;
function rules(){return nativeEffects??=createFeatureEffectRules({source:{indexWorldEvent:(...args)=>indexWorldEvent(...args)},mechanics:{inspectNativeGmDecision:(...args)=>inspectNativeGmDecision(...args),inspectFeatureWindow:(...args)=>inspectFeatureWindow(...args),typedRollProof:(...args)=>typedRollProof(...args),groupReactionState:(...args)=>groupReactionState(...args),applyGroupReactionOutcome:(...args)=>applyGroupReactionOutcome(...args),settleGroupFeature:(...args)=>settleGroupFeature(...args),applyNativeStressPassive:(...args)=>applyNativeStressPassive(...args)},notices:{reserveGmArbitrationNotice:(...args)=>reserveGmArbitrationNotice(...args)}});}
export function featureReactionStakes(...args){return rules().featureReactionStakes(...args);}
export function validateFeatureInvitation(...args){return rules().validateFeatureInvitation(...args);}
export function cancelFeatureReaction(...args){return rules().cancelFeatureReaction(...args);}
export function applyFeatureReactionOutcome(...args){return rules().applyFeatureReactionOutcome(...args);}
export function validateFeatureReactionEffect(...args){return rules().validateFeatureReactionEffect(...args);}
