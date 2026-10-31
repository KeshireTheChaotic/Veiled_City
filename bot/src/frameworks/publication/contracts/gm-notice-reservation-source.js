import {createFunctionPort} from '../../../kernel/function-port.js';
/** Original synchronous queued-notice reservation; caller retains its connection and transaction. */
export function createGmNoticeReservationSource(){return createFunctionPort(['reserveGmArbitrationNotice'],{code:'PUBLICATION_GM_NOTICE_RESERVATION_COMPOSITION',label:'Publication GM notice reservation source'});}
export const publicationGmNoticeReservation=createGmNoticeReservationSource();
