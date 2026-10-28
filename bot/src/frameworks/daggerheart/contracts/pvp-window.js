import {createFunctionPort} from '../../../kernel/function-port.js';
/** Native PvP rounds ask Session to synchronize the PvP action window without owning window rules. */
export const nativePvpWindow=createFunctionPort(['synchronizePvpWindow'],{code:'NATIVE_PVP_WINDOW_COMPOSITION',label:'Native PvP window'});