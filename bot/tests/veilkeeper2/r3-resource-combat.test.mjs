import test from 'node:test';
import assert from 'node:assert/strict';
import {hopeCap,pcEffectResource} from '../../src/v2/rules/pc-resources.js';
import {hpMarksForDamage,adversaryHpState,wouldMarkLastAdversaryHp} from '../../src/v2/rules/combat.js';
test('Hope spending respects permanent cap, insufficient cost and invalid native deltas',()=>{
  const data={resources:{hope:3,hope_max:4}};assert.equal(hopeCap(data),4);assert.deepEqual(pcEffectResource(data,'hope',-2),{before:3,max:4,after:1});
  assert.throws(()=>pcEffectResource(data,'hope',-4));assert.throws(()=>pcEffectResource(data,'hope',2));for(const delta of [NaN,Infinity,0.5])assert.throws(()=>pcEffectResource(data,'hope',delta));assert.throws(()=>pcEffectResource(data,'gold',1));assert.equal(data.resources.hope,3);
});
test('marked-slot pool arithmetic preserves clamping and rejects invalid stored state',()=>{
  const data={resources:{hp:{current:2,max:6},stress:{current:1,max:5},armor:{current:0,max:3}}};
  assert.deepEqual(pcEffectResource(data,'hp',-4),{before:2,max:6,after:0});assert.deepEqual(pcEffectResource(data,'stress',2),{before:1,max:5,after:3});assert.throws(()=>pcEffectResource(data,'armor',4));data.resources.hp.current=7;assert.throws(()=>pcEffectResource(data,'hp',-1));
});
test('damage threshold equality and minion marks retain deterministic legacy boundaries',()=>{
  const c={role:'Standard',major_threshold:8,severe_threshold:15};assert.deepEqual([0,1,7,8,14,15,30].map(n=>hpMarksForDamage(c,n)),[0,1,1,2,2,3,3]);assert.equal(hpMarksForDamage({...c,role:'Minion'},30),1);
});
test('adversary remaining HP stays distinct from marked PC slots',()=>{
  assert.deepEqual(adversaryHpState({hp_current:2,hp_max:5}),{remaining:2,max:5,marked:3,marked_half_or_more:true});assert.equal(wouldMarkLastAdversaryHp({hp_current:2,hp_max:5},2),true);assert.equal(wouldMarkLastAdversaryHp({hp_current:0,hp_max:5},1),false);assert.throws(()=>adversaryHpState({hp_current:6,hp_max:5}));
});
