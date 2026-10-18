import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup} from './narrative-fixtures.mjs';
import {adjudicateRollSource,contributeRoll} from '../src/roll-collaboration.js';
import {rollRevision,prepareRollRequest,rollBreakdown} from '../src/roll-requests.js';
import {reconcileNativeFormationBreakdown} from '../src/native-defense-aura.js';
import {typedRollProof} from '../src/typed-roll-proof.js';
import {prepareIncomingAttack,reviewIncomingAttack,confirmIncomingDefense} from '../src/pc-incoming.js';
import {EncounterLibrary} from '../src/encounter.js';
import {buildCombatants} from '../src/combat.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {currentScene,recordScenePresence} from '../src/scene-continuity.js';

function npc(f,key='guard',location='terminal'){
  f.db.upsertNpcProfile(f.guild,{npcKey:key,displayName:'Inez',role:'attendant',publicIdentity:'A local attendant.'});
  f.db.setSimulationEntity(f.guild,'npc',key,{name:'Inez',location_key:location,visibility:'party'});
}
function incoming(f,{template,privateScene=false}={}){
  const x=setup(f,{privateScene,text:'I strike the guard.'}),library=new EncounterLibrary('../content'),scene=currentScene(f.db,f.guild);npc(f);
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_encounters:true}});
  f.db.updateCharacterData(x.pc.id,d=>{d.evasion=12;d.thresholds={major:7,severe:14};});
  const source=indexWorldEvent(f.db,f.guild,{key:'veil-guard-source',kind:'observation',source_id:'gm',title:'Native guard encounter',session_id:f.session.id,scene:scene.key,location_key:'terminal',visibility:'party'},'gm');
  recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:'guard',source_event:source.event_key,location_key:'terminal',zone:'interior',range:'Close',visibility:'party',accepted_by:'gm'},'gm');
  const encounter=f.db.createEncounter(f.guild,f.session.id,{status:'active',tier:1,pc_count:4,base_bp:14,budget_bp:14,composition:[{name:template,quantity:1}]}),
    [combatant]=f.db.initializeCombatants(encounter.id,buildCombatants(encounter,library));
  f.db.saveCityRecord(f.guild,{kind:'encounter_binding',key:encounter.id,source_event:source.event_key,data:{combatants:[{actor:'guard',id:combatant.id}]}});
  f.db.upsertRulesRuling(f.guild,{key:'veil-standard',ruling:'Current standard attack; no unreviewed feature or extra spotlight.',createdBy:'gm'});
  const row=prepareIncomingAttack(f.db,f.guild,'gm',{npc:'guard',combatant:combatant.id,character:x.pc.id,source:source.event_key,ruling:'veil-standard',
    defenses:{resistance:'none',armor_reduction:1,armor_allowed:true,source:'base'}},{gm:true,interactionId:'veil-attack',library});
  reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,row.record_key,{library});confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,row.record_key);
  return {...x,library,row};
}
function strike(f,x,key,{beforeRoll=()=>{},afterRoll=()=>{},afterDamage=()=>{},rollRng=[11,12]}={}){
  const target=f.db.listCombatants(f.db.getCurrentEncounter(f.session.id).id)[0];
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,roll_requests:true,roll_collaboration:true}});
  f.db.updateCharacterData(x.pc.id,d=>{d.inventory.push({name:'Fixture blade',equipped:true});});
  const accepted=f.accepted(0,'I strike the guard.',null,{type:'interact',operation:'attack',target:{kind:'npc',key:'guard',phrase:'guard',grounding:'known'}});
  f.db.upsertRulesRuling(f.guild,{key:'veil-blade',ruling:'Exact owned equipped fixture blade attack damage 1d100 physical.',createdBy:'gm'});
  const attack=adjudicateRollSource(f.db,f.guild,{key:`veil-blade-${key}`,character_id:x.pc.id,kind:'attack',ruling_key:'veil-blade',
      data:{trait:'Finesse',active:true,weapon:'Fixture blade',damage:'1d100',damage_type:'physical',target_id:target.id}},'gm'),
    request=prepareRollRequest(f.db,f.guild,{source_event:accepted.source_event,accepted_intent:accepted.record_key,character_id:x.pc.id,trait:'Finesse',kind:'attack',
      attack_source:attack.event_key,modifier_keys:[],difficulty_source:'',adjudication:'Exact actual native fixture attack.'},'gm',{scope:x.scope});
  beforeRoll(request);
  let face=0;const rolled=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',key:`veil-roll-${key}`,request:request.record_key,expected_revision:rollRevision(request)},
    {rng:()=>Array.isArray(rollRng)?rollRng[face++]:rollRng()});
  afterRoll(rolled);
  if(rolled.status==='resolved')return rolled;
  const damageInput={op:'damage',key:`veil-damage-${key}`,request:request.record_key,expected_revision:rollRevision(rolled)},resolved=contributeRoll(f.db,f.guild,x.pc.owner_user_id,damageInput,{rng:()=>1});
  afterDamage(resolved,damageInput);return resolved;
}

