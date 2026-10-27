/** V3 damage/group consent. Accepted intent is input; these agreements never mint dice or effects. */
import {consentAction,historicalActionSource} from "./action-consent.js";
import {conversationPrincipal,historicalOwnerPrincipal} from "./conversation-principal.js";
import {nativeScenes} from './frameworks/daggerheart/public.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {isPvpIntent,pvpTarget} from "./pvp-authority.js";
import {cancelBrawlForWithdrawal} from "./pvp-brawl.js";
import {assertPvpSafety} from './pvp-campaign-policy.js';
import {stageCampaignPvp,validateCampaignPvp} from './pvp-campaign-execution.js';

import {createPvpProfileRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createPvpProfileRules({capabilities:{consentAction:(...args)=>consentAction(...args),historicalActionSource:(...args)=>historicalActionSource(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),historicalOwnerPrincipal:(...args)=>historicalOwnerPrincipal(...args),currentScene:(...args)=>currentScene(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),isPvpIntent:(...args)=>isPvpIntent(...args),pvpTarget:(...args)=>pvpTarget(...args),cancelBrawlForWithdrawal:(...args)=>cancelBrawlForWithdrawal(...args),assertPvpSafety:(...args)=>assertPvpSafety(...args),stageCampaignPvp:(...args)=>stageCampaignPvp(...args),validateCampaignPvp:(...args)=>validateCampaignPvp(...args)}});}
export function proposeDamagePvp(...args){return rules().proposeDamagePvp(...args);}
export function reviewDamagePvp(...args){return rules().reviewDamagePvp(...args);}
export function damagePvpOwnerContext(...args){return rules().damagePvpOwnerContext(...args);}
export function validateDamagePvp(...args){return rules().validateDamagePvp(...args);}
export function respondDamagePvp(...args){return rules().respondDamagePvp(...args);}
export function reviseDamagePvp(...args){return rules().reviseDamagePvp(...args);}
export function damagePvpInbox(...args){return rules().damagePvpInbox(...args);}
export function damagePvpEligibility(...args){return rules().damagePvpEligibility(...args);}
export function stageDamagePvp(...args){return rules().stageDamagePvp(...args);}
export function validateDamageAttackIntent(...args){return rules().validateDamageAttackIntent(...args);}
