import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRecallPlanner,decayedRecallWeight} from '../../src/v2/recall-planner.js';
import {createContextAuthority} from '../../src/v2/context-authority.js';

function fixture(){
  const source={id:'m',campaign:'c',scene:'s',recipients:['p'],text:'Remember the clerk?'};
  const body='The clerk claims the tower is haunted.',hash=createHash('sha256').update(body).digest('hex');
  const records=new Map(['a','b','secret'].map(id=>[id,{id,campaignId:'c',revision:'1',contentHash:hash,status:'active',kind:'testimony',scope:'scene',sceneId:'s',visibility:id==='secret'?'gm':'recipients',recipientIds:['p'],disclosure:'observed',knownBy:['npc'],sourceRefs:[]}]));
  const state={tick:0,causes:[],pins:[],valid:true,reads:0};
  const context=createContextAuthority({sourceAuthority:{revalidate:()=>state.valid},records:{metadata:(_c,id)=>records.get(id),readText:(_c,id,revision)=>{state.reads++;return {revision,text:body};}},readActor:()=>({id:'npc',campaignId:'c',sceneId:'s',kind:'npc',status:'active',controllerUserId:null,proxyAuthorized:false,controlRevision:'1'})});
  const planner=createRecallPlanner({contextAuthority:context,readCandidates:()=>[...records.keys()],readCauses:()=>state.causes,readPins:()=>state.pins,readClock:()=>state.tick});
  return {source,records,state,context,planner};
}
const cause=(id,target,kind='mention',tick=0)=>({id,campaignId:'c',status:'committed',authority:'native_recall',kind,tick,targetRefs:[target],sourceRefs:[target],independentlyAuthenticated:true});

test('fictional decay preserves established six-tick cadence and rejects invalid time',()=>{
  assert.deepEqual([0,5,6,12,18].map(t=>decayedRecallWeight(3,0,t)),[3,3,2,1,0]);
  assert.equal(decayedRecallWeight(7,9,8),0);assert.equal(decayedRecallWeight(7,0,Infinity),0);
});
test('canonical causes are deduplicated and model echoes cannot outweigh independent interaction',()=>{
  const f=fixture(),a=cause('a-event','a');f.state.causes=[...Array(100).fill(a),cause('b-event','b','interaction'),{...cause('echo','a','lead'),authority:'model'}];
  assert.deepEqual(f.planner.select(f.source),['b','a']);assert.equal(f.state.reads,0);
  assert.equal(f.records.get('a').kind,'testimony');assert.equal(f.records.size,3);
  f.state.causes.push({...a,tick:1});f.state.tick=1;assert.throws(()=>f.planner.select(f.source),/Conflicting/);
});
test('private sources, hidden ancestors and actor-unknown records cannot affect scoped recall',()=>{
  const f=fixture();f.state.causes=[{...cause('hidden','a','lead'),sourceRefs:['secret']},cause('visible','b')];
  assert.deepEqual(f.planner.select(f.source),['b','a']);assert.equal(f.state.reads,0);
  f.records.get('a').sourceRefs=['secret'];assert.deepEqual(f.planner.select(f.source),['b']);
  f.records.get('b').knownBy=[];assert.deepEqual(f.planner.select(f.source,{actorId:'npc'}),[]);
});
test('retirement is reversible through entitled focus or active native pin and never deletes history',()=>{
  const f=fixture();f.state.causes=[cause('a-event','a'),cause('b-event','b','gm_reuse')];f.state.tick=12;
  assert.deepEqual(f.planner.select(f.source),[]);assert.equal(f.records.size,3);
  assert.deepEqual(f.planner.select(f.source,{focus:['a','secret']}),['a']);
  f.state.pins=[{id:'open-lead',campaignId:'c',authority:'native_recall_pin',status:'active',targetRefs:['b'],sourceRefs:['b']}];
  assert.deepEqual(f.planner.select(f.source),['b']);
  f.state.pins[0].status='resolved';assert.deepEqual(f.planner.select(f.source),[]);
  f.state.causes.push(cause('return','a','return',12));assert.deepEqual(f.planner.select(f.source),['a']);
});
test('revocation and malformed native snapshots fail closed; ranking does not read bodies',()=>{
  const f=fixture();f.state.valid=false;assert.throws(()=>f.planner.select(f.source),/authority/);assert.equal(f.state.reads,0);
  f.state.valid=true;f.state.tick=-1;assert.throws(()=>f.planner.select(f.source),/snapshot/);
  assert.throws(()=>f.planner.select(f.source,{limit:65}),/Bounded/);
});
