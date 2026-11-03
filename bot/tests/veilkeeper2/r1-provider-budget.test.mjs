import test from 'node:test';
import assert from 'node:assert/strict';
import {createCallBudget} from '../../src/v2/provider-budget.js';
test('call budget forwards calls until its ceiling, then refuses without retrying',async()=>{
  const calls=[],budget=createCallBudget({generate:async input=>{calls.push(input);return {text:'ok'};}},{maxCalls:2});
  assert.deepEqual(await budget.generate({a:1}),{text:'ok'});await budget.generate({a:2});assert.equal(budget.used,2);assert.equal(budget.remaining,0);
  await assert.rejects(budget.generate({a:3}),/budget of 2 exhausted/);assert.equal(calls.length,2);
});
test('call budget rejects unbounded or invalid configuration',()=>{
  for(const maxCalls of [0,-1,1.5,1001,undefined])assert.throws(()=>createCallBudget({generate(){}},{maxCalls}),/bounded call budget/);assert.throws(()=>createCallBudget({},{maxCalls:1}),/Provider/);
});
