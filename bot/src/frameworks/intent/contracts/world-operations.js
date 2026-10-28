import {createFunctionPort} from '../../../kernel/function-port.js';

/** Intent reads native World operation grants, receipts and place references through the original World services. */
export const intentWorldOperations=createFunctionPort(['prepareNativeWorldOperation','nativeWorldOperationAllows','nativeWorldOperationOrigin','inspectNativeWorldOperationReceipt','nativeWorldOperationCatalog','nativeWorldStrategyScope','resolvePlaceReference'],{
 code:'INTENT_WORLD_OPERATIONS_COMPOSITION',label:'Intent World operations'
});