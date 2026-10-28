import {createFunctionPort} from '../../../kernel/function-port.js';
/** Session asks native rules for PC eligibility, PvP and typed-roll proof checks without owning them. */
export const sessionNativeChecks=createFunctionPort(['assertPcCanAct','validatePvpResolutionReceipt','pendingPvpFear','validatePvpDamageApplication','validatePvpAttackRoll','typedRollProof'],{code:'SESSION_NATIVE_CHECKS_COMPOSITION',label:'Session native checks'});
