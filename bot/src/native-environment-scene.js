import {inspectArbitrationOrigin} from './scene-intent-board.js';
import {inspectNativeEnvironmentInstance} from './native-environment-instance.js';
import {featureDisposition} from './native-feature-catalog.js';
import {nativeGmOpportunity} from './gm-action-capability.js';
import {reservedCampaignFear} from './fear-reservations.js';
import {worldSessionScene} from './frameworks/world/public.js';
function recordScenePresence(...args){return worldSessionScene.recordScenePresence(...args);}function currentScene(...args){return worldSessionScene.currentScene(...args);}function scenePresence(...args){return worldSessionScene.scenePresence(...args);}
import {sceneFictionHash as hash,narrativeSourceVisible} from './scene-fiction-context.js';
import {indexWorldEvent} from './frameworks/world/public.js';
import {assertEnvironmentAudience} from './native-environment-audience.js';
import {nativeEstablishedFact} from './frameworks/world/public.js';
import {nativeEnvironmentDoorChainSituation} from './native-environment-door-chain.js';
import {nativeEnvironmentImagingSituation} from './native-environment-imaging.js';
import {nativeEnvironmentProcedureSituation} from './native-environment-procedure.js';
import {nativeEnvironmentThinWallsSituation} from './native-environment-thin-walls.js';
import {nativeEnvironmentChainOfTitleSituation} from './native-environment-chain-of-title.js';
import {nativeEnvironmentNoConsensusSituation} from './native-environment-no-consensus.js';
import {nativeEnvironmentMetaphorPhysicsSituation} from './native-environment-metaphor-physics.js';
import {nativeEnvironmentNoOrdinarySignalSituation} from './native-environment-no-ordinary-signal.js';
import {nativeEnvironmentConsensusEngineSituation} from './native-environment-consensus-engine.js';
import {nativeEnvironmentGuestRightSituation} from './native-environment-guest-right.js';
import {nativeEnvironmentPrivateRoomSituation} from './native-environment-private-room.js';
import {nativeEnvironmentPriceOfferSituation} from './native-environment-price-offer.js';
import {nativeEnvironmentAuctionSituation} from './native-environment-auction.js';
import {nativeEnvironmentModelRoomSituation} from './native-environment-model-room.js';
import {nativeEnvironmentContainmentShuttersSituation} from './native-environment-containment-shutters.js';
import {nativeEnvironmentSealedDocketSituation} from './native-environment-sealed-docket.js';
import {nativeEnvironmentThreeVectorsSituation} from './native-environment-three-vectors.js';
import {nativeEnvironmentMarketNeutralitySituation} from './native-environment-market-neutrality.js';
import {nativeEnvironmentContaminatedSceneSituation} from './native-environment-contaminated-scene.js';
import {nativeEnvironmentEveryoneIsWatchingSituation} from './native-environment-everyone-is-watching.js';
import {nativeEnvironmentWrongOfferingSituation} from './native-environment-wrong-offering.js';
import {nativeEnvironmentLastTrainRulesSituation} from './native-environment-last-train-rules.js';
import {nativeEnvironmentExpressThroughMemorySituation} from './native-environment-express-through-memory.js';
import {nativeEnvironmentThirdRailSpiritSituation} from './native-environment-third-rail-spirit.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {environmentSceneConsumer} from './frameworks/world/contracts/environment-scene.js';
export function environmentSceneCapabilities(){return {inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),inspectNativeEnvironmentInstance:(...args)=>inspectNativeEnvironmentInstance(...args),featureDisposition:(...args)=>featureDisposition(...args),nativeGmOpportunity:(...args)=>nativeGmOpportunity(...args),reservedCampaignFear:(...args)=>reservedCampaignFear(...args),recordScenePresence:(...args)=>recordScenePresence(...args),currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args),hash:(...args)=>hash(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),assertEnvironmentAudience:(...args)=>assertEnvironmentAudience(...args),nativeEstablishedFact:(...args)=>nativeEstablishedFact(...args),fail:(...args)=>fail(...args)};}
export function validateMundaneEnvironmentDetail(...args){return environmentSceneConsumer.validateMundaneEnvironmentDetail(...args);}
export function validateMaintenanceMemoryFact(...args){return environmentSceneConsumer.validateMaintenanceMemoryFact(...args);}
export function applyEnvironmentSceneAction(...args){return environmentSceneConsumer.applyEnvironmentSceneAction(...args);}
export function inspectEnvironmentSceneEffect(...args){return environmentSceneConsumer.inspectEnvironmentSceneEffect(...args);}
export function environmentSceneProjection(...args){return environmentSceneConsumer.environmentSceneProjection(...args);}

export function nativeEnvironmentSituation(db,guild,scope,location){
  const scene=currentScene(db,guild),result=[];
  for(const row of db.listCityRecords(guild,{kind:'native_environment_scene_effect',includeGM:true,limit:100})){
    const d=row.data;
    if(d.origin?.scene!==scene.key||d.origin.location!==location)continue;
    try{
      const view=environmentSceneProjection(db,guild,row.record_key,scope);
      result.push({receipt_kind:row.kind,receipt_ref:row.record_key,source_ref:view.source.event_key,text:view.text,
        authority:'Current native local scene state, not a PC reaction, a successful action, injury or automatic modifier.'});
    }catch(error){if(!['GM_ARBITRATION','SCENE_FICTION','STATE_CONFLICT'].includes(error.code))throw error;}
    if(result.length===6)break;
  }
  if(result.length<6)result.push(...nativeEnvironmentDoorChainSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentImagingSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentProcedureSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentThinWallsSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentChainOfTitleSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentNoConsensusSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentMetaphorPhysicsSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentNoOrdinarySignalSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentConsensusEngineSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentGuestRightSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentPrivateRoomSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentPriceOfferSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentAuctionSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentModelRoomSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentContainmentShuttersSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentSealedDocketSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentThreeVectorsSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentMarketNeutralitySituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentContaminatedSceneSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentEveryoneIsWatchingSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentWrongOfferingSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentLastTrainRulesSituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentExpressThroughMemorySituation(db,guild,scope,location).slice(0,6-result.length));
  if(result.length<6)result.push(...nativeEnvironmentThirdRailSpiritSituation(db,guild,scope,location).slice(0,6-result.length));
  return result;
}

// Register only this fixed world component source factory; native binding is owned by application composition.
environmentSceneConsumer.provideSources(environmentSceneCapabilities);
