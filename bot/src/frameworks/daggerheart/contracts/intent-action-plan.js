import {createFunctionPort} from '../../../kernel/function-port.js';
/** Native orchestration consumes Intent's original action-plan and receipt-transition functions unchanged. */
export const nativeIntentActionPlan=createFunctionPort(['buildActionPlan','transitionAction'],{code:'NATIVE_INTENT_ACTION_PLAN_COMPOSITION',label:'Native Intent action plan'});
