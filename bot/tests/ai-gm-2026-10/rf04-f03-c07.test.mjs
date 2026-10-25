import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createScopedMemory} from '../../src/frameworks/knowledge/public.js';
import {rememberEntity,retrieveMemoryRevisions} from '../../src/memory-lifecycle.js';
import {contextMemoriesForScope} from '../../src/context-memory.js';
import {indexWorldEvent} from '../../src/frameworks/world/public.js';
import * as original from '../../src/scoped-memory.js';

function gallery(t){
 const folder=mkdtempSync(join(tmpdir(),'rf04-scoped-c07-')),file=join(folder,'gallery.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);db.ensureCampaign('gallery');const pc=db.createCharacter('gallery','reader','Reader'),session=db.startSession('gallery','Gallery opening'),scope={mode:'private',actorUserId:'reader',actorCharacterId:pc.id};indexWorldEvent(db,'gallery',{key:'observed',title:'An ordinary observed detail',source_id:'gm:observed',visibility:'party'});let allowed=[],scene='current';const views=[];
 const api=createScopedMemory({contextMemoriesForScope,retrieveMemoryRevisions,currentScene:()=>({key:scene,session_id:session.id}),sceneView:(_db,g,options)=>{views.push({guild:g,options});return {occupants:allowed};}});
 const memory=(patch={})=>rememberEntity(db,'gallery',{kind:'object',name:'Painted Token',aliases:[],parent_key:'location:gallery',source_event:'observed',visibility:'party',epistemic:'observation',summary:'A painted token on a plinth.',...patch});
 const presence=(key,patch={})=>{db.upsertNpcProfile('gallery',{npcKey:key,displayName:'Curator '+key});return db.saveCityRecord('gallery',{kind:'scene_presence',key:'presence:'+key,status:'active',visibility:'party',location_key:'gallery',source_event:'observed',data:{entity_type:'npc',entity_key:key,state:'actually_present',scene:'current',zone:'hall',...patch}});};
 t.after(()=>{db.close();rmSync(folder,{recursive:true,force:true});});return {api,get db(){return db;},pc,scope,session,views,memory,presence,setAllowed:v=>allowed=v,setScene:v=>scene=v,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('same named memories across places remain ambiguous until the current parent distinguishes them',t=>{
 const f=gallery(t),one=f.memory(),two=f.memory({parent_key:'location:annex',summary:'A separate painted token in the annex.'});const ambiguous=f.api.resolveScopedMemoryReference(f.db,'gallery',f.scope,'the Painted Token');assert.equal(ambiguous.status,'ambiguous');assert.deepEqual(new Set(ambiguous.candidates),new Set([one.identity.record_key,two.identity.record_key]));const chosen=f.api.resolveScopedMemoryReference(f.db,'gallery',f.scope,'Painted Token',{currentLocation:'annex'});assert.equal(chosen.status,'resolved');assert.equal(chosen.identity,two.identity.record_key);assert.match(chosen.authority,/never access, presence, consent/);assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);
});

test('unknown and blank references do not invent an identity, source or character movement',t=>{
 const f=gallery(t);assert.deepEqual(f.api.resolveScopedMemoryReference(f.db,'gallery',f.scope,'unseen silver bell'),{status:'unknown',candidates:[]});assert.deepEqual(f.api.resolveScopedMemoryReference(f.db,'gallery',f.scope,'  '),{status:'unknown',candidates:[]});assert.equal(f.db.listCityRecords('gallery',{kind:'memory_identity',includeGM:true}).length,0);assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);
});

test('pending native identity reference protects expired memory only for the entitled audience',t=>{
 const f=gallery(t),saved=f.memory({visibility:'character',subject_key:f.pc.id,expires_tick:0});assert.equal(f.api.scopedSceneMemory(f.db,'gallery',f.scope,{atTick:20}).memories.length,0);f.db.saveCityRecord('gallery',{kind:'roll_request',key:'pending-choice',status:'pending',visibility:'character',subject_key:f.pc.id,source_event:'observed',data:{memory_identity_refs:[saved.identity.record_key]}});const own=f.api.scopedSceneMemory(f.db,'gallery',f.scope,{atTick:20});assert.deepEqual(own.pending_identity_refs,[saved.identity.record_key]);assert.equal(own.memories.length,1);const party=f.api.scopedSceneMemory(f.db,'gallery',{mode:'party'},{atTick:20});assert.deepEqual(party.pending_identity_refs,[]);assert.equal(party.memories.length,0);
});

test('resolved native reference stops protecting expired memory without deleting its historical identity',t=>{
 const f=gallery(t),saved=f.memory({expires_tick:0});f.db.saveCityRecord('gallery',{kind:'semantic_intent_proposal',key:'done',status:'accepted',source_event:'observed',data:{target_key:saved.identity.record_key}});const result=f.api.scopedSceneMemory(f.db,'gallery',f.scope,{atTick:10});assert.deepEqual(result.pending_identity_refs,[]);assert.equal(result.memories.length,0);assert.equal(f.db.getCityRecord('gallery','memory_identity',saved.identity.record_key).status,'active');
});

test('current observer authorization and actual presence are both required, independent of attendance',t=>{
 const f=gallery(t);f.presence('visible');f.presence('unseen');f.presence('expected',{state:'expected'});f.presence('hidden',{hidden:true});f.setAllowed(['visible','expected','hidden'].map(entity_key=>({entity_type:'npc',entity_key})));f.db.setPresence(f.session.id,'reader','present');const result=f.api.scopedSceneMemory(f.db,'gallery',f.scope,{currentLocation:'gallery'});assert.deepEqual(result.positions.map(p=>p.entity_key),['visible']);assert.equal(f.views[0].options.observer_key,f.pc.id);assert.match(result.positions[0].authority,/native scene-presence receipt/);assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);
});

