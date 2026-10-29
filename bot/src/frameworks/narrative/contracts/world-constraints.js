import {createFunctionPort} from '../../../kernel/function-port.js';

/** Narrative reads original World proxy and availability rules through fixed capabilities. */
export const narrativeWorldConstraints=createFunctionPort(['activeCityProxy','assertNpcAvailability'],{
 code:'NARRATIVE_WORLD_CONSTRAINTS_COMPOSITION',label:'Narrative World constraints'
});
