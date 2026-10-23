/** Existing provider composition only; native policy is implemented in Daggerheart. */
import { ownedRollRequest } from "./roll-requests.js";
import {recordNativeExperienceEligibility,inspectNativeExperienceEligibility} from './native-experience-eligibility.js';
import {inspectNativeUnarmedAttack} from './native-unarmed-attacks.js';
import {createRollOptionRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createRollOptionRules({
requests:{ownedRollRequest:(...args)=>ownedRollRequest(...args)},
mechanics:{recordNativeExperienceEligibility:(...args)=>recordNativeExperienceEligibility(...args),inspectNativeExperienceEligibility:(...args)=>inspectNativeExperienceEligibility(...args),inspectNativeUnarmedAttack:(...args)=>inspectNativeUnarmedAttack(...args)}
});}
export function discoverRollOptions(...args){return rules().discoverRollOptions(...args);}
export function arbitrateRollOptions(...args){return rules().arbitrateRollOptions(...args);}
