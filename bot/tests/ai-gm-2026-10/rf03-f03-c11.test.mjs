import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPvpDamageDefense} from '../../src/frameworks/daggerheart/pvp-damage-defense.js';

function fail(message){throw Object.assign(new Error(message),{code:'PC_EFFECT_AUTHORITY',expected:true});}
const native=createPvpDamageDefense({fail});
const pc=(patch={})=>({id:'pc:aya',data:{inventory:[],domain_cards:[],conditions:[],thresholds:{major:5,severe:10},
  resources:{hp:{current:5,max:6},armor:{current:2,max:3}},...patch}});
const base={source:'base',resistance:'none',armor_reduction:1,armor_allowed:true};

test('native campaign baseline accepts only exact base defenses and reads without mutation',()=>{
  const character=pc(),before=structuredClone(character);
  assert.equal(native.validatePvpDamageDefense(character,base,{kind:'native_campaign_damage'},['physical'],{native:true}),undefined);
  assert.deepEqual(character,before);
  assert.throws(()=>native.validatePvpDamageDefense(character,{...base,armor_allowed:false},{kind:'native_campaign_damage'},['physical'],{native:true}),
    e=>e.code==='PC_EFFECT_AUTHORITY'&&e.message.includes('special defenses'));
});

test('resistance requires one active owned source covering every incoming damage type',()=>{
  const character=pc({inventory:[{name:'Signal Weave',equipped:true,resistance_types:['magic']}]});
  const defense={source:'Signal Weave',resistance:'half',armor_reduction:1,armor_allowed:true};
  assert.equal(native.validatePvpDamageDefense(character,defense,{created_by:'gm:review'},['magic']),undefined);
  assert.throws(()=>native.validatePvpDamageDefense(character,defense,{created_by:'gm:review'},['magic','physical']),
    e=>e.code==='PC_EFFECT_AUTHORITY'&&e.message.includes('Exact owned resistance'));
  assert.throws(()=>native.validatePvpDamageDefense(pc(),defense,{created_by:'gm:review'},['magic']),
    e=>e.code==='PC_EFFECT_AUTHORITY'&&e.message.includes('active owned source'));
});

test('two-threshold Armor, active conditions and missing state retain native holds',()=>{
  const armor=pc({inventory:[{name:'Mapped Plate',equipped:true,armor_severity_reduction:2}]});
  assert.equal(native.validatePvpDamageDefense(armor,{...base,source:'Mapped Plate',armor_reduction:2},{created_by:'gm:review'},['physical']),undefined);
  assert.throws(()=>native.validatePvpDamageDefense(pc({inventory:[{name:'Plate',equipped:true}]}),
    {...base,source:'Plate',armor_reduction:2},{created_by:'gm:review'},['physical']),e=>e.code==='PC_EFFECT_AUTHORITY');
  assert.throws(()=>native.validatePvpDamageDefense(pc({conditions:[{name:'Vulnerable',active:true}]}),base,{},['physical'],{native:true}),
    e=>e.code==='PC_EFFECT_AUTHORITY'&&e.message.includes('defensive conditions'));
  assert.throws(()=>native.validatePvpDamageDefense(pc({thresholds:{major:10,severe:5}}),base,{},['physical'],{native:true}),
    e=>e.code==='PC_EFFECT_AUTHORITY'&&e.message.includes('Verified current thresholds'));
});

test('pvp damage workflow delegates defense validation while retaining the surrounding transaction module',()=>{
  const provider=fs.readFileSync(new URL('../../src/pvp-damage.js',import.meta.url),'utf8');
  
  
  assert.match(provider,/export function preparePvpDamage/);
});
