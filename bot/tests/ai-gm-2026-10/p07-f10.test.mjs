import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rankEligibleWorldSignals} from '../../src/world-narrative-bridge.js';
import {selectFreshTests} from '../../src/frameworks/operations/ai-gm-test-selection.js';

const coverage=JSON.parse(fs.readFileSync(new URL('./coverage.json',import.meta.url),'utf8'));
const action=(id,actor)=>({id,kind:'resolved_player_intent',causation_ref:'incident:public',audience:{visibility:'party'},
  source_refs:[{kind:'typed_intent',key:`intent-${id}`,hash:`typed-${id}`},
    {kind:'world_event',key:'incident:public',hash:'incident-hash'}],actor});

test('shared public causation does not grant optional overlap priority to causal outcomes',()=>{
  const a=action('a','pc-a'),b=action('b','pc-b');let lookups=0;
  const rank=signals=>rankEligibleWorldSignals(signals,()=>{lookups++;return null;},'guild');
  assert.deepEqual(rank([a,b]).map(row=>row.id),['a','b']);
  assert.deepEqual(rank([b,a]).map(row=>row.id),['b','a']);
  assert.equal(lookups,0,'causal outcomes are not mined for optional-party scoring');
});

test('same location or distinct actors without an optional causal source keep existing order',()=>{
  const first={id:'first',kind:'resolved_player_intent',causation_ref:'location:market',audience:{visibility:'party'},source_refs:[]};
  const second={id:'second',kind:'resolved_player_intent',causation_ref:'location:market',audience:{visibility:'party'},source_refs:[]};
  assert.deepEqual(rankEligibleWorldSignals([first,second],()=>null,'guild').map(row=>row.id),['first','second']);
});

test('fresh selector maps the evidence boundary to this regression',()=>{
  const selected=selectFreshTests(['bot/src/world-narrative-bridge.js'],coverage);
  assert.equal(selected.qualified,true);
  assert.ok(selected.tests.includes('bot/tests/ai-gm-2026-10/p07-f10.test.mjs'));
});
