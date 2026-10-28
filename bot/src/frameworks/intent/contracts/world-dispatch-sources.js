import {createFunctionPort} from '../../../kernel/function-port.js';
/** Intent's original AI intent dispatch and typed-intent readers, each provided by its composing module at load; Intent keeps every rule. */
export const intentAiIntentDispatch=createFunctionPort(['delegateConsequence','delegateWorldGoal','maintainMemory','continueLongProjects','dispatchAiIntents'],{code:'INTENT_AI_INTENT_DISPATCH_COMPOSITION',label:'Intent AI intent dispatch'});
export const intentTypedIntentReaders=createFunctionPort(['currentAcceptedIntent','currentTypedMovement'],{code:'INTENT_TYPED_INTENT_READERS_COMPOSITION',label:'Intent typed intent readers'});
