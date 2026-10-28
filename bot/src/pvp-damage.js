/** Native damage is a separate target-owned transaction, never narration or a narrative contest score. */
import {validatePvpAttackRoll,campaignAttackActorHash} from "./pvp-attacks.js";
import {validateDamagePvp} from "./pvp-profiles.js";
import {nativePersonalContinuity} from './frameworks/daggerheart/public.js';
function personalCharacter(...args){return nativePersonalContinuity.personalCharacter(...args);}
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {pendingPvpFear} from "./pvp-fear-gate.js";
import {buildActionPlan,transitionAction} from "./action-dependency.js";
import {completeBlazeAction,validatePcDeathOutcome} from "./pc-death.js";
import {assertPcAttackable} from "./pc-native-eligibility.js";
import {assertBrawlDamageSources,releaseBrawlLocks,pvpWindowDamageSources} from "./pvp-brawl.js";
import {drainActionContinuations} from "./action-continuation.js";
import {assertPvpSafety} from './pvp-campaign-policy.js';
import {reserveCampaignDamageNotice} from './native-publications.js';
import {createPvpDamageRules} from './frameworks/daggerheart/public.js';
let nativeDamage;
function rules(){return nativeDamage??=createPvpDamageRules({capabilities:{validatePvpAttackRoll:(...args)=>validatePvpAttackRoll(...args),campaignAttackActorHash:(...args)=>campaignAttackActorHash(...args),validateDamagePvp:(...args)=>validateDamagePvp(...args),personalCharacter:(...args)=>personalCharacter(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),pendingPvpFear:(...args)=>pendingPvpFear(...args),buildActionPlan:(...args)=>buildActionPlan(...args),transitionAction:(...args)=>transitionAction(...args),completeBlazeAction:(...args)=>completeBlazeAction(...args),validatePcDeathOutcome:(...args)=>validatePcDeathOutcome(...args),assertPcAttackable:(...args)=>assertPcAttackable(...args),assertBrawlDamageSources:(...args)=>assertBrawlDamageSources(...args),releaseBrawlLocks:(...args)=>releaseBrawlLocks(...args),pvpWindowDamageSources:(...args)=>pvpWindowDamageSources(...args),drainActionContinuations:(...args)=>drainActionContinuations(...args),assertPvpSafety:(...args)=>assertPvpSafety(...args),reserveCampaignDamageNotice:(...args)=>reserveCampaignDamageNotice(...args)}});}
export function rollPvpDamage(...args){return rules().rollPvpDamage(...args);}
export function validatePvpDamageRoll(...args){return rules().validatePvpDamageRoll(...args);}
export function preparePvpDamage(...args){return rules().preparePvpDamage(...args);}
export function prepareCampaignPvpDamage(...args){return rules().prepareCampaignPvpDamage(...args);}
export function refreshCampaignPvpDamage(...args){return rules().refreshCampaignPvpDamage(...args);}
export function pvpDamageOwnerStatus(...args){return rules().pvpDamageOwnerStatus(...args);}
export function reviewPvpDamage(...args){return rules().reviewPvpDamage(...args);}
export function resolvePvpDamage(...args){return rules().resolvePvpDamage(...args);}
export function validatePvpDamageApplication(...args){return rules().validatePvpDamageApplication(...args);}
export function settlePvpDamageAction(...args){return rules().settlePvpDamageAction(...args);}
