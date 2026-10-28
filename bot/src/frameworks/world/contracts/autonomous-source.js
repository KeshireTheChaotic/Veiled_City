/** World's original autonomous authority, narrative entity creation and input key, provided by its composing module at load; World keeps every rule. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const worldAutonomousSource=createFunctionPort(['worldAuthority','establishNarrativeEntity','worldInputKey'],{code:'WORLD_AUTONOMOUS_SOURCE_COMPOSITION',label:'World autonomous source'});
