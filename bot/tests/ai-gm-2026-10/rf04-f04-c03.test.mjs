import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createSceneSetup} from '../../src/frameworks/session/public.js';
import {indexWorldEvent} from '../../src/frameworks/world/public.js';
import {currentScene,recordScenePresence,scenePresence} from '../../src/scene-continuity.js';
import * as original from '../../src/frameworks/session/scene-setup-service.js';
import {captureWorldInput} from '../../src/autonomous-world.js';
import {persistPlayerIntents} from '../../src/typed-intents.js';
function foyer(t){
 const directory=mkdtempSync(join(tmpdir(),'rf04-initial-foyer-')),file=join(directory,'native.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);db.ensureCampaign('foyer');db.setCityCalendar('foyer',{flags:{scene_continuity:true,narrative_camera:true,narrative_authority:true}});for(const u of ['artist','visitor'])db.upsertPlayer('foyer',u,u);const pc=db.createCharacter('foyer','artist','Edda'),other=db.createCharacter('foyer','visitor','Soren'),session=db.startSession('foyer','At the gates');db.assignCharacter(session.id,'artist',pc.id);db.assignCharacter(session.id,'visitor',other.id);db.setPresence(session.id,'artist','present');db.setPresence(session.id,'visitor','present');db.setSimulationEntity('foyer','location','market',{name:'Lantern market'});const api=createSceneSetup({currentScene,recordScenePresence,indexWorldEvent});
 const offer=()=>api.prepareSceneSetup(db,'foyer','artist',pc.id),availability=()=>api.sceneSetupAvailability(db,'foyer','artist',pc.id),confirm=(o,value=o.options[0].value)=>api.confirmSceneSetup(db,'foyer','artist',o.key,value,{interactionId:'choice-'+o.key});const event=(key,patch={})=>indexWorldEvent(db,'foyer',{key,source_id:'gm:'+key,title:'Recorded public place',...patch});
 t.after(()=>{db.close();rmSync(directory,{recursive:true,force:true});});return {api,get db(){return db;},pc,other,session,offer,availability,confirm,event,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('owner offer is private and nonbinding, with both exact disclosure choices and no placement or mechanical effect',t=>{
 const f=foyer(t),before=JSON.stringify(f.db.getCharacter(f.pc.id).data),o=f.offer();assert.equal(f.availability().code,'setup_offer_available');assert.deepEqual(o.options.map(x=>[x.location,x.visibility]),[['market','party'],['market','character']]);const row=f.db.getCityRecord('foyer','scene_setup',o.key),source=f.db.getWorldEvent('foyer',row.source_event);assert.equal(row.visibility,'character');assert.equal(row.subject_key,f.pc.id);assert.equal(source.kind,'native_scene_setup_offer');assert.equal(source.visibility,'character');assert.equal(JSON.stringify(f.db.getCharacter(f.pc.id).data),before);assert.equal(scenePresence(f.db,'foyer','character',f.pc.id),null);assert.equal(f.db.hasCharacterPlacementHistory('foyer',f.pc.id),false);
});

test('private confirmation creates original owner-native choice arrival and presence atomically; replay survives database restart',t=>{
 const f=foyer(t),o=f.offer(),choice=o.options.find(x=>x.visibility==='character'),before=f.db.getCharacter(f.pc.id).data,done=f.confirm(o,choice.value),choiceSource=f.db.getWorldEvent('foyer',done.data.confirmation),arrival=f.db.getWorldEvent('foyer',done.data.arrival);assert.equal(choiceSource.kind,'owner_initial_scene_confirmation');assert.equal(choiceSource.source_id,'player:artist');assert.equal(arrival.kind,'arrival');assert.equal(arrival.details.not_travel,true);assert.equal(arrival.visibility,'character');assert.equal(scenePresence(f.db,'foyer','character',f.pc.id).visibility,'character');assert.deepEqual(f.db.getCharacter(f.pc.id).data,{...before,location:'market'});assert.equal(f.db.getCharacter(f.other.id).data.location,undefined);const count=f.db.listWorldEvents('foyer',{includeGM:true}).length,serialized=JSON.stringify(done);f.reopen();assert.equal(JSON.stringify(f.confirm(o,choice.value)),serialized);assert.equal(f.db.listWorldEvents('foyer',{includeGM:true}).length,count);assert.throws(()=>f.confirm(o,'0'),{code:'SCENE_SETUP'});
});

test('decline is a durable exact choice and never establishes position, arrival or native action',t=>{
 const f=foyer(t),o=f.offer(),row=f.confirm(o,'decline');assert.equal(row.status,'declined');assert.equal(f.confirm(o,'decline').record_key,row.record_key);assert.throws(()=>f.confirm(o),{code:'SCENE_SETUP'});assert.equal(f.db.hasCharacterPlacementHistory('foyer',f.pc.id),false);assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);assert.equal(f.db.listCityRecords('foyer',{kind:'typed_intent',includeGM:true}).length,0);
});

test('hidden private dangerous and cost-bearing places never become safe initial options or owner diagnostics',t=>{
 const f=foyer(t);f.db.setSimulationEntity('foyer','location','market',{hidden:true});for(const [key,state] of Object.entries({secret:{visibility:'gm'},ward:{wards:['keep out']},distant:{travel_minutes:10},danger:{hazards:['fire']},blocked:{locked:true},toll:{travel_cost:1}}))f.db.setSimulationEntity('foyer','location',key,state);const a=f.availability();assert.equal(a.code,'no_eligible_safe_locations');assert.equal(f.offer(),null);for(const key of ['secret','ward','distant','danger','blocked','toll'])assert.equal(a.message.includes(key),false);assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);
});

test('autonomously authored location requires current public source and cannot be retconned into an old offer',t=>{
 const f=foyer(t),s=f.event('market-origin',{visibility:'party'});f.db.saveCityRecord('foyer',{kind:'autonomous_entity',key:'location:market',source_event:s.event_key,visibility:'party',data:{}});const o=f.offer();f.db.saveWorldEvent('foyer',{...s,key:s.event_key,status:'retracted'});assert.equal(f.availability().code,'no_eligible_safe_locations');assert.throws(()=>f.confirm(o),{code:'SCENE_SETUP'});assert.equal(f.db.getCityRecord('foyer','scene_setup',o.key).status,'offered');
});

test('wrong owner, absent role and proxy role cannot make or confirm another player initial position',t=>{
 const f=foyer(t),o=f.offer();assert.equal(f.api.prepareSceneSetup(f.db,'foyer','visitor',f.pc.id),null);assert.throws(()=>f.api.confirmSceneSetup(f.db,'foyer','visitor',o.key,'0'),{code:'SCENE_SETUP'});f.db.setPresence(f.session.id,'artist','absent');assert.equal(f.availability().code,'owner_invalid');assert.throws(()=>f.confirm(o),{code:'SCENE_SETUP'});f.db.setPresence(f.session.id,'artist','present');f.db.assignCharacter(f.session.id,'visitor',f.pc.id,'proxy');assert.equal(f.api.prepareSceneSetup(f.db,'foyer','visitor',f.pc.id),null);assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);
});

