import {createFunctionPort} from '../../../kernel/function-port.js';
/** Original telemetry callbacks only; metrics do not validate fiction or authorize delivery. */
export const publicationOperations=createFunctionPort(['record','incident','publication','measureNative','currentTurnTrace','turnTraceFor','failureTrace'],{code:'PUBLICATION_OPERATIONS_COMPOSITION',label:'Publication Operations telemetry'});
