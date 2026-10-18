import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {captureWorldInput,worldInputKey} from '../src/autonomous-world.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {currentScene} from '../src/scene-continuity.js';
import * as salience from '../src/narrative-salience.js';
import {setup,run,unit,candidate} from './narrative-fixtures.mjs';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {establishNarrativeEntity} from '../src/autonomous-world.js';
import {ContentIndex} from '../src/content.js';
import path from 'node:path';
function fixture(f,visibility='party'){
  const pc=f.pcs[0],scope={mode:visibility==='party'?'party':'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  const origin=setup(f,{privateScene:visibility==='character',messageId:'salience-origin'});
  const entity=establishNarrativeEntity(f.db,f.guild,{kind:'npc',key:'mara',name:'Mara Lane',summary:'An ordinary parcel porter.',
    aliases:['Parcel Keeper'],location_key:'terminal',parent_location_key:'',role:'porter'},
  buildNarrativeContext(f.db,f.guild,scope,origin.sourceRef),{content:new ContentIndex(path.resolve('../content'))});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_memory:true,narrative_salience:true}});
  let sequence=0;const mention=(text='What happened to Parcel Keeper?',intents=[])=>{
    const id=`salience-${sequence++}`;captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,id,text,{privateScene:scope.mode==='private'});
    const ref=worldInputKey(id,pc.id);salience.noteNarrativeInterest(f.db,f.guild,scope,ref,{intents});return ref;};
  return {pc,scope,mention,key:'npc:mara',source:entity.source_event,origin};
}
test('N13 distinct owner mentions and interactions dominate scene-capped GM reuse; replay adds no score',()=>nativeFixture(async f=>{
  const x=fixture(f),ref=x.mention();x.mention();salience.noteNarrativeInterest(f.db,f.guild,x.scope,ref);
  assert.equal(salience.narrativeImportance(f.db,f.guild,x.key,x.scope).score,6);
  for(let i=0;i<10;i++)salience.noteNarrativeReuse(f.db,f.guild,{record_key:`unit-${i}`,source_event:x.source,
    visibility:'party',data:{binding:{scene:currentScene(f.db,f.guild).key},unit:{kind:'scene',subject_key:'mara',location_key:'remote'}}});
  await run(f,x.origin,{fiction_delta:[],narrative_units:[unit('porter','npc_speech','The sorting counter opens soon.',{subject_key:'mara'})]});
  assert.equal(salience.narrativeImportance(f.db,f.guild,x.key,x.scope).score,7);
}));

test('WD03 mutable simulation aliases cannot create source-verified interest',()=>nativeFixture(f=>{
  const x=fixture(f),row=f.db.getSimulationEntity(f.guild,'npc','mara');
  f.db.setSimulationEntity(f.guild,'npc','mara',{...row.state,aliases:[...row.state.aliases,'Forged Keeper']});
  x.mention('What about Forged Keeper?');
  assert.equal(salience.narrativeImportance(f.db,f.guild,x.key,x.scope),null);
  x.mention('What about Parcel Keeper?');assert.equal(salience.narrativeImportance(f.db,f.guild,x.key,x.scope).score,3);
}));
test('WD04 fabricated narrative reuse cannot create weight; real stored native units remain eligible',()=>nativeFixture(f=>{
  const x=fixture(f);
  salience.noteNarrativeReuse(f.db,f.guild,{record_key:'fake-unit',source_event:x.source,status:'accepted_established',visibility:'party',
    data:{binding:{scope:x.scope,scene:currentScene(f.db,f.guild).key},unit:{kind:'lead',subject_key:'mara',location_key:'terminal'}}});
  assert.equal(salience.narrativeImportance(f.db,f.guild,x.key,x.scope),null);
}));
test('WD03 native creation retraction removes interest eligibility without deleting the identity or resources',()=>nativeFixture(f=>{
  const x=fixture(f);x.mention();const before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.source);
  x.mention();assert.equal(salience.narrativeImportance(f.db,f.guild,x.key,x.scope)?.score||0,0);
  assert(f.db.getCityRecord(f.guild,'autonomous_entity',x.key));
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
}));
test('WD02 interaction weight requires an actual accepted owner source, not model-shaped intent data',()=>nativeFixture(async f=>{
  const x=fixture(f),firstRef=worldInputKey('salience-0',x.pc.id);
  x.mention('Mara Lane is nearby.',[{record_key:'fabricated-intent',status:'accepted_for_adjudication',data:{
    actor:x.pc.id,target_key:'mara',type:'interact',world_source_event:firstRef}}]);
  assert.equal(salience.narrativeImportance(f.db,f.guild,x.key,x.scope).score,3);
  const next=setup(f,{text:'Mara Lane, where is the sorting desk?',messageId:'salience-native-interaction'}),turn=candidate(next.text);
  turn.player_intents=[{...turn.player_intents[0],type:'speak',operation:'dialogue',target_key:'mara',target_name:'Mara Lane',utterance:next.text,resolution:'auto'}];
  const out=await run(f,next,{fiction_delta:[],narrative_units:[unit('response','npc_speech','The sorting desk is by the counter.',{subject_key:'mara'})]},turn);
  assert(out.rows.some(row=>row.payload.includes('sorting desk')));
  const interests=f.db.listCityRecords(f.guild,{kind:'narrative_interest',includeGM:true});
  assert.equal(interests.filter(row=>row.source_event===next.sourceRef&&row.data.reason==='interaction'&&row.data.weight===5).length,1);
  assert.equal(f.db.listCanon(f.guild,{includeGM:true}).length,0,'Retrieval interest cannot establish canon');
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
