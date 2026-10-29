/** Original shared Director cadence composition. */
import {createDirectorCadence} from './director-cadence.js';
import {worldRoundEligibility} from './contracts/round-eligibility.js';
function eligibleRoundUsers(...args){return worldRoundEligibility.eligibleRoundUsers(...args);}
export function queueDirectorAfterPartyTurn(...args){return cadence().queueDirectorAfterPartyTurn(...args);}
let worldCadence;
function cadence(){return worldCadence??=createDirectorCadence({eligibleRoundUsers,now:()=>new Date().toISOString()});}
