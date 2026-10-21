/** W6 environments: real native frame/SQLite fixtures, written but not run during construction. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup} from './narrative-fixtures.mjs';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {compileNativeActors,executableNativeFeatures} from '../src/native-feature-catalog.js';
import {establishNativeEnvironmentInstance,inspectNativeEnvironmentInstance,nativeEnvironmentInstanceCapabilities,nativeEnvironmentInstanceForScope} from '../src/native-environment-instance.js';
import {indexWorldEvent} from '../src/city-calendar.js';
const changes=f=>f.db.db.prepare('SELECT total_changes() n').get().n;
const actors=compileNativeActors().filter(a=>a.actor_kind==='environment');
function fixture(f,{privateScene=false}={}){
  const x=setup(f,{privateScene,text:'What is around the terminal?',messageId:'environment-instance'});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,authoring:true}});
  const frame=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),input={version:1,environment:actors[0].actor_key,location:'terminal'};
  return {...x,frame,input};
}
for(const actor of actors)test(`native noncombat profile pins ${actor.actor_key} without creating encounter, NPC or feature effect`,()=>nativeFixture(f=>{
  const x=fixture(f),beforePcs=f.pcs.map(pc=>f.db.getCharacter(pc.id)),npcs=f.db.listSimulationEntities(f.guild,'npc'),
    row=establishNativeEnvironmentInstance(f.db,f.guild,x.frame,{...x.input,environment:actor.actor_key});
  assert.equal(row.visibility,'gm');assert.equal(row.data.environment,actor.actor_key);assert.equal(row.data.template_hash,actor.template_hash);
  assert.equal(row.data.execution_authority,false);assert.equal(row.data.publication_authority,false);
  assert.equal(f.db.getCurrentEncounter(f.session.id),null);assert.deepEqual(f.db.listSimulationEntities(f.guild,'npc'),npcs);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id)),beforePcs);
  const before=changes(f);
  assert.deepEqual(establishNativeEnvironmentInstance(f.db,f.guild,x.frame,{...x.input,environment:actor.actor_key}),row);assert.equal(changes(f),before);
  f.restart();const restarted=changes(f);
  assert.deepEqual(inspectNativeEnvironmentInstance(f.db,f.guild,row.record_key,x.scope),row);
  const capabilities=nativeEnvironmentInstanceCapabilities(f.db,f.guild,row.record_key,x.scope);
  assert.equal(capabilities.execution_authorized,false);
  assert.deepEqual(capabilities.features.map(f=>f.key),executableNativeFeatures('environment').filter(f=>f.template_hash===actor.template_hash).map(f=>f.feature_key));
  assert.deepEqual(nativeEnvironmentInstanceForScope(f.db,f.guild,x.scope,'terminal'),capabilities);
  assert.equal(changes(f),restarted);
}));

test('a private native profile cannot be read as party authority or another owner scope',()=>nativeFixture(f=>{
  const x=fixture(f,{privateScene:true}),row=establishNativeEnvironmentInstance(f.db,f.guild,x.frame,x.input),before=changes(f);
  assert.throws(()=>inspectNativeEnvironmentInstance(f.db,f.guild,row.record_key,{...x.scope,mode:'party'}));
  assert.throws(()=>nativeEnvironmentInstanceCapabilities(f.db,f.guild,row.record_key,{...x.scope,actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id}));
  assert.equal(nativeEnvironmentInstanceForScope(f.db,f.guild,{...x.scope,actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id},'terminal'),null);
  assert.equal(changes(f),before);
}));

for(const change of ['json-frame','unknown-template','wrong-location','disabled-authoring','disabled-discretion','manual-gm','retracted-source'])
test(`environment establishment rejects ${change} without native profile or effects`,()=>nativeFixture(f=>{
  const x=fixture(f);let frame=x.frame,input=x.input;
  if(change==='json-frame')frame=JSON.parse(JSON.stringify({binding:x.frame.binding,scope:x.scope,gm:true}));
  if(change==='unknown-template')input={...input,environment:'environment:invented-profile'};
  if(change==='wrong-location')input={...input,location:'unrelated-location'};
  if(change==='disabled-authoring'||change==='disabled-discretion')f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,
    [change==='disabled-authoring'?'authoring':'gm_discretion']:false}});
  if(change==='manual-gm')f.db.saveCityRecord(f.guild,{kind:'gm_authority',key:'campaign',data:{gm_authority_mode:'manual'}});
  if(change==='retracted-source')indexWorldEvent(f.db,f.guild,{key:x.sourceRef,status:'retracted'},'fixture');
  const before=changes(f);assert.throws(()=>establishNativeEnvironmentInstance(f.db,f.guild,frame,input));
  assert.equal(changes(f),before);assert.equal(f.db.listCityRecords(f.guild,{kind:'native_environment_instance',includeGM:true}).length,0);
}));

test('another template cannot silently replace an established local profile',()=>nativeFixture(f=>{
  const x=fixture(f),row=establishNativeEnvironmentInstance(f.db,f.guild,x.frame,x.input),before=changes(f);
  assert.throws(()=>establishNativeEnvironmentInstance(f.db,f.guild,x.frame,{...x.input,environment:actors[1].actor_key}),/explicit_reconciliation_required/);
  assert.equal(changes(f),before);assert.deepEqual(inspectNativeEnvironmentInstance(f.db,f.guild,row.record_key,x.scope),row);
}));

test('historical environment proof is read-only after movement, location revision and scene end; it cannot authorize a current effect',()=>nativeFixture(f=>{
  const x=fixture(f),row=establishNativeEnvironmentInstance(f.db,f.guild,x.frame,x.input);
  f.db.updateCharacterData(x.pc.id,d=>{d.location='elsewhere';});
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'A revised location',removed:true});
  const before=changes(f);
  assert.deepEqual(inspectNativeEnvironmentInstance(f.db,f.guild,row.record_key,x.scope,{historical:true}),row);
  assert.throws(()=>inspectNativeEnvironmentInstance(f.db,f.guild,row.record_key,x.scope));assert.equal(changes(f),before);
  f.db.endSession(f.guild,'');f.restart();const restarted=changes(f);
  assert.deepEqual(inspectNativeEnvironmentInstance(f.db,f.guild,row.record_key,x.scope,{historical:true}),row);
  assert.throws(()=>inspectNativeEnvironmentInstance(f.db,f.guild,row.record_key,x.scope));assert.equal(changes(f),restarted);
}));
for(const change of ['owner','origin','native-source','receipt'])
test(`historical environment reads still reject changed ${change}`,()=>nativeFixture(f=>{
  const x=fixture(f,{privateScene:true}),row=establishNativeEnvironmentInstance(f.db,f.guild,x.frame,x.input);
  if(change==='owner')f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run('other-owner',x.pc.id);
  if(change==='origin')indexWorldEvent(f.db,f.guild,{key:x.sourceRef,status:'retracted'},'fixture');
  if(change==='native-source')indexWorldEvent(f.db,f.guild,{key:row.source_event,status:'retracted'},'fixture');
  if(change==='receipt'){
    const source=f.db.getWorldEvent(f.guild,row.source_event);
    f.db.db.prepare("UPDATE mutation_ledger SET actor_id='forged-model' WHERE id=?").run(source.source_id);
  }
  const before=changes(f);assert.throws(()=>inspectNativeEnvironmentInstance(f.db,f.guild,row.record_key,x.scope,{historical:true}));
  assert.equal(changes(f),before);
}));
