import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './p10-fixture.mjs';
import {runSessionOpening} from '../../src/session-opening-runner.js';
import {sessionOpeningRecoveryState,prepareSessionOpeningDeliveryReview,recoverSessionOpeningDelivery,recoverSessionOpeningPrecommit} from '../../src/session-opening-recovery.js';
const interaction=f=>({id:'review',guildId:'g',guild:f.guild,user:{id:'gm'}});
test('restart delivers exact known-unsent prepared payload with no provider and immutable ACK',async()=>{
 const f=fixture();try{f.start();const fetch=f.guild.channels.fetch;f.guild.channels.fetch=async()=>null;
  const job=await runSessionOpening(f);assert.equal(job.status,'needs_delivery_review');
  assert.equal(sessionOpeningRecoveryState(f.db,'g',f.session.id).disposition,'COMMITTED_KNOWN_UNSENT');
  const delivery=f.db.assemblyDeliveryRecords('g',f.session.id)[0],before=f.db.listTurnPublications('g',delivery.data.turn_id)[0],calls=f.calls();
  f.db.db.close();const db=f.connect();f.guild.channels.fetch=fetch;
  const i=interaction(f),key=prepareSessionOpeningDeliveryReview(db,i,()=>true);assert.ok(key);
  await recoverSessionOpeningDelivery({db,interaction:i,authorize:()=>true,key});
  const after=db.getPublication('g',before.id);assert.equal(after.payload,before.payload);assert.equal(after.payload_hash,before.payload_hash);
  assert.equal(after.status,'delivered');assert.equal(f.sends.length,1);assert.deepEqual(f.calls(),calls);
  await recoverSessionOpeningDelivery({db,interaction:i,authorize:()=>true,key});assert.equal(f.sends.length,1);
 }finally{f.close();}
});
test('uncertain transport forbids recovery, reauthoring and replay across connection restart',async()=>{
 const f=fixture();try{f.start();f.guild.channels.fetch=async()=>({id:'table',isTextBased:()=>true,send:async()=>{throw new Error('transport lost');}});
  await runSessionOpening(f);assert.equal(sessionOpeningRecoveryState(f.db,'g',f.session.id).disposition,'TRANSPORT_UNCERTAIN');
  const calls=f.calls(),db=f.connect(),i=interaction(f);
  assert.equal(prepareSessionOpeningDeliveryReview(db,i,()=>true),null);
  await assert.rejects(recoverSessionOpeningPrecommit({db,interaction:i,authorize:()=>true,gm:f.gm}));
  await runSessionOpening({...f,db});assert.deepEqual(f.calls(),calls);assert.equal(f.sends.length,0);
 }finally{f.close();}
});
test('failed uncommitted planner can receive one authenticated recovery without manual attempt 2',async()=>{
 const f=fixture();try{f.start();f.gm.planAssembly=async()=>{throw Object.assign(new Error('secret provider body'),{code:'PROVIDER_ERROR'});};
  await runSessionOpening(f);assert.equal(sessionOpeningRecoveryState(f.db,'g',f.session.id).disposition,'UNCOMMITTED');
  await assert.rejects(recoverSessionOpeningPrecommit({db:f.db,interaction:interaction(f),authorize:()=>false,gm:f.gm}));
  f.gm.planAssembly=async()=>f.currentPlan();const job=await recoverSessionOpeningPrecommit({db:f.db,interaction:interaction(f),authorize:()=>true,gm:f.gm});
  assert.equal(job.data.attempts,1);assert.equal(job.data.epoch.number,1);assert.equal(f.sends.length,1);
  assert.ok(!JSON.stringify(job).includes('secret provider body'));
 }finally{f.close();}
});
