/** New creative authority contract: real commit/outbox adapters, synthetic provider, temporary SQLite only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
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
export function setup(f,{text='Set the scene',privateScene=false,placed=true}={}){
  const pc=f.pcs[0],messageId=`freedom-${f.db.listWorldEvents(f.guild,{includeGM:true,limit:100}).length}`,
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
  const mutation=commitGmTurn({db:f.db,guild:{id:f.guild},session:f.db.getActiveSession(f.guild),result,scope:x.scope,speaker:x.pc.name,label:'Narrative freedom fixture',
    meta:{messageId:x.messageId,turnId:attempt.turn_id}});
  return {ai,gm,result,attempt,mutation,rows:f.db.listTurnPublications(f.guild,attempt.turn_id)};
}
const setting=()=>({narrative_units:[unit('setting','scene','Warm lamplight pools on a slate counter. A red notice flutters beside the open public doorway.')],fiction_delta:[]});
test('N01 fresh empty scene retains expressive fiction, not the raw combined draft',()=>nativeFixture(async f=>{
  const x=setup(f),out=await run(f,x,setting()),text=out.rows.map(r=>r.payload).join('\n');
  assert.match(text,/slate counter/);assert.match(text,/red notice/);assert(!/UNTRUSTED|No additional character response/.test(text));
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);
  const camera=setup(f,{placed:false}),direct=await run(f,camera,setting(),undefined,true);
  assert.equal(direct.ai.requests.length,1);assert.equal(JSON.parse(direct.ai.requests[0].input).viewpoint.kind,'camera');
  assert.equal(f.db.getCharacter(x.pc.id).data.location,undefined);assert(direct.rows.some(r=>r.payload.includes('slate counter')));
}));
test('N02 native creation establishes new named place and NPC without moving a PC',()=>nativeFixture(async f=>{
  const x=setup(f),answer=setting();answer.fiction_delta=[
    {kind:'location',key:'copper-arcade',name:'Copper Arcade',summary:'An ordinary public arcade.',location_key:'',parent_location_key:'terminal',role:'arcade',aliases:['Copper Walk']},
    {kind:'npc',key:'mara-lane',name:'Mara Lane',summary:'An ordinary night-shift porter.',location_key:'copper-arcade',parent_location_key:'',role:'porter',aliases:['Mara']}];
  answer.narrative_units=[unit('arcade','scene','Copper Arcade lies beyond a brass-framed arch.',{location_key:'copper-arcade'}),
    unit('porter','npc_speech','Late parcels again? Leave the story sealed if you like—what are you looking for?',{subject_key:'mara-lane',location_key:'copper-arcade',epistemic:'testimony'})];
  const out=await run(f,x,answer);assert(out.rows.some(r=>r.payload.includes('Copper Arcade')));
  assert(f.db.getSimulationEntity(f.guild,'location','copper-arcade'));assert(f.db.getNpcProfile(f.guild,'mara-lane'));
  assert.equal(f.db.getCharacter(x.pc.id).data.location,'terminal');assert.equal(out.mutation.world.length,0);
}));
test('N03 observed soft clue and attributed rumor do not establish a hidden cause or canon',()=>nativeFixture(async f=>{
  const x=setup(f),answer={narrative_units:[unit('knocks','lead','Three uneven knocks come from the wall behind the parcel rack.'),
    unit('rumor','rumor','A handwritten note claims the night ferry carries letters without stamps.',{epistemic:'testimony'})],fiction_delta:[]},out=await run(f,x,answer);
  assert(out.rows.some(r=>r.payload.includes('Three uneven knocks')));assert(out.rows.some(r=>r.payload.includes('claims')));
  assert.equal(f.db.listCanon(f.guild,{includeGM:true,limit:500}).length,0);
}));
test('N10 legitimate AI-GM observation is retrieved; private ancestor is excluded',()=>nativeFixture(async f=>{
  const x=setup(f),source=indexWorldEvent(f.db,f.guild,{key:'observed-lamp',kind:'observation',title:'Native visible lamp',source_id:'native:fixture',
    truth_status:'observed',visibility:'party',location_key:'terminal',session_id:f.session.id,scene:currentScene(f.db,f.guild).key,details:{}},'native:fixture');
  f.db.addFact(f.guild,{source:'ai_gm',category:'environment',content:'A green lamp stands on the counter.',visibility:'party',
    provenance:{scene_location:'terminal',epistemic:{kind:'observation',source_refs:[source.event_key],perspective:'native:fixture'}}});
  const hidden=indexWorldEvent(f.db,f.guild,{key:'hidden-lamp-source',kind:'observation',title:'Secret cause',source_id:'native:fixture',visibility:'gm',details:{}},'native:fixture'),
    wrapper=indexWorldEvent(f.db,f.guild,{key:'bad-public-wrapper',kind:'observation',title:'Not audience authority',source_id:'native:fixture',visibility:'party',details:{input_source:hidden.event_key}},'native:fixture');
  f.db.addFact(f.guild,{source:'ai_gm',category:'environment',content:'LAUNDERED_PRIVATE_CAUSE',visibility:'party',
    provenance:{scene_location:'terminal',epistemic:{kind:'observation',source_refs:[wrapper.event_key],perspective:'native:fixture'}}});
  const {buildNarrativeContext}=await import('../src/narrative-authority-context.js'),ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef);
  assert(JSON.stringify(ctx.packet).includes('green lamp'));
  assert(!JSON.stringify(ctx.packet).includes('LAUNDERED_PRIVATE_CAUSE'));
}));
test('N11 PC surname and alias attempts are held without suppressing an independent scene unit',()=>nativeFixture(async f=>{
  const x=setup(f);f.db.updateCharacterData(f.pcs[1].id,d=>{d.aliases=['Calesh','Quietblade'];});
  const answer=setting();answer.narrative_units.push(unit('forced','scene','Quietblade apologizes and surrenders.'));
  const out=await run(f,x,answer),text=out.rows.map(r=>r.payload).join('\n');assert(text.includes('slate counter'));assert(!text.includes('apologizes'));
}));
test('N18 cross-audience reference cannot launder a secret through an invented scene unit',()=>nativeFixture(async f=>{
  const x=setup(f),secret=f.db.addFact(f.guild,{content:'PRIVATE_SYNTHETIC_ORIGIN',visibility:'character',subjectCharacterId:f.pcs[1].id}),answer=setting();
  answer.narrative_units.push(unit('secret','scene','PRIVATE_SYNTHETIC_ORIGIN',{source_refs:[secret]}));
  const out=await run(f,x,answer);assert(out.rows.every(r=>!r.payload.includes('PRIVATE_SYNTHETIC_ORIGIN')));assert(out.rows.some(r=>r.payload.includes('slate counter')));
}));
