/** 10.2 regressions: temporary native fixtures and synthetic responses, never provider traffic. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {FakeResponses,fakeInteraction} from './contract-fixtures.mjs';
import {setup,candidate,unit} from './narrative-freedom-test.mjs';
import {INTENT_PAYLOADS,intentOperations} from '../src/ai-intent-contracts.js';
import {configureDelegation,delegationPolicy,delegationOperation} from '../src/ai-intents.js';
import {delegationCatalog} from '../src/delegation-catalog.js';
import {handleStoryCommand} from '../src/story-commands.js';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/content.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
export const allOperations=()=>[...new Set(Object.keys(INTENT_PAYLOADS).flatMap(f=>intentOperations(f).map(op=>`${f}.${op}`)))].sort();
export async function qualityTurn(f,{omit=false,fast=false,text='Describe the scene',answer=null,config={}}={}){
  const x=setup(f,{text}),r=candidate(text);if(omit)r.gm_world_parts=[];
  const ai=new FakeResponses(fast?[answer]:[r,answer]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai,
    config:{gmModel:'offline-main',routineGmModel:'offline-routine',maxRecentMessages:2,maxContentChunks:1,playableObservationFastPath:fast,...config}});
  const result=await gm.runTurn({guildId:f.guild,actorUserId:x.pc.owner_user_id,actorName:x.pc.name,messageId:x.messageId,messageText:text,scope:x.scope.mode});
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:x.messageId,actorPrincipal:x.pc.owner_user_id,audience:x.scope.mode});
  commitGmTurn({db:f.db,content:gm.content,guild:{id:f.guild},session:f.db.getActiveSession(f.guild),result,scope:x.scope,speaker:x.pc.name,
    label:'Quality fixture',meta:{messageId:x.messageId,turnId:attempt.turn_id}});
  return {x,ai,result,rows:f.db.listTurnPublications(f.guild,attempt.turn_id)};
}
const scene=()=>({narrative_units:[unit('scene','scene','Amber light falls across a brass parcel counter.')],fiction_delta:[]});
test('DQ01 all registered permissions exceed forty and persist',()=>nativeFixture(f=>{
  const allow=allOperations();assert.equal(allow.length,41);
  configureDelegation(f.db,f.guild,{mode:'manual',allow,private_allow:[],max_operations:1,max_cost:0,expires_minute:null},'gm');
  assert.deepEqual(delegationPolicy(f.db,f.guild).allow,allow);f.restart();assert.deepEqual(delegationPolicy(f.db,f.guild).allow,allow);
}));
test('DP01 registry growth and private eligibility have no numeric grant cap',()=>nativeFixture(f=>{
  const operations=INTENT_PAYLOADS.density.properties.op.enum;operations.push('future_inspect');
  try{
    const allow=allOperations();assert.equal(allow.length,42);
    configureDelegation(f.db,f.guild,{mode:'manual',allow,private_allow:delegationCatalog().private_eligible,max_operations:4,max_cost:20,expires_minute:null},'gm');
    assert.equal(delegationPolicy(f.db,f.guild).allow.length,42);
    for(const private_allow of [['density.future_inspect'],['scene.unknown']])assert.throws(()=>configureDelegation(f.db,f.guild,
      {mode:'manual',allow,private_allow,max_operations:1,max_cost:0,expires_minute:null},'gm'),/Private world/);
    assert.throws(()=>configureDelegation(f.db,f.guild,{mode:'manual',allow:[],private_allow:['scene.record'],max_operations:1,max_cost:0,expires_minute:null},'gm'));
  }finally{operations.pop();}
}));
test('DP02 CAS patches preserve governance and fail atomically',()=>nativeFixture(f=>{
  const patch=value=>delegationOperation(f.db,f.guild,{op:'patch',...value},'gm');
  patch({expected_revision:0,allow_add:['scene.record'],private_allow_add:['scene.record']});
  const before=delegationPolicy(f.db,f.guild);assert.equal(before.mode,'manual');assert.equal(before.max_operations,1);assert.equal(before.max_cost,0);assert.equal(before.expires_minute,null);
  for(const bad of [{expected_revision:0,allow_add:['density.inspect']},{expected_revision:1,allow_add:['bad.operation']},
    {expected_revision:1,allow_add:['scene.enter','scene.enter']},{expected_revision:1,allow_add:['density.inspect'],max_cost:21},
    {expected_revision:1,mode:'routine_delegated'},{expected_revision:1,private_allow_add:['roll.prepare']},
    {expected_revision:1,allow_add:'scene.enter'},{expected_revision:1,extra:true}]){
    assert.throws(()=>patch(bad));assert.deepEqual(delegationPolicy(f.db,f.guild),before);
  }
  const removed=patch({expected_revision:1,allow_remove:['scene.record']});assert.equal(removed.policy.revision,2);assert.deepEqual(removed.policy.private_allow,[]);
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,limit:500}).filter(e=>e.event_key.startsWith('ai-policy:')).length,2);
  assert.throws(()=>configureDelegation(f.db,f.guild,{mode:'manual',allow:[],max_operations:5,max_cost:0,expires_minute:null},'gm'));
  assert.notEqual(f.db.getCityCalendar(f.guild).flags.scene_continuity,true);
}));
test('DP03 existing JSON command catalog/status/patch remain GM-private, unauthorized rejected',()=>nativeFixture(async f=>{
  const interaction=(json,gm=true)=>({...fakeInteraction({gm,sub:'delegation',json}),guildId:f.guild});
  const no=interaction({op:'patch',expected_revision:0,allow_add:['scene.enter']},false);
  await assert.rejects(handleStoryCommand(no,{db:f.db,gm:{}}),/permission/);assert.equal(delegationPolicy(f.db,f.guild).revision,0);
  for(const input of [{op:'catalog'},{op:'status'},{op:'patch',expected_revision:0,allow_add:allOperations()}]){
    const i=interaction(input);await handleStoryCommand(i,{db:f.db,gm:{}});
    assert.equal(i.deliveries.length,1);assert.equal(i.deliveries[0].ephemeral,true);assert.equal(i.deliveries[0].files.length,1);
    const json=JSON.parse(i.deliveries[0].files[0].attachment.toString());assert(json.total===41||json.count===0||json.count===41);
  }
  assert.equal(delegationPolicy(f.db,f.guild).allow.length,41);
}));
test('DQ02 omitted v8 still produces one isolated creative response',()=>nativeFixture(async f=>{
  const out=await qualityTurn(f,{omit:true,answer:scene()});
  assert.equal(out.ai.requests.length,2);assert(out.rows.some(r=>r.payload.includes('brass parcel counter')));
}));
test('DQ03 configured narrative model independent of routine planner',()=>nativeFixture(async f=>{
  const out=await qualityTurn(f,{answer:scene(),config:{narrativeModel:'offline-writer'}});
  assert.equal(out.ai.requests[0].model,'offline-routine');assert.equal(out.ai.requests[1].model,'offline-writer');
}));
test('DQ04 native known surname NPC vocative is allowed without PC agency',()=>nativeFixture(async f=>{
  f.db.updateCharacterData(f.pcs[0].id,d=>{d.aliases=['Raven'];});
  f.db.upsertNpcProfile(f.guild,{npcKey:'attendant',displayName:'Attendant',role:'porter'});
  f.db.setSimulationEntity(f.guild,'npc','attendant',{location_key:'terminal',visibility:'party'});
  // Name entitlement is supplied by an actual recorded native listener source below, not a writer label.
  const x=setup(f,{text:'I tell the attendant to call me Raven.'});
  f.db.upsertNpcKnowledge(f.guild,{npcKey:'attendant',knowledgeKey:`character-name:${x.pc.id}`,content:'Raven',
    beliefState:'known',sourceType:'observed',sourceRef:x.sourceRef,isSecret:false});
  const answer=scene();answer.narrative_units.push(unit('address','npc_speech','Mr. Raven, the evening parcels are delayed.',{subject_key:'attendant',epistemic:'testimony'}));
  const out=await qualityTurn(f,{answer});assert(out.rows.some(r=>r.payload.includes('Mr. Raven')));
}));
