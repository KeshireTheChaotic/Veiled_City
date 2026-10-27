/** Provider for native pvp-campaign-policy policy. */
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {cancelBrawlForSafety} from './pvp-brawl.js';
import {createPvpSafetyRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createPvpSafetyRules({capabilities:{indexWorldEvent:(...args)=>indexWorldEvent(...args),cancelBrawlForSafety:(...args)=>cancelBrawlForSafety(...args)}});}
export function campaignPvpPolicy(...args){return rules().campaignPvpPolicy(...args);}
export function setCampaignPvpMode(...args){return rules().setCampaignPvpMode(...args);}
export function setPvpSafetyStop(...args){return rules().setPvpSafetyStop(...args);}
export function assertPvpSafety(...args){return rules().assertPvpSafety(...args);}
export function pvpSafetyStatus(...args){return rules().pvpSafetyStatus(...args);}
