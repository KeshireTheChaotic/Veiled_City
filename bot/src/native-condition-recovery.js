/** Native condition cleanup from an exact already-resolved owner action; no prose, dice or new costs. */
import {ordinaryActionProof,ordinaryPrerequisite} from './ordinary-effect-proof.js';
import {validateNativeCondition} from './native-group-features.js';
import {assertPcCanAct} from './pc-native-eligibility.js';
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}

import {createConditionRecoveryRules} from './frameworks/daggerheart/public.js';
let nativeRecovery;
function rules(){return nativeRecovery??=createConditionRecoveryRules({capabilities:{ordinaryActionProof:(...args)=>ordinaryActionProof(...args),ordinaryPrerequisite:(...args)=>ordinaryPrerequisite(...args),validateNativeCondition:(...args)=>validateNativeCondition(...args),assertPcCanAct:(...args)=>assertPcCanAct(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args)}});}
export function inspectNativeConditionClearAncestry(...args){return rules().inspectNativeConditionClearAncestry(...args);}
export function clearNativeConditionFromOutcome(...args){return rules().clearNativeConditionFromOutcome(...args);}
import {nativeConditionRecoverySource} from './frameworks/daggerheart/public.js';
// Provide this module's original condition recovery to the fixed native slot; no other authority is granted.
nativeConditionRecoverySource.bind({clearNativeConditionFromOutcome});
