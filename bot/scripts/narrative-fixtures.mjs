/** Shared deterministic narrative fixtures; importing this module registers no tests. */
import path from 'node:path';
import {FakeResponses} from './contract-fixtures.mjs';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/content.js';
import {POST_TURN_REVIEW_CATEGORIES} from '../src/director.js';
import {captureWorldInput,worldInputKey} from '../src/autonomous-world.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {recordScenePresence,currentScene} from '../src/scene-continuity.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
export const unit=(id,kind,text,fields={})=>({id,kind,text,subject_key:'',location_key:'terminal',visibility:'party',
  epistemic:kind==='rumor'?'testimony':kind==='npc_action_attempt'?'attempt':'observation',source_refs:[],receipt_kind:'',receipt_ref:'',...fields});
export function setup(f,{text='Set the scene',privateScene=false,placed=true,messageId:explicitMessageId=null}={}){
  const pc=f.pcs[0],messageId=explicitMessageId||`freedom-${f.db.listWorldEvents(f.guild,{includeGM:true,limit:100}).length}`,
    scope={mode:privateScene?'private':'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,playable_narration:true,scene_continuity:true,
    narrative_authority:true,narrative_camera:true}});
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Public Terminal',place_type:'parcel office',visibility:'party'});
  if(placed){
    const arrival=indexWorldEvent(f.db,f.guild,{key:`${messageId}:initial`,kind:'arrival',title:'Native fixture initial position',source_id:`player:${pc.owner_user_id}`,
      scene:currentScene(f.db,f.guild).key,session_id:f.session.id,location_key:'terminal',visibility:privateScene?'character':'party',subject_key:privateScene?pc.id:null,
      details:{entity_type:'character',entity_key:pc.id,owner_user_id:pc.owner_user_id}},pc.owner_user_id);
    recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:pc.id,location_key:'terminal',zone:'interior',source_event:arrival.event_key,
      visibility:arrival.visibility,subject_key:arrival.subject_key,accepted_by:pc.owner_user_id},'fixture-native');
  }else f.db.updateCharacterData(pc.id,d=>{delete d.location;});
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,messageId,text,{privateScene});
  return {pc,text,messageId,scope,sourceRef:worldInputKey(messageId,pc.id)};
}
export function candidate(text){
  const state_review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(k=>[k,{decision:'no_change',reason:'No native consequential change.',confidence:100}]));
  state_review.scene={decision:'continue',label:'',reason:'Same scene.',confidence:100};
  const result={respond:true,narration:'UNTRUSTED COMBINED DRAFT',narrative_claims:[],state_review,decision_advisory:null,narrative_interpretation:null,authored_candidates:null,
    player_intents:[{type:'other',source_span:text,target_name:'',target_key:'',destination:'unspecified',operation:'describe_scene',utterance:'',excluded_targets:[],
      framing:'immediate',resolution:'conversational',reason:'Source-owned observation.'}],
    gm_world_parts:[{version:8,kind:'narrative_request',operation:'describe_scene',source_refs:[]}]};
  for(const key of ['ordinary_effect_proposals','world_additions','scene_actions','world_conflicts','context_memories','private_messages',
    'events','handouts','relationships','npc_memories','npc_knowledge','npc_goals','canon_proposals','simulation_updates','ai_intents'])result[key]=[];
  return result;
}
export async function run(f,x,answer,r=candidate(x.text),fast=false){
  const ai=new FakeResponses(fast?[answer]:[r,answer]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
    config:{gmModel:'offline',maxRecentMessages:2,maxContentChunks:1,playableObservationFastPath:fast}});
  const result=await gm.runTurn({guildId:f.guild,actorUserId:x.pc.owner_user_id,actorName:x.pc.name,messageId:x.messageId,messageText:x.text,scope:x.scope.mode});
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:x.messageId,actorPrincipal:x.pc.owner_user_id,audience:x.scope.mode});
  const mutation=commitGmTurn({db:f.db,content:gm.content,guild:{id:f.guild},session:f.db.getActiveSession(f.guild),result,scope:x.scope,speaker:x.pc.name,label:'Narrative freedom fixture',
    meta:{messageId:x.messageId,turnId:attempt.turn_id}});
  return {ai,gm,result,attempt,mutation,rows:f.db.listTurnPublications(f.guild,attempt.turn_id)};
}
