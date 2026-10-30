import test from 'node:test';
import assert from 'node:assert/strict';
import {publicationOperations} from '../../src/frameworks/publication/public.js';
import {TurnLatency,turnLatency,failureTrace,publicationTelemetrySource,operationalMetrics,withTurnTrace} from '../../src/frameworks/operations/public.js';
import {TurnLatency as rootClass,turnLatency as rootLatency} from '../../src/turn-latency.js';
import {failureTrace as rootFailure} from '../../src/failure-trace.js';
import {initializePublicationOperations} from '../../src/application/composition/publication-operations.js';

test('single original class/singleton/function retained; fixed telemetry source binds idempotently and refuses replacement',()=>{
  assert.equal(TurnLatency,rootClass);assert.equal(turnLatency,rootLatency);assert.equal(failureTrace,rootFailure);
  assert.throws(()=>publicationOperations.currentTurnTrace(),e=>e.code==='PUBLICATION_OPERATIONS_COMPOSITION');
  initializePublicationOperations();assert.doesNotThrow(()=>initializePublicationOperations());
  assert.throws(()=>publicationOperations.bind({...publicationTelemetrySource,record(){}}),/replacement forbidden/);
});
test('record and incident callbacks reach the original Operations metric singleton',()=>{
  const guild='rf13-metrics',before=operationalMetrics.snapshot(guild).stages.discord?.count||0;
  publicationOperations.record('discord',{guildId:guild,durationMs:3});publicationOperations.incident('publication',{guildId:guild,reference:'part-1',code:'UNCERTAIN'});
  assert.equal(operationalMetrics.snapshot(guild).stages.discord.count,before+1);
  const incident=operationalMetrics.incidents(guild).find(i=>i.category==='publication');assert.equal(incident.code,'UNCERTAIN');assert.equal(incident.occurrences,1);assert.notEqual(incident.reference,'part-1');
});
test('native measurement retains synchronous value/error and original trace finally callback',()=>{
  const result={},error=Object.assign(new Error('synthetic original failure'),{code:'NARRATIVE_PVP'}),events=[];
  const trace={guild:'rf13-native',clock:()=>7,stage:(...args)=>events.push(args)};
  withTurnTrace(trace,()=>{
    assert.equal(publicationOperations.measureNative('opening_native_accept','rf13-native',()=>result),result);
    assert.throws(()=>publicationOperations.measureNative('opening_native_accept','rf13-native',()=>{throw error;}),actual=>actual===error);
  });
  assert.deepEqual(events,[['opening_native_accept',0],['opening_native_accept',0]]);
});
test('async-local trace identity and guild restriction survive awaits without copying context',async()=>{
  const trace={guild:'rf13-trace'};
  await withTurnTrace(trace,async()=>{assert.equal(publicationOperations.currentTurnTrace(),trace);await Promise.resolve();assert.equal(publicationOperations.turnTraceFor('rf13-trace'),trace);assert.equal(publicationOperations.turnTraceFor('other'),null);});
  assert.equal(publicationOperations.currentTurnTrace(),null);
});
test('original first substantive timing and singleton publication binding remain intact',()=>{
  let now=0;const latency=new TurnLatency({clock:()=>now,metrics:{reference:(guild,kind,id)=>`${guild}:${kind}:${id}`}}),trace=latency.begin('rf13-clock');
  trace.progress();now=10;trace.publication(false);assert.equal(trace.first,null);latency.bind('rf13-clock','turn',trace);now=15;latency.publication('rf13-clock','turn',true);now=25;latency.publication('rf13-clock','turn',true);trace.finish('delivered');
  assert.equal(latency.snapshot('rf13-clock').first_substantive_ms.p50,15);assert.equal(latency.snapshot('rf13-clock').samples[0].progress_notices,1);
  const calls=[];turnLatency.bind('rf13-singleton','turn',{guild:'rf13-singleton',publication:value=>calls.push(value)});publicationOperations.publication('rf13-singleton','turn',true);assert.deepEqual(calls,[true]);
});
test('failure projection keeps original closed fields and excludes raw private text',()=>{
  const error={code:'NARRATIVE_PVP',message:'private secret text',diagnostic:{category:'source_span',source_ref:'source-1',action_key:'action-1'}};
  const expected={version:1,code:'NARRATIVE_PVP',category:'source_span',turn_id:'turn-1',message_id:'message-1',source_event:'source-1',action_key:'action-1',model_attempts:0,recovery:'resync_committed_output'};
  assert.deepEqual(publicationOperations.failureTrace(error,{turn_id:'turn-1',discord_message_id:'message-1',committed:'yes'}),expected);
  assert.ok(!JSON.stringify(expected).includes(error.message));
});
