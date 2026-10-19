import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,candidate} from './narrative-fixtures.mjs';
import {sceneFictionHash as hash} from '../src/scene-fiction-context.js';
import {createArbitrationOrigin,buildSceneIntentBoard} from '../src/scene-intent-board.js';
import {adjudicateSceneBoard} from '../src/gm-unified-arbitration.js';
import {executeUnifiedGmActions,inspectGmReactionInvitation,submitGmReactionInvitation,withdrawGmReactionInvitation} from '../src/gm-native-rolls.js';
import {settleGroupFeature} from '../src/native-group-features.js';
import {materializeNativeNotices} from '../src/native-publications.js';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {currentScene,recordScenePresence} from '../src/scene-continuity.js';
import {EncounterLibrary} from '../src/encounter.js';
import {buildCombatants} from '../src/combat.js';

const FEATURE='adversary:traffic-saint:all-lanes-stop';
const decision=intent_ref=>({intent_ref,disposition:'native_feature_resolution',rule_basis_refs:['srd:reaction-rolls'],
  difficulty:null,trait:null,stakes_kind:'native_feature',stakes:'Native All Lanes Stop owner reactions.',reason:'Native source-bound feature.',
  difficulty_reason:'',feature_ref:FEATURE,experience_ref:'',advantage:false,disadvantage:false});

async function prepareGroup(f){
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
  return {x,library,execution};
}
function groupChild(f,execution,index){
  return execution.data.children.map(c=>f.db.getCityRecord(f.guild,'gm_arbitration_decision',c.decision)).find(c=>c.data.native.character===f.pcs[index].id);
}
function submit(f,row,index,faces=[10]){
  const owner=f.pcs[index].owner_user_id,terms=inspectGmReactionInvitation(f.db,f.guild,owner,row.record_key).terms,
    input={op:'gm-reaction-roll',request:row.record_key,revision:terms.revision};
  return submitGmReactionInvitation(f.db,f.guild,owner,input,{interactionId:`owner-roll-${index}`,authoredText:JSON.stringify(input),rng:(()=>{let i=0;return()=>faces[i++];})()});
}
function withdraw(f,row,index){
  const owner=f.pcs[index].owner_user_id,terms=inspectGmReactionInvitation(f.db,f.guild,owner,row.record_key).terms,
    input={op:'gm-reaction-withdraw',request:row.record_key,revision:terms.revision};
  return withdrawGmReactionInvitation(f.db,f.guild,owner,input,{interactionId:`owner-withdraw-${index}`,authoredText:JSON.stringify(input)});
}
function reassign(f,index){f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[3].owner_user_id,f.pcs[index].id);}

test('owner withdrawal and committed effect remain parent terminal dispositions after reassignment/restart',async()=>nativeFixture(async f=>{
  const {execution}=await prepareGroup(f),first=groupChild(f,execution,0),withdrawn=groupChild(f,execution,1);
  submit(f,first,0,[2,1]);
  const effect=f.db.getCityRecord(f.guild,'gm_group_feature_effect',`group-effect:${hash(first.record_key)}`);
  assert.equal(effect.status,'resolved');assert.equal(f.db.getCharacter(f.pcs[0].id).data.conditions.filter(c=>c.name==='Movement limited'&&c.active).length,1);
  reassign(f,0);
  const withdrawal=withdraw(f,withdrawn,1);reassign(f,1);
  submit(f,groupChild(f,execution,2),2,[10,10]);
  let progress=f.db.getCityRecord(f.guild,'gm_group_feature_progress',execution.record_key);
  assert.equal(progress.status,'resolved');assert.deepEqual(progress.data.children.map(c=>c.status),['resolved','withdrawn','resolved']);
  f.restart();settleGroupFeature(f.db,f.guild,execution.record_key);
  progress=f.db.getCityRecord(f.guild,'gm_group_feature_progress',execution.record_key);
  assert.equal(progress.status,'resolved');assert.deepEqual(progress.data.children.map(c=>c.status),['resolved','withdrawn','resolved']);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_group_feature_effect',includeGM:true}).length,2);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_action_cost_receipt',includeGM:true}).length,1);
  assert.equal(f.db.getCampaign(f.guild).fear,1);assert.equal(f.db.getCityRecord(f.guild,'gm_reaction_submission',withdrawal.record_key).status,'withdrawn');
  assert.throws(()=>inspectGmReactionInvitation(f.db,f.guild,f.pcs[0].owner_user_id,first.record_key));
  assert.throws(()=>inspectGmReactionInvitation(f.db,f.guild,f.pcs[1].owner_user_id,withdrawn.record_key));
  materializeNativeNotices(f.db,f.guild);
  const jobs=f.db.listCityRecords(f.guild,{kind:'gm_arbitration_publication',includeGM:true});
  assert(jobs.some(job=>job.status==='needs_review'));
  assert(!jobs.some(job=>job.data.user===f.pcs[3].owner_user_id));
}));

test('revoked withdrawal source cannot terminalize a group parent or erase committed owner effect',async()=>nativeFixture(async f=>{
  const {execution}=await prepareGroup(f),first=groupChild(f,execution,0),withdrawn=groupChild(f,execution,1);
  submit(f,first,0,[2,1]);
  const effectKey=`group-effect:${hash(first.record_key)}`,effect=f.db.getCityRecord(f.guild,'gm_group_feature_effect',effectKey);
  assert.equal(effect.status,'resolved');reassign(f,0);
  const withdrawal=withdraw(f,withdrawn,1),receipt=f.db.getCityRecord(f.guild,'gm_reaction_submission',withdrawal.record_key);
  indexWorldEvent(f.db,f.guild,{key:receipt.source_event,status:'retracted'},'gm');reassign(f,1);
  submit(f,groupChild(f,execution,2),2,[10,10]);
  const progress=f.db.getCityRecord(f.guild,'gm_group_feature_progress',execution.record_key);
  assert.equal(progress.status,'awaiting_owners');assert.deepEqual(progress.data.children.map(c=>c.status),['resolved','needs_review','resolved']);
  assert.equal(f.db.getCityRecord(f.guild,'gm_group_feature_effect',effectKey).status,'resolved');
  assert.equal(f.db.getCharacter(f.pcs[0].id).data.conditions.filter(c=>c.name==='Movement limited'&&c.active).length,1);
  assert.equal(f.db.getCampaign(f.guild).fear,1);assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_action_cost_receipt',includeGM:true}).length,1);
}));
