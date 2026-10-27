import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createSceneContinuity} from '../../src/frameworks/session/public.js';
import {RANGE_BANDS} from '../../src/frameworks/daggerheart/public.js';
import {cityObject,cityKey,cityVisibility,cityAudit,indexWorldEvent,requireCitySource} from '../../src/frameworks/world/public.js';
import {activeCityProxy} from '../../src/city-constraints.js';
import {nativeMovementConditionIssue} from '../../src/native-group-features.js';
import {motivationKey} from '../../src/frameworks/npc/public.js';
import * as original from '../../src/scene-continuity.js';

function chamber(t){
 const folder=mkdtempSync(join(tmpdir(),'rf04-scene-c02-')),file=join(folder,'scene.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema),movementIssue=null;db.ensureCampaign('chamber');db.setCityCalendar('chamber',{flags:{scene_continuity:true}});db.upsertPlayer('chamber','owner','Owner');db.upsertPlayer('chamber','proxy','Proxy');const pc=db.createCharacter('chamber','owner','Mira'),session=db.startSession('chamber','Current chamber');db.assignCharacter(session.id,'owner',pc.id);db.setPresence(session.id,'owner','present');for(const key of ['atrium','garden'])db.setSimulationEntity('chamber','location',key,{name:key});for(const key of ['guide','porter']){db.upsertNpcProfile('chamber',{npcKey:key,displayName:key});db.setSimulationEntity('chamber','npc',key,{activity_tier:'supporting',location_key:'atrium'});}const api=createSceneContinuity({cityObject,cityKey,cityVisibility,cityAudit,indexWorldEvent,requireCitySource,activeCityProxy,nativeMovementConditionIssue:(...args)=>movementIssue||nativeMovementConditionIssue(...args)});
 const source=(key,patch={})=>indexWorldEvent(db,'chamber',{key,title:'A recorded scene observation',source_id:'gm:'+key,visibility:'party',location_key:'atrium',...patch});
 const mark=(entity_type,entity_key,source_event,patch={})=>api.recordScenePresence(db,'chamber',{entity_type,entity_key,source_event,location_key:'atrium',zone:'floor',visibility:'party',...(entity_type==='character'?{accepted_by:'owner'}:{}),...patch},'owner');
 const npc=(key,patch={})=>{source('presence-'+key);return mark('npc',key,'presence-'+key,patch);};const access=(patch={})=>api.sceneAccess(db,'chamber',{observer_type:'npc',observer_key:'guide',target_type:'npc',target_key:'porter',...patch});
 t.after(()=>{db.close();rmSync(folder,{recursive:true,force:true});});return {api,get db(){return db;},pc,session,source,mark,npc,access,setMovementIssue:v=>movementIssue=v,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('current scene and descriptive range labels preserve source API identity and attendance never implies PC presence',t=>{
 const f=chamber(t);assert.deepEqual(RANGE_BANDS,['Melee','Very Close','Close','Far','Very Far']);assert.equal(f.api.currentScene(f.db,'chamber').session_id,f.session.id);assert.equal(f.api.scenePresence(f.db,'chamber','character',f.pc.id),null);assert.equal(f.api.lastVerifiedCharacterPresence(f.db,'chamber',f.pc),null);assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);assert.equal(f.db.listCityRecords('chamber',{kind:'scene_presence',includeGM:true}).length,0);
});

test('actual owner-established native arrival uses original key bytes and replays without extra source or position mutation',t=>{
 const f=chamber(t);f.db.updateCharacterData(f.pc.id,data=>{data.location='atrium';});const pc=f.db.getCharacter(f.pc.id),row=f.api.recordCharacterArrival(f.db,'chamber',pc,'owner','owner-arrival'),key='arrival:'+motivationKey(['owner-arrival',pc.id]);assert.equal(row.source_event,key);assert.equal(f.db.getWorldEvent('chamber',key).kind,'arrival');assert.equal(row.data.entity_key,pc.id);assert.equal(row.data.state,'actually_present');const count=f.db.listWorldEvents('chamber',{includeGM:true}).length;f.reopen();assert.deepEqual(f.api.recordCharacterArrival(f.db,'chamber',f.db.getCharacter(pc.id),'owner','owner-arrival'),row);assert.equal(f.db.listWorldEvents('chamber',{includeGM:true}).length,count);
});

test('PC descriptive presence needs current attendance, the actual owner and an established source location',t=>{
 const f=chamber(t);f.source('position');assert.throws(()=>f.mark('character',f.pc.id,'position',{accepted_by:'proxy'}),/explicit owner-established/);f.db.setPresence(f.session.id,'owner','absent');assert.throws(()=>f.mark('character',f.pc.id,'position'),/Absent or unrelated/);f.db.setPresence(f.session.id,'owner','present');assert.throws(()=>f.mark('character',f.pc.id,'position',{location_key:'garden'}),/Source event must establish/);assert.equal(f.db.listCityRecords('chamber',{kind:'scene_presence',includeGM:true}).length,0);
});

test('NPC must actually reach its location and a live human proxy retains voluntary presence control',t=>{
 const f=chamber(t);f.db.setSimulationEntity('chamber','npc','guide',{location_key:'garden'});assert.throws(()=>f.npc('guide'),/actually reach/);f.db.setSimulationEntity('chamber','npc','guide',{location_key:'atrium'});f.db.setPresence(f.session.id,'proxy','guest');f.db.upsertNpcProxy('chamber',f.session.id,{npcName:'Guide',userId:'proxy',status:'active'});assert.throws(()=>f.npc('guide'),/Proxy controls voluntary presence/);assert.equal(f.npc('guide',{proxy_consent_by:'proxy'}).data.entity_key,'guide');
});

test('observer access requires both actual current positions and never converts belief or later world movement into presence',t=>{
 const f=chamber(t);f.npc('guide');f.npc('porter',{state:'believed_present'});assert.equal(f.access(),false);f.source('porter-confirmed');f.mark('npc','porter','porter-confirmed');assert.equal(f.access(),true);f.db.setSimulationEntity('chamber','npc','porter',{location_key:'garden'});assert.equal(f.access(),false);assert.equal(f.db.getSimulationEntity('chamber','npc','guide').state.location_key,'atrium');
});

test('source-grounded barriers block only their recorded sense and observer views omit inaccessible occupants and GM metadata',t=>{
 const f=chamber(t);f.npc('guide');f.npc('porter',{zone:'alcove'});f.source('screen');f.mark('barrier','screen','screen',{zone:'floor',to_zone:'alcove',blocks:['sight']});assert.equal(f.access({sense:'sight'}),false);assert.equal(f.access({sense:'sound'}),true);const view=f.api.sceneView(f.db,'chamber',{observer_type:'npc',observer_key:'guide'});assert.equal(view.occupants.some(r=>r.entity_key==='porter'),false);assert.ok(view.occupants.every(r=>r.data===undefined&&r.hidden===undefined&&r.known_to===undefined));assert.equal(f.api.sceneView(f.db,'chamber',{gm:true}).occupants.some(r=>r.data.entity_key==='porter'),true);
});

test('hidden actor is unavailable until explicitly known to that observer and private sources cannot be relabeled public',t=>{
 const f=chamber(t);f.npc('guide');f.npc('porter',{hidden:true});assert.equal(f.access(),false);f.source('known-hidden');f.mark('npc','porter','known-hidden',{hidden:true,known_to:['npc:guide']});assert.equal(f.access(),true);f.source('private-observation',{visibility:'character',subject_key:f.pc.id});assert.throws(()=>f.mark('evidence','private-note','private-observation',{visibility:'party'}),/Private source requires a legitimate disclosure/);assert.equal(f.db.listCityRecords('chamber',{kind:'scene_presence',query:'private-note',includeGM:true}).length,0);
});

test('departed actor cannot reappear from generic prose; committed actor-specific arrival is required for reconciliation',t=>{
 const f=chamber(t);f.npc('porter',{state:'departed'});f.source('generic-return');assert.throws(()=>f.mark('npc','porter','generic-return'),/Reappearance requires/);assert.throws(()=>f.api.reconcileSceneArrival(f.db,'chamber',{type:'npc',key:'porter',source_event:'generic-return'}),/actor-specific arrival/);f.source('native-travel',{kind:'travel',details:{entity_type:'npc',entity_key:'porter'}});const row=f.api.reconcileSceneArrival(f.db,'chamber',{type:'npc',key:'porter',source_event:'native-travel'});assert.equal(row.data.state,'actually_present');assert.equal(row.data.history[0].state,'departed');
});

test('native movement-condition hold prevents descriptive relocation without changing PC resources or prior presence',t=>{
 const f=chamber(t);f.source('first-owner-position');const first=f.mark('character',f.pc.id,'first-owner-position');f.source('second-owner-position');f.setMovementIssue('existing native movement condition needs step-distance proof');assert.throws(()=>f.mark('character',f.pc.id,'second-owner-position',{zone:'alcove'}),/native step-distance proof/);assert.deepEqual(f.api.scenePresence(f.db,'chamber','character',f.pc.id),first);assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);
});

test('scene archival preserves native last verified position as read-only history without minting a new arrival or witness',t=>{
 const f=chamber(t);f.db.updateCharacterData(f.pc.id,data=>{data.location='atrium';});const arrival=original.recordCharacterArrival(f.db,'chamber',f.db.getCharacter(f.pc.id),'owner','historic-arrival');f.db.setDirectorState(f.session.id,{scene_number:2,scene_label:'Next scene'});assert.equal(f.api.scenePresence(f.db,'chamber','character',f.pc.id),null);assert.equal(f.db.getCityRecord('chamber','scene_presence',arrival.record_key).status,'archived');const before=f.db.cityRecordCounts('chamber'),last=f.api.lastVerifiedCharacterPresence(f.db,'chamber',f.db.getCharacter(f.pc.id));assert.equal(last.source_event,arrival.source_event);assert.equal(last.data.zone,'scene');assert.deepEqual(f.db.cityRecordCounts('chamber'),before);f.db.updateCharacterData(f.pc.id,data=>{data.travel={status:'in_transit'};});assert.equal(f.api.lastVerifiedCharacterPresence(f.db,'chamber',f.db.getCharacter(f.pc.id)),null);
});

test('presence audit failure rolls descriptive state and history back inside actual SQLite',t=>{
 const f=chamber(t);f.source('source');const record=f.db.recordMutation;f.db.recordMutation=function(g,row){if(row.mutationType==='scene_presence')throw Error('C02 scene audit failure');return record.call(this,g,row);};assert.throws(()=>f.mark('npc','guide','source'),/C02 scene/);f.db.recordMutation=record;assert.equal(f.api.scenePresence(f.db,'chamber','npc','guide'),null);assert.equal(f.mark('npc','guide','source').data.entity_key,'guide');
});

test('retained NPC evidence policy uses actual moved scene access and strict historical observer evidence, never proximity alone',t=>{
 const f=chamber(t);f.npc('guide');f.npc('porter');f.source('witnessless',{details:{entity_type:'npc',entity_key:'porter',observation:'A porter rang a bell'}});assert.throws(()=>original.assertNpcObservation(f.db,'chamber','guide','witnessless',{sourceType:'observed',content:'A porter rang a bell',strict:true}),/proximity cannot establish a past witness/);f.source('recorded-witness',{details:{entity_type:'npc',entity_key:'porter',observation:'A porter rang a bell',observers:['npc:guide']}});assert.equal(original.assertNpcObservation(f.db,'chamber','guide','recorded-witness',{sourceType:'observed',content:'A porter rang a bell',strict:true}),true);assert.equal(f.db.listNpcKnowledge('chamber','guide').length,0);
});

test('original source reaches extracted current scene and view while NPC evidence declarations remain at original mixed source',t=>{
 const f=chamber(t);f.npc('guide');assert.deepEqual(original.currentScene(f.db,'chamber'),f.api.currentScene(f.db,'chamber'));assert.equal(original.sceneView(f.db,'chamber',{gm:true}).occupants.length,1);const source=readFileSync(fileURLToPath(new URL('../../src/scene-continuity.js',import.meta.url)),'utf8'),engine=readFileSync(fileURLToPath(new URL('../../src/frameworks/session/scene-continuity.js',import.meta.url)),'utf8');assert.doesNotMatch(engine,/function npcEvidenceActive|function assertNpcObservation/);
});
