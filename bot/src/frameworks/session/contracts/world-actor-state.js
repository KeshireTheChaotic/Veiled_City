import {createFunctionPort} from '../../../kernel/function-port.js';
/** Session reads original World actor state, without granting resources or control. */
export const sessionWorldActorState=createFunctionPort(['actorState'],{code:'SESSION_WORLD_ACTOR_STATE_COMPOSITION',label:'Session World actor state'});
