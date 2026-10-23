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

test('death provider uses native mappings in both mutation and saved-outcome verification',()=>{
  const provider=fs.readFileSync(new URL('../../src/pc-death.js',import.meta.url),'utf8');
  assert.match(provider,/riskItAllOutcome\(payload\.duality\)/);
  assert.match(provider,/riskItAllOutcome\(r\.duality\)/);
  assert.match(provider,/avoidDeathOutcome\(f\.pc\.data,hope,f\.pc\.data\.level\)/);
  assert.match(provider,/avoidDeathOutcome\(expected\.data,r\.hope,expected\.data\.level\)/);
});
