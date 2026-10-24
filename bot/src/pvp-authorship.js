import {reservePvpProjection} from "./native-publications.js";
import { pvpOwnerContext } from "./narrative-pvp.js";
import { indexWorldEvent } from "./city-calendar.js";
export { assertPvpOutput } from "./pvp-output.js";
import {createPvpAuthorshipRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createPvpAuthorshipRules({capabilities:{reservePvpProjection:(...args)=>reservePvpProjection(...args),pvpOwnerContext:(...args)=>pvpOwnerContext(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args)}});}
export function draftPvpNarrative(...args){return rules().draftPvpNarrative(...args);}
export function authorPvpNarrative(...args){return rules().authorPvpNarrative(...args);}
export function pvpNarrationInbox(...args){return rules().pvpNarrationInbox(...args);}
export function reviewPvpDraft(...args){return rules().reviewPvpDraft(...args);}
export function ratifyPvpClause(...args){return rules().ratifyPvpClause(...args);}
export function validatePvpClause(...args){return rules().validatePvpClause(...args);}
export function reviewPvpNarrative(...args){return rules().reviewPvpNarrative(...args);}
export function sharePvpNarrative(...args){return rules().sharePvpNarrative(...args);}
export function pvpProjection(...args){return rules().pvpProjection(...args);}
export function reviewPvpScope(...args){return rules().reviewPvpScope(...args);}
