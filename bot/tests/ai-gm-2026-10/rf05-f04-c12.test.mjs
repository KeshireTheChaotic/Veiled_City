import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GMService} from '../../src/gm.js';
import * as operations from '../../src/frameworks/operations/public.js';
import * as compatibility from '../../src/operational-metrics.js';
import * as traceCompatibility from '../../src/turn-trace-context.js';

const traceFor=guild=>{
  const stages=[];
  return {guild,retries:{structured:0,validation:0},stages,clock:()=>performance.now(),stage:(name,ms)=>stages.push([name,ms])};
};

test('Operations public and compatibility paths share one metrics implementation and singleton',()=>{
  assert.equal(typeof GMService,'function');
  for(const key of ['OperationalMetrics','measureNative','measureStage','operationalMetrics','parseModelPricing'])
    assert.equal(operations[key],compatibility[key],`${key} compatibility identity`);
  assert.ok(operations.operationalMetrics instanceof compatibility.OperationalMetrics);
});

test('metrics record retries and stage timing in the Operations-owned turn trace',async()=>{
  const metrics=new operations.OperationalMetrics({pricing:{'model-a':{input:1,output:2}}});
  const trace=traceFor('guild-1');
  await traceCompatibility.withTurnTrace(trace,async()=>{
    metrics.record('structured_retry',{guildId:'guild-1'});
    metrics.record('validation_retry',{guildId:'guild-1'});
    metrics.record('structured_retry',{guildId:'guild-2'});
    assert.equal(await operations.measureStage(metrics,'gm',async()=>{await Promise.resolve();return 'done';},{guildId:'guild-1'}),'done');
    assert.equal(operations.measureNative('commit','guild-1',()=>7,metrics),7);
    await assert.rejects(operations.measureStage(metrics,'validate',async()=>{throw Object.assign(new Error('x'),{code:'STATE_CONFLICT'});},{guildId:'guild-1'}));
    operations.measureNative('discord','guild-2',()=>null,metrics);
  });
  assert.deepEqual(trace.retries,{structured:1,validation:1});
  assert.deepEqual(trace.stages.map(([name])=>name),['gm','commit','validate']);
  assert.ok(trace.stages.every(([,ms])=>Number.isFinite(ms)&&ms>=0));
  const stages=metrics.snapshot('guild-1').stages;
  assert.equal(stages.gm.count,1);assert.equal(stages.commit.count,1);
  assert.equal(stages.validate.failures,1);assert.deepEqual(stages.validate.error_codes,{STATE_CONFLICT:1});
  assert.equal(stages.discord,undefined);
});

test('snapshots and incidents keep closed aggregate fields, not prompt or campaign content',()=>{
  const metrics=new operations.OperationalMetrics({pricing:{'model-a':{input:1,output:2}}}),secret='PROMPT-SECRET the vault code is 4417';
  metrics.record('model_request',{guildId:'guild-1',model:'model-a',inputTokens:100,outputTokens:50,prompt:secret,errorCode:secret,status:'error'});
  metrics.record(secret,{guildId:'guild-1'});
  metrics.incident('narrative',{guildId:'guild-1',reference:secret,code:secret});
  const serialized=JSON.stringify([metrics.snapshot('guild-1'),metrics.incidents('guild-1')]);
  assert.doesNotMatch(serialized,/PROMPT-SECRET|vault|4417/);
  const row=metrics.snapshot('guild-1').stages.model_request;
  assert.equal(row.input_tokens,100);assert.equal(row.output_tokens,50);
  assert.equal(row.cost_estimate_usd,(100*1+50*2)/1000000);
  assert.deepEqual(row.error_codes,{UNCLASSIFIED:1});
  assert.deepEqual(metrics.incidents('guild-1').map(({category,code,occurrences})=>({category,code,occurrences})),[{category:'narrative',code:'UNCLASSIFIED',occurrences:1}]);
});

test('GM imports metrics through Operations public',async()=>{
  const gm=await readFile(new URL('../../src/gm.js',import.meta.url),'utf8');
  assert.match(gm,/operationalMetrics[^}]*\}\s*from\s*["']\.\/frameworks\/operations\/public\.js["']/);
  assert.doesNotMatch(gm,/from\s*["']\.\/operational-metrics\.js["']/);
});
