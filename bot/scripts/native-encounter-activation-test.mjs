/** W2 construction fixtures: real local native adapters only; authored, not executed during qualification freeze. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {configureDelegation,dispatchAiIntents,stateRevision} from '../src/ai-intents.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {currentScene,recordScenePresence} from '../src/scene-continuity.js';
import {EncounterLibrary,manageWorldEncounter,validateWorldEncounterActivation,recomputeBudget} from '../src/encounter.js';
import {activateDelegatedEncounter,inspectNativeEncounterActivation} from '../src/native-encounter-activation.js';
import {applicationPrincipal} from '../src/application-authority.js';

function setup(f,{privateScope=false,allow=true,privateAllow=false,configure=true,overBudget=false}={}){
  const scene=currentScene(f.db,f.guild),lib=new EncounterLibrary('../content');
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,encounter_intelligence:true,scene_continuity:true,gm_discretion:true}});
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Terminal'});
  const source=indexWorldEvent(f.db,f.guild,{key:'activation-scene',kind:'arrival',title:'Existing actors and participants at terminal',
    source_id:'human_gm',visibility:'party',location_key:'terminal',session_id:scene.session_id,scene:scene.key},'fixture-gm');
  for(const pc of f.pcs)recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:pc.id,location_key:'terminal',
    source_event:source.event_key,accepted_by:pc.owner_user_id,visibility:'party'},'fixture-gm');
  const template=lib.adversaries.find(a=>Number(a.tier)===1&&(overBudget?a.type==='Solo':!['Minion','Horde'].includes(a.type))),
    environment=lib.environments.find(e=>Number(e.tier)===1);
  assert(template&&environment,'Sanitized fixture requires real tier-one single-body and environment catalog entries.');
  const actors=Array.from({length:overBudget?4:1},(_,i)=>`watcher-${i}`);
  for(const actor of actors){
    f.db.upsertNpcProfile(f.guild,{npcKey:actor,displayName:actor});
    f.db.setSimulationEntity(f.guild,'npc',actor,{location_key:'terminal',resources:{information:2}});
    f.db.upsertNpcKnowledge(f.guild,{npcKey:actor,knowledgeKey:'scene',content:'I am present in this established scene.',sourceRef:source.event_key});
    recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:actor,location_key:'terminal',source_event:source.event_key,visibility:'party'},'fixture-gm');
    manageWorldEncounter(f.db,f.guild,{op:'bind',actor,template:template.name,information_key:'scene',source_event:source.event_key},'fixture-gm',lib);
  }
  const proposal=manageWorldEncounter(f.db,f.guild,{op:'propose',key:'native-negotiation',source_event:source.event_key,actors,
    location_key:'terminal',objective:'negotiation',environment:environment.name},'fixture-gm',lib);
  const policy=configure?configureDelegation(f.db,f.guild,{mode:'routine_delegated',allow:allow?['encounter.activate']:[],
    private_allow:privateAllow?['encounter.activate']:[],max_operations:2,max_cost:0,
    expires_minute:f.db.getSimulationClock(f.guild).minute+60},'fixture-gm'):null;
  const intent={version:1,feature:'encounter',target_key:proposal.record_key,expected_revision:stateRevision(proposal),
    policy_revision:policy?.data.revision||0,source_prerequisites:[],
    payload:{op:'activate',proposal_key:proposal.record_key,source_event:source.event_key}};
  const scope={mode:privateScope?'private':'party',actorUserId:f.pcs[0].owner_user_id,actorCharacterId:f.pcs[0].id};
  const dispatch=(candidate=intent,origin='native-activation-fixture')=>dispatchAiIntents(f.db,f.guild,[candidate],
    {origin,sessionId:f.session.id,scope})[0];
  return {lib,actors,template,source,proposal,intent,scope,dispatch};
}
function unchangedState(f){return {pcs:f.pcs.map(pc=>f.db.getCharacter(pc.id).data),npcs:f.db.listSimulationEntities(f.guild,'npc'),
  rolls:f.db.db.prepare('SELECT COUNT(*) AS n FROM rolls WHERE guild_id=?').get(f.guild).n};}
function assertUnchanged(f,before){assert.deepEqual(unchangedState(f),before,'Bookkeeping cannot spawn/move actors, choose PC resources or roll dice.');}
function requireHold(f,s,before){
  const result=s.dispatch();assert.notEqual(result.status,'accepted',result.data.diagnostic||result.data.reason);
  assert.equal(f.db.getCurrentEncounter(f.session.id),null);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'native_encounter_activation',includeGM:true}).length,0);
  assertUnchanged(f,before);return result;
}

for(const privateScope of [false,true])test(`W2 explicit ${privateScope?'private':'party'} encounter delegation commits native bookkeeping once`,()=>nativeFixture(f=>{
  const s=setup(f,{privateScope,privateAllow:privateScope}),before=unchangedState(f),result=s.dispatch();
  assert.equal(result.status,'accepted',result.data.diagnostic);
  const encounter=f.db.getCurrentEncounter(f.session.id),binding=f.db.getCityRecord(f.guild,'encounter_binding',encounter.id);
  assert.equal(encounter.status,'planned');assert.equal(encounter.pc_count,4);assert.equal(encounter.composition.length,s.actors.length);
  assert.deepEqual(binding.data.roster,f.pcs.map(pc=>pc.id).sort());
  assert.equal(encounter.composition[0].name,s.template.name);assert.equal(encounter.composition[0].quantity,1);
  const budget=recomputeBudget(encounter);assert.equal(encounter.budget_bp,budget.budget);assert.equal(encounter.spent_bp,budget.spent);
  assert(budget.spent<=budget.budget);assert.equal(f.db.listCombatants(encounter.id).length,0);
  validateWorldEncounterActivation(f.db,f.guild,encounter);
  const native=inspectNativeEncounterActivation(f.db,f.guild,binding.data.native_activation);assert.equal(native.visibility,'gm');
  assert.equal(inspectNativeEncounterActivation(f.db,f.guild,native.record_key,{current:true}).record_key,native.record_key);
  assert.equal(native.data.proposal,s.proposal.record_key);assert.deepEqual(native.data.roster,binding.data.roster);
  assertUnchanged(f,before);f.restart();
  assert.equal(s.dispatch().record_key,result.record_key);
  validateWorldEncounterActivation(f.db,f.guild,f.db.getEncounter(encounter.id));
  assert.equal(inspectNativeEncounterActivation(f.db,f.guild,native.record_key).record_key,native.record_key);
  assert.equal(inspectNativeEncounterActivation(f.db,f.guild,native.record_key,{current:true}).record_key,native.record_key);
  assert.equal(f.db.listEncounters(f.session.id).length,1);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'native_encounter_activation',includeGM:true}).length,1);
  assertUnchanged(f,before);
}));

for(const principal of [null,{guild:'v9-synthetic',operation:'encounter.activate',id:'model-role'}])
  test('W2 serialized encounter principal cannot mint native authority',()=>nativeFixture(f=>{
    const s=setup(f),before=unchangedState(f);
    assert.throws(()=>activateDelegatedEncounter(f.db,f.guild,s.intent,{principal,library:s.lib}),/APPLICATION_AUTHORITY_REQUIRED/);
    assert.equal(f.db.getCurrentEncounter(f.session.id),null);assertUnchanged(f,before);
  }));

for(const options of [{configure:false},{allow:false},{privateScope:true,privateAllow:false}])
  test(`W2 activation requires explicit operator permission ${JSON.stringify(options)}`,()=>nativeFixture(f=>{
    const s=setup(f,options);requireHold(f,s,unchangedState(f));
  }));

for(const change of ['wrong-source','stale-proposal','binding','scene','roster','proxy','owner'])
  test(`W2 pre-activation ${change} change cannot bypass native encounter gates`,()=>nativeFixture(f=>{
    const s=setup(f);
    if(change==='wrong-source'){
      indexWorldEvent(f.db,f.guild,{key:'different-source',title:'Unrelated active source',source_id:'human_gm'},'fixture-gm');
      s.intent.payload.source_event='different-source';
    }
    if(change==='stale-proposal')f.db.saveCityRecord(f.guild,{...s.proposal,key:s.proposal.record_key,data:{...s.proposal.data,objective:'escape'}});
    if(change==='binding'){
      const row=f.db.getCityRecord(f.guild,'encounter_actor',s.actors[0]);
      f.db.saveCityRecord(f.guild,{...row,key:row.record_key,data:{...row.data,template:'Unmapped changed template'}});
    }
    if(change==='scene')f.db.setDirectorState(f.session.id,{scene_number:2});
    if(change==='roster')for(const pc of f.pcs.slice(1))f.db.setPresence(f.session.id,pc.owner_user_id,'absent');
    if(change==='proxy')f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:s.actors[0],userId:f.pcs[0].owner_user_id,status:'active'});
    if(change==='owner')f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[1].owner_user_id,f.pcs[0].id);
    requireHold(f,s,unchangedState(f));
  }));

test('W2 explicit activation permission cannot exceed native battle-point budget',()=>nativeFixture(f=>{
  const s=setup(f,{overBudget:true});requireHold(f,s,unchangedState(f));
}));

for(const change of ['roster','scene','proxy','owner','source','binding'])
  test(`W2 saved/current activation read rejects ${change} change after restart`,()=>nativeFixture(f=>{
    const s=setup(f),result=s.dispatch();assert.equal(result.status,'accepted',result.data.diagnostic);
    const encounter=f.db.getCurrentEncounter(f.session.id),binding=f.db.getCityRecord(f.guild,'encounter_binding',encounter.id);
    if(change==='roster')f.db.setPresence(f.session.id,f.pcs[1].owner_user_id,'absent');
    if(change==='scene')f.db.setDirectorState(f.session.id,{scene_number:2});
    if(change==='proxy')f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:s.actors[0],userId:f.pcs[0].owner_user_id,status:'active'});
    if(change==='owner')f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[1].owner_user_id,f.pcs[0].id);
    if(change==='source')indexWorldEvent(f.db,f.guild,{key:s.source.event_key,status:'retracted'},'fixture-gm');
    if(change==='binding')f.db.saveCityRecord(f.guild,{...binding,key:binding.record_key,data:{...binding.data,roster:[]}});
    const before=unchangedState(f);f.restart();
    assert.throws(()=>validateWorldEncounterActivation(f.db,f.guild,f.db.getEncounter(encounter.id)));
    assert.equal(f.db.getCityRecord(f.guild,'native_encounter_activation',binding.data.native_activation).status,'committed');
    assert.equal(f.db.getEncounter(encounter.id).status,'planned');assertUnchanged(f,before);
  }));

test('W2 direct native replay cannot substitute a different source after activation',()=>nativeFixture(f=>{
  const s=setup(f);assert.equal(s.dispatch().status,'accepted');
  const before=unchangedState(f),principal=applicationPrincipal(f.guild,'encounter.activate','trusted-fixture');
  assert.throws(()=>activateDelegatedEncounter(f.db,f.guild,{...s.intent,payload:{...s.intent.payload,source_event:'forged-replay-source'}},
    {principal,library:s.lib}));
  assert.equal(f.db.listEncounters(f.session.id).length,1);assertUnchanged(f,before);
}));
