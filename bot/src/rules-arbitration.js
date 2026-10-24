/** Explainable internal adjudication envelopes; model suggestions never become native dice, costs or authority. */
import { indexWorldEvent, cityKey } from "./city-calendar.js";
import { prepareRollRequest } from "./roll-requests.js";
import { conversationPrincipal } from "./conversation-principal.js";
import { currentScene } from "./scene-continuity.js";
import { isPvpIntent } from "./pvp-authority.js";
import {overlapsOwnerActionTerminal} from "./owner-action-terminal.js";
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
