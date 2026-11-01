import {createFunctionPort} from '../../../kernel/function-port.js';
/** Intent-private original dispatch functions; no replacement executor or policy. */
export const intentReviewExecution=createFunctionPort(['preflight','applyNative'],{code:'INTENT_REVIEW_EXECUTION_COMPOSITION',label:'Intent review execution'});
