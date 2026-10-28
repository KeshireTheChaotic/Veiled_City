import {createFunctionPort} from '../../../kernel/function-port.js';

/** Persistence delegates saved relationship classification to the original Knowledge rule. */
export const persistenceRelationshipEvidence=createFunctionPort(['relationshipEvidence'],{
 code:'PERSISTENCE_RELATIONSHIP_EVIDENCE_COMPOSITION',label:'Persistence relationship evidence source'
});
