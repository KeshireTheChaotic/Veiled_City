/** Original World simulation overview reader for the GM dashboard; Operations adds no visibility or world rule. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const operationsWorldOverview=createFunctionPort(['simulationOverview'],{code:'OPERATIONS_WORLD_OVERVIEW_COMPOSITION',label:'Operations World overview'});
