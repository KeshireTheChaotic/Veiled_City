/** Receipt-first action/narration reconciliation; prose projects outcomes but never creates them. */
import { pvpAttemptKey,pvpTarget } from "./pvp-authority.js";
import {consentAction} from './action-consent.js';
import { validateDamageAttackIntent } from "./pvp-profiles.js";
import {typedRollProof} from "./typed-roll-proof.js";

import {createConsequenceReconciliationRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createConsequenceReconciliationRules({capabilities:{pvpAttemptKey:(...args)=>pvpAttemptKey(...args),pvpTarget:(...args)=>pvpTarget(...args),consentAction:(...args)=>consentAction(...args),validateDamageAttackIntent:(...args)=>validateDamageAttackIntent(...args),typedRollProof:(...args)=>typedRollProof(...args)}});}
export function reconcileConsequences(...args){return rules().reconcileConsequences(...args);}
