/** Native environment scene composition: Daggerheart rules wired to original sources through fixed ports. */
import {inspectNativeEnvironmentInstance} from './native-environment-instance.js';
import {featureDisposition} from './native-feature-catalog.js';
import {nativeArbitrationOrigin,nativeGmOpportunityPeer,reservedCampaignFearPeer,doorChainSituationPeer,imagingSituationPeer} from './contracts/environment-sources.js';
import {nativeScenes} from './contracts/scenes.js';
import {nativeEnvironmentNarrative} from './contracts/environment-narrative.js';
import {nativeWorldEvents} from './contracts/world-events.js';
import {nativeWorldEstablishedEvidence} from './contracts/world-established-evidence.js';
import {assertEnvironmentAudience} from './environment-audience-source.js';
import {createEnvironmentSceneRules} from './environment-scene-rules.js';
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {arbitrationFailure as fail} from '../../kernel/arbitration-failure.js';
import {nativeEnvironmentAuctionSituation} from './native-environment-auction.js';
import {nativeEnvironmentChainOfTitleSituation} from './native-environment-chain-of-title.js';
import {nativeEnvironmentConsensusEngineSituation} from './native-environment-consensus-engine.js';
import {nativeEnvironmentContainmentShuttersSituation} from './native-environment-containment-shutters.js';
import {nativeEnvironmentContaminatedSceneSituation} from './native-environment-contaminated-scene.js';
import {nativeEnvironmentEveryoneIsWatchingSituation} from './native-environment-everyone-is-watching.js';
import {nativeEnvironmentExpressThroughMemorySituation} from './native-environment-express-through-memory.js';
import {nativeEnvironmentGuestRightSituation} from './native-environment-guest-right.js';
import {nativeEnvironmentLastTrainRulesSituation} from './native-environment-last-train-rules.js';
import {nativeEnvironmentMarketNeutralitySituation} from './native-environment-market-neutrality.js';
import {nativeEnvironmentMetaphorPhysicsSituation} from './native-environment-metaphor-physics.js';
import {nativeEnvironmentModelRoomSituation} from './native-environment-model-room.js';
import {nativeEnvironmentNoConsensusSituation} from './native-environment-no-consensus.js';
import {nativeEnvironmentNoOrdinarySignalSituation} from './native-environment-no-ordinary-signal.js';
import {nativeEnvironmentPriceOfferSituation} from './native-environment-price-offer.js';
import {nativeEnvironmentPrivateRoomSituation} from './native-environment-private-room.js';
import {nativeEnvironmentProcedureSituation} from './native-environment-procedure.js';
import {nativeEnvironmentSealedDocketSituation} from './native-environment-sealed-docket.js';
import {nativeEnvironmentThinWallsSituation} from './native-environment-thin-walls.js';
import {nativeEnvironmentThirdRailSpiritSituation} from './native-environment-third-rail-spirit.js';
import {nativeEnvironmentThreeVectorsSituation} from './native-environment-three-vectors.js';
import {nativeEnvironmentWrongOfferingSituation} from './native-environment-wrong-offering.js';
function inspectArbitrationOrigin(...args){return nativeArbitrationOrigin.inspectArbitrationOrigin(...args);}
function nativeGmOpportunity(...args){return nativeGmOpportunityPeer.nativeGmOpportunity(...args);}
function reservedCampaignFear(...args){return reservedCampaignFearPeer.reservedCampaignFear(...args);}
function nativeEnvironmentDoorChainSituation(...args){return doorChainSituationPeer.nativeEnvironmentDoorChainSituation(...args);}
function nativeEnvironmentImagingSituation(...args){return imagingSituationPeer.nativeEnvironmentImagingSituation(...args);}
function recordScenePresence(...args){return nativeScenes.recordScenePresence(...args);}
function currentScene(...args){return nativeScenes.currentScene(...args);}
function scenePresence(...args){return nativeScenes.scenePresence(...args);}
function narrativeSourceVisible(...args){return nativeEnvironmentNarrative.narrativeSourceVisible(...args);}
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
function nativeEstablishedFact(...args){return nativeWorldEstablishedEvidence.nativeEstablishedFact(...args);}
export function environmentSceneCapabilities(){return {inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),inspectNativeEnvironmentInstance:(...args)=>inspectNativeEnvironmentInstance(...args),featureDisposition:(...args)=>featureDisposition(...args),nativeGmOpportunity:(...args)=>nativeGmOpportunity(...args),reservedCampaignFear:(...args)=>reservedCampaignFear(...args),recordScenePresence:(...args)=>recordScenePresence(...args),currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args),hash:(...args)=>hash(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),assertEnvironmentAudience:(...args)=>assertEnvironmentAudience(...args),nativeEstablishedFact:(...args)=>nativeEstablishedFact(...args),fail:(...args)=>fail(...args)};}
let service;
/** One native scene service; World's environment consumer is bound to this same instance by the pair adapter. */
export function environmentSceneService(){return service??=createEnvironmentSceneRules({capabilities:environmentSceneCapabilities()});}
export function validateMundaneEnvironmentDetail(...args){return environmentSceneService().validateMundaneEnvironmentDetail(...args);}
export function validateMaintenanceMemoryFact(...args){return environmentSceneService().validateMaintenanceMemoryFact(...args);}
export function applyEnvironmentSceneAction(...args){return environmentSceneService().applyEnvironmentSceneAction(...args);}
export function inspectEnvironmentSceneEffect(...args){return environmentSceneService().inspectEnvironmentSceneEffect(...args);}
export function environmentSceneProjection(...args){return environmentSceneService().environmentSceneProjection(...args);}

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

