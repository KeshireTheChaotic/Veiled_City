import {createFunctionPort} from '../../../kernel/function-port.js';
/** Session asks World to apply autonomous world narrative without owning World's rules. */
export const sessionWorldAutonomy=createFunctionPort(['applyAutonomousWorld'],{code:'SESSION_WORLD_AUTONOMY_COMPOSITION',label:'Session World autonomy'});
