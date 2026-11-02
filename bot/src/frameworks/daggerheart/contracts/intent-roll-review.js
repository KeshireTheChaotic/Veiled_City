import {createFunctionPort} from '../../../kernel/function-port.js';

/** Original Native captured-owner roll review exposed to the fixed Intent consumer. */
export const nativeIntentRollReview=createFunctionPort(['reviewRollDeclaration'],{
 code:'NATIVE_INTENT_ROLL_REVIEW_COMPOSITION',label:'Native Intent roll review'
});
