import {createFunctionPort} from '../../../kernel/function-port.js';

/** Intent delegates history reconciliation and memory cluster maintenance to Knowledge. */
export const intentKnowledgeMaintenance=createFunctionPort(['reconcileHistory','manageMemoryCluster','memoryMaintenanceCandidate'],{
 code:'INTENT_KNOWLEDGE_MAINTENANCE_COMPOSITION',label:'Intent Knowledge maintenance'
});