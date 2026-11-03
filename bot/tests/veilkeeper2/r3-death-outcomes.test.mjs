import test from 'node:test';
import assert from 'node:assert/strict';
import {riskItAllOutcome,avoidDeathOutcome} from '../../src/v2/rules/pc-death-outcomes.js';
test('Risk It All maps actual Duality classifications without selecting the owner move',()=>{
  assert.equal(riskItAllOutcome('Fear'),'dead');assert.equal(riskItAllOutcome('Critical'),'recovered');assert.equal(riskItAllOutcome('Hope'),'allocate_recovery');
});
test('Avoid Death scar boundary uses Hope die at or below level and permanent Hope cap',()=>{
  const data={resources:{hope_max:6}};assert.deepEqual(avoidDeathOutcome(data,3,3),{scar:true,hope_max:5,result:'unconscious'});
  assert.deepEqual(avoidDeathOutcome(data,4,3),{scar:false,hope_max:6,result:'unconscious'});assert.equal(data.resources.hope_max,6);
});
test('last permanent Hope slot ends the journey only when a scar is incurred',()=>{
  const data={resources:{hope_max:1}};assert.deepEqual(avoidDeathOutcome(data,1,2),{scar:true,hope_max:0,result:'journey_ended'});
  assert.deepEqual(avoidDeathOutcome(data,3,2),{scar:false,hope_max:1,result:'unconscious'});
});
test('invalid permanent cap fails instead of producing an authorized death result',()=>{
  assert.throws(()=>avoidDeathOutcome({resources:{hope_max:7}},1,1));assert.throws(()=>avoidDeathOutcome({resources:{hope_max:1.5}},1,1));
});
