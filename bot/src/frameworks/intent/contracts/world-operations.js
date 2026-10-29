import {createFunctionPort} from '../../../kernel/function-port.js';

/** Intent calls native World operation grants, receipts, place references and city influence through the original World services. */
export const intentWorldOperations=createFunctionPort(['prepareNativeWorldOperation','nativeWorldOperationAllows','nativeWorldOperationOrigin','inspectNativeWorldOperationReceipt','nativeWorldOperationCatalog','nativeWorldStrategyScope','resolvePlaceReference','attemptCityInfluence','subscribeConsequence','reviewConsequence'],{
 code:'INTENT_WORLD_OPERATIONS_COMPOSITION',label:'Intent World operations'
});
