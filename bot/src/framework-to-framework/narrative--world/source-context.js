/** Read-only native causal signals for the existing GM request. No world effects, disclosure or provider calls. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {narrativeSourceVisible,rankWorldNarrativeOpportunities} from '../../frameworks/narrative/public.js';
import {worldKnowledgeSources,worldSessionScene,worldConversationPrincipal} from '../../frameworks/world/public.js';
function listNarrativeRecords(...args){return worldKnowledgeSources.listNarrativeRecords(...args);}function currentScene(...args){return worldSessionScene.currentScene(...args);}function scenePresence(...args){return worldSessionScene.scenePresence(...args);}function conversationPrincipal(...args){return worldConversationPrincipal.conversationPrincipal(...args);}
import {findNpcConversationMemory,npcSignalMemoryReferenceValid,npcConversationMemoryVisible as actorEvidenceVisible,activeCityProxy,worldSimulationReceiptForAudience} from '../../frameworks/world/public.js';
import {narrativeUnitRenderSource} from '../../frameworks/narrative/public.js';
function renderNarrativeUnit(...args){return narrativeUnitRenderSource.renderNarrativeUnit(...args);}
import {narrativeBridgeSessionSources,narrativeBridgeNativeSources} from '../../frameworks/narrative/public.js';
function inspectOpeningEntryOpportunity(...args){return narrativeBridgeSessionSources.inspectOpeningEntryOpportunity(...args);}function inspectSessionOpening(...args){return narrativeBridgeSessionSources.inspectSessionOpening(...args);}function assemblyDeliverySummary(...args){return narrativeBridgeSessionSources.assemblyDeliverySummary(...args);}
function completedActionSource(...args){return narrativeBridgeNativeSources.completedActionSource(...args);}function historicalActionSource(...args){return narrativeBridgeNativeSources.historicalActionSource(...args);}function typedRollProof(...args){return narrativeBridgeNativeSources.typedRollProof(...args);}function validateFearEffect(...args){return narrativeBridgeNativeSources.validateFearEffect(...args);}
import {inspectNativeEncounterCandidate} from '../../frameworks/world/public.js';
const entitled=(row,scope)=>['public','party'].includes(row.visibility)||scope.mode==='private'&&row.visibility==='character'
  &&row.subject_key===scope.actorCharacterId&&!!scope.actorUserId;
const audience=s=>s.mode==='private'?{visibility:'character',character:s.actorCharacterId,user:s.actorUserId}:{visibility:'party',character:null,user:null};
function ownerScope(db,guild,s){
  if(s.mode!=='private')return s.mode==='party';
  const pc=db.getCharacter(s.actorCharacterId);return pc?.guild_id===guild&&pc.owner_user_id===s.actorUserId;
}
function envelope(scene,scope,kind,root,refs,disposition){
  const boundary=audience(scope),operation=refs[0].key,cycle=`world-cycle:${hash([scene.session_id,scene.key,root])}`;
  return {version:1,protocol:'narrative_signal_v1',id:`world-signal:${hash([kind,root,operation,boundary,cycle])}`,kind,operation_ref:operation,
    session:scene.session_id,scene:scene.key,audience:boundary,causation_ref:root,world_cycle_ref:cycle,depth:0,
    origin_kind:['unresolved_narrative_task','opening_opportunity_request'].includes(kind)?'native_diagnostic':'human_action',source_refs:refs,
    authority_disposition:disposition,execution_authority:false,publication_authority:false};
}
function nativeDirectorBridge(db,guild,source,scope){
  const actual=source&&db.getWorldEvent(guild,source.event_key),d=source?.details;
  return !!(actual&&hash(actual)===hash(source)&&source.status==='active'&&source.kind==='native_director_narrative_scope'
    &&source.source_id==='native:director'&&source.event_key===`director-fiction:${hash(d)}`&&d?.version===2
    &&hash(d.scope)===hash(scope)&&narrativeSourceVisible(db,guild,source.event_key,scope)
    &&d.world_bridge?.version===1&&Array.isArray(d.world_bridge.signals)&&d.world_bridge.signals.length<=4);
}
/** GM-authored camera fiction is usable only through an active, ledger-authenticated native scope. */
function nativeCameraNarrativeOrigin(db,guild,origin,binding,scope,scene){
  if(scope.mode!=='party'||scope.actorUserId||scope.actorCharacterId||binding?.scope?.mode!=='party'
    ||binding.scope.actorUserId||binding.scope.actorCharacterId||hash(binding.scope)!==hash(scope)
    ||origin?.status!=='active'||origin.session_id!==scene.session_id||origin.scene!==scene.key
    ||origin.visibility!=='party'||origin.subject_key!=null||origin.details?.private_scene!==false
    ||!db.ownerAuthoredSource(guild,origin.event_key,origin.source_id))return false;
  if(origin.kind==='native_assembly_scope')return origin.source_id==='native:assembly'&&origin.details?.version===2;
  if(origin.kind==='native_director_narrative_scope')return origin.source_id==='native:director'&&origin.details?.version===2
    &&origin.event_key===`director-fiction:${hash(origin.details)}`;
  return false;
}

export {hash,narrativeSourceVisible,rankWorldNarrativeOpportunities,listNarrativeRecords,currentScene,scenePresence,conversationPrincipal,findNpcConversationMemory,npcSignalMemoryReferenceValid,actorEvidenceVisible,activeCityProxy,worldSimulationReceiptForAudience,renderNarrativeUnit,inspectOpeningEntryOpportunity,inspectSessionOpening,assemblyDeliverySummary,completedActionSource,historicalActionSource,typedRollProof,validateFearEffect,inspectNativeEncounterCandidate,entitled,audience,ownerScope,envelope,nativeDirectorBridge,nativeCameraNarrativeOrigin};
