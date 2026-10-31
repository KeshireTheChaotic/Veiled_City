import {intentNativeEncounter} from './frameworks/intent/public.js';
const {nativeEnvironmentBinding}=intentNativeEncounter;
/** Immutable scoped scene inputs. Accepted PC sources and native GM NPC proposals never impersonate each other. */
import {intentNarrativeContext} from './frameworks/intent/public.js';
const {buildNarrativeContext,narrativeSourceVisible}=intentNarrativeContext;
import {jsonHash as hash} from './kernel/json-hash.js';
import {consentAction,historicalActionSource} from './action-consent.js';
import {intentWorldConstraints} from './frameworks/intent/public.js';
const {activeCityProxy,assertNpcAvailability}=intentWorldConstraints;
import {intentSessionScene} from './frameworks/intent/public.js';
const {scenePresence}=intentSessionScene;
import {intentNpcEvidence} from './frameworks/intent/public.js';
const {actorReferenceVisible}=intentNpcEvidence;
import {matchesArbitrationSchema,npcSceneIntentSchema,arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {intentWorldPrimitives} from './frameworks/intent/public.js';
const {indexWorldEvent}=intentWorldPrimitives;
import {featureWindowChoices,inspectFeatureWindow} from './native-feature-windows.js';
import {executableNativeFeatures,compileNativeActors} from './native-feature-catalog.js';

import {isGroupFeature,groupFeatureStakes,groupReactionRules} from './native-group-features.js';
import {nativeActorControl} from './native-actor-control.js';
import {preRollFearCandidates} from './pre-roll-fear.js';

import {intentNativeEnvironment} from './frameworks/intent/public.js';
function nativeEnvironmentInstanceForScope(...args){return intentNativeEnvironment.nativeEnvironmentInstanceForScope(...args);}
import {nativeAdversaryFeatureContext} from './native-adversary-context.js';
import {preparedPositionCandidates} from './native-professional-entry.js';
import {intentArbitrationOrigin} from './frameworks/intent/public.js';
import {createArbitrationOrigins} from './frameworks/intent/public.js';
export const {createArbitrationOrigin,inspectArbitrationOrigin}=createArbitrationOrigins({nativeActorControl});
import {createSceneIntentBoardService} from './frameworks/intent/public.js';
export const {arbitrationPromptBoard,bindArbitrationTurn,arbitrationTurnOrigin,currentScenePlayerInputs,buildSceneIntentBoard}=createSceneIntentBoardService({inspectArbitrationOrigin,consentAction,historicalActionSource,featureWindowChoices,inspectFeatureWindow,executableNativeFeatures,compileNativeActors,isGroupFeature,groupFeatureStakes,groupReactionRules,nativeActorControl,preRollFearCandidates,nativeAdversaryFeatureContext,preparedPositionCandidates});
// Provide this module's original inspectArbitrationOrigin to the fixed port; no other authority is granted.
intentArbitrationOrigin.bind({inspectArbitrationOrigin});
import {intentArbitrationOriginCreator} from './frameworks/intent/public.js';
intentArbitrationOriginCreator.bind({createArbitrationOrigin});
