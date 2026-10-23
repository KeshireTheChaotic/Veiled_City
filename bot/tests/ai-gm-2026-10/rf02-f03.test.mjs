import test from 'node:test';import assert from 'node:assert/strict';
import {createLogger,openingErrorCode,openingDiagnostic} from '../../src/frameworks/operations/public.js';
test('relocated logger preserves threshold, method choice and exact argument identity',()=>{
  const calls=[],saved={};for(const name of ['debug','info','warn','error']){saved[name]=console[name];console[name]=(...args)=>calls.push([name,args]);}
  try{const logger=createLogger('WARN'),payload={reference:'native'};logger.debug('skip');logger.info('skip');logger.warn('warning',payload);logger.error(payload);
    assert.deepEqual(calls.map(([name])=>name),['warn','error']);assert.equal(calls[0][1][1],payload);assert.equal(calls[1][1][0],payload);
    const debug=createLogger('debug');debug.debug(payload);assert.equal(calls.at(-1)[0],'debug');
  }finally{for(const [name,fn] of Object.entries(saved))console[name]=fn;}
});
test('logger keeps explicit configuration failure and original empty-level default',()=>{
  assert.throws(()=>createLogger('verbose'),/LOG_LEVEL must be one of: debug, info, warn, error\./);
  assert.deepEqual(Object.keys(createLogger('')),['debug','info','warn','error']);assert.ok(createLogger(null));
});
test('operational error categories preserve source/native/provider classifications without raw message leakage',()=>{
  for(const [code,want] of [['OPENING_INPUT_CHANGED','OPENING_INPUT_CHANGED'],['SESSION_OPENING','OPENING_SOURCE_INVALID'],
    ['ASSEMBLY_SOURCE','OPENING_SOURCE_CHANGED'],['SESSION_OPENING_ATTENDANCE','OPENING_SOURCE_CHANGED'],
    ['SCENE_FICTION','OPENING_NATIVE_OUTPUT_HELD'],['NARRATIVE_PVP','OPENING_NATIVE_OUTPUT_HELD'],['AI_GENERATION_DEADLINE','OPENING_PROVIDER_DEADLINE'],
    ['unknown-private-provider-error','OPENING_AUTHORING_ERROR']])assert.equal(openingErrorCode({code,message:'PRIVATE-BODY'}),want);
  assert.equal(openingErrorCode({name:'TimeoutError'}),'OPENING_PROVIDER_DEADLINE');assert.equal(openingErrorCode(null),'OPENING_AUTHORING_ERROR');
});
test('diagnostic shape, rounding, epoch/hash precedence and honest unknown usage remain stable',()=>{
  const row={data:{attempts:1,epoch:{number:3,input_fingerprint:'epoch-hash'},context:{input_fingerprint:'original'},private_text:'NEVER OUTPUT'}};
  const result=openingDiagnostic(row,{code:'OPENING_INPUT_CHANGED',stage:'authoring',durationMs:12.6,plannerInvocations:2});
  assert.deepEqual(result,{version:1,category:'OPENING_INPUT_CHANGED',stage:'authoring',attempt:1,epoch:3,input_hash:'epoch-hash',duration_ms:13,planner_invocations:2,
    provider_calls:'UNMEASURED',tokens:'UNMEASURED',cost:'UNMEASURED',retry:'Authenticated exact-state review; never retry uncertain transport.'});
  assert.equal(JSON.stringify(result).includes('NEVER OUTPUT'),false);
  assert.equal(openingDiagnostic({data:{attempts:2,context:{input_fingerprint:'original'}}},{durationMs:-1}).input_hash,'original');
  assert.equal(openingDiagnostic({data:{}},{durationMs:-1}).duration_ms,0);
});
