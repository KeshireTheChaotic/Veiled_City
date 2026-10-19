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
  return {...x,intent,origin,board,library,combatant};
}

test('native unarmed attack prepares an owner-private NPC-target roll without resolving the attack',()=>nativeFixture(f=>{
  const x=fixture(f),entry=x.board.data.entries[0],decision={intent_ref:entry.intent_ref,disposition:'request_pc_action_roll',
    rule_basis_refs:['srd:attack-rolls'],difficulty:null,trait:'Strength',stakes_kind:'native_attack',
    stakes:'The punch may miss; no damage or target change is assumed.',reason:'A source-backed ordinary unarmed attack.',
    difficulty_reason:'Use the active NPC combatant Difficulty.',feature_ref:'unarmed_attack',experience_ref:'',advantage:false,disadvantage:false};
  const [saved]=adjudicateSceneBoard(f.db,f.guild,x.origin,x.board,[decision],{library:x.library});
  assert.equal(saved.status,'pending_pc_roll',saved.data.reason);
  const request=f.db.getCityRecord(f.guild,'roll_request',saved.data.native.roll_request_ref);
  assert.equal(request.status,'pending');
  assert.equal(request.subject_key,x.pc.id);
  assert.equal(request.data.owner_user_id,x.pc.owner_user_id);
  assert.deepEqual(request.data.breakdown.attack,{weapon:'unarmed',damage:`${x.pc.data.proficiency}d4`,damage_type:'physical',
    target_id:x.combatant.id,encounter_id:f.db.getCurrentEncounter(f.session.id).id,difficulty:x.combatant.difficulty});
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,2);
  assert.equal(f.db.getCombatant(x.combatant.id).hp_current,x.combatant.hp_current);
}));
