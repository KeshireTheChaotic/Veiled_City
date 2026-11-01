import test from 'node:test';
import assert from 'node:assert/strict';
import {operationsIntentPolicy} from '../../src/frameworks/operations/public.js';
import {connectOperationsIntentPolicy} from '../../src/framework-to-framework/intent--operations/public.js';

test('Operations receives only the unchanged Intent policy reader through fixed composition',()=>{
  assert.throws(()=>operationsIntentPolicy.delegationPolicy({},'guild'),{code:'OPERATIONS_INTENT_POLICY_COMPOSITION'});
  assert.equal(connectOperationsIntentPolicy(),operationsIntentPolicy);
  assert.equal(connectOperationsIntentPolicy(),operationsIntentPolicy);
  const saved={mode:'routine_delegated',allow:['dialogue.interpret'],private_allow:[],max_operations:2,max_cost:3,expires_minute:91,revision:4};
  const calls=[];
  const db={getCityRecord(...args){assert.equal(this,db);calls.push(args);return {data:saved};}};
  assert.equal(operationsIntentPolicy.delegationPolicy(db,'guild'),saved);
  assert.deepEqual(calls,[['guild','ai_delegation','campaign']]);
  assert.deepEqual(operationsIntentPolicy.delegationPolicy({getCityRecord(){return null;}},'missing'),
    {mode:'manual',revision:0,allow:[],max_operations:1,max_cost:0,expires_minute:null});
  const failure=new Error('storage failure');
  assert.throws(()=>operationsIntentPolicy.delegationPolicy({getCityRecord(){throw failure;}},'guild'),error=>error===failure);
  assert.throws(()=>operationsIntentPolicy.bind({}),/requires the original functions/);
  assert.throws(()=>operationsIntentPolicy.bind({delegationPolicy(){}}),/replacement forbidden/);
  assert.deepEqual(Object.keys(operationsIntentPolicy).sort(),['bind','delegationPolicy']);
});
