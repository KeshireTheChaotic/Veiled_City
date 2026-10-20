/** W2 authoring fixtures only: real human mapping and native owner execution; no provider calls. Unrun. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup} from './narrative-fixtures.mjs';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {createArbitrationOrigin,buildSceneIntentBoard} from '../src/scene-intent-board.js';
import {adjudicateSceneBoard} from '../src/gm-unified-arbitration.js';
import {EncounterLibrary} from '../src/encounter.js';
import {buildCombatants} from '../src/combat.js';
import {currentScene,recordScenePresence} from '../src/scene-continuity.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {adjudicateRollSource,contributeRoll} from '../src/roll-collaboration.js';
import {rollRevision,queueRollAmendment,publishRollAmendment} from '../src/roll-requests.js';
import {typedRollProof} from '../src/typed-roll-proof.js';
import {nativeGmNotice} from '../src/gm-arbitration-output.js';

function fixture(f,{privateScene=false,approval=true,ambiguous=false,equipped=true,duplicate=false,wrongTarget=false,
  targetKey='guard',beyondZone=false}={}){
  const x=setup(f,{text:'I attack the guard with my fixture blade.',privateScene}),scene=currentScene(f.db,f.guild);
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,roll_requests:true,
    roll_collaboration:true,narrative_encounters:true}});
  const weapon={id:'fixture-blade',name:'Fixture blade',equipped,category:'weapon'};
  f.db.updateCharacterData(x.pc.id,d=>{d.inventory=[...(d.inventory||[]),weapon,...(duplicate?[{...weapon,id:'second-blade'}]:[])];});
  f.db.upsertNpcProfile(f.guild,{npcKey:'guard',displayName:'Guard'});
  f.db.setSimulationEntity(f.guild,'npc','guard',{name:'Guard',location_key:'terminal',visibility:'party'});
  const source=indexWorldEvent(f.db,f.guild,{key:'equipped-guard-source',kind:'observation',source_id:'gm',title:'Guard is present',
    session_id:f.session.id,scene:scene.key,location_key:'terminal',visibility:'party'},'fixture-gm');
  recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:'guard',source_event:source.event_key,location_key:'terminal',
    zone:beyondZone?'exterior':'interior',range:beyondZone?'Far':'Melee',visibility:'party',accepted_by:'fixture-gm'},'fixture-gm');
  const library=new EncounterLibrary('../content'),encounter=f.db.createEncounter(f.guild,f.session.id,{status:'active',tier:1,
    pc_count:4,base_bp:14,budget_bp:14,composition:[{name:'Aster Vale Contractor',quantity:1}]}),
    [combatant]=f.db.initializeCombatants(encounter.id,buildCombatants(encounter,library));
  f.db.saveCityRecord(f.guild,{kind:'encounter_binding',key:encounter.id,source_event:source.event_key,
    data:{combatants:[{actor:'guard',id:combatant.id}]}});
  f.db.upsertRulesRuling(f.guild,{key:'fixture-equipped-blade',ruling:'Exact owned equipped Fixture blade; Finesse attack; 1d8 physical against the reviewed guard target.',createdBy:'fixture-gm'});
  const approve=key=>adjudicateRollSource(f.db,f.guild,{key,character_id:x.pc.id,kind:'attack',ruling_key:'fixture-equipped-blade',
    data:{trait:'Finesse',active:true,weapon:'Fixture blade',damage:'1d8',damage_type:'physical',
      target_id:wrongTarget?'another-combatant':combatant.id}},'fixture-gm');
  const humanSource=approval?approve('equipped-human-approval'):null;
  if(ambiguous)approve('equipped-second-human-approval');
  const intent=persistPlayerIntents(f.db,f.guild,[{type:'interact',source_span:x.text,target_name:targetKey==='guard'?'guard':'other player',
    target_key:targetKey,destination:'unspecified',operation:'weapon_attack',utterance:'',excluded_targets:[],framing:'immediate',
    resolution:'auto',reason:'Attempt the explicitly declared equipped weapon strike; no result assumed.'}],x.scope,{messageId:x.messageId})[0];
  const origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),board=buildSceneIntentBoard(f.db,f.guild,origin,[intent],[]);
  return {...x,intent,origin,board,library,combatant,encounter,humanSource,weapon};
}
function prepare(f,x,patch={}){
  return adjudicateSceneBoard(f.db,f.guild,x.origin,x.board,[{intent_ref:x.board.data.entries[0].intent_ref,
    disposition:'request_pc_action_roll',rule_basis_refs:['srd:attack-rolls'],difficulty:null,trait:'Finesse',stakes_kind:'native_attack',
    stakes:'Only the declared existing target may take approved weapon damage after owner dice.',reason:'Existing exact human-approved equipped mapping.',
    difficulty_reason:'Use the current native NPC combatant Difficulty.',feature_ref:'equipped_attack',experience_ref:'',
    advantage:false,disadvantage:false,...patch}],{library:x.library})[0];
}
function request(f,x){const saved=prepare(f,x);assert.equal(saved.status,'pending_pc_roll',saved.data.reason);
  return {saved,q:f.db.getCityRecord(f.guild,'roll_request',saved.data.native.roll_request_ref)};}
function resolve(f,x,q){
  let faces=0;const rolled=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',key:'equipped-owner-roll',request:q.record_key,
    expected_revision:rollRevision(q)},{rng:()=>[12,11][faces++]});
  assert.equal(faces,2);assert.equal(rolled.status,'awaiting_damage');
  let damageFaces=0;const damaged=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'damage',key:'equipped-owner-damage',request:q.record_key,
    expected_revision:rollRevision(rolled)},{rng:()=>{damageFaces++;return 8;}});
  assert.equal(damageFaces,1);assert.equal(damaged.status,'resolved');return {rolled,damaged};
}
function noRolls(f){assert.equal(f.db.db.prepare('SELECT COUNT(*) AS n FROM rolls WHERE guild_id=?').get(f.guild).n,0);}
const currentTarget=(f,x)=>f.db.listCombatants(x.encounter.id).find(c=>c.id===x.combatant.id);

test('W2 equipped preparation is private and seals the existing human source without spending or damage',()=>nativeFixture(f=>{
  const x=fixture(f),before=f.db.getCharacter(x.pc.id).data,{q}=request(f,x);
  assert.equal(q.status,'pending');assert.equal(q.visibility,'character');assert.equal(q.subject_key,x.pc.id);
  assert.equal(q.data.owner_user_id,x.pc.owner_user_id);assert.equal(q.data.input.private_result,true);
  assert.equal(q.data.input.attack_source,x.humanSource.event_key);assert(q.data.input.native_equipped_ref);
  assert.equal(f.db.getWorldEvent(f.guild,x.humanSource.event_key).details.reviewed_by,'fixture-gm');
  assert.equal(f.db.getWorldEvent(f.guild,q.data.input.native_equipped_ref).kind,'native_equipped_attack');
  assert.deepEqual(q.data.breakdown.attack,{weapon:'Fixture blade',damage:'1d8',damage_type:'physical',target_id:x.combatant.id,
    encounter_id:x.encounter.id,difficulty:x.combatant.difficulty});
  assert.deepEqual(f.db.getCharacter(x.pc.id).data,before);assert.equal(currentTarget(f,x).hp_current,x.combatant.hp_current);noRolls(f);
}));

test('W2 equipped owner roll/damage saves native outcomes and survives restart without repeated dice',()=>nativeFixture(f=>{
  const x=fixture(f),{q}=request(f,x),{rolled,damaged}=resolve(f,x,q),proof=typedRollProof(f.db,f.guild,damaged);
  assert.equal(proof.outcome,'success');assert.equal(damaged.data.damage_result.target_id,x.combatant.id);
  const hp=currentTarget(f,x).hp_current;assert(hp<x.combatant.hp_current);
  const savedDice=f.db.getSavedRoll(f.guild,damaged.data.roll_id);assert.equal(savedDice.character_id,x.pc.id);
  assert.equal(savedDice.discord_user_id,x.pc.owner_user_id);f.restart();
  assert.deepEqual(typedRollProof(f.db,f.guild,f.db.getCityRecord(f.guild,'roll_request',q.record_key)),proof);
  let calls=0;contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'damage',key:'equipped-owner-damage',request:q.record_key,
    expected_revision:rollRevision(rolled)},{rng:()=>{calls++;return 1;}});
  assert.equal(calls,0);assert.equal(currentTarget(f,x).hp_current,hp);
}));

for(const [name,options,patch] of [['no existing approval',{approval:false}],['ambiguous human mappings',{ambiguous:true}],
  ['unequipped item',{equipped:false}],['ambiguous equipped identities',{duplicate:true}],['wrong exact target',{wrongTarget:true}],
  ['beyond-zone target',{beyondZone:true}],['PC target',{pcTarget:true}],['unapproved trait',{}, {trait:'Strength'}]])
  test(`W2 equipped ${name} stays held without inferred acquisition or dice`,()=>nativeFixture(f=>{
    const x=fixture(f,{...options,...(options.pcTarget?{targetKey:f.pcs[1].id}:{})}),before=f.db.getCharacter(x.pc.id).data;
    let saved=null,error=null;try{saved=prepare(f,x,patch);}catch(cause){error=cause;}
    assert(error||saved?.status==='needs_rules_review',`${name} unexpectedly prepared ${saved?.status}`);
    assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true}).length,0);
    assert.deepEqual(f.db.getCharacter(x.pc.id).data,before);noRolls(f);
  }));

for(const change of ['item','source','owner','rule'])test(`W2 equipped ${change} changes before RNG preserve all owner dice and costs`,()=>nativeFixture(f=>{
  const x=fixture(f),{q}=request(f,x);
  if(change==='item')f.db.updateCharacterData(x.pc.id,d=>{d.inventory.find(i=>i.id==='fixture-blade').equipped=false;});
  if(change==='source')indexWorldEvent(f.db,f.guild,{key:x.humanSource.event_key,status:'retracted'},'fixture-gm');
  if(change==='owner')f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[1].owner_user_id,x.pc.id);
  if(change==='rule')f.db.upsertRulesRuling(f.guild,{key:'fixture-equipped-blade',ruling:'Changed damage requires new reviewed terms.',createdBy:'fixture-gm'});
  const before=f.db.getCharacter(x.pc.id).data;let calls=0;
  assert.throws(()=>contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',key:'equipped-stale-roll',request:q.record_key,
    expected_revision:rollRevision(q)},{rng:()=>{calls++;return 12;}}));
  assert.equal(calls,0);assert.deepEqual(f.db.getCharacter(x.pc.id).data,before);noRolls(f);
}));

test('W2 historical equipped result survives lawful later gear loss without rewriting committed damage',()=>nativeFixture(f=>{
  const x=fixture(f),{q}=request(f,x),{damaged}=resolve(f,x,q),proof=typedRollProof(f.db,f.guild,damaged),hp=currentTarget(f,x).hp_current;
  // Simulate a later authoritative inventory state; this is not an acquisition/transfer adapter.
  f.db.updateCharacterData(x.pc.id,d=>{d.inventory=d.inventory.filter(i=>i.id!=='fixture-blade');});f.restart();
  const saved=f.db.getCityRecord(f.guild,'roll_request',q.record_key);
  assert.deepEqual(typedRollProof(f.db,f.guild,saved),proof);assert.equal(currentTarget(f,x).hp_current,hp);
}));

test('W2 revoked human mapping holds saved equipped readback while preserving native rolls and damage',()=>nativeFixture(f=>{
  const x=fixture(f),{q}=request(f,x),{damaged}=resolve(f,x,q),hp=currentTarget(f,x).hp_current;
  indexWorldEvent(f.db,f.guild,{key:x.humanSource.event_key,status:'retracted'},'fixture-gm');f.restart();
  assert.throws(()=>typedRollProof(f.db,f.guild,f.db.getCityRecord(f.guild,'roll_request',q.record_key)));
  assert(f.db.getSavedRoll(f.guild,damaged.data.roll_id));assert.equal(currentTarget(f,x).hp_current,hp);
}));

test('W2 private equipped declaration publishes only to its owner and never grants party disclosure',()=>nativeFixture(async f=>{
  const x=fixture(f,{privateScene:true}),{saved,q}=request(f,x),scope={...x.scope,mode:'private'};
  assert(nativeGmNotice(f.db,f.guild,saved.record_key,scope).text.length);
  assert.throws(()=>nativeGmNotice(f.db,f.guild,saved.record_key,{...scope,mode:'party'}));
  assert.throws(()=>nativeGmNotice(f.db,f.guild,saved.record_key,{mode:'private',actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id}));
  queueRollAmendment(f.db,f.guild,q);f.restart();const sent=[];
  await publishRollAmendment(f.db,f.guild,q,(user,text,session,character)=>{
    sent.push({user,text,character});return {messageId:'equipped-private-notice',channelId:'offline-owner-dm'};
  });
  assert.equal(sent.length,1);assert.equal(sent[0].user,x.pc.owner_user_id);assert.equal(sent[0].character,x.pc.id);
  assert(sent[0].text.includes(x.text));assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_party_publication',includeGM:true}).length,0);
}));

test('W2 stale deferred equipped notice fails before delivery and source withdrawal grants no disclosure',()=>nativeFixture(async f=>{
  const x=fixture(f,{privateScene:true}),{saved,q}=request(f,x);queueRollAmendment(f.db,f.guild,q);
  indexWorldEvent(f.db,f.guild,{key:x.humanSource.event_key,status:'retracted'},'fixture-gm');f.restart();
  assert.throws(()=>nativeGmNotice(f.db,f.guild,saved.record_key,x.scope));let sent=0;
  await assert.rejects(()=>publishRollAmendment(f.db,f.guild,q,()=>{sent++;return {messageId:'forbidden'};}));
  assert.equal(sent,0);noRolls(f);
}));
