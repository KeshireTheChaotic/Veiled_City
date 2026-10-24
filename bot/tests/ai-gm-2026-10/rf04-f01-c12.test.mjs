import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {resolvePlaceReference,preflightPlaceIdentity,preflightNpcIdentity,indexWorldEvent} from '../../src/frameworks/world/public.js';
import * as original from '../../src/location-language.js';

function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'rf04-world-place-')),file=join(dir,'places.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);db.ensureCampaign('g');const pc=db.createCharacter('g','owner','Traveller'),other=db.createCharacter('g','other','Second');
 for(const [key,name,aliases] of [['west-gate','Café Gate',['Old Arch']],['market','Market',[]]])db.setSimulationEntity('g','location',key,{name,aliases});
 const event=(key,details={},extra={})=>indexWorldEvent(db,'g',{key,title:key,source_id:'gm:source',details,...extra});event('linked-source');
 const reference=(source='private-source',refs=['event:linked-source'])=>db.saveCityRecord('g',{kind:'narrative_context',key:'context',visibility:'character',subject_key:pc.id,source_event:source,data:{interpretation:{references:[{entity_type:'location',status:'resolved',phrase:'that gate',entity_key:'west-gate',source_refs:refs}]}}});
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});return {get db(){return db;},pc,other,event,reference,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('isolated World source and original reader retain exact exported function identity',()=>{
 assert.equal(original.resolvePlaceReference,resolvePlaceReference);assert.equal(original.preflightPlaceIdentity,preflightPlaceIdentity);assert.equal(original.preflightNpcIdentity,preflightNpcIdentity);
 const body=readFileSync(new URL('../../src/frameworks/world/location-language.js',import.meta.url),'utf8');assert.match(body,/from '\.\.\/\.\.\/kernel\/entity-key\.js'/);assert.doesNotMatch(body,/npc-cognition\.js/);
 const consumer=readFileSync(new URL('../../src/autonomous-world.js',import.meta.url),'utf8');assert.match(consumer,/resolvePlaceReference, preflightPlaceIdentity, preflightNpcIdentity \} from "\.\/frameworks\/world\/public\.js"/);
});

test('existing names and aliases resolve without placing an unplaced character or spending resources',t=>{
 const f=fixture(t),before=f.db.getCharacter(f.pc.id);for(const phrase of ['the CAFE GATE','my old arch','west-gate'])assert.equal(resolvePlaceReference(f.db,'g',f.pc.id,phrase).location.entity_key,'west-gate');assert.equal(resolvePlaceReference(f.db,'g',f.pc.id,'inside').status,'unknown');assert.deepEqual(f.db.getCharacter(f.pc.id),before);assert.equal(f.db.listCityRecords('g',{kind:'narrative_context',includeGM:true}).length,0);
});

test('ambiguous place names request clarification; relative inside uses only established native location',t=>{
 const f=fixture(t);f.db.setSimulationEntity('g','location','other-gate',{name:'Café Gate'});const found=resolvePlaceReference(f.db,'g',f.pc.id,'Café Gate');assert.equal(found.status,'needs_player_clarification');assert.equal(found.candidates.length,2);assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);
 f.db.updateCharacterData(f.pc.id,d=>{d.location='market';});assert.equal(resolvePlaceReference(f.db,'g',f.pc.id,'it').location.entity_key,'market');assert.equal(f.db.getCharacter(f.pc.id).data.location,'market');
});

test('private interpreted referent is limited to its current character and source author',t=>{
 const f=fixture(t);f.event('private-source',{author:'owner',character_id:f.pc.id,private_scene:true},{visibility:'character',subject_key:f.pc.id});f.reference();
 assert.equal(resolvePlaceReference(f.db,'g',f.pc.id,'that gate',{mode:'party',user:'owner'}).status,'unknown');assert.equal(resolvePlaceReference(f.db,'g',f.pc.id,'that gate',{mode:'private',user:'other'}).status,'unknown');assert.equal(resolvePlaceReference(f.db,'g',f.other.id,'that gate',{mode:'private',user:'other'}).status,'unknown');assert.equal(resolvePlaceReference(f.db,'g',f.pc.id,'that gate',{mode:'private',user:'owner'}).location.entity_key,'west-gate');
});

