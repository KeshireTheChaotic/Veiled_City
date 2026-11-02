import {createFunctionPort} from '../../../kernel/function-port.js';

/** Fixed Native captured-owner roll review operation consumed by Intent dispatch. */
export const intentNativeRollReview=createFunctionPort(['reviewRollDeclaration'],{
 code:'INTENT_NATIVE_ROLL_REVIEW_COMPOSITION',label:'Intent Native roll review'
});
