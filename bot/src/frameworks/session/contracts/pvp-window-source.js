/** Session's original PvP window synchronization, provided at load by window-coordinator.js; Session keeps every window rule. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const sessionPvpWindowSource=createFunctionPort(['synchronizePvpWindow'],{code:'SESSION_PVP_WINDOW_SOURCE_COMPOSITION',label:'Session PvP window source'});