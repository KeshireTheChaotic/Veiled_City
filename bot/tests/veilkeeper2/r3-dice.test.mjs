import test from 'node:test';
import assert from 'node:assert/strict';
import {dualityRoll,gmD20Roll,gmAttackDamage,diceSpec,parseDice} from '../../src/v2/rules/dice.js';
function stream(values,sides){let n=0;const rng=s=>{assert.equal(s,sides[n]);return values[n++];};return {rng,used:()=>n};}
test('all Duality face pairs preserve total and Hope/Fear/Critical classification',()=>{
  for(let hope=1;hope<=12;hope++)for(let fear=1;fear<=12;fear++){
    const s=stream([hope,fear],[12,12]),r=dualityRoll({modifier:2,experience:-1},s.rng);
    assert.equal(r.total,hope+fear+1);assert.equal(r.duality,hope===fear?'Critical':hope>fear?'Hope':'Fear');assert.equal(s.used(),2);
  }
});
test('net advantage uses one d6 and help uses the highest permitted result',()=>{
  const a=stream([4,8,3],[12,12,6]);assert.equal(dualityRoll({advantage:3,disadvantage:1,helperDice:[5,2]},a.rng).total,17);assert.equal(a.used(),3);
  const b=stream([4,8,3],[12,12,6]);assert.equal(dualityRoll({disadvantage:2},b.rng).total,9);
  const c=stream([4,8],[12,12]);assert.equal(dualityRoll({advantage:2,disadvantage:2},c.rng).total,12);assert.equal(c.used(),2);
  assert.throws(()=>dualityRoll({disadvantage:1,helperDice:[6]},()=>{throw new Error('must not roll');}),/saved GM ruling/);
});
test('GM natural twenty differs by roll family and critical attack damage adds maximum dice',()=>{
  assert.equal(gmD20Roll({kind:'action',difficulty:100},()=>20).success,false);
  const attack=gmD20Roll({kind:'attack',difficulty:100},()=>20);assert.equal(attack.success,true);assert.equal(attack.critical,'attack_success');
  const s=stream([2,4],[6,6]),damage=gmAttackDamage(attack,'2d6+3',s.rng);assert.equal(damage.total,21);assert.equal(damage.critical_bonus,12);
  assert.equal(gmD20Roll({kind:'reaction',difficulty:100},()=>20).critical,'reaction_success');
  assert.equal(gmAttackDamage(gmD20Roll({kind:'attack',difficulty:30},()=>1),'2d6',()=>{throw new Error('must not roll');}),null);
});
test('GM advantage/disadvantage selection and dice bounds reject fabricated faces and invalid inputs',()=>{
  const a=stream([3,17],[20,20]);assert.equal(gmD20Roll({advantage:true,difficulty:15},a.rng).selected,17);
  const b=stream([3,17],[20,20]);assert.equal(gmD20Roll({disadvantage:true,difficulty:15},b.rng).selected,3);
  assert.deepEqual(diceSpec('2d6-2'),{count:2,sides:6,mod:-2});assert.equal(parseDice('2d6-2',()=>3).total,4);
  for(const expr of ['0d6','51d6','2d1001','roll now'])assert.throws(()=>diceSpec(expr));
  assert.throws(()=>dualityRoll({},()=>13),/out of range/);assert.throws(()=>gmD20Roll({difficulty:1},()=>21),/out of range/);
  assert.throws(()=>gmD20Roll({difficulty:1,advantage:true,disadvantage:true}));
});
