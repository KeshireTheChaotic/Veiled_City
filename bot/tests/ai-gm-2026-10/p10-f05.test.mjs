import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,barrier} from './p10-fixture.mjs';
import {runSessionOpening} from '../../src/session-opening-runner.js';
import {deliverOpeningEntry} from '../../src/opening-entry.js';
const deliver=(f,a,db=f.db)=>deliverOpeningEntry({db,guild:f.guild,gm:f.gm,key:a.opportunity.record_key});
test('owner hooks guide actual private writer, authored units publish once and other secrets stay out',async()=>{
 const f=fixture();try{f.start();await runSessionOpening(f);const a=f.attend('a');f.attend('b');
  const result=await deliver(f,a);assert.equal(result.status,'delivered',JSON.stringify(result.data));assert.equal(result.data.authoring.code,'ACCEPTED_UNITS');
  const packet=f.packets.at(-1),serialized=JSON.stringify(packet);assert.ok(serialized.includes('OWNER_a_THREAD'));
  assert.ok(!serialized.includes('OWNER_b_THREAD'));assert.ok(!serialized.includes('SECRET_CANARY'));
  const sent=f.sends.find(s=>s.target==='dm-a');assert.ok(sent.content.includes('Amber lamps'));assert.ok(!sent.content.includes('OWNER_a_THREAD'));
  const parts=f.db.listTurnPublications('g',result.data.turn_id),calls=f.calls();await deliver(f,a,f.connect());
  assert.deepEqual(f.db.listTurnPublications('g',result.data.turn_id),parts);assert.deepEqual(f.calls(),calls);
 }finally{f.close();}
});
for(const scenario of ['exception','zero','held'])test(`entry ${scenario} retains redacted reason and honest versioned fallback`,async()=>{
 const f=fixture();try{f.start();await runSessionOpening(f);const a=f.attend('a');
  f.gm.generateNarrative=async(_g,packet)=>{if(scenario==='exception')throw new Error('PRIVATE_PROVIDER_BODY_CANARY');
    if(scenario==='zero')return {version:9,acts:[],fiction_delta:[]};
    const answer=f.answer(packet);answer.acts[0].text='Character a attacks and spends Hope.';return answer;};
  const result=await deliver(f,a);assert.equal(result.status,'fallback_delivered',JSON.stringify(result.data));
  assert.equal(result.data.evidence.narrative_verified,false);assert.equal(result.data.authoring.code,scenario==='exception'?'WRITER_ERROR':scenario==='zero'?'ZERO_UNITS':'ALL_UNITS_HELD');
  const sent=f.sends.find(s=>s.target==='dm-a');assert.ok(sent.content.includes('not been certified'));assert.ok(!sent.content.includes('OWNER_a_THREAD'));
  assert.ok(!JSON.stringify(result).includes('PRIVATE_PROVIDER_BODY_CANARY'));
 }finally{f.close();}
});
test('control changes during writer await fence draft/commit/send and cross-connection entry claim',async()=>{
 const f=fixture();try{f.start();await runSessionOpening(f);const a=f.attend('a'),entered=barrier(),release=barrier();let calls=0;
  f.gm.generateNarrative=async(_g,packet)=>{calls++;entered.resolve();await release.promise;return f.answer(packet);};
  const work=deliver(f,a);await entered.promise;const sibling=await deliver(f,a,f.connect());assert.equal(sibling.status,'authoring');assert.equal(calls,1);
  f.db.assignCharacter(f.session.id,'a',a.pc.id,{role:'primary',controlPolicy:'player_only'});release.resolve();const result=await work;
  assert.equal(result.status,'needs_review');assert.equal(f.sends.filter(s=>s.target==='dm-a').length,0);assert.ok(!result.data.turn_id);
 }finally{f.close();}
});
