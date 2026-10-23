import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPvpProfileTerms} from '../../src/frameworks/daggerheart/pvp-profile-terms.js';

function fail(message){throw Object.assign(new Error(message),{code:'NARRATIVE_PVP',expected:true});}
const owners=new Map([['pc:aya','user:aya'],['pc:bo','user:bo'],['pc:cy','user:cy']]);
let historicalReads=[];
const native=createPvpProfileTerms({fail});
const resolveOwner=(character,historical)=>{historicalReads.push([character,historical]);return {character,user:owners.get(character)};};
const valid={version:3,profile:'damage_enabled',objective:'Resolve the contested archive handoff.',
  participants:[{character:'pc:aya',team:null},{character:'pc:bo',team:null}],interaction_scope:'duel',
  target_permissions:[{actor:'pc:aya',target:'pc:bo',effect_class:'attack_damage',max_risk:'lethal'},
    {actor:'pc:bo',target:'pc:aya',effect_class:'attack_damage',max_risk:'lethal'}],
  stakes:[{character:'pc:aya',best:'Keep the archive',worst:'Lose the archive'},{character:'pc:bo',best:'Secure the archive',worst:'Retreat'}],
  boundaries:['no_forced_player_dialogue','no_private_information_disclosure','no_forced_player_control','no_involuntary_item_loss','no_authored_permanent_scar'],
  allow_damage:true,lethality:'lethal',last_hp_policy:'owner_selected_srd_death_move',critical_stress_policy:'disabled',
  hope_policy:'no_pvp_hope_generation',fear_policy:'immediate_contextual_fear',scoring_policy:'none',features:[],
  resource_spending:'owner_native_only',audience:'private',stop_policy:'neutral_withdrawal_preserve_committed_effects',expires_minute:10};
const validate=(input=valid,options={})=>native.checkTerms(input,{resolveOwner,currentMinute:()=>5,...options});

test('valid v3 damage profile retains owner, audience, target and boundary terms exactly',()=>{
  historicalReads=[];
  const source=structuredClone(valid),result=validate(source);
  assert.deepEqual(result,{...source,participants:source.participants,stakes:source.stakes,target_permissions:source.target_permissions,
    boundaries:valid.boundaries,features:[]});
  assert.deepEqual(historicalReads,[['pc:aya',false],['pc:bo',false]]);
  assert.deepEqual(source,valid);
});

test('duplicate PC owners and invalid target/agency/privacy terms remain held',()=>{
  owners.set('pc:bo','user:aya');
  assert.throws(()=>validate(),e=>e.code==='NARRATIVE_PVP'&&e.message.includes('distinct affected owners'));
  owners.set('pc:bo','user:bo');
  for(const patch of [
    {target_permissions:[{actor:'pc:aya',target:'pc:aya',effect_class:'attack_damage',max_risk:'lethal'}]},
    {boundaries:valid.boundaries.slice(1)},
    {audience:'gm'},
    {lethality:'nonlethal'},
    {features:['feature:x','feature:x']},
    {expires_minute:5}
  ])assert.throws(()=>validate({...valid,...patch}),e=>e.code==='NARRATIVE_PVP');
});

test('historical term validation uses historical owner evidence and does not read the current clock',()=>{
  historicalReads=[];
  const result=validate({...valid,expires_minute:1},{historical:true,currentMinute:()=>{throw new Error('historical clock must not be read');}});
  assert.equal(result.expires_minute,1);
  assert.deepEqual(historicalReads,[['pc:aya',true],['pc:bo',true]]);
});

test('current PvP profile provider supplies owner and clock ports to Daggerheart',()=>{
  const provider=fs.readFileSync(new URL('../../src/pvp-profiles.js',import.meta.url),'utf8');
  assert.match(provider,/createPvpProfileTerms\(\{fail\}\)/);
  assert.match(provider,/resolveOwner:\(character,isHistorical\)=>controlledOwner/);
  assert.match(provider,/currentMinute:\(\)=>db\.getSimulationClock/);
});
