import test from 'node:test';
import assert from 'node:assert/strict';
import {createModelTransport} from '../../src/frameworks/ai-provider/model-transport.js';
import {OperationalMetrics} from '../../src/frameworks/operations/public.js';

test('a transport without a Responses client can be constructed, as before the extraction',()=>{
  const transport=createModelTransport({client:{},config:{openaiMaxRetries:0},metrics:new OperationalMetrics()});
  assert.equal(typeof transport.requestModel,'function');
  assert.throws(()=>createModelTransport({client:{}}),/configuration is required/);
});

test('dispatch without a Responses client fails as a recorded provider error and is not retried',async()=>{
  const metrics=new OperationalMetrics(),incidents=[];
  const transport=createModelTransport({client:{},config:{openaiMaxRetries:3},metrics,randomId:()=>{incidents.push(1);return 'ref';},wait:async()=>{throw new Error('must not retry');}});
  await assert.rejects(transport.requestModel({model:'m'},{guildId:'g'}),TypeError);
  const row=metrics.snapshot('g').stages.model_request;
  assert.equal(row.count,1);assert.equal(row.failures,1);assert.deepEqual(row.error_codes,{PROVIDER_ERROR:1});
  assert.equal(incidents.length,1);
});
