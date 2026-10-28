import {createFunctionPort} from '../../../kernel/function-port.js';
/** World asks Knowledge for scoped context memories without owning memory rules. */
export const worldContextMemory=createFunctionPort(['contextMemoriesForScope'],{code:'WORLD_CONTEXT_MEMORY_COMPOSITION',label:'World context memory'});
