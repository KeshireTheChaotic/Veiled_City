import {nativeMovementReaderSource} from '../../frameworks/daggerheart/public.js';
import {sessionNativeMovement} from '../../frameworks/session/public.js';
/** Uses the original native source engine; callback is never supplied by a model or source JSON. */
export function connectNativeSessionMovement(){return sessionNativeMovement.bind(nativeMovementReaderSource.movementFunction());}

import {nativeEnvironmentSession} from '../../frameworks/daggerheart/public.js';
import {conversationPrincipal,currentScene,scenePresence} from '../../frameworks/session/public.js';
export function connectNativeEnvironmentSession(){return nativeEnvironmentSession.bind({conversationPrincipal,currentScene,scenePresence});}

import {nativeScenes} from '../../frameworks/daggerheart/public.js';
import {sceneAccess,recordScenePresence} from '../../frameworks/session/public.js';
export function connectNativeScenes(){return nativeScenes.bind({currentScene,scenePresence,sceneAccess,recordScenePresence});}

import {RANGE_BANDS} from '../../frameworks/daggerheart/public.js';
import {sessionRangeBands} from '../../frameworks/session/public.js';
export function connectSessionRangeBands(){return sessionRangeBands.bind(RANGE_BANDS);}

import {nativePrincipals} from '../../frameworks/daggerheart/public.js';
import {historicalOwnerPrincipal} from '../../frameworks/session/public.js';
export function connectNativePrincipals(){return nativePrincipals.bind({conversationPrincipal,historicalOwnerPrincipal});}

import {nativeOwnerActionTerminal} from '../../frameworks/daggerheart/public.js';
import {overlapsOwnerActionTerminal,recordOwnerActionTerminal} from '../../frameworks/session/public.js';
export function connectNativeOwnerActionTerminal(){return nativeOwnerActionTerminal.bind({overlapsOwnerActionTerminal,recordOwnerActionTerminal});}

import {nativeActionConsentSource} from '../../frameworks/daggerheart/public.js';
import {sessionNativeActionConsent} from '../../frameworks/session/public.js';
/** Forward only the original native consent checks. */
export function connectSessionNativeActionConsent(){return sessionNativeActionConsent.bind({consentAction:nativeActionConsentSource.consentAction,validateActionConsent:nativeActionConsentSource.validateActionConsent,requestActionConsent:nativeActionConsentSource.requestActionConsent,respondActionConsent:nativeActionConsentSource.respondActionConsent});}

import {nativeSessionActionWindow} from '../../frameworks/daggerheart/public.js';
import {openActionWindow} from '../../frameworks/session/public.js';
export function connectNativeSessionActionWindow(){return nativeSessionActionWindow.bind({openActionWindow});}
