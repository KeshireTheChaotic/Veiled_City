import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sceneFictionHash} from '../../src/scene-fiction-context.js';
import {rankEligibleWorldSignals} from '../../src/world-narrative-bridge.js';
import {selectFreshTests} from '../../src/ai-gm-test-selection.js';

const coverage=JSON.parse(fs.readFileSync(new URL('./coverage.json',import.meta.url),'utf8'));

function fixture(id,actor,root){
  const typed={record_key:`intent-${id}`,status:'resolved',data:{actor}};
  const event={event_key:root,status:'active',visibility:'party'};
  return {signal:{id,kind:'resolved_player_intent',causation_ref:root,audience:{visibility:'party'},source_refs:[
    {kind:'typed_intent',key:typed.record_key,hash:sceneFictionHash(typed)},
    {kind:'world_event',key:root,hash:sceneFictionHash(event)}]},typed,event};
}

test('independent resolved PC actions on one current public source establish causal overlap',()=>{
  const a=fixture('a','pc-a','incident:public'),b=fixture('b','pc-b','incident:public');
  const records=new Map([[a.typed.record_key,a.typed],[b.typed.record_key,b.typed]]);
  const events=new Map([[a.event.event_key,a.event]]);
  const ranked=rankEligibleWorldSignals([a.signal,b.signal],(kind,key)=>kind==='typed_intent'?records.get(key):events.get(key),'guild');
  assert.deepEqual(ranked.map(row=>row.id),['a','b']);
});

test('same location, private-only source, stale source or one actor never proves overlap',()=>{
  const a=fixture('a','pc-a','incident:public'),b=fixture('b','pc-b','incident:public');
  const oneActor=fixture('c','pc-a','incident:public');
  const privateEvent={...b.event,visibility:'character'};b.signal.source_refs[1].hash=sceneFictionHash(privateEvent);
  const rows=new Map([a,b,oneActor].map(item=>[item.typed.record_key,item.typed]));
  const events=new Map([[a.event.event_key,a.event],[privateEvent.event_key,privateEvent]]);
  assert.deepEqual(rankEligibleWorldSignals([a.signal,b.signal],(kind,key)=>kind==='typed_intent'?rows.get(key):events.get(key),'guild')
    .map(row=>row.id),['a','b']);
  b.signal.source_refs[1].hash='stale';
  assert.deepEqual(rankEligibleWorldSignals([a.signal,b.signal,oneActor.signal],(kind,key)=>kind==='typed_intent'?rows.get(key):events.get(key),'guild')
    .map(row=>row.id),['a','b','c']);
});

test('fresh selector maps the non-conversation evidence contract to this regression',()=>{
  const selected=selectFreshTests(['bot/src/world-narrative-bridge.js'],coverage);
  assert.equal(selected.qualified,true);
  assert.ok(selected.tests.includes('bot/tests/ai-gm-2026-10/p07-f10.test.mjs'));
});
