export {hopeCap} from './frameworks/daggerheart/public.js';
/** Current native death-proof provider for the Daggerheart action-eligibility rules. */
import {validatePcDeathOutcome} from './pc-death.js';
import {createPcEligibility} from './frameworks/daggerheart/public.js';
const native=createPcEligibility({validatePcDeathOutcome});
export const {assertPcCanAct,assertPcAttackable}=native;
