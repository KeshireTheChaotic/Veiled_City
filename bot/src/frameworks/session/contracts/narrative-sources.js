import {createFunctionPort} from '../../../kernel/function-port.js';
/** Session asks Narrative for its original source visibility and PvP agreement validation without owning narrative or agreement rules. */
export const sessionNarrativeSources=createFunctionPort(['narrativeSourceVisible','validatePvpAgreement'],{code:'SESSION_NARRATIVE_SOURCES_COMPOSITION',label:'Session narrative sources'});