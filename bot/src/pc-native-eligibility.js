export {hopeCap} from './frameworks/daggerheart/public.js';
/** Current native death-proof provider for the Daggerheart action-eligibility rules. */
import {validatePcDeathOutcome} from './pc-death.js';
import {createPcEligibility} from './frameworks/daggerheart/public.js';
const native=createPcEligibility({validatePcDeathOutcome});
export const {assertPcCanAct,assertPcAttackable}=native;
import {nativePcActionEligibility} from './frameworks/daggerheart/public.js';
// Provide this module's original PC action eligibility check to the fixed native slot; no other authority is granted.
nativePcActionEligibility.bind({assertPcCanAct});
