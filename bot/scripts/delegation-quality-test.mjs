/** 10.2 regressions: temporary native fixtures and synthetic responses, never provider traffic. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {FakeResponses,fakeInteraction} from './contract-fixtures.mjs';
import {setup,candidate,unit} from './narrative-freedom-test.mjs';
import {INTENT_PAYLOADS,intentOperations} from '../src/ai-intent-contracts.js';
import {configureDelegation,delegationPolicy} from '../src/ai-intents.js';
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
