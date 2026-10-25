import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createEntityMemory} from '../../src/frameworks/knowledge/public.js';
import {resolvePlaceReference,preflightNpcIdentity,indexWorldEvent} from '../../src/frameworks/world/public.js';
import {tierWorldAdditions as original} from '../../src/entity-memory.js';

function street(t){
 const folder=mkdtempSync(join(tmpdir(),'rf04-identity-retrieval-c08-')),file=join(folder,'street.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema),visible=true,origin=true;db.ensureCampaign('street');const pc=db.createCharacter('street','reader','Reader'),other=db.createCharacter('street','other','Other');indexWorldEvent(db,'street',{key:'origin',title:'Established ordinary identity source',source_id:'gm:origin',visibility:'party'});db.setSimulationEntity('street','location','arcade',{name:'Copper Arcade',aliases:['the arcade']});db.upsertReference('street',{kind:'location',key:'arcade',name:'Copper Arcade',summary:'An established arcade'});db.upsertReference('street',{kind:'npc',key:'seller',name:'Copper Seller',summary:'An established seller'});
 const api=createEntityMemory({resolvePlaceReference,preflightNpcIdentity,narrativeSourceVisible:()=>visible,worldIdentityOrigin:()=>origin}),scope={mode:'party',actorUserId:'reader',actorCharacterId:pc.id},run=(items,options={})=>{const result={world_additions:items};return {selected:api.tierWorldAdditions(result,'',{db,guild:'street',scope,...options}),result};};
 t.after(()=>{db.close();rmSync(folder,{recursive:true,force:true});});return {get db(){return db;},api,pc,other,scope,run,setVisible:v=>visible=v,setOrigin:v=>origin=v,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('current established location and NPC references remain available without creating identities, profiles or movement',t=>{
 const f=street(t),items=[{kind:'location',key:'arcade',name:'Copper Arcade'},{kind:'npc',key:'seller',name:'Copper Seller'}],before=f.db.cityRecordCounts('street'),{selected,result}=f.run(items);assert.deepEqual(selected.durable,items);assert.deepEqual(selected.ephemeral,[]);assert.deepEqual(result.world_additions,items);assert.deepEqual(f.db.cityRecordCounts('street'),before);assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);assert.equal(f.db.getNpcProfile('street','seller'),null);
});

test('unverified combined proposal is retained as nonbinding reason without materializing an ordinary world identity',t=>{
 const f=street(t),{selected,result}=f.run([{kind:'npc',key:'fresh-guide',name:'A Fresh Guide'},{kind:'location',key:'new-street',name:'New Street'},{kind:'faction',key:'circle',name:'A Circle'}]);assert.deepEqual(selected.durable,[]);assert.equal(selected.ephemeral.length,3);assert.match(selected.ephemeral[0].reason,/independent native GM creation receipt/);assert.deepEqual(result.world_additions,[]);assert.equal(f.db.getNpcProfile('street','fresh-guide'),null);assert.equal(f.db.getSimulationEntity('street','location','new-street'),null);
});

test('private established reference is usable only within its original character audience without revealing protected details',t=>{
 const f=street(t);f.db.upsertReference('street',{kind:'npc',key:'private-guide',name:'Hidden Guide',summary:'Distinct private secret',visibility:'character',subjectCharacterId:f.pc.id});const item={kind:'npc',key:'private-guide',name:'Hidden Guide'};assert.equal(f.run([item]).selected.durable.length,0);assert.equal(f.run([item],{scope:{...f.scope,mode:'private'}}).selected.durable.length,1);const other=f.run([item],{scope:{mode:'private',actorUserId:'other',actorCharacterId:f.other.id}});assert.equal(other.selected.durable.length,0);assert.doesNotMatch(JSON.stringify(other.selected),/Distinct private secret/);
});

test('ambiguous or mismatched native location resolution remains a candidate rather than silently substituting identity',t=>{
 const f=street(t);f.db.setSimulationEntity('street','location','another-arcade',{name:'Copper Arcade'});assert.equal(f.run([{kind:'location',key:'arcade',name:'Copper Arcade'}]).selected.durable.length,0);assert.equal(f.run([{kind:'location',key:'arcade',name:'Unknown Building'}]).selected.durable.length,0);assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);
});

test('source-bound authored identity separately requires current narrative visibility and qualified World origin',t=>{
 const f=street(t),identity=f.db.saveCityRecord('street',{kind:'autonomous_entity',key:'npc:seller',source_event:'origin',visibility:'party',data:{kind:'npc',name:'Copper Seller',authorship_ref:'native-origin-fixture'}}),item={kind:'npc',key:'seller',name:'Copper Seller'};assert.equal(f.run([item]).selected.durable.length,1);f.setVisible(false);assert.equal(f.run([item]).selected.durable.length,0);f.setVisible(true);f.setOrigin(false);assert.equal(f.run([item]).selected.durable.length,0);f.reopen();assert.equal(f.db.getCityRecord('street','autonomous_entity',identity.record_key).data.authorship_ref,'native-origin-fixture');
});

test('missing source context and non-array results remain empty without authoring or arbitrary mutation',t=>{
 const f=street(t);assert.deepEqual(f.api.tierWorldAdditions(null),{durable:[],ephemeral:[]});assert.deepEqual(f.api.tierWorldAdditions({world_additions:'invalid'}),{durable:[],ephemeral:[]});const r={world_additions:[{kind:'location',key:'arcade',name:'Copper Arcade'}]};assert.equal(f.api.tierWorldAdditions(r).ephemeral.length,1);assert.deepEqual(r.world_additions,[]);
});

test('actual original source provider reaches extracted established-reference selector without new authority',t=>{
 const f=street(t),r={world_additions:[{kind:'npc',key:'seller',name:'Copper Seller'}]},result=original(r,'',{db:f.db,guild:'street',scope:f.scope});assert.equal(result.durable.length,1);assert.equal(f.db.listCanon('street',{includeGM:true}).length,0);assert.equal(f.db.listSimulationRecords('street',{kind:'action'}).length,0);
});
