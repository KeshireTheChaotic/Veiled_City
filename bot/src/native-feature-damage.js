/** Automatic, pinned adversary defense before existing native NPC damage finalization. No dice or PC effects. */
import {compileNativeFeatures} from './native-feature-catalog.js';
import {EncounterLibrary} from './encounter.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {currentScene,scenePresence} from './scene-continuity.js';
import {activeCityProxy} from './city-constraints.js';
import {indexWorldEvent} from './city-calendar.js';
import {historicalActionSource} from './action-consent.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {hpMarksForDamage} from './frameworks/daggerheart/public.js';

const HANDLER='first_severe_to_major',library=()=>new EncounterLibrary('../content');
function savedDamage(db,guild,request,data){
  const source=db.getWorldEvent(guild,request.source_event),pc=db.getCharacter(request.subject_key),roll=db.getSavedRoll(guild,data.roll_id);
  const stable=['kind','session_id','scene','character_id','owner_user_id','roll_id','result','breakdown','input'];
  if(hash(request)!==hash(db.getCityRecord(guild,'roll_request',request.record_key))
    ||stable.some(k=>hash(data[k])!==hash(request.data[k]))
    ||source?.status!=='active'||!['authored_turn','player_declaration'].includes(source.kind)||source.details.character_id!==pc?.id
    ||source.source_id!==`player:${pc?.owner_user_id}`||pc?.owner_user_id!==data.owner_user_id||source.details.author!==pc.owner_user_id
    ||!db.ownerAuthoredSource(guild,source.event_key,pc.owner_user_id)||source.session_id!==data.session_id||source.scene!==data.scene
    ||data.kind!=='attack'||roll?.session_id!==data.session_id||roll.payload.request!==request.record_key
    ||hash(Object.fromEntries(Object.keys(data.result).map(k=>[k,roll.payload[k]])))!==hash(data.result)
    ||data.result.duality!=='Critical'&&data.result.total<data.breakdown.attack.difficulty)throw fail('defense_actual_saved_attack');
  if(data.input.accepted_intent){
    const accepted=db.getCityRecord(guild,'typed_intent',data.input.accepted_intent);
    historicalActionSource(db,guild,data.input.accepted_intent,{resolved:accepted?.status==='resolved'});
  }
  const participants=data.tag?.participants||[{character:data.character_id,user:data.owner_user_id,damage:data.damage}];
  const damage=[];
  for(const p of participants){
    const d=p.damage,s=d&&db.getSavedRoll(guild,d.roll_id),{roll_id:ignored,...payload}=d||{},owner=db.getCharacter(p.character)?.owner_user_id;
    if(s?.roll_type!=='attack_damage'||s.session_id!==data.session_id||s.character_id!==p.character||s.discord_user_id!==owner
      ||p.user&&p.user!==owner||s.payload.request!==request.record_key
      ||hash(Object.fromEntries(Object.keys(payload).map(k=>[k,s.payload[k]])))!==hash(payload))throw fail('defense_actual_saved_damage');
    damage.push({roll:s.id,character:p.character,owner,total:s.payload.total});
  }
  return {roll:roll.id,damage,total:damage.reduce((n,d)=>n+d.total,0)};
}

