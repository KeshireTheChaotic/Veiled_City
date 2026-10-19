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

async function establishedSceneBeat(f,{privateScene=false}={}){
  const x=setup(f,{privateScene,messageId:`outbound-unit-${privateScene?'private':'party'}`}),
    content=new ContentIndex(path.resolve('../content')),
    input={version:8,kind:'narrative_request',operation:'describe_scene',source_refs:[]},
    result={act:true,gm_world_parts:[input],player_intents:[]};
  await authorNarrativeRequests({db:f.db,guild:f.guild,result,scope:x.scope,sourceRef:x.sourceRef,budget:{used:false},
    generate:async()=>({fiction_delta:[],narrative_units:[unit('lamp','scene','A brass lamp burns above the quiet terminal desk.',{
      location_key:'terminal',visibility:privateScene?'character':'party'})]})});
  const units=establishNarrativeUnits(f.db,f.guild,input,x.scope,x.sourceRef,{content});
  assert.equal(units.length,1,'fixture must pass native authoring and establishment');
  const partyScope={mode:'party'},ref=bindDirectorNarrativeSource(f.db,f.guild,{act:false},partyScope,'round',{},content),
    source=f.db.getWorldEvent(f.guild,ref),brief=directorBriefForAudience(f.db,f.guild,source,partyScope);
  return {f,x,units,partyScope,ref,source,brief};
}

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

test('W3 saved native beat revalidates after restart and deduplicates without writes or effects',()=>nativeFixture(async f=>{
  const x=await establishedSceneBeat(f),first=x.brief.world_bridge.beats.find(row=>row.kind==='established_world_change');assert(first);
  const before={units:f.db.listCityRecords(f.guild,{kind:'narrative_unit',includeGM:true,limit:100}).length,
    rolls:f.db.db.prepare('SELECT COUNT(*) n FROM rolls').get().n,pc:f.db.getCharacter(x.x.pc.id).data};
  f.restart();
  const brief=directorBriefForAudience(f.db,f.guild,f.db.getWorldEvent(f.guild,x.ref),x.partyScope),again=brief.world_bridge.beats.find(row=>row.kind==='established_world_change');
  assert.equal(again.id,first.id);assert.deepEqual(brief.world_bridge.beats.filter(row=>row.kind==='established_world_change').map(row=>row.id),[first.id]);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'narrative_unit',includeGM:true,limit:100}).length,before.units);
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM rolls').get().n,before.rolls);
  assert.deepEqual(f.db.getCharacter(x.x.pc.id).data,before.pc);
}));

test('W3 changed native payload or stale source/location holds the beat without changing the unit receipt',()=>nativeFixture(async f=>{
  const x=await establishedSceneBeat(f),row=x.units[0],actual=f.db.getCityRecord(f.guild,'narrative_unit',row.record_key);
  f.db.saveCityRecord(f.guild,{...actual,key:actual.record_key,data:{...actual.data,unit:{...actual.data.unit,text:'A changed unverified lamp claim.'}}});
  let brief=directorBriefForAudience(f.db,f.guild,f.db.getWorldEvent(f.guild,x.ref),x.partyScope);
  assert.equal(brief.world_bridge.beats.filter(beat=>beat.kind==='established_world_change').length,0);
  assert(brief.world_bridge.held>=1);
  f.db.saveCityRecord(f.guild,{...actual,key:actual.record_key});
  const origin=actual.data.binding.source;
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,origin);
  brief=worldDirectorBridgeBeats(f.db,f.guild,f.db.getWorldEvent(f.guild,x.ref),x.partyScope);
  assert.equal(brief.beats.filter(beat=>beat.kind==='established_world_change').length,0);
  assert(brief.held>=1);
}));

test('W3 a moved owner viewpoint cannot reuse an old location-bound native scene beat',()=>nativeFixture(async f=>{
  const x=await establishedSceneBeat(f);
  f.db.updateCharacterData(x.x.pc.id,data=>{data.location='annex';});
  const bridge=worldDirectorBridgeBeats(f.db,f.guild,f.db.getWorldEvent(f.guild,x.ref),x.partyScope);
  assert.equal(bridge.beats.filter(beat=>beat.kind==='established_world_change').length,0);
  assert(bridge.held>=1);
}));
