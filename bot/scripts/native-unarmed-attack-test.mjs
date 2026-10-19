/** Test-first UA14: native ordinary PC-to-NPC unarmed attack remains owner-rolled. */
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
import {contributeRoll} from '../src/roll-collaboration.js';
import {rollRevision} from '../src/roll-requests.js';
import {typedRollProof} from '../src/typed-roll-proof.js';

function fixture(f){
  const x=setup(f,{text:'I punch the guard.'}),scene=currentScene(f.db,f.guild),npc='guard';
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,roll_requests:true,roll_collaboration:true,
    narrative_encounters:true}});
  f.db.upsertNpcProfile(f.guild,{npcKey:npc,displayName:'Guard'});
  f.db.setSimulationEntity(f.guild,'npc',npc,{name:'Guard',location_key:'terminal',visibility:'party'});
  const source=indexWorldEvent(f.db,f.guild,{key:'unarmed-guard-source',kind:'observation',source_id:'gm',title:'Guard is present',
    session_id:f.session.id,scene:scene.key,location_key:'terminal',visibility:'party'},'gm');
  recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:npc,source_event:source.event_key,location_key:'terminal',zone:'interior',
    range:'Melee',visibility:'party',accepted_by:'gm'},'gm');
  const library=new EncounterLibrary('../content'),encounter=f.db.createEncounter(f.guild,f.session.id,{status:'active',tier:1,pc_count:4,
    base_bp:14,budget_bp:14,composition:[{name:'Aster Vale Contractor',quantity:1}]}),combatant=f.db.initializeCombatants(encounter.id,
      buildCombatants(encounter,library))[0];
  f.db.saveCityRecord(f.guild,{kind:'encounter_binding',key:encounter.id,source_event:source.event_key,
    data:{combatants:[{actor:npc,id:combatant.id}]}});
  const intent=persistPlayerIntents(f.db,f.guild,[{type:'interact',source_span:x.text,target_name:'guard',target_key:npc,
    destination:'unspecified',operation:'unarmed_attack',utterance:'',excluded_targets:[],framing:'immediate',resolution:'auto',
    reason:'Attempt an ordinary unarmed strike.'}],x.scope,{messageId:x.messageId})[0];
  const origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),board=buildSceneIntentBoard(f.db,f.guild,origin,[intent],[]);
  return {...x,intent,origin,board,library,combatant,encounter};
}

function prepare(f,x){
  const entry=x.board.data.entries[0],decision={intent_ref:entry.intent_ref,disposition:'request_pc_action_roll',
    rule_basis_refs:['srd:attack-rolls'],difficulty:null,trait:'Strength',stakes_kind:'native_attack',
    stakes:'The punch may miss; no damage or target change is assumed.',reason:'A source-backed ordinary unarmed attack.',
    difficulty_reason:'Use the active NPC combatant Difficulty.',feature_ref:'unarmed_attack',experience_ref:'',advantage:false,disadvantage:false};
  const [saved]=adjudicateSceneBoard(f.db,f.guild,x.origin,x.board,[decision],{library:x.library});
  return saved;
}

test('native unarmed attack prepares an owner-private NPC-target roll without resolving the attack',()=>nativeFixture(f=>{
  const x=fixture(f),saved=prepare(f,x);
  assert.equal(saved.status,'pending_pc_roll',saved.data.reason);
  const request=f.db.getCityRecord(f.guild,'roll_request',saved.data.native.roll_request_ref);
  assert.equal(request.status,'pending');
  assert.equal(request.subject_key,x.pc.id);
  assert.equal(request.data.owner_user_id,x.pc.owner_user_id);
  assert.deepEqual(request.data.breakdown.attack,{weapon:'unarmed',damage:`${x.pc.data.proficiency}d4`,damage_type:'physical',
    target_id:x.combatant.id,encounter_id:x.encounter.id,difficulty:x.combatant.difficulty});
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,2);
  assert.equal(f.db.listCombatants(x.encounter.id).find(c=>c.id===x.combatant.id).hp_current,x.combatant.hp_current);
}));

test('owner rolls and damages through native saved receipts; replay and restart preserve one result',()=>nativeFixture(f=>{
  const x=fixture(f),saved=prepare(f,x);assert.equal(saved.status,'pending_pc_roll',saved.data.reason);
  const q=f.db.getCityRecord(f.guild,'roll_request',saved.data.native.roll_request_ref);
  assert.equal(saved.status,'pending_pc_roll',saved.data.reason);
  let faces=0;const rolled=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',key:'unarmed-roll',request:q.record_key,
    expected_revision:rollRevision(q)},{rng:()=>[12,7][faces++]});
  assert.equal(faces,2);assert.equal(rolled.status,'awaiting_damage');
  assert.equal(rolled.data.owner_user_id,x.pc.owner_user_id);assert.equal(rolled.data.breakdown.attack.target_id,x.combatant.id);
  let damageFaces=0;const damaged=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'damage',key:'unarmed-damage',request:q.record_key,
    expected_revision:rollRevision(rolled)},{rng:()=>{damageFaces++;return 4;}});
  assert.equal(damageFaces,x.pc.data.proficiency);assert.equal(damaged.status,'resolved');
  assert.equal(damaged.data.damage_result.target_id,x.combatant.id);
  const savedDice=f.db.getSavedRoll(f.guild,damaged.data.roll_id);
  assert.equal(savedDice.character_id,x.pc.id);assert.equal(savedDice.discord_user_id,x.pc.owner_user_id);
  const proof=typedRollProof(f.db,f.guild,damaged);assert.equal(proof.outcome,'success');
  const hp=f.db.listCombatants(x.encounter.id).find(c=>c.id===x.combatant.id).hp_current;
  assert(hp<x.combatant.hp_current);assert.equal(damaged.data.damage_result.after,hp);
  const count=faces+damageFaces;f.restart();
  const replay=f.db.getCityRecord(f.guild,'roll_request',q.record_key);
  assert.deepEqual(typedRollProof(f.db,f.guild,replay),proof);
  let rerollCalls=0;const replayed=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'damage',key:'unarmed-damage',request:q.record_key,
    expected_revision:rollRevision(rolled)},{rng:()=>{rerollCalls++;return 1;}});
  assert.equal(rerollCalls,0);assert.equal(f.db.getCityRecord(f.guild,'roll_request',q.record_key).data.roll_id,damaged.data.roll_id);
  assert.equal(f.db.listCombatants(x.encounter.id).find(c=>c.id===x.combatant.id).hp_current,hp);assert.equal(count,2+x.pc.data.proficiency);
}));
