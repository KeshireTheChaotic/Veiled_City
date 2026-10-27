import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {riskItAllOutcome,avoidDeathOutcome} from '../../src/frameworks/daggerheart/pc-death-outcomes.js';

test('Risk It All maps saved Duality results without choosing or rolling',()=>{
  assert.equal(riskItAllOutcome('Fear'),'dead');
  assert.equal(riskItAllOutcome('Critical'),'recovered');
  assert.equal(riskItAllOutcome('Hope'),'allocate_recovery');
});

test('Avoid Death maps scar, permanent Hope slot and journey-end threshold',()=>{
  assert.deepEqual(avoidDeathOutcome({resources:{hope_max:1}},3,3),{scar:true,hope_max:0,result:'journey_ended'});
  assert.deepEqual(avoidDeathOutcome({resources:{hope_max:1}},4,3),{scar:false,hope_max:1,result:'unconscious'});
  assert.deepEqual(avoidDeathOutcome({resources:{hope_max:2}},3,3),{scar:true,hope_max:1,result:'unconscious'});
});

