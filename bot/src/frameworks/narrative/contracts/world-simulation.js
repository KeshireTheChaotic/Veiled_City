import {createFunctionPort} from '../../../kernel/function-port.js';

/** Narrative prepares World simulation observations through the original World reader. */
export const narrativeWorldSimulation=createFunctionPort(['prepareWorldSimulationObservation'],{
 code:'NARRATIVE_WORLD_SIMULATION_COMPOSITION',label:'Narrative World simulation'
});