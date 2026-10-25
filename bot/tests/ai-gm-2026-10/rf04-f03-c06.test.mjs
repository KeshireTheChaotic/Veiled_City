import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createContextMemory} from '../../src/frameworks/knowledge/public.js';
import {rememberEntity} from '../../src/memory-lifecycle.js';
import {indexWorldEvent} from '../../src/frameworks/world/public.js';
import * as original from '../../src/context-memory.js';

function desk(t,{privateTurn=false}={}){
 const folder=mkdtempSync(join(tmpdir(),'rf04-context-c06-')),file=join(folder,'context.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);db.ensureCampaign('desk');for(const user of ['reader','visitor'])db.upsertPlayer('desk',user,user);const pc=db.createCharacter('desk','reader','Reader'),other=db.createCharacter('desk','visitor','Visitor'),session=db.startSession('desk','Two readers');db.assignCharacter(session.id,'reader',pc.id);db.assignCharacter(session.id,'visitor',other.id);db.setPresence(session.id,'reader','present');db.setPresence(session.id,'visitor','present');const messageId='context-message',key='world-input:'+createHash('sha256').update(JSON.stringify([messageId,pc.id])).digest('hex').slice(0,40);indexWorldEvent(db,'desk',{key,kind:'authored_turn',title:'Authenticated fixture input',source_id:'player:reader',visibility:privateTurn?'character':'party',subject_key:privateTurn?pc.id:null,session_id:session.id,scene:'reading-room',details:{text:'I examine the Ink Jar.',author:'reader',character_id:pc.id,private_scene:privateTurn}},'reader');
 const api=createContextMemory({rememberEntity}),scope={mode:privateTurn?'private':'party',actorUserId:'reader',actorCharacterId:pc.id},row=(patch={})=>({kind:'object',key:'ink-jar',name:'Ink Jar',summary:'An invented model summary must not replace source evidence.',retention:'durable',...patch}),result=(patch={})=>({narration:'An Ink Jar rests on the desk.',context_memories:[row()],private_messages:[],...patch}),save=(r=result())=>api.saveContextMemories(db,'desk',r,scope,{messageId});
 t.after(()=>{db.close();rmSync(folder,{recursive:true,force:true});});return {api,get db(){return db;},pc,other,session,key,scope,messageId,row,result,save,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('moved context schema and prompt preserve existing authority contract without a new output restriction',t=>{
 const f=desk(t);assert.deepEqual(f.api.contextMemorySchema,original.contextMemorySchema);assert.equal(f.api.CONTEXT_MEMORY_PROMPT,original.CONTEXT_MEMORY_PROMPT);assert.match(f.api.CONTEXT_MEMORY_PROMPT,/NEVER authoritative canon/);assert.equal(f.api.contextMemorySchema.items.additionalProperties,false);assert.deepEqual(f.api.persistentMemories(f.result()),[f.row()]);assert.deepEqual(f.api.persistentMemories(f.result({context_memories:[f.row({retention:'temporary'})]})),[]);
});

test('shared descriptive memory stores authorized source excerpt rather than model summary and leaves unplaced PC untouched',t=>{
 const f=desk(t),saved=f.save();assert.equal(saved.length,1);assert.equal(saved[0].visibility,'party');assert.equal(saved[0].data.summary,'I examine the Ink Jar.');assert.doesNotMatch(saved[0].data.summary,/invented model summary/);assert.equal(saved[0].data.origin_surface,'player_input');assert.equal(saved[0].data.audience_contract,1);assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);assert.equal(f.db.listSimulationEntities('desk','location').length,0);assert.equal(f.db.listNpcProfiles('desk').length,0);assert.equal(f.db.listCanon('desk',{includeGM:true}).length,0);assert.equal(f.db.listCityRecords('desk',{kind:'memory_identity',includeGM:true})[0].data.parent_key,'scene:reading-room');
});

test('temporary context remains unpersisted and unsupported model-only summary never establishes evidence',t=>{
 const f=desk(t);assert.deepEqual(f.save(f.result({context_memories:[f.row({retention:'temporary'})]})),[]);assert.deepEqual(f.save(f.result({narration:'The room is quiet.',context_memories:[f.row({name:'Unmentioned Brass Bell',key:'brass-bell'})]})),[]);assert.equal(f.db.listCityRecords('desk',{kind:'context_memory',includeGM:true}).length,0);assert.throws(()=>f.api.persistentMemories(f.result({context_memories:[f.row({key:'Invalid Key'})]})),/Closed, named/);
});

test('private owner description stays character-private on save, read and SQLite reopen',t=>{
 const f=desk(t,{privateTurn:true}),saved=f.save();assert.equal(saved[0].visibility,'character');assert.equal(saved[0].subject_key,f.pc.id);assert.equal(f.api.contextMemoriesForScope(f.db,'desk',{mode:'party'}).length,0);assert.equal(f.api.contextMemoriesForScope(f.db,'desk',f.scope).length,1);assert.equal(f.api.contextMemoriesForScope(f.db,'desk',{mode:'private',actorUserId:'visitor',actorCharacterId:f.other.id}).length,0);f.reopen();assert.equal(f.api.contextMemoriesForScope(f.db,'desk',f.scope)[0].summary,'I examine the Ink Jar.');assert.deepEqual(f.save(),saved);
});

test('distinct private recipient surface creates only that recipient memory without leaking to shared or another private scope',t=>{
 const f=desk(t),saved=f.save(f.result({narration:'The room is quiet.',context_memories:[f.row({name:'Blue Envelope',key:'blue-envelope'})],private_messages:[{discord_user_id:'visitor',content:'A Blue Envelope bears a private mark.'}]}));assert.equal(saved.length,1);assert.equal(saved[0].visibility,'character');assert.equal(saved[0].subject_key,f.other.id);assert.equal(saved[0].data.summary,'A Blue Envelope bears a private mark.');assert.equal(saved[0].data.origin_surface,'private_message');assert.equal(f.api.contextMemoriesForScope(f.db,'desk',{mode:'party'}).length,0);assert.equal(f.api.contextMemoriesForScope(f.db,'desk',{mode:'private',actorUserId:'reader',actorCharacterId:f.pc.id}).length,0);assert.equal(f.api.contextMemoriesForScope(f.db,'desk',{mode:'private',actorUserId:'visitor',actorCharacterId:f.other.id}).length,1);
});

test('private turn never persists another recipient proposed message, and absent party recipient receives no memory',t=>{
 const f=desk(t,{privateTurn:true}),r=f.result({narration:'The room is quiet.',context_memories:[f.row({name:'Secret Map',key:'secret-map'})],private_messages:[{discord_user_id:'visitor',content:'A Secret Map appears.'}]});assert.deepEqual(f.save(r),[]);const party=desk(t);party.db.setPresence(party.session.id,'visitor','absent');assert.deepEqual(party.save(party.result({narration:'Quiet.',context_memories:[party.row({name:'Secret Map',key:'secret-map'})],private_messages:[{discord_user_id:'visitor',content:'A Secret Map appears.'}]})),[]);
});

test('stale source, mismatched author/private mode and missing authenticated input fail before saving context',t=>{
 const f=desk(t);assert.throws(()=>f.api.saveContextMemories(f.db,'desk',f.result(),{...f.scope,actorUserId:'visitor'},{messageId:f.messageId}),/authenticated source/);assert.throws(()=>f.api.saveContextMemories(f.db,'desk',f.result(),{...f.scope,mode:'private'},{messageId:f.messageId}),/authenticated source/);assert.throws(()=>f.api.saveContextMemories(f.db,'desk',f.result(),f.scope,{}),/authenticated character input/);indexWorldEvent(f.db,'desk',{key:f.key,status:'retracted'});assert.throws(()=>f.save(),/authenticated source/);assert.equal(f.db.listCityRecords('desk',{kind:'context_memory',includeGM:true}).length,0);
});

test('read projection rejects legacy unbound, contradictory audience and retracted source while originals remain',t=>{
 const f=desk(t),saved=f.save()[0];f.db.saveCityRecord('desk',{kind:'context_memory',key:'legacy-unbound',source_event:f.key,visibility:'party',data:{kind:'object',name:'Legacy secret',summary:'Unbound summary'}});assert.equal(f.api.contextMemoriesForScope(f.db,'desk',f.scope).length,1);f.db.saveCityRecord('desk',{...saved,key:saved.record_key,data:{...saved.data,origin_visibility:'character',origin_subject:f.other.id}});assert.equal(f.api.contextMemoriesForScope(f.db,'desk',f.scope).length,0);assert.equal(f.db.getCityRecord('desk','context_memory',saved.record_key).data.summary,saved.data.summary);indexWorldEvent(f.db,'desk',{key:f.key,status:'retracted'});assert.equal(f.api.contextMemoriesForScope(f.db,'desk',f.scope).length,0);
});

test('caller transaction rolls descriptive record and lifecycle identity back together after a failed revision write',t=>{
 const f=desk(t),save=f.db.saveCityRecord;f.db.saveCityRecord=function(g,row){if(row.kind==='memory_revision')throw Error('C06 context revision failure');return save.call(this,g,row);};assert.throws(()=>f.db.transaction(()=>f.save()),/C06 context revision/);f.db.saveCityRecord=save;for(const kind of ['context_memory','memory_identity','memory_revision'])assert.equal(f.db.listCityRecords('desk',{kind,includeGM:true}).length,0);assert.equal(f.save().length,1);
});

test('original context source provider reaches extracted save, selector and fail-closed scoped reader',t=>{
 const f=desk(t),rows=original.saveContextMemories(f.db,'desk',f.result(),f.scope,{messageId:f.messageId});assert.equal(rows.length,1);assert.equal(original.persistentMemories(f.result()).length,1);assert.equal(original.contextMemoriesForScope(f.db,'desk',{mode:'party'})[0].authority,'descriptive_only_not_canon');assert.equal(f.db.listCanon('desk',{includeGM:true}).length,0);
});