test('changed current control revision invalidates the old offer even for the same owner and character',t=>{
 const f=foyer(t),o=f.offer();f.db.assignCharacter(f.session.id,'artist',f.pc.id);assert.throws(()=>f.confirm(o),{code:'SCENE_SETUP'});assert.equal(f.db.getCityRecord('foyer','scene_setup',o.key).status,'offered');assert.equal(f.db.hasCharacterPlacementHistory('foyer',f.pc.id),false);
});

test('scene location and assembly revisions reject old choice without erasing pending offer',t=>{
 const f=foyer(t),o=f.offer();f.db.setSimulationEntity('foyer','location','market',{name:'Changed market'});assert.throws(()=>f.confirm(o),{code:'SCENE_SETUP'});const newer=f.offer();f.db.setDirectorState(f.session.id,{scene_number:2});assert.throws(()=>f.confirm(newer),{code:'SCENE_SETUP'});f.db.setAssemblyPhase(f.session.id,'party');assert.equal(f.availability().code,'not_in_assembly_phase');assert.equal(f.db.getCityRecord('foyer','scene_setup',o.key).status,'offered');
});

test('expired or altered offer cannot establish position and genuine provider errors are not hidden as setup unavailability',t=>{
 const f=foyer(t),o=f.offer(),row=f.db.getCityRecord('foyer','scene_setup',o.key);f.db.saveCityRecord('foyer',{...row,key:o.key,data:{...row.data,expires_at:0}});assert.throws(()=>f.confirm(o),{code:'SCENE_SETUP'});const other=f.offer(),r=f.db.getCityRecord('foyer','scene_setup',other.key);f.db.saveCityRecord('foyer',{...r,key:other.key,data:{...r.data,options:[{location:'market',visibility:'party',value:'unissued'}]}});assert.throws(()=>f.confirm(other,'unissued'),{code:'SCENE_SETUP'});const list=f.db.listSimulationEntities;f.db.listSimulationEntities=()=>{throw Error('C03 actual store fault');};assert.throws(()=>f.availability(),/actual store fault/);f.db.listSimulationEntities=list;
});