/** Called only inside finishDamage after actual damage dice were saved and before any NPC HP mutation. */
export function nativeAdversaryDamageDefense(db,guild,request,data,target,{total,type,marks}){
  if(marks!==3)return null;
  const feature=compileNativeFeatures().find(f=>f.actor_name===target.base_name&&f.native_handler===HANDLER);
  if(!feature)return null;
  const scene=currentScene(db,guild),encounter=db.getCurrentEncounter(data.session_id),binding=encounter&&db.getCityRecord(guild,'encounter_binding',encounter.id),
    actor=binding?.data.combatants.find(b=>b.id===target.id)?.actor,presence=actor&&scenePresence(db,guild,'npc',actor),entity=actor&&db.getSimulationEntity(guild,'npc',actor),
    template=library().findAdversary(target.base_name),source=db.getWorldEvent(guild,binding?.source_event);
  // An unbound/proxied/stale actor never acquires this automatic AI-owned defense by its display name.
  if(!actor||activeCityProxy(db,guild,actor)||encounter.status!=='active'||encounter.id!==data.breakdown.attack.encounter_id
    ||source?.status!=='active'||hash(template)!==feature.template_hash||scene.key!==data.scene||scene.session_id!==data.session_id
    ||presence?.data.state!=='actually_present'||presence.data.scene!==scene.key||db.getWorldEvent(guild,presence.source_event)?.status!=='active'
    ||entity?.state.location_key!==presence.location_key||presence.location_key!==db.getCharacter(data.character_id)?.data.location)return null;
  const charge=`defense-charge:${hash([scene.key,actor,feature.feature_key])}`;
  if(db.getCityRecord(guild,'adversary_defense_charge',charge))return null; // Never refresh a spent charge after retraction/restart.
  const proof=savedDamage(db,guild,request,data);
  if(proof.total!==total||hpMarksForDamage(target,total)!==3||target.id!==data.breakdown.attack.target_id)throw fail('defense_native_damage_target');
  const key=`adversary-defense:${hash([request.record_key,proof.damage.map(d=>d.roll),feature.feature_key])}`,
    material={version:1,phase:'before_damage_applied',feature:feature.feature_key,feature_hash:hash(feature),template_hash:feature.template_hash,
      actor,combatant:target.id,scene:scene.key,session:scene.session_id,request:request.record_key,input_source:request.source_event,
      proof,total,type,marks_before:3,marks_after:2,hp_before:target.hp_current,hp_after:Math.max(0,target.hp_current-2),charge};
  const event=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_adversary_defense',source_id:'native:feature-gate',
    title:'Native automatic pre-damage defense',session_id:scene.session_id,scene:scene.key,location_key:presence.location_key,
    visibility:'gm',details:{input_source:request.source_event,payload_hash:hash(material)}},'native:feature-gate');
  const receipt=db.saveCityRecord(guild,{kind:'adversary_defense_receipt',key,status:'resolved',source_event:event.event_key,visibility:'gm',data:material});
  db.saveCityRecord(guild,{kind:'adversary_defense_charge',key:charge,status:'consumed',source_event:event.event_key,visibility:'gm',
    data:{scene:scene.key,actor,feature:feature.feature_key,receipt:key}});
  return {marks:2,ref:receipt.record_key};
}

/** Read-only saved receipt; cannot reapply damage, restore the charge, spend or roll. */
export function inspectAdversaryDamageDefense(db,guild,request){
  const result=request?.data.damage_result,key=result?.defense_ref;if(!key)return null;
  if(hash(request)!==hash(db.getCityRecord(guild,'roll_request',request.record_key)))throw fail('defense_current_native_request');
  const receipt=db.getCityRecord(guild,'adversary_defense_receipt',key),v=receipt?.data,event=receipt&&db.getWorldEvent(guild,receipt.source_event),
    feature=compileNativeFeatures().find(f=>f.feature_key===v?.feature),charge=v&&db.getCityRecord(guild,'adversary_defense_charge',v.charge),
    proof=savedDamage(db,guild,request,request.data);
  if(receipt?.status!=='resolved'||receipt.visibility!=='gm'||event?.status!=='active'||event.kind!=='native_adversary_defense'
    ||event.source_id!=='native:feature-gate'||event.details.payload_hash!==hash(v)||event.details.input_source!==request.source_event
    ||!feature||feature.native_handler!==HANDLER||hash(feature)!==v.feature_hash||feature.template_hash!==v.template_hash
    ||v.request!==request.record_key||v.input_source!==request.source_event||v.scene!==request.data.scene||v.session!==request.data.session_id
    ||v.phase!=='before_damage_applied'||v.marks_before!==3||v.marks_after!==2||hash(proof)!==hash(v.proof)||proof.total!==v.total
    ||charge?.status!=='consumed'||charge.visibility!=='gm'||charge.source_event!==receipt.source_event||charge.data.receipt!==key
    ||v.charge!==`defense-charge:${hash([v.scene,v.actor,v.feature])}`||charge.data.actor!==v.actor||charge.data.feature!==v.feature
    ||result.marks!==2||result.total!==v.total||result.type!==v.type||result.target_id!==v.combatant||result.before!==v.hp_before
    ||result.after!==v.hp_after||v.hp_after!==Math.max(0,v.hp_before-2))throw fail('native_adversary_defense_ancestry');
  return receipt;
}
