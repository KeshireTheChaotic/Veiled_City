import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,candidate} from './narrative-fixtures.mjs';
import {sceneFictionHash as hash} from '../src/scene-fiction-context.js';
import {createArbitrationOrigin,buildSceneIntentBoard} from '../src/scene-intent-board.js';
import {adjudicateSceneBoard} from '../src/gm-unified-arbitration.js';
import {executeUnifiedGmActions,inspectGmReactionInvitation,submitGmReactionInvitation,withdrawGmReactionInvitation} from '../src/gm-native-rolls.js';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {currentScene,recordScenePresence} from '../src/scene-continuity.js';
import {EncounterLibrary} from '../src/encounter.js';
import {buildCombatants} from '../src/combat.js';

const FEATURE='adversary:traffic-saint:all-lanes-stop';
const decision=intent_ref=>({intent_ref,disposition:'native_feature_resolution',rule_basis_refs:['srd:reaction-rolls'],
  difficulty:null,trait:null,stakes_kind:'native_feature',stakes:'Native All Lanes Stop owner reactions.',reason:'Native source-bound feature.',
  difficulty_reason:'',feature_ref:FEATURE,experience_ref:'',advantage:false,disadvantage:false});

test('owner withdrawal remains a terminal parent disposition after later owner reassignment',async()=>nativeFixture(f=>{
  const x=setup(f,{privateScene:false,text:'Describe the scene.'}),library=new EncounterLibrary('../content'),scene=currentScene(f.db,f.guild);
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,roll_requests:true,roll_collaboration:true,narrative_encounters:true}});
  f.db.changeFear(f.guild,2-f.db.getCampaign(f.guild).fear);
  f.db.upsertNpcProfile(f.guild,{npcKey:'guard',displayName:'Saint',role:'attendant',publicIdentity:'A local attendant.'});
  f.db.setSimulationEntity(f.guild,'npc','guard',{name:'Saint',location_key:'terminal',visibility:'party'});
  const source=indexWorldEvent(f.db,f.guild,{key:'group-source',kind:'observation',source_id:'gm',title:'Native Saint encounter',session_id:f.session.id,
    scene:scene.key,location_key:'terminal',visibility:'party'},'gm');
  recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:'guard',source_event:source.event_key,location_key:'terminal',zone:'interior',range:'Close',visibility:'party',accepted_by:'gm'},'gm');
  for(const pc of f.pcs.slice(1,3))recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:pc.id,source_event:source.event_key,
    location_key:'terminal',zone:'interior',range:'Close',visibility:'party',accepted_by:pc.owner_user_id},'fixture-native');
  const encounter=f.db.createEncounter(f.guild,f.session.id,{status:'active',tier:1,pc_count:4,base_bp:14,budget_bp:14,composition:[{name:'Traffic Saint',quantity:1}]}),
    [combatant]=f.db.initializeCombatants(encounter.id,buildCombatants(encounter,library));
  f.db.saveCityRecord(f.guild,{kind:'encounter_binding',key:encounter.id,source_event:source.event_key,data:{combatants:[{actor:'guard',id:combatant.id}]}});
  f.db.upsertRulesRuling(f.guild,{key:'group-rule',ruling:'Current standard group feature.',createdBy:'gm'});
  const rows=persistPlayerIntents(f.db,f.guild,candidate(x.text).player_intents,x.scope,{messageId:x.messageId}),origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),
    proposal={actor_key:'guard',operation:'feature',target_refs:f.pcs.slice(0,3).map(pc=>pc.id),objective_ref:'',source_refs:[],dependencies:[]},
    board=buildSceneIntentBoard(f.db,f.guild,origin,rows,[proposal]),[parent]=adjudicateSceneBoard(f.db,f.guild,origin,board,
      [{...decision(board.data.entries.find(e=>e.actor.type==='npc').intent_ref),trait:'Instinct',difficulty:14,stakes:'Exact native feature reaction.'}],{library});
  assert.equal(parent.status,'gm_action_ready',parent.data.reason);
  const [execution]=executeUnifiedGmActions(f.db,f.guild,[parent],{library});
  assert.equal(execution.kind,'gm_group_feature_execution');
  const child=execution.data.children.map(c=>f.db.getCityRecord(f.guild,'gm_arbitration_decision',c.decision)).find(c=>c.data.native.character===f.pcs[1].id),
    user=f.pcs[1].owner_user_id,terms=inspectGmReactionInvitation(f.db,f.guild,user,child.record_key).terms,input={op:'gm-reaction-withdraw',request:child.record_key,revision:terms.revision};
  const first=execution.data.children.map(c=>f.db.getCityRecord(f.guild,'gm_arbitration_decision',c.decision)).find(c=>c.data.native.character===f.pcs[0].id),
    firstOwner=f.pcs[0].owner_user_id,firstTerms=inspectGmReactionInvitation(f.db,f.guild,firstOwner,first.record_key).terms,
    firstInput={op:'gm-reaction-roll',request:first.record_key,revision:firstTerms.revision};
  submitGmReactionInvitation(f.db,f.guild,firstOwner,firstInput,{interactionId:'first-owner-effect',authoredText:JSON.stringify(firstInput),rng:()=>1});
  f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[3].owner_user_id,f.pcs[0].id);
  withdrawGmReactionInvitation(f.db,f.guild,user,input,{interactionId:'withdraw-before-owner-change',authoredText:JSON.stringify(input)});
  f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[3].owner_user_id,f.pcs[1].id);
  for(const index of [2]){
    const row=execution.data.children.map(c=>f.db.getCityRecord(f.guild,'gm_arbitration_decision',c.decision)).find(c=>c.data.native.character===f.pcs[index].id),
      owner=f.pcs[index].owner_user_id,invitation=inspectGmReactionInvitation(f.db,f.guild,owner,row.record_key).terms,
      roll={op:'gm-reaction-roll',request:row.record_key,revision:invitation.revision};
    submitGmReactionInvitation(f.db,f.guild,owner,roll,{interactionId:`remaining-owner-${index}`,authoredText:JSON.stringify(roll),rng:()=>10});
  }
  const progress=f.db.getCityRecord(f.guild,'gm_group_feature_progress',execution.record_key);
  assert.equal(progress.status,'resolved');
  assert.deepEqual(progress.data.children.map(c=>c.status),['resolved','withdrawn','resolved']);
}));
