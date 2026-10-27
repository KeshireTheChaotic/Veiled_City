/** V4 campaign attack scope. Policy is permission to adjudicate, never another owner's consent. */
import {campaignPvpPolicy,assertPvpSafety} from './pvp-campaign-policy.js';
import {consentAction,historicalActionSource} from './action-consent.js';
import {nativePrincipals} from './frameworks/daggerheart/public.js';
function conversationPrincipal(...args){return nativePrincipals.conversationPrincipal(...args);}function historicalOwnerPrincipal(...args){return nativePrincipals.historicalOwnerPrincipal(...args);}
import {pvpTarget} from './pvp-authority.js';
import {nativeScenes} from './frameworks/daggerheart/public.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}function scenePresence(...args){return nativeScenes.scenePresence(...args);}
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}

import {createPvpCampaignScopeRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createPvpCampaignScopeRules({capabilities:{campaignPvpPolicy:(...args)=>campaignPvpPolicy(...args),assertPvpSafety:(...args)=>assertPvpSafety(...args),consentAction:(...args)=>consentAction(...args),historicalActionSource:(...args)=>historicalActionSource(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),historicalOwnerPrincipal:(...args)=>historicalOwnerPrincipal(...args),pvpTarget:(...args)=>pvpTarget(...args),currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args)}});}
export function stageCampaignPvp(...args){return rules().stageCampaignPvp(...args);}
export function validateCampaignPvp(...args){return rules().validateCampaignPvp(...args);}
