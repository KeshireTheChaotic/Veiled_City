import {createFunctionPort} from '../../../kernel/function-port.js';
/** Native originals for Session continuation and scene-entry checks, each provided by its composing native module at load; native rules keep every check. */
const slot=(name,code,label)=>createFunctionPort([name],{code,label});
export const nativePcActionEligibility=slot('assertPcCanAct','NATIVE_PC_ACTION_ELIGIBILITY_COMPOSITION','Native PC action eligibility');
export const nativePvpResolutionReceipt=slot('validatePvpResolutionReceipt','NATIVE_PVP_RESOLUTION_RECEIPT_COMPOSITION','Native PvP resolution receipt');
export const nativePvpPendingFear=slot('pendingPvpFear','NATIVE_PVP_PENDING_FEAR_COMPOSITION','Native PvP pending Fear');
export const nativePvpDamageApplication=slot('validatePvpDamageApplication','NATIVE_PVP_DAMAGE_APPLICATION_COMPOSITION','Native PvP damage application');
export const nativePvpAttackRoll=slot('validatePvpAttackRoll','NATIVE_PVP_ATTACK_ROLL_COMPOSITION','Native PvP attack roll');
export const nativeTypedRollProof=slot('typedRollProof','NATIVE_TYPED_ROLL_PROOF_COMPOSITION','Native typed roll proof');
