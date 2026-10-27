import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPcDeathEligibility} from '../../src/frameworks/daggerheart/pc-death-eligibility.js';

function fail(message){throw Object.assign(new Error(message),{code:'PC_DEATH_MOVE',expected:true});}
const native=createPcDeathEligibility({fail});
const pc=(patch={})=>({id:'pc:aya',data:{resources:{hp:{current:5,max:5},stress:{current:2,max:6},hope:3,hope_max:5},level:3,
  inventory:[],domain_cards:[],features:[],transformations:[],...patch}});

test('final-HP eligibility preserves current HP, Stress, level and Hope bounds',()=>{
  assert.equal(native.assertFinalHp(pc()),undefined);
  for(const patch of [
    {resources:{hp:{current:4,max:5},stress:{current:2,max:6},hope:3,hope_max:5}},
    {resources:{hp:{current:5,max:5},stress:{current:7,max:6},hope:3,hope_max:5}},
    {resources:{hp:{current:5,max:5},stress:{current:2,max:6},hope:6,hope_max:5}},
    {level:11}
  ])assert.throws(()=>native.assertFinalHp(pc(patch)),e=>e.message.includes('Verified final HP'));
});

test('owned death-specific features hold mapped death dice without removing other owner choices',()=>{
  assert.throws(()=>native.assertDeathMapping(pc({inventory:["Won't Stay Dead"]}),'risk_it_all'),e=>e.code==='PC_DEATH_MOVE'
    &&e.message.includes('supported native mapping/review'));
  assert.equal(native.assertDeathMapping(pc({inventory:["Won't Stay Dead"]}),'avoid_death'),undefined);
  assert.throws(()=>native.assertDeathMapping(pc({features:[{name:'Unmapped death feature',death_move:'blaze'}]}),'blaze_of_glory'),
    e=>e.code==='PC_DEATH_MOVE');
  assert.equal(native.assertDeathMapping(pc({features:[{name:'Inactive feature',death_move:'blaze',active:false}]}),'risk_it_all'),undefined);
});

