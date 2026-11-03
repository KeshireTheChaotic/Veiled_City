import test from 'node:test';
import assert from 'node:assert/strict';
import {incomingDamageOutcome} from '../../src/v2/rules/incoming-damage.js';
const input={damage:8,major:8,severe:16,hp:{current:0,max:6},armorSlots:{current:0,max:3},defenses:{resistance:'none',armorReduction:1,armorAllowed:true},useArmor:false};
test('PC damage boundaries, resistance rounding and both reviewed Armor reductions preserve marked-resource semantics',()=>{
  const cases=[
    [0,'none',false,1,0,0,0],[1,'none',false,1,1,1,1],[7,'none',false,1,7,1,1],
    [8,'none',false,1,8,2,2],[15,'none',false,1,15,2,2],[16,'none',false,1,16,3,3],
    [15,'half',false,1,8,2,2],[16,'half',false,1,8,2,2],[31,'half',false,1,16,3,3],
    [99,'immune',false,1,0,0,0],[8,'none',true,1,8,2,1],[16,'none',true,1,16,3,2],
    [8,'none',true,2,8,2,0],[16,'none',true,2,16,3,1],[1,'none',true,1,1,1,0]
  ];
  for(const [damage,resistance,useArmor,armorReduction,after,base,marks] of cases){
    const value={...input,damage,useArmor,defenses:{...input.defenses,resistance,armorReduction}},snapshot=structuredClone(value),result=incomingDamageOutcome(value);
    assert.equal(result.damageAfterResistance,after);assert.equal(result.baseMarks,base);assert.equal(result.hpMarks,marks);assert.equal(result.hp.current,marks);assert.equal(result.armorSlots.current,useArmor?1:0);assert.equal(result.effectsCommitted,false);assert.equal(result.deathChoiceRequired,false);assert.deepEqual(value,snapshot);
  }
});
test('HP saturation requests an owner death choice without choosing death, including Armor prevention at the boundary',()=>{
  const capped=incomingDamageOutcome({...input,damage:16,hp:{current:5,max:6}});assert.equal(capped.hpMarks,1);assert.equal(capped.hp.current,6);assert.equal(capped.deathChoiceRequired,true);
  const prevented=incomingDamageOutcome({...input,hp:{current:5,max:6},useArmor:true,defenses:{...input.defenses,armorReduction:2}});assert.equal(prevented.hpMarks,0);assert.equal(prevented.deathChoiceRequired,false);assert.equal(prevented.armorSlots.current,1);
});
test('missing native numeric terms, unavailable/inapplicable Armor and immune/zero damage cannot fabricate resource effects',()=>{
  for(const patch of [{damage:-1},{damage:NaN},{major:0},{severe:7},{hp:{current:7,max:6}},{hp:{current:0,max:13}},{armorSlots:{current:4,max:3}},{useArmor:'yes'},{defenses:{...input.defenses,armorReduction:3}}])assert.throws(()=>incomingDamageOutcome({...input,...patch}));
  assert.throws(()=>incomingDamageOutcome({...input,useArmor:true,armorSlots:{current:3,max:3}}),/Available applicable/);
  assert.throws(()=>incomingDamageOutcome({...input,useArmor:true,defenses:{...input.defenses,armorAllowed:false}}),/Available applicable/);
  for(const patch of [{damage:0},{defenses:{...input.defenses,resistance:'immune'}}])assert.throws(()=>incomingDamageOutcome({...input,...patch,useArmor:true}),/No positive damage/);
});
