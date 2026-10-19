/** Real native PvP Fear clock consequences enter the existing Director metadata consumer. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture,pvpTerms} from './v9-fixtures.mjs';
import {proposePvp,reviewPvp,respondPvp,choosePvp,rollPvp,progressPvp} from '../src/narrative-pvp.js';
import {establishFearContext,selectFearMove,applyFearMove,validateFearEffect,fearRevision} from '../src/pvp-fear-moves.js';
import {ContentIndex} from '../src/content.js';
import {bindDirectorNarrativeSource,directorBriefForAudience} from '../src/narrative-director-source.js';
import {canonicalNarrativeCause,worldDirectorBridgeBeats} from '../src/world-narrative-bridge.js';
import {openingWorldOpportunities} from '../src/opening-world-bridge.js';

function lock(f){
  const p=proposePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:f.accepted().record_key,opponent:f.pcs[1].id,
    terms:pvpTerms(f.pcs)});
  for(const pc of f.pcs.slice(0,2)){
    reviewPvp(f.db,f.guild,pc.owner_user_id,p.record_key);
    respondPvp(f.db,f.guild,pc.owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,
      decision:'accept',interaction_id:`clock-beat-accept:${pc.id}`});
  }
  return p;
}
function op(f,p,i){
  const v=progressPvp(f.db,f.guild,f.pcs[i].owner_user_id,p.record_key);
  return {proposal:p.record_key,expected_revision:p.data.terms_hash,round:v.round,expected_window_revision:v.window_revision,
    interaction_id:`clock-beat:${i}:${v.round}:${v.window_revision}`};
}
function pair(f,p){
  for(let i=0;i<2;i++)choosePvp(f.db,f.guild,f.pcs[i].owner_user_id,{...op(f,p,i),trait:'Agility',attempt:'I try a harmless feint.'});
  let result;
  for(const [i,faces] of [[3,10],[3,2]].entries()){
    let n=0;result=rollPvp(f.db,f.guild,f.pcs[i].owner_user_id,op(f,p,i),{rng:()=>faces[n++]});
  }
  return result;
}
function realClockEffect(f,{visibility='party',subject=null}={}){
  const p=lock(f);
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Terminal',access:'public',visibility:'party'});
  f.db.changeClock(f.guild,'closing-time',0,{label:'Closing time',max:6,visibility,
    subjectCharacterId:subject});
  pair(f,p);
  const trigger=f.db.listCityRecords(f.guild,{kind:'pvp_fear_trigger',includeGM:true,limit:100})[0];
  const context=establishFearContext(f.db,f.guild,'gm',{move_kind:'clock_advance',target_key:'closing-time',
    location_key:'terminal',visibility,subject_key:subject},{gm:true,interactionId:`clock-beat-context:${visibility}:${subject||'party'}`});
  const current=f.db.getCityRecord(f.guild,'pvp_fear_trigger',trigger.record_key);
  const decision=selectFearMove(f.db,f.guild,'gm',{trigger:trigger.record_key,expected_revision:current.data.revision,
    context:context.record_key,expected_target_revision:fearRevision(f.db.getClock(f.guild,'closing-time')),affected_actions:[]},
    {gm:true,interactionId:`clock-beat-select:${visibility}:${subject||'party'}`});
  const effect=applyFearMove(f.db,f.guild,'gm',{trigger:trigger.record_key,
    expected_revision:f.db.getCityRecord(f.guild,'pvp_fear_trigger',trigger.record_key).data.revision,decision:decision.record_key},{gm:true});
  assert.equal(validateFearEffect(f.db,f.guild,effect.record_key).record_key,effect.record_key);
  assert.equal(f.db.getClock(f.guild,'closing-time').value,1);
  return {effect,context,proposal:p};
}
function director(f,scope){
  const content=new ContentIndex(path.resolve('../content')),
    ref=bindDirectorNarrativeSource(f.db,f.guild,{act:false},scope,'round',{},content),source=f.db.getWorldEvent(f.guild,ref);
  return {ref,source,brief:directorBriefForAudience(f.db,f.guild,source,scope)};
}

test('W5 actual committed Fear clock consequence reaches the Director writer brief as bounded metadata',()=>nativeFixture(f=>{
  const {effect}=realClockEffect(f),bound=director(f,{mode:'party'}),beat=bound.brief.world_bridge.beats.find(row=>row.kind==='world_consequence');
  assert(beat,'a validated native clock consequence should be available to the actual Director brief reader');
  assert.equal(beat.effect_ref,effect.record_key);assert.equal(beat.protocol,'world_beat_v1');
  assert.equal(beat.audience.visibility,'party');assert.equal(beat.depth,1);
  assert.equal(beat.execution_authority,false);assert.equal(beat.publication_authority,false);
  assert.equal(Object.hasOwn(beat,'text'),false);assert.equal(Object.hasOwn(beat,'clock_value'),false);
}));

test('W5 private native clock consequence is same-owner only and never projects to party',()=>nativeFixture(f=>{
  const pc=f.pcs[0],effect=realClockEffect(f,{visibility:'character',subject:pc.id}).effect,
    privateScope={mode:'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id},bound=director(f,privateScope),
    beat=bound.brief.world_bridge.beats.find(row=>row.kind==='world_consequence');
  assert(beat);assert.equal(beat.effect_ref,effect.record_key);assert.equal(beat.audience.visibility,'character');
  assert.equal(beat.audience.character,pc.id);assert.equal(beat.audience.user,pc.owner_user_id);
  assert.equal(worldDirectorBridgeBeats(f.db,f.guild,bound.source,{mode:'party'}),null);
  const other={mode:'private',actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id};
  assert.equal(worldDirectorBridgeBeats(f.db,f.guild,bound.source,other),null);
}));

test('W5 revoked context source or changed receipt suppresses the saved clock beat',()=>nativeFixture(f=>{
  const {effect,context}=realClockEffect(f),bound=director(f,{mode:'party'}),beforeClock=f.db.getClock(f.guild,'closing-time');
  const original=f.db.getWorldEvent(f.guild,context.source_event);
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,context.source_event);
  let bridge=worldDirectorBridgeBeats(f.db,f.guild,bound.source,{mode:'party'});
  assert.equal(bridge.beats.filter(row=>row.kind==='world_consequence').length,0);assert(bridge.held>=1);
  assert.deepEqual(f.db.getClock(f.guild,'closing-time'),beforeClock);
  f.db.db.prepare("UPDATE world_events SET status='active',details_json=? WHERE guild_id=? AND event_key=?")
    .run(JSON.stringify(original.details),f.guild,context.source_event);
  f.db.db.prepare("UPDATE world_events SET details_json=json_set(details_json,'$.fixture_tamper','changed') WHERE guild_id=? AND event_key=?")
    .run(f.guild,context.source_event);
  bridge=worldDirectorBridgeBeats(f.db,f.guild,bound.source,{mode:'party'});
  assert.equal(bridge.beats.filter(row=>row.kind==='world_consequence').length,0);assert(bridge.held>=1);
  f.db.db.prepare("UPDATE world_events SET details_json=? WHERE guild_id=? AND event_key=?")
    .run(JSON.stringify(original.details),f.guild,context.source_event);
  const saved=f.db.getCityRecord(f.guild,'pvp_fear_effect_receipt',effect.record_key);
  f.db.saveCityRecord(f.guild,{...saved,key:saved.record_key,data:{...saved.data,effect_digest:'forged'}});
  bridge=worldDirectorBridgeBeats(f.db,f.guild,bound.source,{mode:'party'});
  assert.equal(bridge.beats.filter(row=>row.kind==='world_consequence').length,0);assert(bridge.held>=1);
  assert.deepEqual(f.db.getClock(f.guild,'closing-time'),beforeClock);
}));

test('W5 restart/duplicate reader and Opening consumer preserve one beat without writes or native effects',()=>nativeFixture(f=>{
  const {effect}=realClockEffect(f),bound=director(f,{mode:'party'}),initial=bound.brief.world_bridge.beats.find(row=>row.kind==='world_consequence');
  assert(initial);assert.equal(canonicalNarrativeCause(f.db,f.guild,bound.ref,{mode:'party'}),
    f.db.getCityRecord(f.guild,'pvp_fear_effect_receipt',effect.record_key).source_event);
  const before={clock:f.db.getClock(f.guild,'closing-time'),rolls:f.db.db.prepare('SELECT COUNT(*) n FROM rolls').get().n,
    effects:f.db.listCityRecords(f.guild,{kind:'pvp_fear_effect_receipt',includeGM:true,limit:100}).length};
  f.restart();
  const changes=f.db.db.prepare('SELECT total_changes() n').get().n;
  const stored=f.db.getWorldEvent(f.guild,bound.ref),again=directorBriefForAudience(f.db,f.guild,stored,{mode:'party'}),
    replay=worldDirectorBridgeBeats(f.db,f.guild,stored,{mode:'party'}).beats.filter(row=>row.kind==='world_consequence');
  assert.deepEqual(replay.map(row=>row.id),[initial.id]);
  const opened=openingWorldOpportunities(f.db,f.guild,{mode:'party'}).beats.find(row=>row.kind==='world_consequence');
  assert(opened);assert.equal(opened.signal_ref,effect.record_key);assert.equal(opened.execution_authority,false);
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM rolls').get().n,before.rolls);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_fear_effect_receipt',includeGM:true,limit:100}).length,before.effects);
  assert.deepEqual(f.db.getClock(f.guild,'closing-time'),before.clock);
  assert.equal(f.db.db.prepare('SELECT total_changes() n').get().n,changes,'Director and Opening readers are strictly read-only');
  assert.equal(directorBriefForAudience(f.db,f.guild,stored,{mode:'party'}).world_bridge.beats.find(row=>row.kind==='world_consequence').id,initial.id);
}));
