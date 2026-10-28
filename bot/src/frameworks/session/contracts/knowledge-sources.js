import {createFunctionPort} from '../../../kernel/function-port.js';
/** Session asks Knowledge for fact visibility, public referents, evidence classification and history reconciliation without owning them. */
export const sessionKnowledgeSources=createFunctionPort(['factVisibleTo','mentionsPublicIdentity','evidenceType','activeEvidence','reconcileHistory'],{code:'SESSION_KNOWLEDGE_SOURCES_COMPOSITION',label:'Session knowledge sources'});