test('stale scene, wrong location and retracted source remove positions while preserving saved records',t=>{
 const f=gallery(t),row=f.presence('curator');f.setAllowed([{entity_type:'npc',entity_key:'curator'}]);assert.equal(f.api.scopedSceneMemory(f.db,'gallery',f.scope,{currentLocation:'gallery'}).positions.length,1);f.setScene('later');assert.equal(f.api.scopedSceneMemory(f.db,'gallery',f.scope,{currentLocation:'gallery'}).positions.length,0);f.setScene('current');assert.equal(f.api.scopedSceneMemory(f.db,'gallery',f.scope,{currentLocation:'elsewhere'}).positions.length,0);indexWorldEvent(f.db,'gallery',{key:'observed',status:'retracted'});f.reopen();assert.equal(f.api.scopedSceneMemory(f.db,'gallery',f.scope,{currentLocation:'gallery'}).positions.length,0);assert.equal(f.db.getCityRecord('gallery','scene_presence',row.record_key).status,'active');
});

test('private presence labels never become shared lookup positions despite an observer candidate',t=>{
 const f=gallery(t),row=f.presence('private-curator');f.setAllowed([{entity_type:'npc',entity_key:'private-curator'}]);f.db.saveCityRecord('gallery',{...row,key:row.record_key,visibility:'character',subject_key:f.pc.id});assert.equal(f.api.scopedSceneMemory(f.db,'gallery',f.scope,{currentLocation:'gallery'}).positions.length,0);assert.equal(f.api.resolveScopedMemoryReference(f.db,'gallery',f.scope,'Curator private-curator',{currentLocation:'gallery'}).status,'unknown');
});

test('single authorized current NPC position resolves a reference without a memory identity or new consequence grant',t=>{
 const f=gallery(t);f.presence('caretaker');f.setAllowed([{entity_type:'npc',entity_key:'caretaker'}]);const result=f.api.resolveScopedMemoryReference(f.db,'gallery',f.scope,'Curator caretaker',{currentLocation:'gallery'});assert.equal(result.status,'resolved');assert.equal(result.identity,null);assert.equal(result.entity_key,'caretaker');assert.equal(result.source_event,'observed');assert.equal(f.db.listSimulationRecords('gallery',{kind:'action'}).length,0);assert.equal(f.db.getSimulationEntity('gallery','npc','caretaker'),null);
});

test('legacy bound descriptive context supplements missing identities but does not duplicate a represented name',t=>{
 const f=gallery(t);f.memory();const data={kind:'object',key:'painted-token',name:'Painted Token',summary:'Existing source excerpt',audience_contract:1,origin_visibility:'party',origin_subject:null};f.db.saveCityRecord('gallery',{kind:'context_memory',key:'compat-token',source_event:'observed',visibility:'party',data});f.db.saveCityRecord('gallery',{kind:'context_memory',key:'compat-sign',source_event:'observed',visibility:'party',data:{...data,key:'gallery-sign',name:'Gallery Sign',summary:'A gallery sign points to the annex.'}});const result=f.api.scopedSceneMemory(f.db,'gallery',f.scope);assert.equal(result.memories.filter(m=>m.name==='Painted Token').length,1);const sign=result.memories.find(m=>m.name==='Gallery Sign');assert.equal(sign.identity,null);assert.match(sign.authority,/never consequence/);assert.match(result.authority,/native receipts separately authorize consequences/);
});

test('original scoped provider reaches extracted lookup with actual memory retrieval and no new state mutation',t=>{
 const f=gallery(t),saved=f.memory();const before=f.db.cityRecordCounts('gallery'),result=original.resolveScopedMemoryReference(f.db,'gallery',f.scope,'Painted Token');assert.equal(result.status,'resolved');assert.equal(result.identity,saved.identity.record_key);assert.equal(original.scopedSceneMemory(f.db,'gallery',f.scope).memories.length,1);assert.deepEqual(f.db.cityRecordCounts('gallery'),before);assert.equal(f.db.listCanon('gallery',{includeGM:true}).length,0);
});
