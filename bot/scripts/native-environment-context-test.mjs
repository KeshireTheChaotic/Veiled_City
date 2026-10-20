/** W6 construction fixtures. No execution before complete-phase freeze. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {EncounterLibrary,manageWorldEncounter} from '../src/encounter.js';
import {currentScene,recordScenePresence} from '../src/scene-continuity.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {nativeEnvironmentBinding,inspectNativeEnvironmentBinding} from '../src/native-environment-context.js';
import {executableNativeFeatures} from '../src/native-feature-catalog.js';
const changes=f=>f.db.db.prepare('SELECT total_changes() n').get().n;
function setup(f){
  const scene=currentScene(f.db,f.guild),library=new EncounterLibrary('../content');
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,encounter_intelligence:true,scene_continuity:true}});
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Terminal'});
  const source=indexWorldEvent(f.db,f.guild,{key:'environment-grounding',kind:'arrival',source_id:'fixture-gm',visibility:'party',
    title:'Present actors at the terminal',location_key:'terminal',session_id:scene.session_id,scene:scene.key},'fixture-gm');
  for(const pc of f.pcs)recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:pc.id,location_key:'terminal',
    source_event:source.event_key,accepted_by:pc.owner_user_id,visibility:'party'},'fixture-gm');
  const template=library.adversaries.find(a=>Number(a.tier)===1&&!['Minion','Horde'].includes(a.type)),
    environment=library.environments.find(e=>Number(e.tier)===1);
  f.db.upsertNpcProfile(f.guild,{npcKey:'environment-watcher',displayName:'Watcher'});
  f.db.setSimulationEntity(f.guild,'npc','environment-watcher',{location_key:'terminal'});
  f.db.upsertNpcKnowledge(f.guild,{npcKey:'environment-watcher',knowledgeKey:'scene',content:'I am present.',sourceRef:source.event_key});
  recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:'environment-watcher',location_key:'terminal',
    source_event:source.event_key,visibility:'party'},'fixture-gm');
  manageWorldEncounter(f.db,f.guild,{op:'bind',actor:'environment-watcher',template:template.name,information_key:'scene',source_event:source.event_key},'fixture-gm',library);
  const proposal=manageWorldEncounter(f.db,f.guild,{op:'propose',key:'environment-review',actors:['environment-watcher'],
    source_event:source.event_key,location_key:'terminal',objective:'negotiation',environment:environment.name},'fixture-gm',library);
  manageWorldEncounter(f.db,f.guild,{op:'accept',key:proposal.record_key},'fixture-gm',library);
  const encounter=f.db.getCurrentEncounter(f.session.id);
  f.db.setEncounterStatus(encounter.id,'active');
  return {scene,library,source,environment,proposal,encounter,
    input:{encounter:encounter.id,scene:scene.key,location:'terminal'}};
}
test('reviewed native environment identity is source-pinned and read-only, never feature or PC effect permission',()=>nativeFixture(f=>{
  const s=setup(f),before=changes(f),proof=nativeEnvironmentBinding(f.db,f.guild,s.input,{library:s.library});
  assert.equal(proof.execution_authorized,false);assert.equal(proof.encounter,s.encounter.id);
  assert.equal(proof.features.length,executableNativeFeatures('environment').filter(f=>f.actor_name===s.environment.name).length);
  assert.equal(proof.source,s.source.event_key);
  assert.equal(changes(f),before);f.restart();const restarted=changes(f);
  assert.deepEqual(inspectNativeEnvironmentBinding(f.db,f.guild,proof,{library:s.library}),proof);assert.equal(changes(f),restarted);
}));
for(const change of ['source','scene','location','template','activation'])
test(`environment binding rejects changed ${change} without creating effects or a replacement actor`,()=>nativeFixture(f=>{
  const s=setup(f),proof=structuredClone(nativeEnvironmentBinding(f.db,f.guild,s.input,{library:s.library}));
  if(change==='source')indexWorldEvent(f.db,f.guild,{key:s.source.event_key,status:'retracted'},'fixture');
  if(change==='scene')proof.scene='foreign-scene';
  if(change==='location')s.input.location='foreign-location';
  if(change==='template')f.db.updateEncounter(s.encounter.id,{environment_name:'Invented Environment'});
  if(change==='activation'){
    const p=f.db.getCityRecord(f.guild,'encounter_proposal',s.proposal.record_key);
    f.db.saveCityRecord(f.guild,{...p,key:p.record_key,data:{...p.data,reviewed_by:'native:encounter-activation'}});
  }
  const before=changes(f);
  assert.throws(()=>change==='location'?nativeEnvironmentBinding(f.db,f.guild,s.input):inspectNativeEnvironmentBinding(f.db,f.guild,proof));
  assert.equal(changes(f),before);assert.equal(f.db.listCityRecords(f.guild,{kind:'native_environment_effect',includeGM:true}).length,0);
}));
