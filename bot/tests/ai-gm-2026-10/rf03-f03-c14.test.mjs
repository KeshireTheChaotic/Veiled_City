import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPvpAttackTerms} from '../../src/frameworks/daggerheart/pvp-attack-terms.js';

function fail(message){throw Object.assign(new Error(message),{code:'NARRATIVE_PVP',expected:true});}
const bands=['Melee','Very Close','Close','Far','Very Far'];
const native=createPvpAttackTerms({fail,rangeBands:bands});
const pc=(patch={})=>({id:'pc:aya',data:{proficiency:3,inventory:[],...patch}});
const target=(evasion=12)=>({id:'pc:bo',data:{evasion}});

test('unarmed terms preserve current Proficiency, permitted traits and Melee range',()=>{
  assert.deepEqual(native.calculatePvpAttackTerms({kind:'unarmed',weapon:null,trait:'Strength'},pc(),target(),'Melee'),
    {range:'Melee',damage:'3d4',damage_type:'physical',evasion:12});
  assert.deepEqual(native.calculatePvpAttackTerms({kind:'unarmed',weapon:null,trait:'Finesse'},pc(),target(),'Melee'),
    {range:'Melee',damage:'3d4',damage_type:'physical',evasion:12});
});

test('one exact equipped weapon determines range, damage expression and damage type',()=>{
  const weapon={name:'Signal Blade',equipped:true,trait:'Finesse',range:'Close',damage_die:8,damage_modifier:2,damage_type:'magic'};
  assert.deepEqual(native.calculatePvpAttackTerms({kind:'weapon',weapon:'Signal Blade',trait:'Finesse'},pc({inventory:[weapon]}),target(15),'Close'),
    {range:'Close',damage:'3d8+2',damage_type:'magic',evasion:15});
});

test('unavailable attacks, duplicate or stale weapons, range and malformed stats remain held',()=>{
  const weapon={name:'Signal Blade',equipped:true,trait:'Finesse',range:'Close',damage_die:8,damage_modifier:0,damage_type:'physical'};
  const action={kind:'weapon',weapon:'Signal Blade',trait:'Finesse'};
  for(const [input,character,victim,actualRange] of [
    [{...action,kind:'spell'},pc(),target(),'Melee'],
    [action,pc({inventory:[weapon,{...weapon}]}),target(),'Melee'],
    [action,pc({inventory:[{...weapon,equipped:false}]}),target(),'Melee'],
    [action,pc({inventory:[{...weapon,trait:'Strength'}]}),target(),'Melee'],
    [action,pc({inventory:[weapon]}),target(),'Far'],
    [{kind:'unarmed',weapon:'Signal Blade',trait:'Strength'},pc(),target(),'Melee'],
    [{kind:'unarmed',weapon:null,trait:'Presence'},pc(),target(),'Melee'],
    [{kind:'unarmed',weapon:null,trait:'Strength'},pc({proficiency:0}),target(),'Melee'],
    [{kind:'unarmed',weapon:null,trait:'Strength'},pc(),target(0),'Melee']
  ])assert.throws(()=>native.calculatePvpAttackTerms(input,character,victim,actualRange),e=>e.code==='NARRATIVE_PVP');
});

test('existing PvP attack provider supplies source range bands to native terms logic',()=>{
  const provider=fs.readFileSync(new URL('../../src/pvp-attacks.js',import.meta.url),'utf8');
  assert.match(provider,/createPvpAttackTerms\(\{fail,rangeBands:RANGE_BANDS\}\)/);
  assert.match(provider,/calculatePvpAttackTerms\(input,pc,target,actualRange\)/);
});
