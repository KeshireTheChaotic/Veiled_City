/** Native control classification is a restriction, never a model role or execution grant. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup} from './narrative-fixtures.mjs';
import {createArbitrationOrigin,arbitrationPromptBoard,buildSceneIntentBoard} from '../src/scene-intent-board.js';
import {adjudicateSceneBoard} from '../src/gm-unified-arbitration.js';
import {inspectNativeGmDecision,inspectCommittedGmDecision} from '../src/gm-action-capability.js';
import * as controls from '../src/native-actor-control.js';
import {sceneFictionHash as hash} from '../src/scene-fiction-context.js';
import {assertNpcAvailability} from '../src/city-constraints.js';
import {actorSource} from '../src/simulation-motivation.js';
import {indexWorldEvent} from '../src/city-calendar.js';

function fixture(f,key='attendant'){
  const x=setup(f,{text:'What happens next?'});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true}});
  f.db.upsertNpcProfile(f.guild,{npcKey:key,displayName:'Local attendant',role:'attendant'});
  f.db.setSimulationEntity(f.guild,'npc',key,{name:'Local attendant',location_key:'terminal',visibility:'party'});
  return {...x,key,origin:createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef)};
}
const proposal=key=>({actor_key:key,operation:'speak',target_refs:[],objective_ref:'',source_refs:[],dependencies:[]});
const ruling=intent_ref=>({intent_ref,disposition:'npc_no_roll',rule_basis_refs:['srd:gm-moves'],difficulty:null,trait:null,
  stakes_kind:'attempt_only',stakes:'none',reason:'An ordinary NPC invitation only.',difficulty_reason:'',feature_ref:'',experience_ref:'',advantage:false,disadvantage:false});

test('native actor control: legacy NPC availability and motivation cannot acquire a real PC through a colliding profile',()=>nativeFixture(f=>{
  const x=fixture(f,f.pcs[0].id),before=f.db.getCharacter(x.pc.id),source=indexWorldEvent(f.db,f.guild,{key:'control-report',kind:'observation',
    title:'A native reported lead',source_id:'gm',visibility:'gm'},'gm');
  f.db.upsertNpcKnowledge(f.guild,{npcKey:x.key,knowledgeKey:'lead',content:'An attributed report, not an established fact.',sourceRef:source.event_key});
  assert.throws(()=>assertNpcAvailability(f.db,f.guild,x.key,{type:'investigate',location_key:'terminal'}),/Player characters cannot be controlled as NPCs/);
  assert.throws(()=>actorSource(f.db,f.guild,{actor_type:'npc',actor_key:x.key,information_key:'lead',source_event:source.event_key}),/Player characters cannot be controlled as NPCs/);
  assert.deepEqual(f.db.getCharacter(x.pc.id),before);
}));

test('native actor control: ordinary native NPC availability and its own sourced motivation remain available',()=>nativeFixture(f=>{
  const x=fixture(f),source=indexWorldEvent(f.db,f.guild,{key:'npc-control-report',kind:'observation',title:'An available NPC lead',source_id:'gm',visibility:'gm'},'gm');
  f.db.upsertNpcKnowledge(f.guild,{npcKey:x.key,knowledgeKey:'lead',content:'An attributed report, not an established fact.',sourceRef:source.event_key});
  assert.doesNotThrow(()=>assertNpcAvailability(f.db,f.guild,x.key,{type:'investigate',location_key:'terminal'}));
  assert.equal(actorSource(f.db,f.guild,{actor_type:'npc',actor_key:x.key,information_key:'lead',source_event:source.event_key}).event.event_key,source.event_key);
}));

test('native actor control: a PC ID with an NPC profile is never an AI NPC candidate',()=>nativeFixture(f=>{
  const x=fixture(f,f.pcs[0].id),packet=arbitrationPromptBoard(f.db,f.guild,x.origin);
  assert(!packet.npc_candidates.some(n=>n.actor_key===x.key));
  assert.throws(()=>buildSceneIntentBoard(f.db,f.guild,x.origin,[],[proposal(x.key)]));
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,limit:100}).filter(e=>e.kind==='native_npc_scene_intent').length,0);
}));

test('native actor control: native PCs and proxies outrank proposed GM labels; unknown actors remain administrative',()=>nativeFixture(f=>{
  const x=fixture(f),control=()=>controls.nativeActorControl(f.db,f.guild,'npc',x.key);
  assert.equal(control().owner_control_type,'ai_world');
  assert.equal(control().execution_authority,false);
  assert.equal(controls.nativeActorControl(f.db,f.guild,'npc',x.pc.id).owner_control_type,'player');
  f.db.setSimulationEntity(f.guild,'npc','unproven',{location_key:'terminal',owner_control_type:'ai_world',gm:true});
  assert.equal(controls.nativeActorControl(f.db,f.guild,'npc','unproven').owner_control_type,'admin');
  assert.equal(controls.nativeActorControl(f.db,f.guild,'organization','unproven').owner_control_type,'admin');
  f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:x.key,userId:f.pcs[1].owner_user_id,status:'active'});
  assert.equal(control().owner_control_type,'proxy');
  assert(!arbitrationPromptBoard(f.db,f.guild,createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef)).npc_candidates.some(n=>n.actor_key===x.key));
  assert.throws(()=>buildSceneIntentBoard(f.db,f.guild,JSON.parse(JSON.stringify(x.origin)),[],[proposal(x.key)]),/native_origin/);
}));

test('native actor control: routine classification does not waive campaign operator policy',()=>nativeFixture(f=>{
  const x=fixture(f);
  f.db.saveCityRecord(f.guild,{kind:'gm_authority',key:'campaign',source_event:x.sourceRef,visibility:'gm',data:{gm_authority_mode:'manual'}});
  assert.equal(controls.nativeActorControl(f.db,f.guild,'npc',x.key).owner_control_type,'ai_world');
  assert.throws(()=>createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),/manual_gm_authority/);
  assert.throws(()=>buildSceneIntentBoard(f.db,f.guild,x.origin,[],[proposal(x.key)]),/manual_gm_authority/);
}));

test('native actor control: historical v1 board retries retain exact hashes and still recheck live proxy control',()=>nativeFixture(f=>{
  const x=fixture(f),p=proposal(x.key),current=buildSceneIntentBoard(f.db,f.guild,x.origin,[],[p]),legacy=structuredClone(current);
  assert.equal(current.data.version,2);
  // Sanitized native v1 history: only the additive classification field/version differ.
  legacy.data.version=1;
  for(const entry of legacy.data.entries){
    delete entry.actor.owner_control_type;
    const event=f.db.getWorldEvent(f.guild,entry.source_ref),{source_ref,source_hash,...material}=entry;
    event.details.entry_hash=hash(material);
    f.db.db.prepare('UPDATE world_events SET details_json=? WHERE guild_id=? AND event_key=?').run(JSON.stringify(event.details),f.guild,event.event_key);
    entry.source_hash=hash(event.details);
  }
  f.db.saveCityRecord(f.guild,{...legacy,key:legacy.record_key});
  const event=f.db.getWorldEvent(f.guild,legacy.source_event);event.details.payload_hash=hash(legacy.data);
  f.db.db.prepare('UPDATE world_events SET details_json=? WHERE guild_id=? AND event_key=?').run(JSON.stringify(event.details),f.guild,event.event_key);
  assert.deepEqual(buildSceneIntentBoard(f.db,f.guild,x.origin,[],[p]).data,legacy.data);
  const [d]=adjudicateSceneBoard(f.db,f.guild,x.origin,legacy,[ruling(legacy.data.entries[0].intent_ref)]);
  assert.equal(inspectNativeGmDecision(f.db,f.guild,d.record_key).board.data.version,1);
  f.restart();
  assert.equal(inspectNativeGmDecision(f.db,f.guild,d.record_key).board.data.version,1);
  f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:x.key,userId:f.pcs[1].owner_user_id,status:'active'});
  assert.throws(()=>inspectNativeGmDecision(f.db,f.guild,d.record_key));
}));

test('native actor control: source-bound AI ownership survives restart but cannot authorize an owner choice',()=>nativeFixture(f=>{
  const x=fixture(f),packet=arbitrationPromptBoard(f.db,f.guild,x.origin),board=buildSceneIntentBoard(f.db,f.guild,x.origin,[],[proposal(x.key)]);
  assert.equal(packet.npc_candidates[0].owner_control_type,'ai_world');
  assert.equal(board.data.entries[0].actor.owner_control_type,'ai_world');
  const [decision]=adjudicateSceneBoard(f.db,f.guild,x.origin,board,[ruling(board.data.entries[0].intent_ref)]);
  assert.equal(decision.status,'resolved_no_roll');
  assert.equal(decision.data.native,null);
  const before=f.db.getCharacter(x.pc.id).data;
  f.restart();
  assert.equal(inspectNativeGmDecision(f.db,f.guild,decision.record_key).entry.actor.owner_control_type,'ai_world');
  assert.deepEqual(f.db.getCharacter(x.pc.id).data,before);
  f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:x.key,userId:f.pcs[1].owner_user_id,status:'active'});
  assert.throws(()=>inspectNativeGmDecision(f.db,f.guild,decision.record_key));
  // Historical source proof is not a new-action capability and must not undo a committed operation.
  assert.equal(inspectCommittedGmDecision(f.db,f.guild,decision.record_key).entry.actor.owner_control_type,'ai_world');
}));
