import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,barrier} from './p10-fixture.mjs';
import {runSessionOpening} from '../../src/session-opening-runner.js';
import {runOpeningCohort} from '../../src/opening-cohort-runner.js';
test('zero-attendee public camera is authored, acknowledged once and does not place anyone',async()=>{
 const f=fixture();try{f.start();const job=await runSessionOpening(f);assert.equal(job.status,'completed');assert.equal(f.sends.length,1);
  assert.ok(f.sends[0].content.includes('Amber lamps'));assert.equal(f.packets[0].viewpoint.pc_witness,false);
  assert.equal(f.db.roster(f.session.id).length,0);await runOpeningCohort(f);assert.equal(f.sends.length,1);
 }finally{f.close();}
});
test('independent shared scene after failed uncommitted original, separate owner positions, cross-connection claim and immutable repeat',async()=>{
 const f=fixture();try{f.start();const real=f.gm.planAssembly;f.gm.planAssembly=async()=>{throw new Error('planner unavailable');};
  await runSessionOpening(f);f.gm.planAssembly=real;const a=f.attend('a'),b=f.attend('b');
  f.db.updateCharacterData(a.pc.id,d=>{d.location='private-a';});f.db.updateCharacterData(b.pc.id,d=>{d.location='private-b';});
  const entered=barrier(),release=barrier();f.gm.planAssembly=async()=>{entered.resolve();await release.promise;return f.currentPlan();};
  const work=runOpeningCohort(f);await entered.promise;const other=f.connect();
  const sibling=await runOpeningCohort({...f,db:other});assert.equal(sibling.status,'planning');release.resolve();const job=await work;
  assert.equal(job.status,'delivered',JSON.stringify(job.data));assert.equal(job.data.camera_basis.kind,'independent_absent_original');
  assert.equal(f.sends.length,1);assert.equal(f.sends[0].target,'table');assert.equal(f.packets.at(-1).viewpoint.pc_witness,false);
  const packet=JSON.stringify(f.packets.at(-1));for(const secret of ['OWNER_a_THREAD','OWNER_b_THREAD','SECRET_CANARY','private-a','private-b'])assert.ok(!packet.includes(secret),secret);
  const parts=f.db.listTurnPublications('g',job.data.turn_id);await runOpeningCohort({...f,db:other});assert.deepEqual(other.listTurnPublications('g',job.data.turn_id),parts);
  const calls=f.calls();f.db.setDirectorPaused('g',true);assert.equal((await runOpeningCohort(f)).status,'delivered');assert.deepEqual(f.calls(),calls);
  assert.deepEqual(f.db.listTurnPublications('g',job.data.turn_id),parts);
  assert.equal(f.sends.length,1);assert.equal(f.db.getPartyState('g').established,false);
 }finally{f.close();}
});
test('original uncertain public transport cannot mint competing cohort',async()=>{
 const f=fixture();try{f.start();f.guild.channels.fetch=async()=>({id:'table',isTextBased:()=>true,send:async()=>{throw new Error('unknown send');}});
  await runSessionOpening(f);f.attend('a');f.attend('b');const calls=f.calls();assert.equal(await runOpeningCohort(f),null);assert.deepEqual(f.calls(),calls);
 }finally{f.close();}
});
