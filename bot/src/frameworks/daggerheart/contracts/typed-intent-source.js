import {createFunctionPort} from '../../../kernel/function-port.js';
/** Original Intent persistence only; Native keeps its decisions, costs, dice and receipts. */
export const nativeTypedIntentSource=createFunctionPort(['persistPlayerIntents'],{code:'NATIVE_TYPED_INTENT_SOURCE_COMPOSITION',label:'Native typed intent source'});
