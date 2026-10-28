import {createFunctionPort} from '../../../kernel/function-port.js';
/** World asks Intent to dispatch AI intents and read accepted typed intents without owning Intent's rules. */
export const worldIntentDispatch=createFunctionPort(['delegateConsequence','delegateWorldGoal','maintainMemory','continueLongProjects','dispatchAiIntents','currentAcceptedIntent','currentTypedMovement'],{code:'WORLD_INTENT_DISPATCH_COMPOSITION',label:'World Intent dispatch'});
