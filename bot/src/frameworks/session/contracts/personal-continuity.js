/** Session reads the owner's personal character and inbox through Knowledge's original readers; Knowledge keeps every rule. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const sessionPersonalContinuity=createFunctionPort(['personalCharacter','personalInbox'],{code:'SESSION_PERSONAL_CONTINUITY_COMPOSITION',label:'Session personal continuity'});