test('source references revalidate across SQLite reopen and source retraction without rewriting saved context',t=>{
 const f=fixture(t);f.event('private-source',{author:'owner',character_id:f.pc.id,private_scene:true},{visibility:'character',subject_key:f.pc.id});const record=f.reference();f.reopen();assert.equal(resolvePlaceReference(f.db,'g',f.pc.id,'that gate',{mode:'private',user:'owner'}).status,'resolved_existing');indexWorldEvent(f.db,'g',{key:'linked-source',status:'retracted'});assert.equal(resolvePlaceReference(f.db,'g',f.pc.id,'that gate',{mode:'private',user:'owner'}).status,'unknown');assert.deepEqual(f.db.getCityRecord('g','narrative_context','context'),record);
});

test('retracted frame and unresolved interpretation never become a source-qualified candidate',t=>{
 const f=fixture(t);f.event('private-source',{author:'owner',character_id:f.pc.id});f.reference();indexWorldEvent(f.db,'g',{key:'private-source',status:'retracted'});assert.equal(resolvePlaceReference(f.db,'g',f.pc.id,'that gate',{user:'owner'}).status,'unknown');
 f.event('fresh',{author:'owner',character_id:f.pc.id});const context=f.reference('fresh');f.db.saveCityRecord('g',{...context,key:'context',data:{interpretation:{references:[{entity_type:'location',status:'unresolved',phrase:'that gate',entity_key:'west-gate',source_refs:[]}]}}});assert.equal(resolvePlaceReference(f.db,'g',f.pc.id,'that gate',{user:'owner'}).status,'unknown');
});

test('protected location collisions reveal no matches while same-owner private references remain reusable',t=>{
 const f=fixture(t),input={key:'new',name:'CAFE GATE'};f.db.upsertReference('g',{kind:'location',key:'west-gate',name:'Café Gate',summary:'GM secret',visibility:'gm'});assert.deepEqual(preflightPlaceIdentity(f.db,'g',{...input,scope:{mode:'party'}}),{status:'protected_collision',matches:[]});
 f.db.upsertReference('g',{kind:'location',key:'west-gate',name:'Café Gate',summary:'private detail',visibility:'character',subjectCharacterId:f.pc.id});assert.equal(preflightPlaceIdentity(f.db,'g',{...input,scope:{mode:'private',actorCharacterId:f.pc.id}}).status,'reuse');assert.deepEqual(preflightPlaceIdentity(f.db,'g',{...input,scope:{mode:'private',actorCharacterId:f.other.id}}),{status:'protected_collision',matches:[]});
});

test('NPC preflight covers current aliases and reference-only hidden identities without inventing a person',t=>{
 const f=fixture(t);f.db.upsertNpcProfile('g',{npcKey:'porter',displayName:'Café Keeper'});f.db.setSimulationEntity('g','npc','porter',{aliases:['Gate Warden']});assert.equal(preflightNpcIdentity(f.db,'g',{key:'new',name:'the Gate Warden',scope:{mode:'party'}}).status,'reuse');
 f.db.upsertReference('g',{kind:'npc',key:'hidden-contact',name:'Secret Witness',summary:'hidden relationship',visibility:'gm'});assert.deepEqual(preflightNpcIdentity(f.db,'g',{key:'new',name:'Secret Witness',scope:{mode:'party'}}),{status:'protected_collision',matches:[]});assert.equal(f.db.getNpcProfile('g','hidden-contact'),null);assert.equal(f.db.listNpcProfiles('g').length,1);
});
