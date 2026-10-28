/** Explainable internal adjudication envelopes; model suggestions never become native dice, costs or authority. */
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}function cityKey(...args){return nativeWorldEvents.cityKey(...args);}
import { prepareRollRequest } from "./roll-requests.js";
import {nativePrincipals} from './frameworks/daggerheart/public.js';
function conversationPrincipal(...args){return nativePrincipals.conversationPrincipal(...args);}
import {nativeScenes} from './frameworks/daggerheart/public.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}
import { isPvpIntent } from "./pvp-authority.js";
import {nativeOwnerActionTerminal} from './frameworks/daggerheart/public.js';
function overlapsOwnerActionTerminal(...args){return nativeOwnerActionTerminal.overlapsOwnerActionTerminal(...args);}
import {captureNoRollFeatureWindows} from './native-feature-windows.js';
import {nativeDeviceUseIssue} from './native-feature-effects.js';
import {consentAction,historicalActionSource} from './action-consent.js';


import {createRulesArbitration} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createRulesArbitration({capabilities:{indexWorldEvent:(...args)=>indexWorldEvent(...args),cityKey:(...args)=>cityKey(...args),prepareRollRequest:(...args)=>prepareRollRequest(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),currentScene:(...args)=>currentScene(...args),isPvpIntent:(...args)=>isPvpIntent(...args),overlapsOwnerActionTerminal:(...args)=>overlapsOwnerActionTerminal(...args),captureNoRollFeatureWindows:(...args)=>captureNoRollFeatureWindows(...args),nativeDeviceUseIssue:(...args)=>nativeDeviceUseIssue(...args),consentAction:(...args)=>consentAction(...args),historicalActionSource:(...args)=>historicalActionSource(...args)}});}
export function adjudicationEnvelope(...args){return rules().adjudicationEnvelope(...args);}
export function selectRuleBasis(...args){return rules().selectRuleBasis(...args);}
export function adjudicateAcceptedIntent(...args){return rules().adjudicateAcceptedIntent(...args);}
export function movementAdjudication(...args){return rules().movementAdjudication(...args);}
import {nativeMovementAdjudication} from './frameworks/daggerheart/public.js';
// Provide this module's original movement adjudication to the fixed native slot; no other authority is granted.
nativeMovementAdjudication.bind({movementAdjudication});
import {nativeRulesArbitrationSource} from './frameworks/daggerheart/public.js';
// Provide this module's original accepted-intent adjudication to the fixed native slot; no other authority is granted.
nativeRulesArbitrationSource.bind({adjudicateAcceptedIntent});
