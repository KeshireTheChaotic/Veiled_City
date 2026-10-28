import {sessionIntent} from '../../frameworks/session/public.js';
import {buildActionPlan,transitionAction,signalActionContinuation,intentPlayerLanguage} from '../../frameworks/intent/public.js';
/** Pass Intent's original action scheduling and authored-text functions to Session unchanged. */
export function connectSessionIntent(){return sessionIntent.bind({buildActionPlan,transitionAction,signalActionContinuation,interpretAuthoredText:intentPlayerLanguage.interpretAuthoredText,captureDeclaration:intentPlayerLanguage.captureDeclaration});}
