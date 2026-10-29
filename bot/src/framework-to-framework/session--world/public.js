import {createSessionWorldEventConsumer} from '../../frameworks/session/public.js';
import {indexWorldEvent} from '../../frameworks/world/public.js';
/** Pass the native issuer without changing source, audience, transaction, result or error. */
export function connectSessionWorldEvents({consumer=createSessionWorldEventConsumer(),source=indexWorldEvent}={}){return consumer.bind(source);}

import {conversationPrincipal} from '../../frameworks/session/public.js';
import {worldConversationPrincipal} from '../../frameworks/world/public.js';
export function connectWorldPrincipal(){return worldConversationPrincipal.bind(conversationPrincipal);}

import {sessionSceneWorldSources} from '../../frameworks/session/public.js';
import {cityObject,cityKey,cityInteger,cityVisibility,cityAudit,requireCitySource,activeCityProxy} from '../../frameworks/world/public.js';
export function connectSessionSceneWorld(){return sessionSceneWorldSources.bind({cityObject,cityKey,cityInteger,cityVisibility,cityAudit,requireCitySource,activeCityProxy});}

import {sessionWorldInstitution} from '../../frameworks/session/public.js';
import {requireCityRecord,assertInstitutionDelegation} from '../../frameworks/world/public.js';
export function connectSessionWorldInstitution(){return sessionWorldInstitution.bind({requireCityRecord,assertInstitutionDelegation});}

import {sessionWorldActorState} from '../../frameworks/session/public.js';
import {actorState} from '../../frameworks/world/public.js';
export function connectSessionWorldActorState(){return sessionWorldActorState.bind({actorState});}

import {currentScene,reconcileSceneArrival,scenePresence,sceneAccess,recordScenePresence} from '../../frameworks/session/public.js';
import {worldSessionScene} from '../../frameworks/world/public.js';
export function connectWorldSessionScene(){return worldSessionScene.bind({currentScene,reconcileSceneArrival,scenePresence,sceneAccess,recordScenePresence});}

import {sessionWorldAutonomy} from '../../frameworks/session/public.js';
import {worldAutonomousApplication} from '../../frameworks/world/public.js';
/** Pass World's original autonomous application to Session unchanged. */
export function connectSessionWorldAutonomy(){return sessionWorldAutonomy.bind({applyAutonomousWorld:worldAutonomousApplication.applyAutonomousWorld});}

import {sessionContinuationAuthorization} from '../../frameworks/session/public.js';
import {worldSessionContinuation} from '../../frameworks/world/public.js';
/** Pass Session's original continuation authorization to World unchanged. */
export function connectWorldSessionContinuation(){return worldSessionContinuation.bind({continuationAuthorization:sessionContinuationAuthorization.continuationAuthorization});}

import {sessionStoryContinuitySource} from '../../frameworks/session/public.js';
import {worldStoryContinuity} from '../../frameworks/world/public.js';
/** Pass Session's original pacing advice and mystery configuration to World unchanged. */
export function connectWorldStoryContinuity(){return worldStoryContinuity.bind({pacingAdvice:sessionStoryContinuitySource.pacingAdvice,configureMystery:sessionStoryContinuitySource.configureMystery});}

import {sessionWorldNpcAvailability} from '../../frameworks/session/public.js';
import {assertNpcAvailability} from '../../frameworks/world/public.js';
/** Pass World's original NPC availability check to Session unchanged. */
export function connectSessionWorldNpcAvailability(){return sessionWorldNpcAvailability.bind({assertNpcAvailability});}
export {openingWorldOpportunities} from './opening-opportunities.js';

import {eligibleRoundUsers} from '../../frameworks/session/public.js';
import {worldRoundEligibility} from '../../frameworks/world/public.js';
export function connectWorldRoundEligibility(){return worldRoundEligibility.bind({eligibleRoundUsers});}
