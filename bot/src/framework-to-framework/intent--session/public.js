import {sessionIntent} from '../../frameworks/session/public.js';
import {buildActionPlan,transitionAction,signalActionContinuation,intentPlayerLanguage} from '../../frameworks/intent/public.js';
/** Pass Intent's original action scheduling and authored-text functions to Session unchanged. */
export function connectSessionIntent(){return sessionIntent.bind({buildActionPlan,transitionAction,signalActionContinuation,interpretAuthoredText:intentPlayerLanguage.interpretAuthoredText,captureDeclaration:intentPlayerLanguage.captureDeclaration});}

import {sessionIntentLanguage} from '../../frameworks/session/public.js';
import {intentAuthoredTurnSource,intentGameplayIntakeSource} from '../../frameworks/intent/public.js';
/** Pass Intent's original quote-span, silence and response-obligation readings to Session unchanged. */
export function connectSessionIntentLanguage(){return sessionIntentLanguage.bind({sourceSpanInsideQuote:intentAuthoredTurnSource.sourceSpanInsideQuote,explicitSilence:intentGameplayIntakeSource.explicitSilence,semanticResponseObligation:intentGameplayIntakeSource.semanticResponseObligation});}