const bands=[
  ['Veil Anchor Sentinel',0,19,'adversary:veil-anchor-sentinel:plausible-denial'],
  ['Veil Anchor Sentinel',2,19,'adversary:veil-anchor-sentinel:plausible-denial'],
  ['Veil Anchor Sentinel',3,18,'adversary:veil-anchor-sentinel:plausible-denial'],
  ['Veil Engine Custodian',0,23,'adversary:veil-engine-custodian:consensus-pressure'],
  ['Veil Engine Custodian',2,23,'adversary:veil-engine-custodian:consensus-pressure'],
  ['Veil Engine Custodian',4,21,'adversary:veil-engine-custodian:consensus-pressure'],
  ['Veil Engine Custodian',5,20,'adversary:veil-engine-custodian:consensus-pressure'],
  ['Veil Engine Custodian',6,20,'adversary:veil-engine-custodian:consensus-pressure']
];
for(const [template,exposure,difficulty,feature] of bands)test(`Veil passive prepared Difficulty: ${template}, Exposure ${exposure}`,async()=>nativeFixture(f=>{
  if(exposure)f.db.changeVeilExposure(f.guild,exposure);
  const x=incoming(f,{template});let prepared=0;const request=strike(f,x,`${template}-${exposure}`,{beforeRoll:row=>{prepared++;
    assert.equal(row.data.breakdown.attack.difficulty,difficulty);
    const ref=row.data.breakdown.attack.defense_passive;
    assert(ref);const proof=f.db.getCityRecord(f.guild,'npc_defense_passive_proof',ref.ref);
    assert.equal(proof.visibility,'gm');assert.equal(proof.data.feature,feature);assert.equal(proof.data.exposure,exposure);
    assert.equal(proof.data.bonus,difficulty-(template==='Veil Anchor Sentinel'?18:21));
  }});
  assert.equal(prepared,1,'preparation assertions must run against the real pending owner roll');
  assert.equal(request.data.breakdown.attack.difficulty,difficulty);
}));

for(const [template,exposure,nextExposure] of [['Veil Anchor Sentinel',2,3],['Veil Anchor Sentinel',3,0],['Veil Engine Custodian',0,5]])test(`Veil passive stale Exposure blocks dice: ${template} ${exposure}→${nextExposure}`,async()=>nativeFixture(f=>{
  f.db.changeVeilExposure(f.guild,exposure);const x=incoming(f,{template});let dice=0;
  assert.throws(()=>strike(f,x,`stale-${template}-${exposure}`,{beforeRoll:row=>{f.db.changeVeilExposure(f.guild,nextExposure-exposure);assert(row.data.breakdown.attack.defense_passive);},rollRng:()=>{dice++;return 12;}}));
  assert.equal(dice,0);assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true})[0].status,'pending');
}));

test('Veil passive saved odds survive legitimate Exposure change and proof tampering holds replay',async()=>nativeFixture(f=>{
  f.db.changeVeilExposure(f.guild,2);const x=incoming(f,{template:'Veil Anchor Sentinel'}),request=strike(f,x,'history',()=>{});
  assert.equal(request.data.breakdown.attack.difficulty,19);f.db.changeVeilExposure(f.guild,3);f.restart();
  assert.equal(typedRollProof(f.db,f.guild,request).outcome,'success');
  const proof=f.db.getCityRecord(f.guild,'npc_defense_passive_proof',request.data.breakdown.attack.defense_passive.ref);
  f.db.saveCityRecord(f.guild,{...proof,key:proof.record_key,data:{...proof.data,exposure:1}});f.restart();
  assert.throws(()=>typedRollProof(f.db,f.guild,request));
}));

for(const [exposure,difficulty,outcome] of [[2,19,'failure'],[3,18,'success']])test(`Veil passive changes actual owner result at Difficulty ${difficulty}`,async()=>nativeFixture(f=>{
  f.db.changeVeilExposure(f.guild,exposure);const x=incoming(f,{template:'Veil Anchor Sentinel'});let face=0;
  const request=strike(f,x,`result-${exposure}`,{rollRng:()=>[8,7][face++]});
  assert.equal(request.data.breakdown.attack.difficulty,difficulty);assert.equal(request.data.result.total,18);
  assert.equal(typedRollProof(f.db,f.guild,request).outcome,outcome);
}));

