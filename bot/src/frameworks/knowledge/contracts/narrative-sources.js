import {createFunctionPort} from '../../../kernel/function-port.js';
/** Knowledge asks Narrative for source visibility, importance, narrative visibility and relevance without owning narrative rules. */
export const knowledgeNarrativeSources=createFunctionPort(['narrativeSourceVisible','narrativeImportance','narrativeVisible','narrativeQueryRelevance','narrativeIdentityRelevance'],{code:'KNOWLEDGE_NARRATIVE_SOURCES_COMPOSITION',label:'Knowledge narrative sources'});
