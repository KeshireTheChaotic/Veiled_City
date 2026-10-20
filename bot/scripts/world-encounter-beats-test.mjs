/** W3 authored-only fixtures: real catalog, native proposal producer and read-only candidate reader. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {EncounterLibrary,manageWorldEncounter} from '../src/encounter.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {currentScene,recordScenePresence,recordCharacterArrival} from '../src/scene-continuity.js';
import {snapshotNativeEncounterCandidates,inspectNativeEncounterCandidate,configureWorldEncounterCatalog} from '../src/world-encounter-beats.js';
import {ContentIndex} from '../src/content.js';
import {bindDirectorNarrativeSource,directorBriefForAudience} from '../src/narrative-director-source.js';
import {worldDirectorBridgeBeats} from '../src/world-narrative-bridge.js';
import {openingWorldOpportunities} from '../src/opening-world-bridge.js';

function setup(f,{visibility='party',overBudget=false}={}){
  const {db,guild}=f,library=new EncounterLibrary('../content'),scene=currentScene(db,guild),
    scope=visibility==='character'?{mode:'private',actorUserId:f.pcs[0].owner_user_id,actorCharacterId:f.pcs[0].id}
      :{mode:'party',actorUserId:null,actorCharacterId:null};
  db.setCityCalendar(guild,{flags:{...db.getCityCalendar(guild).flags,encounter_intelligence:true,scene_continuity:true}});
  db.setSimulationEntity(guild,'location','terminal',{name:'Terminal',visibility:'party'});
  for(const pc of f.pcs)recordCharacterArrival(db,guild,pc,pc.owner_user_id,`fixture-arrival:${pc.id}`);
  const source=indexWorldEvent(db,guild,{key:'encounter-candidate-source',kind:'observation',title:'Established local scene',
    source_id:'fixture-gm',visibility,subject_key:visibility==='character'?f.pcs[0].id:null,location_key:'terminal',
    session_id:scene.session_id,scene:scene.key},'fixture-gm');
  const template=library.adversaries.find(t=>Number(t.tier)===1&&(overBudget?t.type==='Solo':!['Minion','Horde'].includes(t.type))),
    environment=library.environments.find(e=>Number(e.tier)===1);
  assert.ok(template&&environment,'Real native single-body and environment catalog entries required.');
  const actors=Array.from({length:overBudget?4:1},(_,i)=>`candidate-watcher-${i}`);
  for(const actor of actors){
    db.upsertNpcProfile(guild,{npcKey:actor,displayName:actor});
    db.setSimulationEntity(guild,'npc',actor,{location_key:'terminal',visibility:'party',resources:{information:2}});
    db.upsertNpcKnowledge(guild,{npcKey:actor,knowledgeKey:'scene',content:'The established scene is accessible.',sourceRef:source.event_key});
    recordScenePresence(db,guild,{entity_type:'npc',entity_key:actor,location_key:'terminal',source_event:source.event_key,
      visibility,subject_key:visibility==='character'?f.pcs[0].id:null},'fixture-gm');
    manageWorldEncounter(db,guild,{op:'bind',actor,template:template.name,information_key:'scene',source_event:source.event_key},'fixture-gm',library);
  }
  const proposal=manageWorldEncounter(db,guild,{op:'propose',key:'candidate-native-negotiation',actors,source_event:source.event_key,
    location_key:'terminal',objective:'negotiation',environment:environment.name},'fixture-gm',library);
  return {library,scope,source,proposal,actors,template};
}
const footprint=db=>db.db.prepare('SELECT total_changes() n').get().n;
const read=(f,x,scope=x.scope)=>snapshotNativeEncounterCandidates(f.db,f.guild,scope,{library:x.library});

test('configured native candidate reaches Director and Opening as metadata, revalidates after restart',()=>nativeFixture(f=>{
  const x=setup(f),content=new ContentIndex(path.resolve('../content')),
    ref=bindDirectorNarrativeSource(f.db,f.guild,{act:false},x.scope,'round',{},content),source=f.db.getWorldEvent(f.guild,ref),
    brief=directorBriefForAudience(f.db,f.guild,source,x.scope),beat=brief.world_bridge.beats.find(b=>b.kind==='encounter_candidate');
  assert.ok(beat);assert.equal(beat.publication_authority,false);assert.equal(beat.execution_authority,false);
  assert.equal(JSON.stringify(beat).includes(x.template.name),false);
  assert.ok(openingWorldOpportunities(f.db,f.guild,x.scope).beats.some(o=>o.kind==='encounter_candidate'));
  const pcs=f.pcs.map(pc=>f.db.getCharacter(pc.id));f.restart();
  // Runtime is reconstructed from trusted content configuration, not any stored/model host path.
  configureWorldEncounterCatalog(f.db,content.root);
  assert.deepEqual(directorBriefForAudience(f.db,f.guild,f.db.getWorldEvent(f.guild,ref),x.scope).world_bridge,brief.world_bridge);
  indexWorldEvent(f.db,f.guild,{key:x.source.event_key,status:'retracted'},'fixture');
  const held=worldDirectorBridgeBeats(f.db,f.guild,f.db.getWorldEvent(f.guild,ref),x.scope);
  assert.equal(held.beats.some(b=>b.kind==='encounter_candidate'),false);assert.ok(held.held>0);
  assert.equal(f.db.getCurrentEncounter(f.session.id),null);assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id)),pcs);
}));

for(const visibility of ['party','character'])test(`${visibility} native pending proposal produces bounded proof without activation, dice, prose or writes`,()=>nativeFixture(f=>{
  const x=setup(f,{visibility}),before=footprint(f.db),pcs=f.pcs.map(pc=>f.db.getCharacter(pc.id)),
    proposals=f.db.listCityRecords(f.guild,{kind:'encounter_proposal',includeGM:true}),result=read(f,x);
  assert.equal(result.candidates.length,1);assert.equal(result.held.count,0);
  const proof=result.candidates[0];assert.equal(proof.kind,'encounter_candidate');
  assert.equal(proof.proposal_ref,x.proposal.record_key);assert.equal(proof.source_ref,x.source.event_key);
  assert.equal(proof.execution_authority,false);assert.equal(proof.publication_authority,false);
  assert.equal(JSON.stringify(proof).includes(x.template.name),false);
  for(const field of ['text','objective','stats','template','composition','roll','actor_action'])assert.equal(Object.hasOwn(proof,field),false);
  assert.deepEqual(inspectNativeEncounterCandidate(f.db,f.guild,proof,x.scope,{library:x.library}),proof);
  assert.equal(f.db.getCurrentEncounter(f.session.id),null);assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id)),pcs);
  assert.deepEqual(f.db.listCityRecords(f.guild,{kind:'encounter_proposal',includeGM:true}),proposals);
  assert.equal(footprint(f.db),before);
  f.restart();const restarted=footprint(f.db);
  assert.deepEqual(inspectNativeEncounterCandidate(f.db,f.guild,proof,x.scope,{library:x.library}),proof);
  assert.equal(footprint(f.db),restarted);
}));

test('GM-private proposal source, character-private source and missing library hold distinctly',()=>nativeFixture(f=>{
  const x=setup(f,{visibility:'gm'}),result=read(f,x);
  assert.equal(result.candidates.length,0);assert.equal(result.held.reasons.missing_entitled_source,1);
  assert.equal(snapshotNativeEncounterCandidates(f.db,f.guild,x.scope).held.reasons.missing_native_library,1);
}));

test('character-private proposal cannot be projected to party or another owner',()=>nativeFixture(f=>{
  const x=setup(f,{visibility:'character'});assert.equal(read(f,x).candidates.length,1);
  for(const scope of [{mode:'party',actorUserId:null,actorCharacterId:null},
    {...x.scope,actorUserId:f.pcs[1].owner_user_id},
    {mode:'private',actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id}])assert.equal(read(f,x,scope).candidates.length,0);
}));

for(const change of ['source','proposal','binding','scene','owner','control','proxy','hidden','location','roster','template'])
test(`saved current candidate rejects ${change} change after restart`,()=>nativeFixture(f=>{
  const x=setup(f),proof=read(f,x).candidates[0];assert.ok(proof);
  if(change==='source')indexWorldEvent(f.db,f.guild,{key:x.source.event_key,status:'retracted'},'fixture');
  if(change==='proposal')f.db.saveCityRecord(f.guild,{...x.proposal,key:x.proposal.record_key,data:{...x.proposal.data,objective:'escape'}});
  if(change==='binding'){
    const row=f.db.getCityRecord(f.guild,'encounter_actor',x.actors[0]);
    f.db.saveCityRecord(f.guild,{...row,key:row.record_key,data:{...row.data,template:'Unknown replacement'}});
  }
  if(change==='scene')f.db.setDirectorState(f.session.id,{scene_number:2});
  if(change==='owner')f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run('new-owner',f.pcs[0].id);
  if(change==='control')f.db.assignCharacter(f.session.id,f.pcs[0].owner_user_id,f.pcs[0].id,
    {controlPolicy:'proxy',proxyUserId:f.pcs[1].owner_user_id});
  if(change==='proxy')f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:x.actors[0],userId:f.pcs[0].owner_user_id,status:'active'});
  if(change==='hidden'){
    const entity=f.db.getSimulationEntity(f.guild,'npc',x.actors[0]);f.db.setSimulationEntity(f.guild,'npc',x.actors[0],{...entity.state,hidden:true});
  }
  if(change==='location')f.db.updateCharacterData(f.pcs[0].id,d=>{d.location='elsewhere';});
  if(change==='roster')f.db.setPresence(f.session.id,f.pcs[0].owner_user_id,'absent');
  if(change==='template')x.library.adversaries=x.library.adversaries.filter(t=>t.name!==x.template.name);
  f.restart();const count=footprint(f.db);
  assert.equal(inspectNativeEncounterCandidate(f.db,f.guild,proof,x.scope,{library:x.library}),null);
  assert.equal(footprint(f.db),count);assert.equal(f.db.getCurrentEncounter(f.session.id),null);
}));

test('native BP excess and edited descriptors never become candidates or activation authority',()=>nativeFixture(f=>{
  const x=setup(f,{overBudget:true}),result=read(f,x);
  assert.equal(result.candidates.length,0);assert.equal(result.held.reasons.native_budget_exceeded,1);
  assert.equal(inspectNativeEncounterCandidate(f.db,f.guild,{version:1,kind:'encounter_candidate',proposal_ref:x.proposal.record_key},x.scope,
    {library:x.library}),null);assert.equal(f.db.getCurrentEncounter(f.session.id),null);
}));

test('snapshot caps actual native proposals at four without changing pending proposal history',()=>nativeFixture(f=>{
  const x=setup(f);
  for(let i=0;i<6;i++)manageWorldEncounter(f.db,f.guild,{op:'propose',key:`candidate-extra-${i}`,actors:x.actors,
    source_event:x.source.event_key,location_key:'terminal',objective:'negotiation',environment:x.proposal.data.environment},'fixture-gm',x.library);
  const before=footprint(f.db);assert.equal(read(f,x).candidates.length,4);assert.equal(footprint(f.db),before);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'encounter_proposal',status:'pending',includeGM:true}).length,7);
}));

test('same-owner control revision invalidates prior descriptor without fabricating an encounter',()=>nativeFixture(f=>{
  const x=setup(f),proof=read(f,x).candidates[0];assert.ok(proof);
  f.db.assignCharacter(f.session.id,f.pcs[0].owner_user_id,f.pcs[0].id,{controlPolicy:'player_only'});
  assert.equal(inspectNativeEncounterCandidate(f.db,f.guild,proof,x.scope,{library:x.library}),null);
  assert.equal(read(f,x).candidates.length,1);assert.equal(f.db.getCurrentEncounter(f.session.id),null);
}));

for(const type of ['npc','location'])test(`${type} GM-private or unverified identity ancestry cannot be disclosed by a public proposal source`,()=>nativeFixture(f=>{
  const x=setup(f),id=type==='npc'?x.actors[0]:'terminal';assert.equal(read(f,x).candidates.length,1);
  const birth=indexWorldEvent(f.db,f.guild,{key:`private-birth:${type}`,kind:'native_narrative_entity',title:'Private birth',
    source_id:'native:narrative-authority',visibility:'gm',details:{entity_type:type,entity_key:id,input_source:x.source.event_key}},'fixture');
  f.db.saveCityRecord(f.guild,{kind:'autonomous_entity',key:`${type}:${id}`,status:'active',visibility:'gm',source_event:birth.event_key,
    data:{kind:type,key:id,name:id,narrative_origin:x.source.event_key}});
  assert.equal(read(f,x).candidates.length,0);assert.equal(f.db.getCurrentEncounter(f.session.id),null);
}));
