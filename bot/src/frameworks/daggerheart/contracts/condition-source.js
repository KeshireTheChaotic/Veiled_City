import {createFunctionPort} from '../../../kernel/function-port.js';
/** Original native condition readers, provided by the existing group host at load. No effect or execution authority. */
export const nativeConditionSource=createFunctionPort(['activeNativeConditions','validateNativeCondition'],{
  code:'NATIVE_CONDITION_SOURCE_COMPOSITION',label:'Native condition source'});
