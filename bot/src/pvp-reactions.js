/** Source-backed hazard reactions during PvP reuse native owner roll requests; they never change an independent attack. */
import {validatePvpAttackRoll} from "./pvp-attacks.js";
import {consentAction,completedActionSource} from "./action-consent.js";
import {nativePersonalContinuity} from './frameworks/daggerheart/public.js';
function personalCharacter(...args){return nativePersonalContinuity.personalCharacter(...args);}
import {prepareRollRequest,formatRollRequest,rollRevision} from "./roll-requests.js";
import {adjudicateRollSource,contributeRoll} from "./roll-collaboration.js";

import {createPvpReactionRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createPvpReactionRules({capabilities:{validatePvpAttackRoll:(...args)=>validatePvpAttackRoll(...args),consentAction:(...args)=>consentAction(...args),completedActionSource:(...args)=>completedActionSource(...args),personalCharacter:(...args)=>personalCharacter(...args),prepareRollRequest:(...args)=>prepareRollRequest(...args),formatRollRequest:(...args)=>formatRollRequest(...args),rollRevision:(...args)=>rollRevision(...args),adjudicateRollSource:(...args)=>adjudicateRollSource(...args),contributeRoll:(...args)=>contributeRoll(...args)}});}
export function preparePvpReaction(...args){return rules().preparePvpReaction(...args);}
export function reviewPvpReaction(...args){return rules().reviewPvpReaction(...args);}
export function rollPvpReaction(...args){return rules().rollPvpReaction(...args);}
