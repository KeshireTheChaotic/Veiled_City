import {createFunctionPort} from '../../../kernel/function-port.js';
/** Fixed synchronous cancellation checkpoint; no projection, delivery or transaction policy. */
export function createNativeGmNoticeReservationConsumer(){return createFunctionPort(['reserveGmArbitrationNotice'],{code:'NATIVE_GM_NOTICE_RESERVATION_COMPOSITION',label:'Native GM notice reservation'});}
export const nativeGmNoticeReservation=createNativeGmNoticeReservationConsumer();
