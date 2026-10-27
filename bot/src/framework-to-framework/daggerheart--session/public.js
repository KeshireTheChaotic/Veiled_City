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

import {nativePrincipals} from '../../frameworks/daggerheart/public.js';
import {historicalOwnerPrincipal} from '../../frameworks/session/public.js';
export function connectNativePrincipals(){return nativePrincipals.bind({conversationPrincipal,historicalOwnerPrincipal});}

import {nativeOwnerActionTerminal} from '../../frameworks/daggerheart/public.js';
import {overlapsOwnerActionTerminal,recordOwnerActionTerminal} from '../../frameworks/session/public.js';
export function connectNativeOwnerActionTerminal(){return nativeOwnerActionTerminal.bind({overlapsOwnerActionTerminal,recordOwnerActionTerminal});}
