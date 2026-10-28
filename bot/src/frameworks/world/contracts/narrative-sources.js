import {createFunctionPort} from '../../../kernel/function-port.js';
/** World asks Narrative for source visibility, salience, narrative context and portrayal without owning narrative rules. */
export const worldNarrativeSources=createFunctionPort(['narrativeSourceVisible','nativeSalienceAvailable','narrativeImportance','canonicalInterestEvidence','buildNarrativeContext','configurePortrayal'],{code:'WORLD_NARRATIVE_SOURCES_COMPOSITION',label:'World narrative sources'});
