/** Private non-actionable action review through authenticated owner/GM adapters; never a new effect executor. */
import {consentAction} from "./action-consent.js";
import {personalCharacter} from "./personal-continuity.js";
import {indexWorldEvent} from "./city-calendar.js";
import {adjudicateGmRuling} from "./gm-action-ruling.js";
import {currentScene} from "./scene-continuity.js";
import {recordOwnerActionTerminal} from "./owner-action-terminal.js";
import {ordinaryActionProof} from './ordinary-effect-proof.js';
import {applyOrdinaryEffects} from './ordinary-effects.js';
import {conversationPrincipal} from './conversation-principal.js';

import {createGmActionReviewRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createGmActionReviewRules({capabilities:{consentAction:(...args)=>consentAction(...args),personalCharacter:(...args)=>personalCharacter(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),adjudicateGmRuling:(...args)=>adjudicateGmRuling(...args),currentScene:(...args)=>currentScene(...args),recordOwnerActionTerminal:(...args)=>recordOwnerActionTerminal(...args),ordinaryActionProof:(...args)=>ordinaryActionProof(...args),applyOrdinaryEffects:(...args)=>applyOrdinaryEffects(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args)}});}
export function actionReviewInbox(...args){return rules().actionReviewInbox(...args);}
export function actionReviewOperation(...args){return rules().actionReviewOperation(...args);}
