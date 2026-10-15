import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {captureWorldInput,worldInputKey} from '../src/autonomous-world.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {currentScene} from '../src/scene-continuity.js';
import * as salience from '../src/narrative-salience.js';
function fixture(f,visibility='party'){
  const pc=f.pcs[0],scope={mode:visibility==='party'?'party':'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_authority:true,narrative_memory:true,narrative_salience:true}});
  const e=indexWorldEvent(f.db,f.guild,{key:'salient-porter-source',kind:'native_narrative_entity',source_id:'native:narrative-authority',title:'Native synthetic porter',
    visibility,subject_key:visibility==='character'?pc.id:null,details:{},session_id:f.session.id,scene:currentScene(f.db,f.guild).key},'native:narrative-authority');
  f.db.upsertNpcProfile(f.guild,{npcKey:'mara',displayName:'Mara Lane',role:'porter'});
  f.db.setSimulationEntity(f.guild,'npc','mara',{location_key:'remote',visibility,subject_character_id:pc.id,aliases:['Parcel Keeper']});
  f.db.saveCityRecord(f.guild,{kind:'autonomous_entity',key:'npc:mara',status:'active',source_event:e.event_key,visibility,
    subject_key:visibility==='character'?pc.id:null,data:{kind:'npc',key:'mara',name:'Mara Lane',narrative_origin:e.event_key}});
  let sequence=0;const mention=(text='What happened to Parcel Keeper?',intents=[])=>{
    const id=`salience-${sequence++}`;captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,id,text,{privateScene:scope.mode==='private'});
    const ref=worldInputKey(id,pc.id);salience.noteNarrativeInterest(f.db,f.guild,scope,ref,{intents});return ref;};
  return {pc,scope,mention,key:'npc:mara',source:e.event_key};
}
test('N13 distinct owner mentions and interactions dominate scene-capped GM reuse; replay adds no score',()=>nativeFixture(f=>{
  const x=fixture(f),ref=x.mention();x.mention();salience.noteNarrativeInterest(f.db,f.guild,x.scope,ref);
  assert.equal(salience.narrativeImportance(f.db,f.guild,x.key,x.scope).score,6);
  for(let i=0;i<10;i++)salience.noteNarrativeReuse(f.db,f.guild,{record_key:`unit-${i}`,source_event:x.source,
    visibility:'party',data:{binding:{scene:currentScene(f.db,f.guild).key},unit:{kind:'scene',subject_key:'mara',location_key:'remote'}}});
  assert.equal(salience.narrativeImportance(f.db,f.guild,x.key,x.scope).score,7);
}));
test('N14 fictional-time decay archives context only; entitled alias reference revives it',()=>nativeFixture(f=>{
  const x=fixture(f);x.mention();f.db.advanceSimulationClock(f.guild,{ticks:30});salience.maintainNarrativeSalience(f.db,f.guild);
  assert.equal(salience.narrativeImportance(f.db,f.guild,x.key,x.scope).status,'prompt_archived');
  assert(f.db.getNpcProfile(f.guild,'mara'));assert.equal(f.db.getWorldEvent(f.guild,x.source).status,'active');
  x.mention();assert.equal(salience.narrativeImportance(f.db,f.guild,x.key,x.scope).status,'active');
}));
test('N15 open dependency and human proxy prevent prompt retirement',()=>nativeFixture(f=>{
  const x=fixture(f);x.mention();f.db.advanceSimulationClock(f.guild,{ticks:30});
  f.db.saveCityRecord(f.guild,{kind:'compound_action',key:'open-investigation',status:'active',visibility:'party',source_event:x.source,
    data:{status:'pending',target_key:'mara'}});
  salience.maintainNarrativeSalience(f.db,f.guild);assert.equal(salience.narrativeImportance(f.db,f.guild,x.key,x.scope).status,'active');
  f.db.saveCityRecord(f.guild,{kind:'compound_action',key:'open-investigation',status:'resolved',source_event:x.source,data:{status:'resolved'}});
  const proxy=f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:'mara',userId:f.pcs[3].owner_user_id});
  f.db.activateNpcProxy(proxy.id,f.pcs[3].owner_user_id);salience.maintainNarrativeSalience(f.db,f.guild);
  assert(salience.narrativeImportance(f.db,f.guild,x.key,x.scope).pins.includes('human_proxy'));
}));
test('N16 private interest and archive metadata never leak to another owner or party',()=>nativeFixture(f=>{
  const x=fixture(f,'character');x.mention();assert(salience.narrativeImportance(f.db,f.guild,x.key,x.scope));
  assert.equal(salience.narrativeImportance(f.db,f.guild,x.key,{mode:'party'}),null);
  assert.equal(salience.narrativeImportance(f.db,f.guild,x.key,{mode:'private',actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id}),null);
}));
test('N17 source retraction cannot create salience or revive archived material',()=>nativeFixture(f=>{
  const x=fixture(f),ref=x.mention();f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,ref);
  assert.throws(()=>salience.noteNarrativeInterest(f.db,f.guild,x.scope,ref),/source|owner|current/i);
  assert.equal(salience.narrativeImportance(f.db,f.guild,x.key,x.scope).score,0);
}));
test('N19 retrieval prioritizes exact/current evidence with bounded novelty; does not overwrite contradictory testimony',()=>nativeFixture(f=>{
  const x=fixture(f);x.mention();const rows=[
    {unit:'a',text:'Mara says the ferry left.',epistemic:'testimony',location:'remote'},
    {unit:'b',text:'Mara says the ferry is waiting.',epistemic:'testimony',location:'remote'},
    {unit:'c',text:'The current counter holds a red notice.',epistemic:'observation',location:'terminal'}];
  const ranked=salience.rankNarrativeMemory(f.db,f.guild,x.scope,rows,{query:'Mara',location:'terminal',maxChars:2000});
  assert.equal(ranked.length,3);assert(ranked.some(r=>r.text.includes('ferry left')));assert(ranked.some(r=>r.text.includes('ferry is waiting')));
  assert.equal(f.db.getWorldEvent(f.guild,x.source).status,'active');
}));
test('N14 generic memory expiry uses the native fictional clock, never the calendar configuration',()=>nativeFixture(f=>{
  const x=fixture(f),{source}=x;
  const input={kind:'detail',name:'Temporary notice',parent_key:'location:remote',aliases:[],source_event:source,visibility:'party',
    epistemic:'observation',summary:'The notice expires at the next fictional tick.',expires_tick:1};
  return import('../src/memory-lifecycle.js').then(({rememberEntity,retrieveMemoryRevisions})=>{
    rememberEntity(f.db,f.guild,input);assert.equal(retrieveMemoryRevisions(f.db,f.guild,x.scope).length,1);
    f.db.advanceSimulationClock(f.guild,{ticks:2});assert.equal(retrieveMemoryRevisions(f.db,f.guild,x.scope).length,0);
  });
}));
