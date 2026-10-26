import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import * as legacy from '../../src/action-dependency.js';
import {buildActionPlan,executableActionSpans,transitionAction,signalActionContinuation} from '../../src/frameworks/intent/public.js';
import {indexWorldEvent} from '../../src/frameworks/world/public.js';

const root=fileURLToPath(new URL('../../../',import.meta.url));
function fixture(t){
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'vc-intent-dependencies-')),filename=path.join(folder,'offline.sqlite'),schema=path.join(root,'bot/sql/schema.sql');
  let db=new VeiledDB(filename,schema);const guild='dependency-guild';
  db.ensureCampaign(guild);db.upsertPlayer(guild,'owner','Owner');
  const pc=db.createCharacter(guild,'owner','Nira Flint',{resources:{hope:3}}),session=db.startSession(guild,'Compound action scheduler','manual');
  const source=indexWorldEvent(db,guild,{key:'fresh-scheduler-fixture',kind:'observation',title:'Independent scheduler fixture',source_id:'human_gm',visibility:'party',session_id:session.id});
  // Fresh accepted-row inputs qualify scheduling only, not upstream acceptance or native effects.
  const rows=[0,1].map(n=>db.saveCityRecord(guild,{kind:'typed_intent',key:`typed-${n}`,status:'accepted_for_adjudication',
    source_event:source.event_key,visibility:'party',data:{proposal_id:`proposal-${n}`,sequence_index:n,dependencies:n?['proposal-0']:[],
      actor:pc.id,session_id:session.id,scene:`${session.id}:1`,source_span:`declared span ${n}`,resolution:'ordinary'}}));
  t.after(()=>{db.db.close();fs.rmSync(folder,{recursive:true,force:true});});
  return {guild,pc,session,source,rows,get db(){return db;},reopen(){db.db.close();db=new VeiledDB(filename,schema);}};
}

test('compatibility exports are the same Intent functions and application state adopts their public API',()=>{
  for(const [name,fn] of Object.entries({buildActionPlan,executableActionSpans,transitionAction,signalActionContinuation}))assert.equal(legacy[name],fn);
  const state=fs.readFileSync(path.join(root,'bot/src/state.js'),'utf8');
  assert.match(state,/import \{ buildActionPlan, executableActionSpans, transitionAction \} from "\.\/frameworks\/intent\/public\.js"/);
  assert.equal(state.includes('from "./action-dependency.js"'),false);
});

test('ordering and wake-up depend on native terminal receipt status, never automatic execution or PC effects',t=>{
  const f=fixture(t),before=JSON.stringify(f.db.getCharacter(f.pc.id));
  const first=buildActionPlan(f.db,f.guild,[f.rows[1],f.rows[0]]);
  assert.deepEqual(first.map(n=>n.data.status),['ready','suspended']);
  assert.deepEqual(first[1].data.dependencies,[f.rows[0].record_key]);
  assert.deepEqual(executableActionSpans(first),['declared span 0']);
  transitionAction(f.db,f.guild,first[0].record_key,{expected_status:'ready',status:'resolved',receipt:'scheduler-receipt-fixture'});
  const after=buildActionPlan(f.db,f.guild,f.rows);
  assert.deepEqual(after.map(n=>n.data.status),['resolved','ready']);
  assert.deepEqual(executableActionSpans(after),['declared span 1']);
  const signals=f.db.listCityRecords(f.guild,{kind:'action_continuation_signal',includeGM:true,limit:20});
  assert.equal(signals.length,1);assert.equal(signals[0].status,'pending');assert.equal(signals[0].visibility,'gm');
  assert.equal(JSON.stringify(f.db.getCharacter(f.pc.id)),before);
});

