/** One source-bound pre-roll NPC spotlight, never paid by the interrupted action's future Fear result. */
import {nativeArbitrationOrigin} from './frameworks/daggerheart/public.js';
const {inspectArbitrationOrigin}=nativeArbitrationOrigin;
import {consentAction,historicalActionSource} from './action-consent.js';
import {nativePrincipals} from './frameworks/daggerheart/public.js';
function conversationPrincipal(...args){return nativePrincipals.conversationPrincipal(...args);}
import {nativeScenes} from './frameworks/daggerheart/public.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}
import {nativeEnvironmentNarrative} from './frameworks/daggerheart/public.js';
function narrativeSourceVisible(...args){return nativeEnvironmentNarrative.narrativeSourceVisible(...args);}
import {incomingAttackEvidence,incomingRollProjection} from './pc-incoming.js';
import {revalidateOutputPublication} from './pvp-output.js';
import {assertPreRollFearDeathTerminal} from './pre-roll-fear-recovery.js';
import {inspectPvpAttackRequest} from './pvp-attacks.js';
import {inspectUnrolledInterruptRequest} from './roll-collaboration.js';
import {validatePcDeathOutcome} from './pc-death.js';
import {fearReservationHash as hash,fearReservationFailure as fail,inspectFearReservation,writeFearReservation,
  reservedCampaignFear} from './fear-reservations.js';

import {createPreRollFearRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createPreRollFearRules({sources:{inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),consentAction:(...args)=>consentAction(...args),historicalActionSource:(...args)=>historicalActionSource(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),currentScene:(...args)=>currentScene(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args)},mechanics:{incomingAttackEvidence:(...args)=>incomingAttackEvidence(...args),incomingRollProjection:(...args)=>incomingRollProjection(...args),assertPreRollFearDeathTerminal:(...args)=>assertPreRollFearDeathTerminal(...args),inspectPvpAttackRequest:(...args)=>inspectPvpAttackRequest(...args),inspectUnrolledInterruptRequest:(...args)=>inspectUnrolledInterruptRequest(...args),validatePcDeathOutcome:(...args)=>validatePcDeathOutcome(...args)},publication:{revalidateOutputPublication:(...args)=>revalidateOutputPublication(...args)},writeFearReservation:(...args)=>writeFearReservation(...args)});}
export function reservePreRollFear(...args){return rules().reservePreRollFear(...args);}
export function inspectPreRollFear(...args){return rules().inspectPreRollFear(...args);}
export function preRollFearOpportunity(...args){return rules().preRollFearOpportunity(...args);}
export function preRollFearCandidates(...args){return rules().preRollFearCandidates(...args);}
export function bindPreRollFearBoard(...args){return rules().bindPreRollFearBoard(...args);}
export function assertPreRollFearAcknowledged(...args){return rules().assertPreRollFearAcknowledged(...args);}
export function commitPreRollFearCost(...args){return rules().commitPreRollFearCost(...args);}
export function cancelPreRollFear(...args){return rules().cancelPreRollFear(...args);}
export function settlePreRollFearForIncoming(...args){return rules().settlePreRollFearForIncoming(...args);}
export function assertPreRollFearRollAllowed(...args){return rules().assertPreRollFearRollAllowed(...args);}