for(const [from,to,difficulty] of [[2,3,19],[3,0,18]])test(`saved owner odds and damage survive Veil Exposure change ${from}→${to}`,async()=>nativeFixture(f=>{
  f.db.changeVeilExposure(f.guild,from);const x=incoming(f,{template:'Veil Anchor Sentinel'}),resources=structuredClone(f.db.getCharacter(x.pc.id).data.resources),
    target=f.db.listCombatants(f.db.getCurrentEncounter(f.session.id).id)[0];let repeated;
  const request=strike(f,x,`transition-${from}-${to}`,{afterRoll:rolled=>{
    assert.equal(rolled.status,'awaiting_damage');assert.equal(rolled.data.breakdown.attack.difficulty,difficulty);f.db.changeVeilExposure(f.guild,to);
  },afterDamage:(resolved,input)=>{
    const before=f.db.listCombatants(f.db.getCurrentEncounter(f.session.id).id);repeated=contributeRoll(f.db,f.guild,x.pc.owner_user_id,input,{rng:()=>assert.fail('duplicate damage replay must not roll')});
    assert.equal(repeated.data.roll_id,resolved.data.roll_id);assert.deepEqual(f.db.listCombatants(f.db.getCurrentEncounter(f.session.id).id),before);
  }});
  assert.equal(request.data.breakdown.attack.difficulty,difficulty);assert.equal(request.data.damage_result.before,target.hp_current);
  assert.equal(request.data.damage_result.after,target.hp_current-1);assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,resources);
  assert.equal(typedRollProof(f.db,f.guild,request).outcome,'success');assert.deepEqual(repeated.data.damage_result,request.data.damage_result);
}));

test('Veil passive rejects changed owner or scene ancestry and unsupported tagged collaboration',async()=>nativeFixture(f=>{
  f.db.changeVeilExposure(f.guild,2);const x=incoming(f,{template:'Veil Anchor Sentinel'}),request=strike(f,x,'scope-negative');
  assert.throws(()=>typedRollProof(f.db,f.guild,{...request,data:{...request.data,owner_user_id:'foreign-owner'}}));
  assert.throws(()=>typedRollProof(f.db,f.guild,{...request,data:{...request.data,scene:'foreign-scene'}}));
  const tagged={...request,data:{...request.data,tag:{participants:[]}}},pc=f.db.getCharacter(request.subject_key),actual=rollBreakdown(f.db,f.guild,request.data.input,pc);
  assert.throws(()=>reconcileNativeFormationBreakdown(f.db,f.guild,tagged,actual),error=>error.code==='GM_ARBITRATION');
  const forged={...request,data:{...request.data,breakdown:{...request.data.breakdown,attack:{...request.data.breakdown.attack,defense_aura:{ref:'forged'}}}}};
  assert.throws(()=>typedRollProof(f.db,f.guild,forged));
}));

test('retracted Veil passive proof cannot certify a saved attack after restart',async()=>nativeFixture(f=>{
  f.db.changeVeilExposure(f.guild,5);const x=incoming(f,{template:'Veil Engine Custodian'}),request=strike(f,x,'retracted-proof');
  const proof=f.db.getCityRecord(f.guild,'npc_defense_passive_proof',request.data.breakdown.attack.defense_passive.ref);
  assert.equal(typedRollProof(f.db,f.guild,request).outcome,'success');
  indexWorldEvent(f.db,f.guild,{key:proof.source_event,status:'retracted'},'veil-proof-retracted');f.restart();
  assert.throws(()=>typedRollProof(f.db,f.guild,request));
}));

test('unbound Veil Anchor Sentinel receives no exposure defense by template name alone',async()=>nativeFixture(f=>{
  f.db.changeVeilExposure(f.guild,2);const x=incoming(f,{template:'Veil Anchor Sentinel'}),binding=f.db.getCityRecord(f.guild,'encounter_binding',f.db.getCurrentEncounter(f.session.id).id);
  f.db.saveCityRecord(f.guild,{...binding,key:binding.record_key,data:{combatants:[]}});
  const request=strike(f,x,'unbound');assert.equal(request.data.breakdown.attack.difficulty,18);assert.equal(request.data.breakdown.attack.defense_passive,undefined);
}));

for(const mutation of ['binding','template','location','control'])test(`Veil saved result remains readable but changed live target scope blocks continuation: ${mutation}`,async()=>nativeFixture(f=>{
  f.db.changeVeilExposure(f.guild,2);const x=incoming(f,{template:'Veil Anchor Sentinel'}),request=strike(f,x,`scope-${mutation}`),
    target=f.db.listCombatants(f.db.getCurrentEncounter(f.session.id).id)[0],binding=f.db.getCityRecord(f.guild,'encounter_binding',target.encounter_id);
  assert.doesNotThrow(()=>reconcileNativeFormationBreakdown(f.db,f.guild,request,rollBreakdown(f.db,f.guild,request.data.input,f.db.getCharacter(x.pc.id))));
  if(mutation==='binding')f.db.saveCityRecord(f.guild,{...binding,key:binding.record_key,data:{combatants:[]}});
  if(mutation==='template')f.db.db.prepare('UPDATE encounter_combatants SET base_name=? WHERE id=?').run('Choir Relay',target.id);
  if(mutation==='location')f.db.setSimulationEntity(f.guild,'npc','guard',{name:'Inez',location_key:'elsewhere',visibility:'party'});
  if(mutation==='control')f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:'guard',userId:f.pcs[1].owner_user_id,status:'active'});
  const actual=rollBreakdown(f.db,f.guild,request.data.input,f.db.getCharacter(x.pc.id));
  assert.throws(()=>reconcileNativeFormationBreakdown(f.db,f.guild,request,actual),error=>error.code==='GM_ARBITRATION');
  assert.equal(typedRollProof(f.db,f.guild,request).outcome,'success','historical saved odds remain readable after a later control/placement change');
}));
