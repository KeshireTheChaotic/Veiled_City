import {createFunctionPort} from '../../../kernel/function-port.js';
/** World asks native rules for movement adjudication, movement conditions, PC eligibility and VIP admission without owning them. */
export const worldNativeMovementChecks=createFunctionPort(['movementAdjudication','nativeMovementConditionIssue','assertPcCanAct','nativeVipAdmission'],{code:'WORLD_NATIVE_MOVEMENT_CHECKS_COMPOSITION',label:'World native movement checks'});
