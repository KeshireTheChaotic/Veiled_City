import {createFunctionPort} from '../../../kernel/function-port.js';
/** World retains event provenance and audience validation for publication proofs. */
export const publicationWorldEvents=createFunctionPort(['indexWorldEvent'],{code:'PUBLICATION_WORLD_EVENTS_COMPOSITION',label:'Publication World events'});