test('receipt replay and continuation signals remain idempotent across SQLite restart',t=>{
  const f=fixture(t),plan=buildActionPlan(f.db,f.guild,f.rows),input={expected_status:'ready',status:'resolved',receipt:'durable-native-fixture'};
  const resolved=transitionAction(f.db,f.guild,plan[0].record_key,input),saved=JSON.stringify(resolved);
  const signal=signalActionContinuation(f.db,f.guild,resolved),signalSaved=JSON.stringify(signal);
  f.reopen();
  assert.equal(JSON.stringify(transitionAction(f.db,f.guild,plan[0].record_key,input)),saved);
  assert.equal(JSON.stringify(signalActionContinuation(f.db,f.guild,resolved)),signalSaved);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'action_continuation_signal',includeGM:true,limit:20}).length,1);
  assert.throws(()=>transitionAction(f.db,f.guild,plan[0].record_key,{expected_status:'ready',status:'failed',receipt:'different'}),{code:'ACTION_DEPENDENCY'});
  assert.equal(f.db.getCityRecord(f.guild,'compound_action',plan[0].record_key).data.receipt,'durable-native-fixture');
});

test('unknown or cyclic dependencies and mixed actor/source/scene inputs are rejected before plan writes',t=>{
  const f=fixture(t),before=f.db.listCityRecords(f.guild,{kind:'compound_action',includeGM:true,limit:20});
  const rejected=[];
  for(const field of ['actor','session_id','scene']){
    const input=structuredClone(f.rows);input[1].data[field]='other';rejected.push(input);
  }
  const source=structuredClone(f.rows);source[1].source_event='other';rejected.push(source);
  const missing=structuredClone(f.rows);missing[1].data.dependencies=['absent'];rejected.push(missing);
  const cycle=structuredClone(f.rows);cycle[0].data.dependencies=['proposal-1'];rejected.push(cycle);
  const duplicate=structuredClone(f.rows);duplicate[1].data.sequence_index=0;rejected.push(duplicate);
  for(const input of rejected)assert.throws(()=>buildActionPlan(f.db,f.guild,input),{code:'ACTION_DEPENDENCY'});
  assert.deepEqual(f.db.listCityRecords(f.guild,{kind:'compound_action',includeGM:true,limit:20}),before);
});

test('private execution and private parent dependencies never widen into a public compound node',t=>{
  const f=fixture(t),rows=structuredClone(f.rows),receipt=f.db.saveCityRecord(f.guild,{kind:'action_outcome_receipt',key:'private-outcome-fixture',status:'resolved',
    source_event:f.source.event_key,visibility:'character',subject_key:f.pc.id,data:{action_id:rows[0].record_key}});
  rows[0].data.outcome_receipt=receipt.record_key;
  const plan=buildActionPlan(f.db,f.guild,rows);
  for(const node of plan){assert.equal(node.visibility,'character');assert.equal(node.subject_key,f.pc.id);}
  const before=f.db.getCharacter(f.pc.id).data.resources;
  transitionAction(f.db,f.guild,plan[0].record_key,{expected_status:'ready',status:'failed',receipt:'native-failure-fixture'});
  const blocked=buildActionPlan(f.db,f.guild,rows);
  assert.equal(blocked[1].data.status,'blocked');assert.equal(blocked[1].visibility,'character');
  assert.deepEqual(f.db.getCharacter(f.pc.id).data.resources,before);
});

test('unresolved interrupts prevent a terminal transition until the existing native receipt is resolved',t=>{
  const f=fixture(t),plan=buildActionPlan(f.db,f.guild,f.rows),node=plan[0];
  f.db.saveCityRecord(f.guild,{kind:'action_interrupt_receipt',key:'interrupt-fixture',status:'pending',source_event:f.source.event_key,data:{}});
  f.db.saveCityRecord(f.guild,{...node,key:node.record_key,data:{...node.data,interrupt_refs:['interrupt-fixture']}});
  const input={expected_status:'ready',status:'resolved',receipt:'after-interrupt-fixture'};
  assert.throws(()=>transitionAction(f.db,f.guild,node.record_key,input),{code:'ACTION_DEPENDENCY'});
  assert.equal(f.db.getCityRecord(f.guild,'compound_action',node.record_key).data.status,'ready');
  f.db.saveCityRecord(f.guild,{kind:'action_interrupt_receipt',key:'interrupt-fixture',status:'resolved',source_event:f.source.event_key,data:{}});
  assert.equal(transitionAction(f.db,f.guild,node.record_key,input).data.status,'resolved');
});