test('saved position and historical placement remain distinct diagnostic holds; no setup bypasses an active encounter',t=>{
 const f=foyer(t);f.db.updateCharacterData(f.pc.id,data=>{data.location='market';});assert.equal(f.availability().code,'position_already_set');f.db.updateCharacterData(f.pc.id,data=>{delete data.location;});f.event('older-arrival',{kind:'arrival',location_key:'market',details:{entity_type:'character',entity_key:f.pc.id}});assert.equal(f.availability().code,'placement_history_requires_review');const g=foyer(t);g.db.createEncounter('foyer',g.session.id,{status:'active',tier:1,pc_count:2,base_bp:6,budget_bp:6});assert.equal(g.availability().code,'encounter_active');assert.equal(g.offer(),null);
});

test('native presence audit failure rolls choice event location arrival and confirmation back then allows exact retry',t=>{
 const f=foyer(t),o=f.offer(),record=f.db.recordMutation,count=f.db.listWorldEvents('foyer',{includeGM:true}).length;f.db.recordMutation=function(g,row){if(row.mutationType==='scene_presence')throw Error('C03 injected presence audit fault');return record.call(this,g,row);};assert.throws(()=>f.confirm(o),/presence audit fault/);f.db.recordMutation=record;assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);assert.equal(f.db.getCityRecord('foyer','scene_setup',o.key).status,'offered');assert.equal(f.db.listWorldEvents('foyer',{includeGM:true}).length,count);assert.equal(f.confirm(o).status,'confirmed');
});

test('actual native accepted owner declaration sets only initial position and exact private disclosure, with durable declaration replay',t=>{
 const f=foyer(t),text='My initial position is the lantern market.',scope={mode:'private',actorUserId:'artist',actorCharacterId:f.pc.id},message='foyer-authored-1';const input=captureWorldInput(f.db,'foyer','artist',f.pc.id,message,text,{privateScene:true});const [intent]=persistPlayerIntents(f.db,'foyer',[{type:'other',source_span:text,target_name:'',target_key:'market',destination:'unspecified',operation:'initial_position',utterance:'',excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'Exact owner initial position'}],scope,{messageId:message});assert.ok(intent);assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);const done=f.api.applyAuthoredInitialPosition(f.db,'foyer',intent,scope),arrival=f.db.getWorldEvent('foyer',done.data.arrival);assert.equal(done.status,'confirmed');assert.equal(done.visibility,'character');assert.equal(arrival.details.input_source,input.event_key);assert.equal(arrival.details.not_travel,true);assert.equal(f.db.getCharacter(f.pc.id).data.location,'market');const prior=JSON.stringify(done);f.reopen();assert.equal(JSON.stringify(f.api.applyAuthoredInitialPosition(f.db,'foyer',intent,scope)),prior);assert.equal(f.db.listCityRecords('foyer',{kind:'roll_request',includeGM:true}).length,0);
});

test('unsupported or cross-owner authored declaration is held and original source reader reaches extracted policy',t=>{
 const f=foyer(t);assert.throws(()=>f.api.applyAuthoredInitialPosition(f.db,'foyer',{record_key:'unaccepted'},{actorUserId:'artist',actorCharacterId:f.pc.id,mode:'public'}),{code:'SCENE_SETUP'});const o=original.prepareSceneSetup(f.db,'foyer','artist',f.pc.id);assert.ok(o);assert.deepEqual(original.sceneSetupAvailability(f.db,'foyer','artist',f.pc.id),f.availability());assert.equal(original.confirmSceneSetup(f.db,'foyer','artist',o.key,'decline').status,'declined');assert.equal(f.db.hasCharacterPlacementHistory('foyer',f.pc.id),false);
});
