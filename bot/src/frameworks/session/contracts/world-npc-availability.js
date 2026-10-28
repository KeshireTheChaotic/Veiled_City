import {createFunctionPort} from '../../../kernel/function-port.js';
/** Session asks World whether an NPC is available without owning availability rules. */
export const sessionWorldNpcAvailability=createFunctionPort(['assertNpcAvailability'],{code:'SESSION_WORLD_NPC_AVAILABILITY_COMPOSITION',label:'Session World NPC availability'});