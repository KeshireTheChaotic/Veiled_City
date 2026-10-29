import {reservePvpNotices} from "./native-publications.js";
import { consentAction } from "./action-consent.js";
import {narrativeSessionPrincipal} from './frameworks/narrative/public.js';
function conversationPrincipal(...args){return narrativeSessionPrincipal.conversationPrincipal(...args);}
import { currentScene } from "./scene-continuity.js";
import { indexWorldEvent } from "./city-calendar.js";
import { TRAITS } from "./character-system.js";
import { isPvpIntent, pvpTarget, pvpAttemptKey } from "./pvp-authority.js";
import { settlePvpWindow } from "./pvp-terminal.js";
import {drainActionContinuations} from "./action-continuation.js";
import { closePartialFearGate } from "./pvp-fear-gate.js";
import { stageDamagePvp } from "./pvp-profiles.js";
import {assertPvpSafety,campaignPvpPolicy} from './pvp-campaign-policy.js';
export { choosePvp, rollPvp, progressPvp, continuePvp, authorPvpNarrative, reviewPvpNarrative, sharePvpNarrative, pvpComplication } from "./pvp-rounds.js";
import {pvpAgreementConsumer} from './frameworks/narrative/contracts/pvp-agreement.js';
export function pvpAgreementCapabilities(){return {TRAITS,reservePvpNotices:(...args)=>reservePvpNotices(...args),consentAction:(...args)=>consentAction(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),currentScene:(...args)=>currentScene(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),isPvpIntent:(...args)=>isPvpIntent(...args),pvpTarget:(...args)=>pvpTarget(...args),pvpAttemptKey:(...args)=>pvpAttemptKey(...args),settlePvpWindow:(...args)=>settlePvpWindow(...args),drainActionContinuations:(...args)=>drainActionContinuations(...args),closePartialFearGate:(...args)=>closePartialFearGate(...args),stageDamagePvp:(...args)=>stageDamagePvp(...args),assertPvpSafety:(...args)=>assertPvpSafety(...args),campaignPvpPolicy:(...args)=>campaignPvpPolicy(...args)};}
export function pvpOwnerContext(...args){return pvpAgreementConsumer.pvpOwnerContext(...args);}
export function proposePvp(...args){return pvpAgreementConsumer.proposePvp(...args);}
export function reviewPvp(...args){return pvpAgreementConsumer.reviewPvp(...args);}
export function pvpInbox(...args){return pvpAgreementConsumer.pvpInbox(...args);}
export function revisePvp(...args){return pvpAgreementConsumer.revisePvp(...args);}
export function validatePvpAgreement(...args){return pvpAgreementConsumer.validatePvpAgreement(...args);}
export function respondPvp(...args){return pvpAgreementConsumer.respondPvp(...args);}
export function stagePvpAttempts(...args){return pvpAgreementConsumer.stagePvpAttempts(...args);}
pvpAgreementConsumer.provideSources(pvpAgreementCapabilities);
