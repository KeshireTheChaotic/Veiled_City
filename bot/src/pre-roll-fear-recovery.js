/** Exact-state, authenticated GM recovery. Cancels unused permission, never refunds or rewrites outcomes. */
import {fearReservationHash as hash,fearReservationFailure as fail,inspectFearReservation,writeFearReservation} from './fear-reservations.js';
import {validatePcDeathOutcome} from './pc-death.js';
import {inspectPreRollFear,assertPreRollFearAcknowledged} from './pre-roll-fear.js';
import {rollArbitratedIncomingAttack} from './pc-incoming.js';

import {createPreRollFearRecoveryRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createPreRollFearRecoveryRules({validatePcDeathOutcome:(...args)=>validatePcDeathOutcome(...args),inspectPreRollFear:(...args)=>inspectPreRollFear(...args),assertPreRollFearAcknowledged:(...args)=>assertPreRollFearAcknowledged(...args),rollArbitratedIncomingAttack:(...args)=>rollArbitratedIncomingAttack(...args),writeFearReservation:(...args)=>writeFearReservation(...args)});}
export function recoverPreRollFear(...args){return rules().recoverPreRollFear(...args);}
export function assertPreRollFearDeathTerminal(...args){return rules().assertPreRollFearDeathTerminal(...args);}
