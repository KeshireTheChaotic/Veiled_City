import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sceneFictionHash} from '../../src/scene-fiction-context.js';
import {rankEligibleWorldSignals} from '../../src/world-narrative-bridge.js';
import {selectFreshTests} from '../../src/ai-gm-test-selection.js';

const coverage=JSON.parse(fs.readFileSync(new URL('./coverage.json',import.meta.url),'utf8'));

const task=(id)=>({id,kind:'unresolved_narrative_task',audience:{visibility:'party'},source_refs:[]});
const conversation=(id,actor)=>({id,kind:'conversation_development',audience:{visibility:'party'},source_refs:[
  {kind:'npc_memory',actor:'shared-npc',key:`memory-${id}`,hash:`memory-${id}`},
  {kind:'typed_intent',key:`intent-${id}`,hash:''}]});
function intent(key,actor){const row={record_key:key,status:'accepted_for_adjudication',data:{type:'speak',actor}};return row;}

test('required unresolved work beyond candidate four survives overlap ranking and the cap',()=>{
  const a=conversation('a','pc-a'),b=conversation('b','pc-b'),required=task('required');
  const ra=intent('intent-a','pc-a'),rb=intent('intent-b','pc-b');
  a.source_refs[1].hash=sceneFictionHash(ra);b.source_refs[1].hash=sceneFictionHash(rb);
  const rows=new Map([[ra.record_key,ra],[rb.record_key,rb]]);
  const candidates=[{id:'opening-recovery',kind:'opening_opportunity_request',audience:{visibility:'party'},source_refs:[]},
    {id:'resolved',kind:'resolved_player_intent',audience:{visibility:'party'},source_refs:[]},a,b,
    {id:'ordinary',kind:'other',audience:{visibility:'party'},source_refs:[]},
    {id:'incidental',kind:'ambient_opportunity',audience:{visibility:'party'},source_refs:[]},required];
  const selected=rankEligibleWorldSignals(candidates,(kind,key)=>kind==='typed_intent'?rows.get(key):null,'guild');
  assert.equal(selected.length,4);
  assert.ok(selected.some(row=>row.id==='required'));
  assert.deepEqual(selected.map(row=>row.id),['opening-recovery','required','resolved','a']);
  assert.equal(new Set(selected.map(row=>row.id)).size,selected.length);
});

test('completed intent and conversation are optional or causal, not mandatory responses',()=>{
  const rows=[task('task'),{id:'resolved',kind:'resolved_player_intent',audience:{visibility:'party'},source_refs:[]},
    conversation('conversation','pc-a')];
  assert.deepEqual(rankEligibleWorldSignals(rows,()=>null,'guild').map(row=>row.id),['task','resolved','conversation']);
});

test('fresh selector retains the bridge integration regression mapping',()=>{
  const selected=selectFreshTests(['bot/src/world-narrative-bridge.js'],coverage);
  assert.equal(selected.qualified,true);
  assert.ok(selected.tests.includes('bot/tests/ai-gm-2026-10/p07-f09.test.mjs'));
});
