import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneFictionHash} from '../../src/scene-fiction-context.js';
import {rankEligibleWorldSignals} from '../../src/world-narrative-bridge.js';
import {rankWorldNarrativeOpportunities} from '../../src/narrative-opportunity-policy.js';
import {WORLD_DIRECTOR_OPPORTUNITY_GUIDANCE} from '../../src/narrative-opportunity-guidance.js';

function conversation(id,actor,npc,visibility='party'){
  const row={record_key:`intent-${id}`,status:'accepted_for_adjudication',data:{actor,owner_user_id:`owner-${actor}`,type:'speak'}};
  return {row,signal:{id,kind:'conversation_development',audience:{visibility},source_refs:[
    {kind:'npc_memory',key:`memory-${id}`,actor:npc,hash:`memory-${id}`},
    {kind:'typed_intent',key:row.record_key,hash:sceneFictionHash(row)}
  ]}};
}

test('sourced shared interest can outrank an isolated lead without erasing the personal thread',()=>{
  const isolated=conversation('isolated','pc-a','npc-market'),sharedA=conversation('shared-a','pc-b','npc-guide'),sharedB=conversation('shared-b','pc-c','npc-guide');
  const records=new Map([isolated,sharedA,sharedB].map(item=>[item.row.record_key,item.row]));
  const input=[isolated.signal,sharedA.signal,sharedB.signal];
  const select=()=>rankEligibleWorldSignals(input,(kind,key)=>kind==='typed_intent'?records.get(key):null,'guild').map(s=>s.id);
  assert.deepEqual(select(),['shared-a','shared-b','isolated']);
  assert.deepEqual(select(),select(),'replay is deterministic and has no selection write/delivery behavior');
});

test('private, absent, split-location, and unverified connections do not create a group preference',()=>{
  const one=conversation('one','pc-a','npc-guide'),two=conversation('two','pc-b','npc-market'),privateOne=conversation('private','pc-c','npc-guide','character');
  const records=new Map([one,two,privateOne].map(item=>[item.row.record_key,item.row]));
  const input=[one.signal,two.signal,privateOne.signal];
  assert.deepEqual(rankEligibleWorldSignals(input,(kind,key)=>records.get(key),'guild').map(s=>s.id),['one','two','private']);
  assert.match(WORLD_DIRECTOR_OPPORTUNITY_GUIDANCE,/Never infer shared knowledge, co-location, cooperation, party membership, arrival or participation/);
});

test('an urgent personal consequence beats optional overlap; active questions and quiet scenes are protected',()=>{
  const opportunities=['optional-overlap','urgent-personal'];
  assert.deepEqual(rankWorldNarrativeOpportunities(opportunities,[
    {index:0,classification:'personal_opportunity',verifiedActorLinks:['pc-a','pc-b']},
    {index:1,classification:'causal_consequence',urgency:3}
  ]),['urgent-personal','optional-overlap']);
  assert.match(WORLD_DIRECTOR_OPPORTUNITY_GUIDANCE,/Address active player attempts and direct NPC questions before optional broader developments/);
  assert.match(WORLD_DIRECTOR_OPPORTUNITY_GUIDANCE,/A personal lead remains fully worthwhile/);
});

test('a quiet world/no-op remains allowed and outputs stay bounded',()=>{
  assert.deepEqual(rankEligibleWorldSignals([],()=>null,'guild'),[]);
  const many=Array.from({length:6},(_,i)=>({id:String(i),kind:'unknown',audience:{visibility:'party'},source_refs:[]}));
  assert.equal(rankEligibleWorldSignals(many,()=>null,'guild').length,4);
  assert.match(WORLD_DIRECTOR_OPPORTUNITY_GUIDANCE,/a quiet world is allowed/);
});
