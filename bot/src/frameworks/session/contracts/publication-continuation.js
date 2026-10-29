import {createFunctionPort} from '../../../kernel/function-port.js';
export const sessionPublicationContinuation=createFunctionPort(['prepareContinuationOutput','queueTurnPublications'],{code:'SESSION_PUBLICATION_CONTINUATION_COMPOSITION',label:'Session publication continuation'});
export const sessionContinuationNoticeSource=createFunctionPort(['renderContinuationNotice'],{code:'SESSION_CONTINUATION_NOTICE_SOURCE_COMPOSITION',label:'Session continuation notice source'});
