/** Source-pinned on-hit errata. Native hit/Fear ancestry, not a GM d20 face or model claim, authorizes the effect. */
import {compileNativeFeatures} from './native-feature-catalog.js';
import {nativeHouseErratum} from './native-house-errata.js';
import {inspectNativeGmDecision} from './gm-action-capability.js';
import {typedRollProof} from './typed-roll-proof.js';
import {validateIncomingDamageApplication,incomingAttackEvidence} from './pc-incoming.js';
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {applyNativeStressPassive} from './native-stress-passives.js';

import {createAdversaryHitRules} from './frameworks/daggerheart/public.js';
let nativeHit;
function rules(){return nativeHit??=createAdversaryHitRules({capabilities:{compileNativeFeatures:(...args)=>compileNativeFeatures(...args),nativeHouseErratum:(...args)=>nativeHouseErratum(...args),inspectNativeGmDecision:(...args)=>inspectNativeGmDecision(...args),typedRollProof:(...args)=>typedRollProof(...args),validateIncomingDamageApplication:(...args)=>validateIncomingDamageApplication(...args),incomingAttackEvidence:(...args)=>incomingAttackEvidence(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),applyNativeStressPassive:(...args)=>applyNativeStressPassive(...args)}});}
export function nativeHitFeatureCandidates(...args){return rules().nativeHitFeatureCandidates(...args);}
export function inspectManyDeathsEffect(...args){return rules().inspectManyDeathsEffect(...args);}
export function applyManyDeathsAfterIncoming(...args){return rules().applyManyDeathsAfterIncoming(...args);}
