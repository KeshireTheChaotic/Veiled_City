import {createFunctionPort} from '../../../kernel/function-port.js';

/** Narrative reads public identity mentions and scoped fact queries through the original Knowledge readers. */
export const narrativeKnowledgeReaders=createFunctionPort(['mentionsPublicIdentity','scopedQueryPlan','queryScopedFacts','listNarrativeRecords','narrativeRecordLimit'],{
 code:'NARRATIVE_KNOWLEDGE_READERS_COMPOSITION',label:'Narrative Knowledge readers'
});
