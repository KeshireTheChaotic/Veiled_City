import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {GMService} from '../../src/gm.js';
import {openingEntryAuthoringCode} from '../../src/frameworks/session/opening-entry-evidence.js';
import {prepareAssemblyRefresh,refreshAssemblyPlan} from '../../src/assembly-planning.js';
import {assertSessionOpeningAttempt} from '../../src/session-opening.js';
import {fixture,barrier} from './p10-fixture.mjs';
import {runSessionOpening} from '../../src/session-opening-runner.js';
import {recoverSessionOpeningPrecommit,sessionOpeningRecoveryState,prepareSessionOpeningDeliveryReview,prepareSessionOpeningPrecommitReview} from '../../src/session-opening-recovery.js';
test('check-in during writer await discards unsent draft and regenerates once before acceptance',async()=>{
 const f=fixture();try{f.start();const entered=barrier(),release=barrier();let writes=0;
  f.gm.generateNarrative=async(_g,packet)=>{if(++writes===1){entered.resolve();await release.promise;}return f.answer(packet);};
  const work=runSessionOpening(f);await entered.promise;f.attend('a');f.attend('b');release.resolve();const job=await work;
  assert.equal(job.status,'completed',JSON.stringify(job.data));assert.equal(job.data.epoch.number,1);assert.equal(writes,4);
  assert.equal(f.sends.filter(s=>s.target==='table').length,1);assert.equal(f.sends.filter(s=>s.target==='dm-a').length,1);
  assert.equal(f.db.listCityRecords('g',{kind:'narrative_draft',includeGM:true}).length,3);
 }finally{f.close();}
});
test('committed scene cannot rebase on check-in during channel lookup; proven pre-send guard stays NOT_SENT',async()=>{
 const f=fixture();try{f.start();const entered=barrier(),release=barrier(),fetch=f.guild.channels.fetch;
  f.guild.channels.fetch=async id=>{entered.resolve();await release.promise;return fetch(id);};
  const work=runSessionOpening(f);await entered.promise;f.attend('a');release.resolve();const job=await work;
  assert.equal(f.sends.length,0);assert.ok(!job.data.epoch);const delivery=f.db.assemblyDeliveryRecords('g',f.session.id).find(r=>r.data.scope.mode==='party');
  const part=f.db.listTurnPublications('g',delivery.data.turn_id)[0];assert.equal(part.status,'failed');assert.ok(part.last_failure.startsWith('NOT_SENT: '));
  const units=f.db.listCityRecords('g',{kind:'narrative_unit',includeGM:true});assert.equal(units.length,1);
  await assert.rejects(recoverSessionOpeningPrecommit({db:f.db,interaction:{id:'review',guildId:'g',guild:f.guild,user:{id:'gm'}},authorize:()=>true,gm:f.gm}));
  assert.deepEqual(f.db.listCityRecords('g',{kind:'narrative_unit',includeGM:true}),units);
 }finally{f.close();}
});
test('durable delivering part after restart remains uncertain without any writer retry',async()=>{
 const f=fixture();try{f.start();f.guild.channels.fetch=async()=>null;await runSessionOpening(f);
  const delivery=f.db.assemblyDeliveryRecords('g',f.session.id)[0],part=f.db.listTurnPublications('g',delivery.data.turn_id)[0];
  f.db.claimPublication(part.id);f.db.db.close();const other=f.connect();assert.equal(sessionOpeningRecoveryState(other,'g',f.session.id).disposition,'TRANSPORT_UNCERTAIN');
  assert.equal(prepareSessionOpeningDeliveryReview(other,{id:'review',guildId:'g',guild:f.guild,user:{id:'gm'}},()=>true),null);
  const calls=f.calls();await runSessionOpening({...f,db:other});assert.deepEqual(f.calls(),calls);assert.equal(other.getPublication('g',part.id).status,'delivering');
 }finally{f.close();}
});
test('two isolated SQLite workers share one durable initial planner claim',async()=>{
 const f=fixture();let first,second;try{f.start();
  const create=()=>new Worker(new URL('./p10-worker.mjs',import.meta.url),{workerData:f.paths});
  first=create();const claimed=await new Promise((resolve,reject)=>{first.once('message',resolve);first.once('error',reject);});assert.equal(claimed.type,'planning');
  second=create();const result=await new Promise((resolve,reject)=>{second.once('message',resolve);second.once('error',reject);});
  assert.equal(result.type,'done');assert.equal(result.calls,0);assert.equal(result.status,'planning');
  const done=new Promise((resolve,reject)=>{first.once('message',resolve);first.once('error',reject);});first.postMessage('release');assert.equal((await done).calls,1);
  if(process.env.P10_EVIDENCE==='1')console.log('P10_WORKER_USAGE',JSON.stringify({planner_invocations:1,writer_invocations:0,paid_provider_calls:0}));
 }finally{if(first)await first.terminate();if(second)await second.terminate();f.close();}
});
test('explicit no-commit recovery fences a still-running stale worker without downgrade',async()=>{
 const f=fixture();try{f.start();const entered=barrier(),release=barrier();let calls=0;
  f.gm.planAssembly=async()=>{const plan=f.currentPlan();if(++calls===1){entered.resolve();await release.promise;}return plan;};
  const oldWork=runSessionOpening(f);await entered.promise;
  const other=f.connect(),newGm=Object.create(f.gm);newGm.db=other;
  const recovered=await recoverSessionOpeningPrecommit({db:other,interaction:{id:'recovery',guildId:'g',guild:f.guild,user:{id:'gm'}},authorize:()=>true,gm:newGm});
  assert.equal(recovered.status,'completed');release.resolve();const result=await oldWork;assert.equal(result.status,'completed');
  assert.equal(f.db.getCityRecord('g','session_opening_job',f.session.id).status,'completed');assert.equal(f.sends.length,1);
 }finally{f.close();}
});
test('pause during writer blocks draft and send; stale recovery card is rejected and fresh authenticated card resumes once',async()=>{
 const f=fixture();try{f.start();const entered=barrier(),release=barrier();let writes=0;
  f.gm.generateNarrative=async(_g,packet)=>{if(++writes===1){entered.resolve();await release.promise;}return f.answer(packet);};
  const work=runSessionOpening(f);await entered.promise;f.db.setDirectorPaused('g',true);release.resolve();const paused=await work;
  assert.equal(paused.data.hold_code,'OPENING_DIRECTOR_PAUSED');assert.equal(f.sends.length,0);assert.equal(f.db.listCityRecords('g',{kind:'narrative_draft',includeGM:true}).length,0);
  const interaction={id:'review',guildId:'g',guild:f.guild,user:{id:'gm'}};
  assert.equal(prepareSessionOpeningPrecommitReview(f.db,interaction,()=>true),null);f.db.setDirectorPaused('g',false);
  const stale=prepareSessionOpeningPrecommitReview(f.db,interaction,()=>true);assert.ok(stale);f.attend('a');
  await assert.rejects(recoverSessionOpeningPrecommit({db:f.db,interaction,authorize:()=>true,gm:f.gm,reviewKey:stale}));
  const review=prepareSessionOpeningPrecommitReview(f.db,interaction,()=>true);
  const resumed=await recoverSessionOpeningPrecommit({db:f.db,interaction,authorize:()=>true,gm:f.gm,reviewKey:review});assert.equal(resumed.status,'completed');
  await assert.rejects(recoverSessionOpeningPrecommit({db:f.db,interaction,authorize:()=>true,gm:f.gm,reviewKey:review}));
  assert.equal(f.sends.filter(s=>s.target==='table').length,1);
 }finally{f.close();}
});
test('actual model adapter preserves redacted provider, parse and deadline categories for opening lanes',async()=>{
 const service={config:{gmModel:'mock'},metrics:{record(){}}};
 for(const scenario of ['provider','parse','deadline']){
  const abort=new AbortController();if(scenario==='deadline')abort.abort();
  service.requestModel=async()=>{if(scenario==='provider')throw new Error('PRIVATE_PROVIDER_BODY');return {output_text:scenario==='parse'?'PRIVATE_PARSE_BODY':'{}'};};
  await assert.rejects(GMService.prototype.generateNarrative.call(service,'g',{},abort.signal,'opening_entry'),error=>{
    assert.equal(openingEntryAuthoringCode(error),scenario==='provider'?'PROVIDER_ERROR':scenario==='parse'?'WRITER_PARSE':'PROVIDER_DEADLINE');
    assert.ok(!JSON.stringify(error).includes('PRIVATE_'));return true;
  });
 }
 if(process.env.P10_EVIDENCE==='1')console.log('P10_ADAPTER_USAGE',JSON.stringify({mock_provider_requests:3,paid_provider_calls:0}));
});
test('manual attempt-2 approval remains valid after an uncommitted autonomous epoch',async()=>{
 const f=fixture();try{f.start();f.gm.planAssembly=async()=>{throw new Error('offline');};await runSessionOpening(f);
  const interaction={id:'recovery',guildId:'g',guild:f.guild,user:{id:'gm'}};
  await recoverSessionOpeningPrecommit({db:f.db,interaction,authorize:()=>true,gm:f.gm});
  assert.equal(f.db.getCityRecord('g','session_opening_job',f.session.id).data.epoch.number,1);
  f.gm.planAssembly=async()=>f.currentPlan();const review=prepareAssemblyRefresh(f.db,'g',f.session,'gm');assert.ok(review);
  await refreshAssemblyPlan(f.db,'g','gm',review,f.gm,{authorized:true,interactionId:'explicit-manual-refresh'});
  const job=assertSessionOpeningAttempt(f.db,'g',f.session.id);assert.equal(job.data.attempts,2);assert.equal(job.data.epoch,null);assert.equal(job.data.previous_epoch.number,1);
  const result=await runSessionOpening(f);assert.equal(result.status,'completed');assert.equal(f.sends.length,1);
 }finally{f.close();}
});
test('nested and contradictory private labels never enter actual public or owner writer packets',async()=>{
 const f=fixture();try{f.start();const a=f.attend('a');f.attend('b');
  f.db.updateCharacterData(a.pc.id,d=>{d.entry_hooks.push({text:'NESTED_SECRET_CANARY',visibility:'player',export_meta:{audience:'gm_private'}},
    {text:'CONTRADICTORY_SECRET_CANARY',visibility:'player',scope:'gm_private'});});
  await runSessionOpening(f);assert.equal(f.sends.length,3);
  for(const packet of f.packets){const text=JSON.stringify(packet);assert.ok(!text.includes('NESTED_SECRET_CANARY'));assert.ok(!text.includes('CONTRADICTORY_SECRET_CANARY'));}
  const publicPacket=f.packets.find(p=>p.audience.mode==='party');assert.ok(!JSON.stringify(publicPacket).includes('OWNER_a_THREAD'));assert.ok(!JSON.stringify(publicPacket).includes('OWNER_b_THREAD'));
 }finally{f.close();}
});
