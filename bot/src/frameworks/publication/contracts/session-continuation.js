import {createFunctionPort} from '../../../kernel/function-port.js';
export const publicationContinuationOutputSource=createFunctionPort(['prepareContinuationOutput'],{code:'PUBLICATION_CONTINUATION_OUTPUT_SOURCE_COMPOSITION',label:'Publication continuation output source'});
export const publicationSessionContinuation=createFunctionPort(['renderContinuationNotice'],{code:'PUBLICATION_SESSION_CONTINUATION_COMPOSITION',label:'Publication Session continuation'});
