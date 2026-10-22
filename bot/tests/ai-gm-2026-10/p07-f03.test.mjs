import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneFictionHash} from '../../src/scene-fiction-context.js';
import {rankEligibleWorldSignals} from '../../src/world-narrative-bridge.js';

const signal=(id,actor,npc='npc-shared',visibility='party')=>({id,kind:'conversation_development',audience:{visibility},
  source_refs:[{kind:'npc_memory',key:`memory-${id}`,actor:npc,hash:`memory-hash-${id}`},
    {kind:'typed_intent',key:`intent-${id}`,hash:`intent-hash-${id}`} ]});
const intent=(actor,hash,status='accepted_for_adjudication')=>({record_key:`intent-${actor}`,status,data:{actor,owner_user_id:`owner-${actor}`,type:'speak'},hash});
const bind=(signal,row)=>{row.record_key=signal.source_refs[1].key;signal.source_refs[1].hash=sceneFictionHash(row);return row;};

test('same-NPC speech by distinct PCs creates a tie-break without editing signal envelopes',()=>{
  const a=signal('a','pc-a'),b=signal('b','pc-b'),c={id:'c',kind:'unresolved_narrative_task',audience:{visibility:'party'},source_refs:[]};
  const rowA=bind(a,intent('pc-a')),rowB=bind(b,intent('pc-b'));
  const rows=new Map([[rowA.record_key,rowA],[rowB.record_key,rowB]]);
  const before=structuredClone([a,b,c]);
  const ordered=rankEligibleWorldSignals([c,a,b],(kind,key)=>kind==='typed_intent'?rows.get(key):null,'guild');
  assert.deepEqual(ordered.map(x=>x.id),['c','a','b']);
  assert.deepEqual([a,b,c],before);
});

test('stale, missing, private and single-PC evidence cannot create overlap',()=>{
  const a=signal('a','pc-a'),b=signal('b','pc-b'),privateSignal=signal('private','pc-c','npc-shared','character');
  const rowA=bind(a,intent('pc-a')),rowB=bind(b,intent('pc-b')),rowPrivate=bind(privateSignal,intent('pc-c'));
  a.source_refs[1].hash='stale';
  const records=new Map([[rowA.record_key,rowA],[rowB.record_key,rowB],[rowPrivate.record_key,rowPrivate]]);
  assert.deepEqual(rankEligibleWorldSignals([a,b,privateSignal],(kind,key)=>kind==='typed_intent'?records.get(key):null,'guild').map(x=>x.id),['a','b','private']);
});

test('native obligations and causal consequences precede optional signals; final order is stable',()=>{
  const rows=[
    {id:'ambient',kind:'not-yet-classified',audience:{visibility:'party'},source_refs:[]},
    {id:'transition',kind:'scene_transition',audience:{visibility:'party'},source_refs:[]},
    {id:'task',kind:'unresolved_narrative_task',audience:{visibility:'party'},source_refs:[]}
  ];
  assert.deepEqual(rankEligibleWorldSignals(rows,()=>null,'guild').map(x=>x.id),['task','transition','ambient']);
});
