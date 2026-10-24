import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createEnvironmentAudienceRules} from '../../src/frameworks/daggerheart/environment-audience-rules.js';
import {createEnvironmentBindingRules} from '../../src/frameworks/daggerheart/environment-binding-rules.js';
import {jsonHash as hash} from '../../src/kernel/json-hash.js';

function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'vc-environment-c04-')),file=join(dir,'proof.sqlite');let sql=new DatabaseSync(file),visible=true,ownerLive=true,principal='principal-c04',activation=null;
  t.after(()=>{sql.close();rmSync(dir,{recursive:true,force:true});});
  sql.exec('CREATE TABLE records(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key)); CREATE TABLE events(key TEXT PRIMARY KEY,body TEXT); CREATE TABLE mutation_ledger(id INTEGER PRIMARY KEY,guild_id TEXT,source_layer TEXT,mutation_type TEXT,entity_key TEXT,actor_id TEXT,after_json TEXT);');
  const guild='guild-c04',scene={key:'scene-c04',session_id:'session-c04'},encounter={id:'encounter-c04',guild_id:guild,session_id:scene.session_id,status:'active',environment_name:'Tower C04',tier:1},template={name:encounter.environment_name,tier:1};
  const pc={id:'pc-c04',guild_id:guild,owner_user_id:'owner-c04',data:{location:'tower-c04'}},presence={status:'active',source_event:'presence-c04',location_key:pc.data.location,data:{state:'actually_present'}};
  const db={get db(){return sql;},getCityRecord(_g,kind,key){const r=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key??'');return r?JSON.parse(r.body):null;},saveCityRecord(_g,v){const r={...v,record_key:v.key};sql.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(v.kind,v.key,JSON.stringify(r));return r;},getWorldEvent(_g,key){const r=sql.prepare('SELECT body FROM events WHERE key=?').get(key??'');return r?JSON.parse(r.body):null;},getEncounter(){return encounter;},getCurrentEncounter(){return encounter;},getCharacter(key){return key===pc.id?pc:null;}};
  const event=v=>{const r={...v,event_key:v.key,status:v.status??'active'};sql.prepare('INSERT OR REPLACE INTO events VALUES(?,?)').run(v.key,JSON.stringify(r));return r;};
  const source=event({key:'environment-source-c04',scene:scene.key,session_id:scene.session_id}),proposal=db.saveCityRecord(guild,{kind:'encounter_proposal',key:'proposal-c04',status:'accepted',location_key:pc.data.location,source_event:source.event_key,data:{encounter_id:encounter.id,scene:scene.key,environment:encounter.environment_name,reviewed_by:'gm-c04'}}),binding=db.saveCityRecord(guild,{kind:'encounter_binding',key:encounter.id,status:'active',source_event:source.event_key,data:{proposal:proposal.record_key}});
  function review(row=proposal){return Number(sql.prepare("INSERT INTO mutation_ledger(guild_id,source_layer,mutation_type,entity_key,actor_id,after_json) VALUES(?,'city','encounter_review',?,?,?)").run(guild,row.record_key,row.data.reviewed_by,JSON.stringify(row)).lastInsertRowid);}
  class Library{constructor(){this.environments=[template];}}
  const rules=createEnvironmentBindingRules({capabilities:{EncounterLibrary:Library,currentScene:()=>scene,executableNativeFeatures:()=>[{actor_kind:'environment',feature_key:'environment:c04:rule',template_hash:hash(template)}],nativeActorTaxonomy:()=>({actor_key:'environment:c04',template_hash:hash(template)}),nativeFeatureRuleContextsForTemplate:()=>[{feature:'environment:c04:rule',execution_authorized:false}],inspectNativeEncounterActivation:()=>activation}});
  const audience=createEnvironmentAudienceRules({capabilities:{narrativeSourceVisible:()=>visible,conversationPrincipal:()=>{if(!ownerLive)throw Error('Controller attendance required.');return {kind:'owner',revision:principal};},currentScene:()=>scene,scenePresence:()=>presence}});
  const origin={source:source.event_key,scene:scene.key,session:scene.session_id,location:pc.data.location,viewpoint:'camera',principal},camera={mode:'party'},privateScope={mode:'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  const proof=()=>rules.nativeEnvironmentBinding(db,guild,{encounter:encounter.id,scene:scene.key,location:pc.data.location});
  return {guild,db,scene,encounter,template,pc,presence,proposal,binding,source,rules,audience,origin,camera,privateScope,event,review,proof,setVisible:v=>visible=v,setOwner:v=>ownerLive=v,setPrincipal:v=>principal=v,setActivation:v=>activation=v,reopen(){sql.close();sql=new DatabaseSync(file);}};
}
test('exact native review SQL and current encounter evidence create a read-only environment binding',t=>{
  const f=fixture(t);assert.throws(f.proof,/actual_native_review_receipt/);const id=f.review(),proof=f.proof();assert.equal(proof.review,id);assert.equal(proof.execution_authorized,false);assert.equal(proof.actor,'environment:c04');
  f.reopen();assert.deepEqual(f.rules.inspectNativeEnvironmentBinding(f.db,f.guild,proof),proof);assert.equal(proof.features.length,1);
});
test('forged review, source and template revisions cannot satisfy a saved native locator',t=>{
  const f=fixture(t);f.review();const proof=f.proof();f.template.tier=2;assert.throws(()=>f.rules.inspectNativeEnvironmentBinding(f.db,f.guild,proof),/encounter_location_source/);f.template.tier=1;
  f.event({...f.source,key:f.source.event_key,status:'revoked'});assert.throws(f.proof,/encounter_location_source/);
});
test('native encounter delegation needs its own activation proof in addition to review',t=>{
  const f=fixture(t),proposal={...f.proposal,data:{...f.proposal.data,reviewed_by:'native:encounter-activation'}};f.db.saveCityRecord(f.guild,proposal);f.review(proposal);
  assert.throws(f.proof,/native_activation_receipt/);f.setActivation({record_key:'activation-c04',status:'committed'});f.db.saveCityRecord(f.guild,{...f.binding,data:{...f.binding.data,native_activation:'activation-c04'}});assert.equal(f.proof().activation,'activation-c04');
});
test('original public camera remains usable without creating PC location or knowledge',t=>{
  const f=fixture(t);f.pc.data.location='unplaced';f.presence.data.state='absent';assert.equal(f.audience.assertEnvironmentAudience(f.db,f.guild,f.camera,f.camera,f.origin,{current:true}),true);assert.equal(f.pc.data.location,'unplaced');
});
test('private source cannot be shared or reassigned even to another authenticated character',t=>{
  const f=fixture(t);assert.throws(()=>f.audience.assertEnvironmentAudience(f.db,f.guild,f.privateScope,f.camera,f.origin),/private_source_cannot_change_recipient/);
  assert.throws(()=>f.audience.assertEnvironmentAudience(f.db,f.guild,f.privateScope,{...f.privateScope,actorCharacterId:'other-pc'},f.origin),/private_source_cannot_change_recipient/);
});
test('a different character viewer requires independent current owner and actual local presence',t=>{
  const f=fixture(t);assert.equal(f.audience.assertEnvironmentAudience(f.db,f.guild,f.camera,f.privateScope,f.origin),true);
  f.presence.data.state='absent';assert.throws(()=>f.audience.assertEnvironmentAudience(f.db,f.guild,f.camera,f.privateScope,f.origin),/local_owner_presence/);f.presence.data.state='actually_present';
  f.setOwner(false);assert.throws(()=>f.audience.assertEnvironmentAudience(f.db,f.guild,f.camera,f.privateScope,f.origin),/current_owner/);
});
test('same private recipient current inspection preserves principal revision and source visibility',t=>{
  const f=fixture(t);assert.equal(f.audience.assertEnvironmentAudience(f.db,f.guild,f.privateScope,f.privateScope,f.origin,{current:true}),true);
  f.setPrincipal('changed');assert.throws(()=>f.audience.assertEnvironmentAudience(f.db,f.guild,f.privateScope,f.privateScope,f.origin,{current:true}),/local_owner_presence/);f.setPrincipal('principal-c04');
  f.setVisible(false);assert.throws(()=>f.audience.assertEnvironmentAudience(f.db,f.guild,f.camera,f.camera,f.origin),/original_source_visibility/);
});
test('actual environment proof providers cold-import with unchanged reader APIs',async()=>{
  const a=await import('../../src/native-environment-audience.js'),b=await import('../../src/native-environment-context.js');assert.equal(typeof a.assertEnvironmentAudience,'function');assert.equal(typeof b.nativeEnvironmentBinding,'function');assert.equal(typeof b.inspectNativeEnvironmentBinding,'function');
});
