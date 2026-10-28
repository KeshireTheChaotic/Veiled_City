import {createFunctionPort} from '../../../kernel/function-port.js';

/** Persistence reads original Knowledge evidence status and classification. */
export const persistenceSourceEvidence=createFunctionPort(['activeEvidence','evidenceType'],{
 code:'PERSISTENCE_SOURCE_EVIDENCE_COMPOSITION',label:'Persistence Knowledge source evidence'
});
