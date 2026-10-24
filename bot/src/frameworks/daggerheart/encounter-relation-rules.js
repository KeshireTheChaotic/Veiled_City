/** Complete native native-encounter-relations policy; source and repository capabilities are explicitly injected. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeArbitrationFailure as fail} from './native-failure.js';
export function createEncounterRelationRules({capabilities}){
const {currentScene,scenePresence,sceneAccess,activeCityProxy,nativeActorTaxonomy,EncounterLibrary,inspectNativeGmDecision,indexWorldEvent}=capabilities||{};
if([currentScene,scenePresence,sceneAccess,activeCityProxy,nativeActorTaxonomy,EncounterLibrary,inspectNativeGmDecision,indexWorldEvent].some(fn=>typeof fn!=='function'))throw new TypeError('Native native-encounter-relations capabilities required');
const pairKey=(encounter,a,b)=>`npc-alliance:${hash([encounter,[a,b].sort()])}`;
function nativeEncounterActor(db,guild,actor,{library=new EncounterLibrary('../content')}={}){
  const scene=currentScene(db,guild),encounter=db.getCurrentEncounter(scene.session_id),binding=encounter&&db.getCityRecord(guild,'encounter_binding',encounter.id),
    bound=binding?.data.combatants?.find(b=>b.actor===actor),combatant=bound&&db.listCombatants(encounter.id).find(c=>c.id===bound.id),
    presence=scenePresence(db,guild,'npc',actor),entity=db.getSimulationEntity(guild,'npc',actor),template=combatant&&library.findAdversary(combatant.base_name);
  if(!actor||db.getCharacter(actor)||activeCityProxy(db,guild,actor)||encounter?.status!=='active'||binding?.status!=='active'
    ||db.getWorldEvent(guild,binding?.source_event)?.status!=='active'||combatant?.status!=='active'||combatant.hp_current<1
    ||presence?.data.state!=='actually_present'||presence.data.scene!==scene.key||db.getWorldEvent(guild,presence.source_event)?.status!=='active'
    ||entity?.state.removed||['dead','removed'].includes(entity?.state.status)||entity?.state.location_key!==presence.location_key||!template)
    throw fail('alliance_current_native_unproxied_actor');
  nativeActorTaxonomy('adversary',template); // Exact UA6 actor source, not a display-name grant.
  return {actor,scene:scene.key,session:scene.session_id,encounter:encounter.id,binding:hash(binding),combatant,presence,entity,template};
}
function nativeAlliancePlan(db,guild,origin,entry,{library}={}){
  if(entry.actor.type!=='npc'||!['set_allies','clear_allies'].includes(entry.operation)||!entry.target_refs.length||entry.target_refs.length>4)
    throw fail('alliance_npc_operation');
  const actor=nativeEncounterActor(db,guild,entry.actor.key,{library}),targets=entry.target_refs.map(key=>nativeEncounterActor(db,guild,key,{library}));
  if(actor.scene!==origin.binding.scene||targets.some(t=>t.actor===actor.actor||t.encounter!==actor.encounter||t.presence.location_key!==actor.presence.location_key
    ||!origin.eligible.some(n=>n.key===t.actor)||!sceneAccess(db,guild,{observer_type:'npc',observer_key:actor.actor,target_type:'npc',target_key:t.actor})))
    throw fail('alliance_separate_local_gm_owned_targets');
  return {operation:'commit_npc_alliance',state:entry.operation==='set_allies'?'allied':'ended',encounter:actor.encounter,
    actor:actor.actor,targets:targets.map(t=>({actor:t.actor,snapshot:hash(t)})),actor_snapshot:hash(actor)};
}
function commitNativeNpcAlliance(db,guild,decisionKey,{library}={}){
  return db.transaction(()=>{
    const {row,entry}=inspectNativeGmDecision(db,guild,decisionKey),n=row.data.native;
    if(n?.operation!=='commit_npc_alliance')throw fail('alliance_native_decision');
    const key=`npc-alliance-receipt:${hash(decisionKey)}`,prior=db.getCityRecord(guild,'native_npc_alliance_receipt',key);
    if(prior)return inspectNativeNpcAllianceReceipt(db,guild,key);
    const plan=nativeAlliancePlan(db,guild,{binding:row.data.origin,eligible:[{key:entry.actor.key},...n.targets.map(t=>({key:t.actor}))]},entry,{library});
    if(hash(plan)!==hash(n))throw fail('alliance_actor_source_changed');
    const data={version:1,decision:decisionKey,scene:row.data.origin.scene,session:row.data.origin.session,plan:n},
      event=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_encounter_alliance',source_id:'native:unified-gm',
        title:'Native GM-owned NPC alliance',session_id:data.session,scene:data.scene,visibility:'gm',details:{input_source:row.source_event,payload_hash:hash(data)}},'native:unified-gm');
    const receipt=db.saveCityRecord(guild,{kind:'native_npc_alliance_receipt',key,status:'resolved',source_event:event.event_key,visibility:'gm',data});
    for(const t of n.targets)db.saveCityRecord(guild,{kind:'native_npc_alliance',key:pairKey(n.encounter,n.actor,t.actor),status:n.state,
      source_event:event.event_key,visibility:'gm',data:{encounter:n.encounter,actors:[n.actor,t.actor].sort(),receipt:key}});
    return receipt;
  });
}
/** Historical proof only. Later movement/HP must not rewrite a legitimately committed relationship. */
function inspectNativeNpcAllianceReceipt(db,guild,key){
  const receipt=db.getCityRecord(guild,'native_npc_alliance_receipt',key),v=receipt?.data,event=receipt&&db.getWorldEvent(guild,receipt.source_event),
    decision=v&&db.getCityRecord(guild,'gm_arbitration_decision',v.decision),source=decision&&db.getWorldEvent(guild,decision.source_event),
    board=decision&&db.getCityRecord(guild,'scene_intent_board',decision.data.board),boardSource=board&&db.getWorldEvent(guild,board.source_event),
    entry=board?.data.entries.find(e=>e.intent_ref===decision.data.entry),input=decision&&db.getWorldEvent(guild,decision.data.origin.source);
  if(!v||receipt.status!=='resolved'||receipt.visibility!=='gm'||key!==`npc-alliance-receipt:${hash(v.decision)}`
    ||event?.status!=='active'||event.kind!=='native_encounter_alliance'||event.source_id!=='native:unified-gm'||event.visibility!=='gm'
    ||event.details.payload_hash!==hash(v)||event.details.input_source!==decision?.source_event
    ||source?.status!=='active'||source.kind!=='native_gm_arbitration'||source.source_id!=='native:unified-gm'||source.details.payload_hash!==hash(decision.data)
    ||boardSource?.status!=='active'||boardSource.kind!=='native_scene_intent_board'||boardSource.source_id!=='native:unified-gm'||boardSource.details.payload_hash!==hash(board.data)
    ||input?.status!=='active'||hash(input.details)!==decision.data.origin.source_hash||!entry||hash(entry)!==decision.data.entry_hash
    ||entry.actor.type!=='npc'||v.plan.actor!==entry.actor.key||hash(v.plan)!==hash(decision.data.native)||v.plan.operation!=='commit_npc_alliance'
    ||!['allied','ended'].includes(v.plan.state)||v.scene!==decision.data.origin.scene||v.session!==decision.data.origin.session)
    throw fail('alliance_native_receipt_ancestry');
  return receipt;
}
function nativeNpcAlliance(db,guild,encounter,a,b){
  if(a===b)return null;
  const row=db.getCityRecord(guild,'native_npc_alliance',pairKey(encounter,a,b));if(!row)return null;
  const receipt=inspectNativeNpcAllianceReceipt(db,guild,row.data.receipt),v=receipt.data;
  if(row.visibility!=='gm'||row.source_event!==receipt.source_event||row.status!==v.plan.state||row.data.encounter!==encounter
    ||hash(row.data.actors)!==hash([a,b].sort())||v.plan.encounter!==encounter||![a,b].includes(v.plan.actor)
    ||!v.plan.targets.some(t=>t.actor===(v.plan.actor===a?b:a)))throw fail('alliance_current_pointer');
  return row.status==='allied'?row:null;
}

return Object.freeze({nativeEncounterActor,nativeAlliancePlan,commitNativeNpcAlliance,inspectNativeNpcAllianceReceipt,nativeNpcAlliance});
}
