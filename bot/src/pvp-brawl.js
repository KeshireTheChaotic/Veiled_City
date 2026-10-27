import {nativeSessionActionWindow} from './frameworks/daggerheart/public.js';
const openActionWindow=(...args)=>nativeSessionActionWindow.openActionWindow(...args);
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {validateDamagePvp} from "./pvp-profiles.js";
import {personalCharacter} from "./personal-continuity.js";
import {nativePrincipals} from './frameworks/daggerheart/public.js';
function conversationPrincipal(...args){return nativePrincipals.conversationPrincipal(...args);}
import {validatePvpAttackRoll,attackReviewAuthority} from "./pvp-attacks.js";
import {blazeActionAuthorization} from "./pc-death.js";
import {assertPvpSafety,pvpSafetyStatus} from './pvp-campaign-policy.js';
import {validateCampaignPvp} from './pvp-campaign-execution.js';
import {createPvpBrawlRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createPvpBrawlRules({capabilities:{openActionWindow:(...args)=>openActionWindow(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),validateDamagePvp:(...args)=>validateDamagePvp(...args),personalCharacter:(...args)=>personalCharacter(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),validatePvpAttackRoll:(...args)=>validatePvpAttackRoll(...args),attackReviewAuthority:(...args)=>attackReviewAuthority(...args),blazeActionAuthorization:(...args)=>blazeActionAuthorization(...args),assertPvpSafety:(...args)=>assertPvpSafety(...args),pvpSafetyStatus:(...args)=>pvpSafetyStatus(...args),validateCampaignPvp:(...args)=>validateCampaignPvp(...args)}});}
export function brawlAdmission(...args){return rules().brawlAdmission(...args);}
export function reserveBrawlAttack(...args){return rules().reserveBrawlAttack(...args);}
export function verifyBrawlAttack(...args){return rules().verifyBrawlAttack(...args);}
export function consumeBrawlAttack(...args){return rules().consumeBrawlAttack(...args);}
export function brawlBatchMayFinish(...args){return rules().brawlBatchMayFinish(...args);}
export function assertBrawlFearOrder(...args){return rules().assertBrawlFearOrder(...args);}
export function orderedBrawlFear(...args){return rules().orderedBrawlFear(...args);}
export function assertBrawlDamageSources(...args){return rules().assertBrawlDamageSources(...args);}
export function pvpWindowDamageSources(...args){return rules().pvpWindowDamageSources(...args);}
export function releaseBrawlLocks(...args){return rules().releaseBrawlLocks(...args);}
export function cancelBrawlForWithdrawal(...args){return rules().cancelBrawlForWithdrawal(...args);}
export function cancelBrawlForSafety(...args){return rules().cancelBrawlForSafety(...args);}
export function reviewBrawlOpportunity(...args){return rules().reviewBrawlOpportunity(...args);}
export function passBrawlOpportunity(...args){return rules().passBrawlOpportunity(...args);}
