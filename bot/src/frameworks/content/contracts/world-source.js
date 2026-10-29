import {createFunctionPort} from '../../../kernel/function-port.js';
/** World authenticates the existing campaign source; Content gains no disclosure authority. */
export const contentWorldSource=createFunctionPort(['requireCitySource'],{code:'CONTENT_WORLD_SOURCE_COMPOSITION',label:'Content World source'});
