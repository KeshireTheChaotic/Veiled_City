import {createFunctionPort} from '../../../kernel/function-port.js';
/** Native originals for World movement adjudication, movement conditions and VIP admission, each provided by its composing native module at load; native rules keep every check. */
const slot=(name,code,label)=>createFunctionPort([name],{code,label});
export const nativeMovementAdjudication=slot('movementAdjudication','NATIVE_MOVEMENT_ADJUDICATION_COMPOSITION','Native movement adjudication');
export const nativeMovementCondition=slot('nativeMovementConditionIssue','NATIVE_MOVEMENT_CONDITION_COMPOSITION','Native movement condition');
export const nativeVipAdmissionSource=slot('nativeVipAdmission','NATIVE_VIP_ADMISSION_COMPOSITION','Native VIP admission');
