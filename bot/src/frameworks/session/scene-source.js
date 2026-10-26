/** One original scene service; World source/event and native mechanical readers retain their authority. */
import {createSceneContinuity} from './scene-continuity.js';
import {sessionSceneWorldSources} from './contracts/scene-world-sources.js';
import {sessionWorldEvents} from './contracts/world-events.js';
import {sessionNativeMovement} from './contracts/native-movement.js';
const scenes=createSceneContinuity({cityObject:(...args)=>sessionSceneWorldSources.cityObject(...args),cityKey:(...args)=>sessionSceneWorldSources.cityKey(...args),cityVisibility:(...args)=>sessionSceneWorldSources.cityVisibility(...args),cityAudit:(...args)=>sessionSceneWorldSources.cityAudit(...args),requireCitySource:(...args)=>sessionSceneWorldSources.requireCitySource(...args),activeCityProxy:(...args)=>sessionSceneWorldSources.activeCityProxy(...args),indexWorldEvent:(...args)=>sessionWorldEvents.indexWorldEvent(...args),nativeMovementConditionIssue:(...args)=>sessionNativeMovement.nativeMovementConditionIssue(...args)});
export const {currentScene,scenePresence,lastVerifiedCharacterPresence,reconcileSceneArrival,recordCharacterArrival,recordScenePresence,sceneAccess,sceneView,archiveScenePresence}=scenes;
