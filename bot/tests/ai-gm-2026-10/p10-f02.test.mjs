import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,barrier} from './p10-fixture.mjs';
import {runSessionOpening} from '../../src/session-opening-runner.js';
import {inspectSessionOpening,assertSessionOpeningAttempt} from '../../src/session-opening.js';

test('zero-attendee planner rebases coalesced check-ins once, preserving attempt receipt and cross-connection claim',async()=>{
 const f=fixture();try{
  const original=f.start(),entered=barrier(),release=barrier();let calls=0;
  f.gm.planAssembly=async()=>{calls++;const result=f.currentPlan();if(calls===1){entered.resolve();await release.promise;}return result;};
  const work=runSessionOpening(f);await entered.promise;
  const attempt=structuredClone(f.db.getWorldEvent('g',`opening-attempt:${f.session.id}:1`));
  const other=f.connect();const sibling=await runSessionOpening({...f,db:other});assert.equal(sibling.status,'planning');assert.equal(calls,1);
  f.attend('a');f.attend('b');release.resolve();const result=await work;
  assert.equal(calls,2,JSON.stringify(result.data));assert.equal(result.data.attempts,1);assert.equal(result.data.epoch.number,1);
  assert.deepEqual(f.db.getWorldEvent('g',attempt.event_key),attempt);assert.deepEqual(result.data.origin,original.data.origin);
  assert.ok(!f.db.getWorldEvent('g',`opening-attempt:${f.session.id}:2`));
  assertSessionOpeningAttempt(f.db,'g',f.session.id);
  assert.ok(!['needs_review','planning'].includes(result.status),JSON.stringify(result.data));
  assert.equal(f.sends.filter(s=>s.target==='table').length,1);assert.equal(f.sends.filter(s=>s.target==='dm-a').length,1);
  assert.equal(f.sends.filter(s=>s.target==='dm-b').length,1);
  const ack=f.sends.map(s=>s.id);await runSessionOpening(f);assert.deepEqual(f.sends.map(s=>s.id),ack);
  assert.ok(!JSON.stringify(f.packets).includes('SECRET_CANARY'));assert.equal(f.db.getPartyState('g').established,false);
 }finally{f.close();}
});
test('a second revision during replanning is bounded and retains unsent history',async()=>{
 const f=fixture();try{f.start();let calls=0;f.gm.planAssembly=async()=>{const result=f.currentPlan();f.attend(`owner${++calls}`);return result;};
  const result=await runSessionOpening(f);assert.equal(calls,2);assert.equal(result.data.hold_code,'OPENING_REBASE_PENDING');
  assert.equal(f.sends.length,0);assert.equal(result.data.attempts,1);
  assert.equal(f.db.getCityRecord('g','session_opening_generation',`${f.session.id}:1:0`).status,'superseded_uncommitted');
 }finally{f.close();}
});
test('pause and source tampering cannot regenerate or send',async()=>{
 const f=fixture();try{f.start();const entered=barrier(),release=barrier();f.gm.planAssembly=async()=>{entered.resolve();await release.promise;return f.currentPlan();};
  const work=runSessionOpening(f);await entered.promise;f.db.setDirectorPaused('g',true);release.resolve();await work;assert.equal(f.sends.length,0);
  const row=inspectSessionOpening(f.db,'g',f.session.id);f.db.saveCityRecord('g',{...row,key:row.record_key,data:{...row.data,origin_hash:'forged'}});
  await assert.rejects(runSessionOpening(f),{code:'SESSION_OPENING'});assert.equal(f.sends.length,0);
 }finally{f.close();}
});
