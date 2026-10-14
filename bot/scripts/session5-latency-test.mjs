/** LAT01: deterministic logical-turn timings exclude progress, voice, raw IDs and provider guesses. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {TurnLatency} from '../src/turn-latency.js';
import {withTurnTrace} from '../src/turn-trace-context.js';
import {OperationalMetrics,measureStage,measureNative} from '../src/operational-metrics.js';
import {turnLatency} from '../src/turn-latency.js';
import {nativeFixture} from './v9-fixtures.mjs';
import {captureWorldInput} from '../src/autonomous-world.js';
import {prepareAuthorizedTurnOutput} from '../src/pvp-output.js';
import {queueTurnPublications,deliverTurnOutbox} from '../src/publication-outbox.js';
import {beginGenerationFeedback} from '../src/generation-feedback.js';
import {enqueueTrackedTurn} from '../src/tracked-turn.js';
import {KeyedSerialQueue} from '../src/serial-queue.js';
import {DatabaseSync} from 'node:sqlite';
import {instrumentSqlReads} from '../src/turn-trace-context.js';
test('LAT01 complete-turn first substantive publication includes queue, stages and only reported usage',async()=>{
  let now=0;const metrics=new OperationalMetrics(),latency=new TurnLatency({clock:()=>now,metrics});
  const trace=latency.begin('SECRET_GUILD');now=100;trace.queueStarted(2);
  await withTurnTrace(trace,async()=>{
    await measureStage(metrics,'router',async()=>{now+=200;},{guildId:'SECRET_GUILD'});
    measureNative('validate','SECRET_GUILD',()=>{now+=50;},metrics);
    trace.model({input_tokens:20,output_tokens:10,output_tokens_details:{reasoning_tokens:3}},'gm');
    trace.progress();now+=500;trace.publication(false);assert.equal(trace.first,null);trace.publication(true);trace.finish('delivered');
  });
  const report=latency.snapshot('SECRET_GUILD');assert.equal(report.completed,1);assert.equal(report.first_substantive_ms.p95,850);
  assert.equal(report.samples[0].queue_ms,100);assert.equal(report.samples[0].calls,1);assert.equal(report.samples[0].reported_tokens.reasoning,3);
  assert.doesNotMatch(JSON.stringify(report),/SECRET_GUILD/);assert.equal(latency.snapshot('other').completed,0);
});
test('LAT01 routine threshold distribution, bounded retention, failures and no neutral-only success',()=>{
  let now=0;const latency=new TurnLatency({clock:()=>now,sampleLimit:3});
  for(const ms of [1000,11000,21000,31000]){const trace=latency.begin('guild');trace.category='observation';now+=ms;trace.publication(true);trace.finish('delivered');}
  const failed=latency.begin('guild');failed.publication(false);failed.finish('failed');
  const report=latency.snapshot('guild');assert.equal(report.samples.length,3);assert.equal(report.completed,5);
  assert.equal(report.first_substantive_ms.p90,31000);assert.equal(report.no_substantive,1);assert.equal(report.over_20s,2);
});

test('LAT01 actual outbox acknowledgement measures substantive native output, not neutral or uncertain transport',()=>nativeFixture(async f=>{
  const pc=f.pcs[0],scope={mode:'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Terminal'});
  const source=captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,'trace-source','I wait.',{privateScene:true});
  for(const substantive of [false,true]){
    const attempt=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:`latency-${substantive}`,actorPrincipal:pc.owner_user_id,audience:'private'});
    const result={narration:'Held candidate',private_messages:[],narrative_claims:[],gm_world_parts:substantive?[{version:1,kind:'scene_atmosphere',entity_key:'terminal',acts:['quiet_pause'],tone:'plain'}]:[]};
    prepareAuthorizedTurnOutput(f.db,f.guild,result,scope,{sourceRef:source.event_key});
    queueTurnPublications(f.db,{guild:{id:f.guild},session:f.session,result,scope,turnId:attempt.turn_id});
    const trace=turnLatency.begin(f.guild);turnLatency.bind(f.guild,attempt.turn_id,trace);
    await withTurnTrace(trace,()=>deliverTurnOutbox(f.db,f.guild,attempt.turn_id,async()=>({messageId:'ack',channelId:'offline'})));
    assert.equal(trace.first!==null,substantive);trace.finish('delivered');
  }
}));

test('LAT04 configurable progress stops cleanly, deduplicates callback and makes no commit assertion',async()=>{
  let notice,typing,cleared=0;const replies=[],message={reply:async text=>{replies.push(text);},channel:{sendTyping:async()=>{}}};
  const timers={schedule:fn=>(notice=fn,1),repeat:fn=>(typing=fn,2),cancel:()=>{cleared++;},cancelRepeat:()=>{cleared++;}};
  const stop=beginGenerationFeedback(message,{},timers);notice();notice();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(replies.length,1);assert.doesNotMatch(replies[0],/no .*committed/i);stop();notice();typing();assert.equal(cleared,2);
  notice=null;const disabled=beginGenerationFeedback(message,{gmProgressEnabled:false},timers);assert.equal(notice,null);disabled();
});

test('LAT01 queue wait includes preceding work, bounded instrumentation never changes serial order',async()=>{
  let now=0,release;const latency=new TurnLatency({clock:()=>now}),queue=new KeyedSerialQueue(),order=[];
  const first=enqueueTrackedTurn(queue,'q',async()=>{order.push(1);await new Promise(resolve=>{release=resolve;});now=200;return {stage:'delivered'};},{latency});
  await new Promise(resolve=>setImmediate(resolve));const second=enqueueTrackedTurn(queue,'q',async()=>{order.push(2);return {stage:'delivered'};},{latency});
  release();await Promise.all([first,second]);assert.deepEqual(order,[1,2]);assert.equal(latency.snapshot('q').samples[1].queue_ms,200);
});

test('LAT01 SQLite instrumentation binds native methods, counts only reads and never retains SQL or values',async()=>{
  const raw=new DatabaseSync(':memory:'),db=instrumentSqlReads(raw),latency=new TurnLatency(),trace=latency.begin('sql');
  try{db.exec('CREATE TABLE specimen(value TEXT)');await withTurnTrace(trace,async()=>{
    db.prepare('INSERT INTO specimen VALUES (?)').run('PRIVATE_SQL_VALUE');
    assert.equal(db.prepare('SELECT value FROM specimen').get().value,'PRIVATE_SQL_VALUE');assert.equal(trace.sql_reads,1);
    assert.equal(db.prepare('SELECT * FROM specimen').all().length,1);assert.equal(trace.sql_reads,2);
  });trace.finish('delivered');assert.doesNotMatch(JSON.stringify(latency.snapshot('sql')),/PRIVATE_SQL_VALUE|SELECT|specimen/);}
  finally{db.close();}
});

test('LAT01 untraced standalone operations with no guild preserve original result/error, never dereference an absent trace',async()=>{
  const metrics=new OperationalMetrics();assert.equal(measureNative('validate',undefined,()=>42,metrics),42);
  assert.equal(await measureStage(metrics,'gm',async()=>43),43);
  await assert.rejects(()=>measureStage(metrics,'gm',async()=>{throw new Error('original failure');}),/original failure/);
});
