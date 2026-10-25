import test from 'node:test';
import assert from 'node:assert/strict';
import {createModelTransport} from '../../src/frameworks/ai-provider/public.js';
import {GMService} from '../../src/gm.js';

function harness(create,{retries=1,trace=true}={}){
  const events=[],incidents=[],traceEvents=[],waits=[];let calls=0,clock=0;
  const client={responses:{create:async(...args)=>{calls++;return create(...args,calls);}}};
  const metrics={record:(...args)=>events.push(args),incident:(...args)=>incidents.push(args)};
  const traceValue=trace?{model:(...args)=>traceEvents.push(args)}:null;
  const service=createModelTransport({client,config:{openaiMaxRetries:retries},metrics,
    traceForGuild:guild=>guild==='g-1'?traceValue:null,now:()=>++clock,
    wait:async(ms,_value,{signal}={})=>{waits.push(ms);if(signal?.aborted)throw new Error('aborted');},randomId:()=>`incident-${incidents.length+1}`});
  return {service,events,incidents,traceEvents,waits,calls:()=>calls};
}

test('successful dispatch preserves request options and records usage, cache, and purpose telemetry',async()=>{
  const response={output_text:'ok',usage:{input_tokens:12,output_tokens:4,input_tokens_details:{cached_tokens:7}}};
  const h=harness(async(request,options)=>{assert.equal(request.model,'model-x');assert.equal(options.maxRetries,0);assert.ok(options.signal);return response;});
  const controller=new AbortController();
  assert.equal(await h.service.requestModel({model:'model-x'},{guildId:'g-1',signal:controller.signal,purpose:'writer'}),response);
  assert.equal(h.calls(),1);
  assert.deepEqual(h.events[0],[ 'model_request',{
    guildId:'g-1',model:'model-x',durationMs:1,inputTokens:12,outputTokens:4,cachedInputTokens:7,retries:0
  }]);
  assert.equal(h.traceEvents[0][1].purpose,'writer');
  assert.equal(h.traceEvents[0][1].model,'model-x');
  assert.deepEqual(h.incidents,[]);
});

test('recoverable provider failure waits within the bounded retry policy then returns a response',async()=>{
  const failure=Object.assign(new Error('opaque provider body'),{status:429,headers:{'retry-after':'0'}});
  const response={output_text:'recovered',usage:{input_tokens:2,output_tokens:1}};
  const h=harness(async(_request,_options,call)=>{if(call===1)throw failure;return response;});
  assert.equal(await h.service.requestModel({model:'model-y'},{guildId:'g-1',retry:true,purpose:'gm'}),response);
  assert.equal(h.calls(),2);
  assert.deepEqual(h.waits,[250]);
  assert.equal(h.events.length,2);
  assert.equal(h.events[0][1].errorCode,'PROVIDER_ERROR');
  assert.equal(h.events[1][1].retries,1);
  assert.equal(h.traceEvents.length,2);
  assert.equal(h.incidents[0][1].code,'PROVIDER_ERROR');
  assert.match(h.incidents[0][1].reference,/^incident-/u);
});

test('terminal provider error does not retry and preserves privacy-safe error classification',async()=>{
  const failure=Object.assign(new Error('private response body'),{status:400});
  const h=harness(async()=>{throw failure;});
  await assert.rejects(h.service.requestModel({model:'model-z'},{guildId:'g-1'}),error=>error===failure);
  assert.equal(h.calls(),1);
  assert.deepEqual(h.waits,[]);
  assert.equal(h.events[0][1].errorCode,'PROVIDER_ERROR');
  assert.equal(h.incidents[0][1].code,'PROVIDER_ERROR');
  assert.equal(JSON.stringify(h.events).includes('private response body'),false);
});

test('aborted operation does not dispatch a request',async()=>{
  const h=harness(async()=>({output_text:'unexpected'}));
  const controller=new AbortController();controller.abort();
  await assert.rejects(h.service.requestModel({model:'model-a'},{guildId:'g-1',signal:controller.signal}),error=>error.code==='AI_GENERATION_DEADLINE');
  assert.equal(h.calls(),0);
  assert.equal(h.events.length,0);
});

test('abort after provider response is recorded as a deadline and is never retried',async()=>{
  const controller=new AbortController();
  const h=harness(async()=>{controller.abort();return {usage:{input_tokens:1}};});
  await assert.rejects(h.service.requestModel({model:'model-b'},{guildId:'g-1',signal:controller.signal}),error=>error.code==='AI_GENERATION_DEADLINE');
  assert.equal(h.calls(),1);
  assert.equal(h.events[0][1].errorCode,'AI_GENERATION_DEADLINE');
  assert.equal(h.incidents[0][1].code,'AI_GENERATION_DEADLINE');
});

test('retry configuration remains capped at five retries and honors the server deferral ceiling',async()=>{
  const failure=Object.assign(new Error('temporary'),{status:503});
  const h=harness(async()=>{throw failure;},{retries:99});
  await assert.rejects(h.service.requestModel({model:'model-c'},{guildId:'g-1'}),error=>error===failure);
  assert.equal(h.calls(),6);
  assert.equal(h.waits.length,5);
  assert.deepEqual(h.waits,[250,500,1000,1000,1000]);

  const delayed=Object.assign(new Error('defer'),{status:429,headers:{'retry-after':'2'}});
  const deferred=harness(async()=>{throw delayed;});
  await assert.rejects(deferred.service.requestModel({model:'model-c'},{guildId:'g-1'}),error=>error===delayed);
  assert.equal(deferred.calls(),1);
  assert.deepEqual(deferred.waits,[]);
});

test('application GMService keeps its request method as a transparent provider delegate',async()=>{
  const service=Object.create(GMService.prototype),request={model:'model-d'},options={guildId:'g-1',purpose:'router'};
  let received;
  service.modelTransport={requestModel:(...args)=>{received=args;return Promise.resolve('response');}};
  assert.equal(await service.requestModel(request,options),'response');
  assert.deepEqual(received,[request,options]);
});
