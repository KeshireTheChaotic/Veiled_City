/** Real native PvP Fear clock consequences enter the existing Director metadata consumer. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture,pvpTerms} from './v9-fixtures.mjs';
import {proposePvp,reviewPvp,respondPvp,choosePvp,rollPvp,progressPvp} from '../src/narrative-pvp.js';
import {establishFearContext,selectFearMove,applyFearMove,validateFearEffect,fearRevision} from '../src/pvp-fear-moves.js';
import {ContentIndex} from '../src/content.js';
import {bindDirectorNarrativeSource,directorBriefForAudience} from '../src/narrative-director-source.js';
import {canonicalNarrativeCause,nativeFearClockConsequenceSnapshot,worldDirectorBridgeBeats} from '../src/world-narrative-bridge.js';
import {openingWorldOpportunities} from '../src/opening-world-bridge.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {sceneFictionHash as hash} from '../src/scene-fiction-context.js';
import {conversationPrincipal} from '../src/conversation-principal.js';
import {currentScene} from '../src/scene-continuity.js';

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

test('W5 private source snapshot pins current owner principal revision and holds it after control revision changes',()=>nativeFixture(f=>{
  const pc=f.pcs[0],scope={mode:'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  realClockEffect(f,{visibility:'character',subject:pc.id});
  const bound=director(f,scope),proof=bound.source.details.dramatic_brief.native_clock_consequences.receipts[0];
  assert.equal(proof.audience.user,pc.owner_user_id);assert(proof.principal_revision);
  assert.equal(conversationPrincipal(f.db,f.guild,pc.owner_user_id,pc.id).revision,proof.principal_revision);
  f.db.assignCharacter(f.session.id,pc.owner_user_id,pc.id);
  assert.notEqual(conversationPrincipal(f.db,f.guild,pc.owner_user_id,pc.id).revision,proof.principal_revision);
  const bridge=worldDirectorBridgeBeats(f.db,f.guild,bound.source,scope);
  assert.equal(bridge.beats.filter(row=>row.kind==='world_consequence').length,0);
  assert(bridge.held>=1);
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

test('W5 visible but substituted saved causation cannot retarget a validated clock effect',()=>nativeFixture(f=>{
  const {effect}=realClockEffect(f),bound=director(f,{mode:'party'}),details=structuredClone(bound.source.details),
    proof=details.dramatic_brief.native_clock_consequences.receipts[0];
  proof.causation_ref=bound.ref; // Existing visible Director event, but not this Fear effect's native context source.
  const key=`director-fiction:${hash(details)}`;
  indexWorldEvent(f.db,f.guild,{key,kind:'native_director_narrative_scope',title:'Tampered test snapshot',source_id:'native:director',
    visibility:'party',session_id:bound.source.session_id,scene:bound.source.scene,details},'native:director');
  const source=f.db.getWorldEvent(f.guild,key),bridge=worldDirectorBridgeBeats(f.db,f.guild,source,{mode:'party'});
  assert(bridge);assert.equal(bridge.beats.filter(row=>row.kind==='world_consequence').length,0);assert(bridge.held>=1);
  assert.equal(canonicalNarrativeCause(f.db,f.guild,key,{mode:'party'}),null);
  assert.equal(validateFearEffect(f.db,f.guild,effect.record_key).record_key,effect.record_key);
}));

test('W5 bounded snapshot scans beyond 100 scoped records but validates only native candidates',()=>nativeFixture(f=>{
  const {context}=realClockEffect(f),scene=currentScene(f.db,f.guild).key;
  const source=f.db.getWorldEvent(f.guild,context.source_event);
  for(let i=0;i<101;i++)f.db.saveCityRecord(f.guild,{kind:'pvp_fear_effect_receipt',key:`held-clock-candidate:${i}`,
    status:'held',source_event:source.event_key,visibility:'party',data:{version:1,session:f.session.id,scene,
      move_kind:'clock_advance',target:'closing-time',fixture:'not-a-verified-receipt'}});
  const counts={city_pages:0,candidate_pages:0,city_record_reads:0,receipt_gets:0,event_reads:0,mutation_reads:0},
    list=f.db.listCityRecords.bind(f.db),getRecord=f.db.getCityRecord.bind(f.db),getEvent=f.db.getWorldEvent.bind(f.db),getMutation=f.db.getMutation.bind(f.db);
  f.db.listCityRecords=(guild,options)=>{counts.city_pages++;if(options?.kind==='pvp_fear_effect_receipt')counts.candidate_pages++;return list(guild,options);};
  f.db.getCityRecord=(guild,kind,key)=>{counts.city_record_reads++;if(kind==='pvp_fear_effect_receipt')counts.receipt_gets++;return getRecord(guild,kind,key);};
  f.db.getWorldEvent=(guild,key)=>{counts.event_reads++;return getEvent(guild,key);};
  f.db.getMutation=(guild,id)=>{counts.mutation_reads++;return getMutation(guild,id);};
  let snapshot;
  try{snapshot=nativeFearClockConsequenceSnapshot(f.db,f.guild,{mode:'party'});}
  finally{f.db.listCityRecords=list;f.db.getCityRecord=getRecord;f.db.getWorldEvent=getEvent;f.db.getMutation=getMutation;}
  assert.equal(snapshot.receipts.length,1);assert.equal(snapshot.validated,1);assert.equal(snapshot.scanned,1);
  assert.equal(snapshot.overflow,false);assert.equal(counts.candidate_pages,2);
  assert.deepEqual(counts,{city_pages:4,candidate_pages:2,city_record_reads:31,receipt_gets:2,event_reads:16,mutation_reads:1},
    'measured source reads for one valid receipt after 101 newer nonreceipt rows');
}));

test('W5 snapshot stops at its native validation budget and marks omitted history as truncated',()=>nativeFixture(f=>{
  const {effect,context}=realClockEffect(f),actual=f.db.getCityRecord(f.guild,'pvp_fear_effect_receipt',effect.record_key),
    source=f.db.getWorldEvent(f.guild,context.source_event);
  for(let i=0;i<33;i++){
    const data={...actual.data,trigger:`forged-budget-trigger-${i}`},key=`pvp-fear-effect:${data.trigger}`;
    const {effect_digest,...material}=data;data.effect_digest=hash(material);
    f.db.saveCityRecord(f.guild,{kind:'pvp_fear_effect_receipt',key,status:'resolved',source_event:source.event_key,
      visibility:'party',data});
  }
  const bound=director(f,{mode:'party'}),sidecar=bound.source.details.dramatic_brief.native_clock_consequences;
  assert.equal(sidecar.validated,32);assert.equal(sidecar.scanned,33);assert.equal(sidecar.overflow,true);
  assert.equal(sidecar.receipts.length,0,'forged candidates cannot be selected as native outcomes');
  assert.equal(bound.brief.world_bridge.beats.filter(row=>row.kind==='world_consequence').length,0);
  assert.equal(bound.brief.world_bridge.omission_truncated,true);
}));

test('W5 forged resolved native-looking receipt is held and cannot displace the actual mutation receipt',()=>nativeFixture(f=>{
  const {effect,context}=realClockEffect(f),actual=f.db.getCityRecord(f.guild,'pvp_fear_effect_receipt',effect.record_key),
    forgedData={...actual.data,trigger:'forged-clock-trigger'},forgedKey=`pvp-fear-effect:${forgedData.trigger}`;
  const {effect_digest,...material}=forgedData;forgedData.effect_digest=hash(material);
  f.db.saveCityRecord(f.guild,{kind:'pvp_fear_effect_receipt',key:forgedKey,status:'resolved',source_event:context.source_event,
    visibility:'party',data:forgedData});
  indexWorldEvent(f.db,f.guild,{key:'forged-clock-consequence-event',kind:'pvp_fear_effect_receipt',title:'Forged fixture label',
    source_id:'native:autonomous_pvp_fear',visibility:'party',session_id:f.session.id,scene:currentScene(f.db,f.guild).key,
    details:{effect:forgedKey,move_kind:'clock_advance',authority:'native'}},'native:autonomous_pvp_fear');
  const bound=director(f,{mode:'party'}),refs=bound.source.details.dramatic_brief.native_clock_consequences.receipts,
    beats=bound.brief.world_bridge.beats.filter(row=>row.kind==='world_consequence');
  assert.deepEqual(refs.map(row=>row.key),[effect.record_key]);assert.deepEqual(beats.map(row=>row.effect_ref),[effect.record_key]);
  assert.throws(()=>validateFearEffect(f.db,f.guild,forgedKey),/native|trigger|Fear/i);
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
