import {sessionIntent} from '../../frameworks/session/public.js';
import {buildActionPlan,transitionAction,signalActionContinuation,intentPlayerLanguage} from '../../frameworks/intent/public.js';
/** Pass Intent's original action scheduling and authored-text functions to Session unchanged. */
export function connectSessionIntent(){return sessionIntent.bind({buildActionPlan,transitionAction,signalActionContinuation,interpretAuthoredText:intentPlayerLanguage.interpretAuthoredText,captureDeclaration:intentPlayerLanguage.captureDeclaration});}

import {sessionIntentLanguage} from '../../frameworks/session/public.js';
import {intentAuthoredTurnSource,intentGameplayIntakeSource} from '../../frameworks/intent/public.js';
/** Pass Intent's original quote-span, silence and response-obligation readings to Session unchanged. */
export function connectSessionIntentLanguage(){return sessionIntentLanguage.bind({sourceSpanInsideQuote:intentAuthoredTurnSource.sourceSpanInsideQuote,explicitSilence:intentGameplayIntakeSource.explicitSilence,semanticResponseObligation:intentGameplayIntakeSource.semanticResponseObligation});}
import {overlapsOwnerActionTerminal} from '../../frameworks/session/public.js';
import {intentOwnerActionTerminal} from '../../frameworks/intent/public.js';
/** Bind Session's original owner action terminal reader to Intent's fixed consumer. */
export function connectIntentOwnerActionTerminal(){return intentOwnerActionTerminal.bind({overlapsOwnerActionTerminal});}

import {intentSessionPrincipal} from '../../frameworks/intent/public.js';
import {conversationPrincipal} from '../../frameworks/session/public.js';
/** Bind the original Session reader without evaluating player state. */
export function connectIntentSessionPrincipal(){return intentSessionPrincipal.bind({conversationPrincipal});}

import {intentSessionDialogue} from '../../frameworks/intent/public.js';
import {captureDialogue,interpretDialogue} from '../../frameworks/session/public.js';
export function connectIntentSessionDialogue(){return intentSessionDialogue.bind({captureDialogue,interpretDialogue});}

import {intentSessionStory} from '../../frameworks/intent/public.js';
import {suggestSetupPayoff} from '../../frameworks/session/public.js';
export function connectIntentSessionStory(){return intentSessionStory.bind({suggestSetupPayoff});}

import {intentSessionEntry} from '../../frameworks/intent/public.js';
import {mundaneEntryImpact,resolveMundaneEntry,prepareSceneEntry} from '../../frameworks/session/public.js';
export function connectIntentSessionEntry(){return intentSessionEntry.bind({mundaneEntryImpact,resolveMundaneEntry,prepareSceneEntry});}
