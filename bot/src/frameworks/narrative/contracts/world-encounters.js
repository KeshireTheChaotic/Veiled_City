import {createFunctionPort} from '../../../kernel/function-port.js';

/** Narrative reads World encounter catalog configuration and candidate metadata through the original World services. */
export const narrativeWorldEncounters=createFunctionPort(['configureWorldEncounterCatalog','snapshotNativeEncounterCandidates'],{
 code:'NARRATIVE_WORLD_ENCOUNTERS_COMPOSITION',label:'Narrative World encounters'
});