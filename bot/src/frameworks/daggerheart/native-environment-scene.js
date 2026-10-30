/** Native environment scene composition: Daggerheart rules wired to original sources through fixed ports. */
import {inspectNativeEnvironmentInstance,nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {projectFeatureRuleContexts} from './feature-context-projection.js';
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
  if(result.length<6){
    const profile=nativeEnvironmentInstanceForScope(db,guild,scope,location);
    result.push(...projectFeatureRuleContexts(profile,profile?.authored_feature_rules,{environment:true}).slice(0,6-result.length));
  }
  return result;
}

