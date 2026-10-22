import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneFictionHash} from '../../src/scene-fiction-context.js';
import {rankEligibleWorldSignals} from '../../src/world-narrative-bridge.js';
import {WORLD_DIRECTOR_OPPORTUNITY_GUIDANCE} from '../../src/narrative-opportunity-guidance.js';

function resolved(id,actor,root,visibility='party'){
  const typed={record_key:`intent-${id}`,status:'resolved',data:{actor}};
  const event={event_key:root,status:'active',visibility};
  return {typed,event,signal:{id,kind:'resolved_player_intent',causation_ref:root,audience:{visibility:'party'},source_refs:[
    {kind:'typed_intent',key:typed.record_key,hash:sceneFictionHash(typed)},
    {kind:'world_event',key:root,hash:sceneFictionHash(event)}]}};
}

test('public causal overlap is optional, reproducible, and does not subsume an urgent personal consequence',()=>{
  const a=resolved('carl','pc-carl','incident:station'),b=resolved('raven','pc-raven','incident:station');
  const isolated=resolved('private','pc-choso','incident:private','character');
  const records=new Map([a,b,isolated].map(row=>[row.typed.record_key,row.typed]));
  const events=new Map([[a.event.event_key,a.event],[isolated.event.event_key,isolated.event]]);
  const lookup=(kind,key)=>kind==='typed_intent'?records.get(key):events.get(key);
  const selected=rankEligibleWorldSignals([a.signal,b.signal],lookup,'guild');
  assert.deepEqual(selected.map(row=>row.id),['carl','raven']);
  const urgent={id:'urgent',kind:'scene_transition',audience:{visibility:'party'},source_refs:[]};
  assert.deepEqual(rankEligibleWorldSignals([a.signal,b.signal,urgent],lookup,'guild').map(row=>row.id),['urgent','carl','raven']);
  assert.match(WORLD_DIRECTOR_OPPORTUNITY_GUIDANCE,/leave PC decisions open/);
});

test('unshared/private evidence cannot be projected as party knowledge or invented cooperation',()=>{
  const a=resolved('a','pc-a','cause:a'),b=resolved('b','pc-b','cause:b');
  const records=new Map([[a.typed.record_key,a.typed],[b.typed.record_key,b.typed]]);
  const events=new Map([[a.event.event_key,a.event],[b.event.event_key,b.event]]);
  assert.deepEqual(rankEligibleWorldSignals([a.signal,b.signal],(kind,key)=>kind==='typed_intent'?records.get(key):events.get(key),
    'guild').map(row=>row.id),['a','b']);
  assert.match(WORLD_DIRECTOR_OPPORTUNITY_GUIDANCE,/Never infer shared knowledge, co-location, cooperation/);
});
