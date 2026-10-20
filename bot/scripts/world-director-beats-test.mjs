/** Outbound Director beat projection from real established native narrative receipts. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,unit} from './narrative-fixtures.mjs';
import {ContentIndex} from '../src/content.js';
import {authorNarrativeRequests,establishNarrativeUnits} from '../src/narrative-authority.js';
import {worldDirectorBridgeBeats} from '../src/world-narrative-bridge.js';
import {bindDirectorNarrativeSource,directorBriefForAudience} from '../src/narrative-director-source.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {currentScene} from '../src/scene-continuity.js';
import {conversationPrincipal} from '../src/conversation-principal.js';
import {openingWorldOpportunities} from '../src/opening-world-bridge.js';

async function establishedSceneBeat(f,{privateScene=false,audienceMode=null}={}){
  const x=setup(f,{privateScene,messageId:`outbound-unit-${privateScene?'private':'party'}`}),
    content=new ContentIndex(path.resolve('../content')),
    input={version:8,kind:'narrative_request',operation:'describe_scene',source_refs:[]},
    result={act:true,gm_world_parts:[input],player_intents:[]};
  await authorNarrativeRequests({db:f.db,guild:f.guild,result,scope:x.scope,sourceRef:x.sourceRef,budget:{used:false},
    generate:async()=>({fiction_delta:[],narrative_units:[unit('lamp','scene','A brass lamp burns above the quiet terminal desk.',{
      location_key:'terminal',visibility:privateScene?'character':'party'})]})});
  const units=establishNarrativeUnits(f.db,f.guild,input,x.scope,x.sourceRef,{content});
  assert.equal(units.length,1,'fixture must pass native authoring and establishment');
  const directorScope=audienceMode==='private'?x.scope:audienceMode==='owner_private'
    ?{mode:'private',actorUserId:x.pc.owner_user_id,actorCharacterId:x.pc.id}: {mode:'party'},
    ref=bindDirectorNarrativeSource(f.db,f.guild,{act:false},directorScope,'round',{},content),
    source=f.db.getWorldEvent(f.guild,ref),brief=directorBriefForAudience(f.db,f.guild,source,directorScope);
  return {f,x,units,directorScope,ref,source,brief};
}

for(const kind of ['npc_speech','npc_action_attempt','lead'])test(`W3 actual ${kind} receipt is an offer/opportunity, never a completed PC consequence`,()=>nativeFixture(async f=>{
  const x=setup(f,{messageId:`director-native-${kind}`}),content=new ContentIndex(path.resolve('../content')),
    input={version:8,kind:'narrative_request',operation:'conversation',source_refs:[]},result={act:true,gm_world_parts:[input],player_intents:[]},
    npc={kind:'npc',key:'native-parcel-clerk',name:'Mira Vale',summary:'An ordinary parcel clerk.',role:'parcel clerk',
      location_key:'terminal',parent_location_key:'',aliases:[]};
  const text=kind==='npc_speech'?'Would you like directions?':kind==='npc_action_attempt'?'Mira begins to inspect the notice board.':'An unclaimed shift might be available at the counter.';
  await authorNarrativeRequests({db:f.db,guild:f.guild,result,scope:x.scope,sourceRef:x.sourceRef,budget:{used:false},
    generate:async()=>({fiction_delta:[npc],narrative_units:[unit('offer',kind,text,{subject_key:kind==='lead'?'':npc.key})]})});
  const rows=establishNarrativeUnits(f.db,f.guild,input,x.scope,x.sourceRef,{content});assert.equal(rows.length,1);
  const ref=bindDirectorNarrativeSource(f.db,f.guild,{act:false},{mode:'party'},'round',{},content),source=f.db.getWorldEvent(f.guild,ref),
    brief=directorBriefForAudience(f.db,f.guild,source,{mode:'party'}),expected=kind==='lead'?'scene_opportunity':'npc_intention_or_offer',
    beat=brief.world_bridge.beats.find(b=>b.kind===expected);
  assert(beat);assert.equal(beat.execution_authority,false);assert.equal(beat.publication_authority,false);
  assert.notEqual(beat.epistemic,'native_outcome');assert.equal(Object.hasOwn(beat,'text'),false);
  assert.equal(brief.world_bridge.beats.some(b=>b.kind==='world_consequence'),false);
  assert.equal(openingWorldOpportunities(f.db,f.guild,{mode:'party'}).beats.some(b=>b.kind===expected),true);
  f.restart();assert(directorBriefForAudience(f.db,f.guild,f.db.getWorldEvent(f.guild,ref),{mode:'party'}).world_bridge.beats.some(b=>b.id===beat.id));
}));

test('W3 actual Director writer consumer receives a nonauthorizing established-world beat from a native scene unit',()=>nativeFixture(async f=>{
  const x=await establishedSceneBeat(f),beat=x.brief.world_bridge.beats.find(row=>row.kind==='established_world_change');
  assert(beat,'accepted native scene unit should project a typed established-world beat');
  assert.equal(beat.protocol,'world_beat_v1');assert.equal(beat.audience.visibility,'party');
  assert.equal(beat.epistemic,'observation');assert.equal(beat.execution_authority,false);assert.equal(beat.publication_authority,false);
  assert.equal(beat.source_ref,x.ref);assert.equal(beat.depth,1);
  assert.equal(beat.location,'terminal');assert.equal(Object.hasOwn(beat,'text'),false,'beat carries no prose or secret payload');
}));

test('W3 private native unit is not projected to actorless party Director consumer',()=>nativeFixture(async f=>{
  const x=await establishedSceneBeat(f,{privateScene:true});
  assert.equal(x.brief.world_bridge.beats.filter(row=>row.kind==='established_world_change').length,0);
}));

test('W3 same-owner private Director receives only its original character-private native unit',()=>nativeFixture(async f=>{
  const x=await establishedSceneBeat(f,{privateScene:true,audienceMode:'private'}),beat=x.brief.world_bridge.beats.find(row=>row.kind==='established_world_change');
  assert(beat);assert.equal(beat.audience.visibility,'character');assert.equal(beat.audience.character,x.x.pc.id);
  assert.equal(beat.execution_authority,false);assert.equal(beat.publication_authority,false);
}));

test('W3 another owner cannot retrieve a character-private Director beat',()=>nativeFixture(async f=>{
  const x=await establishedSceneBeat(f,{privateScene:true,audienceMode:'private'}),other={mode:'private',
    actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id};
  assert.equal(worldDirectorBridgeBeats(f.db,f.guild,x.source,other),null);
}));

test('W3 a proxy-controlled role cannot retrieve the former owner private beat',()=>nativeFixture(async f=>{
  const x=await establishedSceneBeat(f,{privateScene:true,audienceMode:'private'}),proxyUser=f.pcs[1].owner_user_id;
  f.db.assignCharacter(f.session.id,x.x.pc.owner_user_id,x.x.pc.id,{controlPolicy:'proxy',proxyUserId:proxyUser});
  assert.equal(conversationPrincipal(f.db,f.guild,proxyUser,x.x.pc.id).kind,'pc_proxy');
  assert.equal(worldDirectorBridgeBeats(f.db,f.guild,x.source,{mode:'private',actorUserId:proxyUser,actorCharacterId:x.x.pc.id}),null);
}));

test('W3 a party unit is held from private Director projection without a private-viewer proof',()=>nativeFixture(async f=>{
  const x=await establishedSceneBeat(f,{audienceMode:'owner_private'});
  assert.equal(x.brief.world_bridge.beats.filter(row=>row.kind==='established_world_change').length,0);
}));

test('W3 direct reader checks exact native event revision and performs no writes',()=>nativeFixture(async f=>{
  const x=await establishedSceneBeat(f),event=x.f.db.getWorldEvent(f.guild,x.units[0].source_event),
    before=x.f.db.db.prepare('SELECT total_changes() n').get().n;
  assert(worldDirectorBridgeBeats(f.db,f.guild,x.source,x.directorScope).beats.some(row=>row.kind==='established_world_change'));
  assert.equal(f.db.db.prepare('SELECT total_changes() n').get().n,before,'positive read is write-free');
  f.db.db.prepare("UPDATE world_events SET details_json=json_set(details_json,'$.fixture_metadata','tampered') WHERE guild_id=? AND event_key=?")
    .run(f.guild,event.event_key);
  const changed=f.db.getWorldEvent(f.guild,event.event_key),afterMutation=f.db.db.prepare('SELECT total_changes() n').get().n;
  assert(afterMutation>before,'fixture mutates only the event after its saved Director snapshot');
  const bridge=worldDirectorBridgeBeats(f.db,f.guild,x.source,x.directorScope);
  assert.equal(bridge.beats.filter(row=>row.kind==='established_world_change').length,0);
  assert(bridge.held>=1);assert.notEqual(changed.details.fixture_metadata,undefined);
  assert.equal(f.db.db.prepare('SELECT total_changes() n').get().n,afterMutation,'reader itself does not mutate campaign state');
}));

test('W3 a changed authenticated owner control revision holds the prior scene beat',()=>nativeFixture(async f=>{
  const x=await establishedSceneBeat(f);
  f.db.assignCharacter(f.session.id,x.x.pc.owner_user_id,x.x.pc.id);
  const bridge=worldDirectorBridgeBeats(f.db,f.guild,x.source,x.directorScope);
  assert.equal(bridge.beats.filter(row=>row.kind==='established_world_change').length,0,'new control revision invalidates prior author binding');
}));

test('W3 source-envelope and unit/source mismatch hold the prior scene beat',()=>nativeFixture(async f=>{
  const x=await establishedSceneBeat(f),origin=x.x.sourceRef,unitRow=x.units[0],original=f.db.getWorldEvent(f.guild,origin);
  f.db.db.prepare('UPDATE world_events SET details_json=json_set(details_json,\'$.author\',?) WHERE guild_id=? AND event_key=?')
    .run('forged-owner',f.guild,origin);
  let bridge=worldDirectorBridgeBeats(f.db,f.guild,x.source,x.directorScope);
  assert.equal(bridge.beats.filter(row=>row.kind==='established_world_change').length,0,'source envelope author must remain the original owner');
  f.db.db.prepare('UPDATE world_events SET details_json=? WHERE guild_id=? AND event_key=?')
    .run(JSON.stringify(original.details),f.guild,origin);
  const changed=f.db.getCityRecord(f.guild,'narrative_unit',unitRow.record_key);
  f.db.saveCityRecord(f.guild,{...changed,key:changed.record_key,data:{...changed.data,binding:{...changed.data.binding,source:'unrelated-source'}}});
  bridge=worldDirectorBridgeBeats(f.db,f.guild,x.source,x.directorScope);
  assert.equal(bridge.beats.filter(row=>row.kind==='established_world_change').length,0,'row binding must match source event payload');
}));

test('W3 loss of current owner attendance or control cannot retain a saved beat',()=>nativeFixture(async f=>{
  const x=await establishedSceneBeat(f);
  f.db.setPresence(f.session.id,x.x.pc.owner_user_id,'absent');
  const bridge=worldDirectorBridgeBeats(f.db,f.guild,x.source,x.directorScope);
  assert.equal(bridge.beats.filter(row=>row.kind==='established_world_change').length,0);
  assert(bridge.held>=1);
}));

test('W3 forged native narrative event without the matching established unit is held',()=>nativeFixture(async f=>{
  const x=setup(f,{messageId:'forged-native-unit-event'}),content=new ContentIndex(path.resolve('../content')),
    fake=indexWorldEvent(f.db,f.guild,{key:'forged-native-unit:source',kind:'native_narrative_unit',title:'Forged fixture event',
      source_id:'native:narrative-authority',session_id:f.session.id,scene:currentScene(f.db,f.guild).key,
      location_key:'terminal',visibility:'party',details:{payload_hash:'not-a-native-unit',epistemic:'observation',input_source:x.sourceRef}},'native:narrative-authority'),
    ref=bindDirectorNarrativeSource(f.db,f.guild,{act:false},{mode:'party'},'round',{},content),source=f.db.getWorldEvent(f.guild,ref),
    bridge=worldDirectorBridgeBeats(f.db,f.guild,source,{mode:'party'});
  assert(bridge);assert.equal(bridge.beats.filter(row=>row.kind==='established_world_change').length,0);assert(bridge.held>=1);
  assert.equal(f.db.getWorldEvent(f.guild,fake.event_key).source_id,'native:narrative-authority');
}));

test('W3 saved native beat revalidates after restart and deduplicates without writes or effects',()=>nativeFixture(async f=>{
  const x=await establishedSceneBeat(f),first=x.brief.world_bridge.beats.find(row=>row.kind==='established_world_change');assert(first);
  const before={units:f.db.listCityRecords(f.guild,{kind:'narrative_unit',includeGM:true,limit:100}).length,
    rolls:f.db.db.prepare('SELECT COUNT(*) n FROM rolls').get().n,pc:f.db.getCharacter(x.x.pc.id).data};
  f.restart();
  const brief=directorBriefForAudience(f.db,f.guild,f.db.getWorldEvent(f.guild,x.ref),x.directorScope),again=brief.world_bridge.beats.find(row=>row.kind==='established_world_change');
  assert.equal(again.id,first.id);assert.deepEqual(brief.world_bridge.beats.filter(row=>row.kind==='established_world_change').map(row=>row.id),[first.id]);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'narrative_unit',includeGM:true,limit:100}).length,before.units);
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM rolls').get().n,before.rolls);
  assert.deepEqual(f.db.getCharacter(x.x.pc.id).data,before.pc);
}));

test('W3 changed native payload or stale source/location holds the beat without changing the unit receipt',()=>nativeFixture(async f=>{
  const x=await establishedSceneBeat(f),row=x.units[0],actual=f.db.getCityRecord(f.guild,'narrative_unit',row.record_key);
  f.db.saveCityRecord(f.guild,{...actual,key:actual.record_key,data:{...actual.data,unit:{...actual.data.unit,text:'A changed unverified lamp claim.'}}});
  let brief=directorBriefForAudience(f.db,f.guild,f.db.getWorldEvent(f.guild,x.ref),x.directorScope);
  assert.equal(brief.world_bridge.beats.filter(beat=>beat.kind==='established_world_change').length,0);
  assert(brief.world_bridge.held>=1);
  f.db.saveCityRecord(f.guild,{...actual,key:actual.record_key});
  const origin=actual.data.binding.source;
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,origin);
  brief=worldDirectorBridgeBeats(f.db,f.guild,f.db.getWorldEvent(f.guild,x.ref),x.directorScope);
  assert.equal(brief.beats.filter(beat=>beat.kind==='established_world_change').length,0);
  assert(brief.held>=1);
}));

test('W3 a moved owner viewpoint cannot reuse an old location-bound native scene beat',()=>nativeFixture(async f=>{
  const x=await establishedSceneBeat(f);
  f.db.updateCharacterData(x.x.pc.id,data=>{data.location='annex';});
  const bridge=worldDirectorBridgeBeats(f.db,f.guild,f.db.getWorldEvent(f.guild,x.ref),x.directorScope);
  assert.equal(bridge.beats.filter(beat=>beat.kind==='established_world_change').length,0);
  assert(bridge.held>=1);
}));

test('W3 OpeningDirector consumes verified beats but cannot revive a changed event snapshot',()=>nativeFixture(async f=>{
  const x=await establishedSceneBeat(f),opening=openingWorldOpportunities(f.db,f.guild,x.directorScope),
    beat=opening.beats.find(row=>row.kind==='established_world_change');
  assert(beat);assert.equal(beat.epistemic,'observation');assert.equal(beat.fictional_scope,'nonmechanical_established_scene');
  assert.equal(beat.publication_authority,false);assert.equal(beat.execution_authority,false);
  assert.equal(Object.hasOwn(beat,'text'),false);
  f.restart();
  assert.deepEqual(openingWorldOpportunities(f.db,f.guild,x.directorScope),opening);
  f.db.db.prepare("UPDATE world_events SET details_json=json_set(details_json,'$.fixture_metadata','changed-after-opening') WHERE guild_id=? AND event_key=?")
    .run(f.guild,x.units[0].source_event);
  const stale=openingWorldOpportunities(f.db,f.guild,x.directorScope);
  assert.equal(stale.beats.filter(row=>row.kind==='established_world_change').length,0);
}));
