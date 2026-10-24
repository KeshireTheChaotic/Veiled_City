import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createWorldAuthorshipRules,indexWorldEvent} from '../../src/frameworks/world/public.js';
import {jsonHash as hash} from '../../src/kernel/json-hash.js';
import {listNarrativeRecords} from '../../src/narrative-records.js';
import {factVisibleTo} from '../../src/disclosure-authority.js';
import {sceneFictionFailure} from '../../src/scene-fiction-context.js';
import * as original from '../../src/world-authorship.js';

function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'rf04-world-origin-')),file=join(dir,'origins.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema),shift=false;db.ensureCampaign('g');const pc=db.createCharacter('g','owner','Traveller'),other=db.createCharacter('g','other','Second');
 indexWorldEvent(db,'g',{key:'owner-input',kind:'ai_gm_input',title:'Owner asks about work',source_id:'player:owner',details:{author:'owner',character_id:pc.id,text:'I ask about ordinary local work.'}},'owner');indexWorldEvent(db,'g',{key:'seed-source',kind:'native_gm_hook_seed',title:'Private hook fixture',source_id:'native:fixture',visibility:'gm'});
 const seed=db.saveCityRecord('g',{kind:'world_authoring_seed',key:'seed',source_event:'seed-source',status:'private_seed',visibility:'gm',data:{character_id:pc.id,owner_user_id:'owner',hook_id:'hook',raw_private_hook:'NEVER_FORWARD_PRIVATE_PREMISE'}});
 const registered=new WeakSet(),proofs=new WeakMap(),scope={mode:'private',actorUserId:'owner',actorCharacterId:pc.id};
 const api=createWorldAuthorshipRules({fail:sceneFictionFailure,listNarrativeRecords,factVisibleTo,
  mintNarrativeAudience(ctx){if(!registered.has(ctx))throw sceneFictionFailure('unregistered_native_audience');const proof=Object.freeze({proof_ref:'audience-v9:fixture'});proofs.set(proof,ctx);return {proof};},
  revalidateNarrativeAudience(database,g,proof,s){const ctx=proofs.get(proof);if(!ctx||database!==db||g!=='g'||hash(ctx.scope)!==hash(s))throw sceneFictionFailure('current_audience_required');return {ctx:shift?{...ctx,binding:{...ctx.binding,scene:'changed'}}:ctx,proof};},
  narrativeSourceVisible(database,g,ref,s){const event=database.getWorldEvent(g,ref);return event?.status==='active'&&factVisibleTo({...event,subject_character_id:event.subject_key,subject_user_id:event.subject_key},s);},
  worldHookSeedForGm(database,g,hook){return {source_ref:hook==='hook'&&database.getWorldEvent(g,'seed-source')?.status==='active'?'seed-source':null};}
 });
 const frame=()=>{const ctx={db,scope:{...scope},binding:{guild:'g',source:'owner-input',scene:'scene',scope:{...scope}}};registered.add(ctx);return ctx;};
 const identity=(visibility='party',{legacy=false,privateSeed=false,kind='location',key='ordinary-place'}={})=>{
  const definition={kind,key,name:kind==='npc'?'Ordinary Clerk':'Ordinary Place',aliases:['Old Name'],summary:'An ordinary identity with no PC effect.'},audience=visibility==='character'?scope:{mode:'party'},sourceRef=privateSeed?'seed-source':'owner-input';
  const origin=privateSeed?{version:2,kind:'gm_private_hook',source_ref:sourceRef,identity_hash:hash(definition),frame_ref:'owner-input',frame_hash:hash({frame:'fixture'}),audience_ref:'audience-v9:fixture',seed_hash:hash(seed),hook_id:'hook',character_id:pc.id,owner_user_id:'owner'}:{version:1,kind:'native_ai_gm',source_ref:sourceRef,identity_hash:hash(definition),scope_hash:hash(audience),audience_ref:'audience-v9:fixture'};
  const eventKey='narrative-entity:'+hash([sourceRef,kind,key]).slice(0,40),event=indexWorldEvent(db,'g',{key:eventKey,kind:'native_narrative_entity',title:'Fresh identity receipt',source_id:'native:narrative-authority',visibility,subject_key:visibility==='character'?pc.id:null,details:{input_source:sourceRef,entity_type:kind,entity_key:key,...(legacy?{}:{authorship_version:privateSeed?2:1,authorship_origin:origin,identity_definition:definition})}});
  if(kind==='npc')db.upsertNpcProfile('g',{npcKey:key,displayName:definition.name});db.setSimulationEntity('g',kind,key,{name:definition.name,visibility});
  const row=db.saveCityRecord('g',{kind:'autonomous_entity',key:kind+':'+key,source_event:event.event_key,visibility,subject_key:visibility==='character'?pc.id:null,data:{kind,key,name:definition.name,summary:definition.summary,aliases:definition.aliases,narrative_origin:sourceRef,...(legacy?{}:{authorship_ref:event.event_key})}});return {row,event,origin,definition};
 };
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});return {get db(){return db;},pc,other,api,scope,seed,frame,identity,setShift:v=>shift=v,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('native context requires registered audience, exact database/guild and matching scope binding',t=>{
 const f=fixture(t),ctx=f.frame();assert.equal(f.api.verifiedWorldAuthoringContext(f.db,'g',ctx).context,ctx);assert.throws(()=>f.api.verifiedWorldAuthoringContext(f.db,'g',{...ctx}),/unregistered_native_audience/);assert.throws(()=>f.api.verifiedWorldAuthoringContext(f.db,'other',ctx),/native_world_authoring_context/);ctx.scope={...ctx.scope,actorUserId:'other'};assert.throws(()=>f.api.verifiedWorldAuthoringContext(f.db,'g',ctx),/native_world_authoring_context/);
});

test('revalidated native audience binding must match the original current authoring frame',t=>{
 const f=fixture(t),ctx=f.frame();f.setShift(true);assert.throws(()=>f.api.verifiedWorldAuthoringContext(f.db,'g',ctx),/native_world_authoring_scope_changed/);
});

test('seeded context exposes only current source metadata, never the private premise or execution authority',t=>{
 const f=fixture(t),derived=f.api.createSeededWorldContext(f.db,'g',f.frame(),'seed-source'),verified=f.api.verifiedWorldAuthoringContext(f.db,'g',derived);assert.equal(verified.private_seed.source_ref,'seed-source');assert.equal(verified.private_seed.character_id,f.pc.id);assert.equal(verified.private_seed.seed_hash,hash(f.seed));assert.equal(JSON.stringify(verified.private_seed).includes('NEVER_FORWARD'),false);assert.equal(verified.private_seed.execution_authority,undefined);assert.equal(verified.private_seed.publication_authority,undefined);
});

test('nested and copied derived contexts cannot mint a second private-seed capability',t=>{
 const f=fixture(t),derived=f.api.createSeededWorldContext(f.db,'g',f.frame(),'seed-source');assert.throws(()=>f.api.createSeededWorldContext(f.db,'g',derived,'seed-source'),/nested_seed_context/);assert.throws(()=>f.api.verifiedWorldAuthoringContext(f.db,'g',{...derived}),/unregistered_native_audience/);
});

test('seed data or derived scope changes invalidate the live seed capability',t=>{
 const f=fixture(t),ctx=f.frame(),derived=f.api.createSeededWorldContext(f.db,'g',ctx,'seed-source');derived.scope={...derived.scope,actorCharacterId:f.other.id};assert.throws(()=>f.api.verifiedWorldAuthoringContext(f.db,'g',derived),/private_seed_context_changed/);
 const next=f.api.createSeededWorldContext(f.db,'g',ctx,'seed-source');f.db.saveCityRecord('g',{...f.seed,key:'seed',data:{...f.seed.data,owner_user_id:'other'}});assert.throws(()=>f.api.verifiedWorldAuthoringContext(f.db,'g',next),/private_seed_context_changed/);
});

test('protected PC aliases and current human proxy names cannot become new autonomous identities',t=>{
 const f=fixture(t);f.db.updateCharacterData(f.pc.id,d=>{d.aliases=['Night Walker'];d.nicknames=['Copper'];});for(const name of ['Traveller','night walker','Copper'])assert.throws(()=>f.api.assertWorldIdentityNames(f.db,'g',{key:'new',name,aliases:[]}),/protected_character_or_proxy_identity/);
 const view=Object.create(f.db);view.getActiveSession=()=>({id:'session'});view.listNpcProxies=()=>[{npc_name:'Human Performer',npc_key:'performer'}];assert.throws(()=>f.api.assertWorldIdentityNames(view,'g',{key:'new',name:'Human Performer',aliases:[]}),/protected_character_or_proxy_identity/);assert.doesNotThrow(()=>f.api.assertWorldIdentityNames(f.db,'g',{key:'new',name:'An Ordinary Stranger',aliases:[]}));
});

test('human assertion cannot establish a named identity, while independent GM-camera fiction uses its own origin',t=>{
 const f=fixture(t),definition={key:'rust-chair',name:'Rust Chair',aliases:[]};assert.throws(()=>f.api.assertIndependentWorldIdentity(definition,{kind:'ai_gm_input',details:{text:'I find the Rust Chair.'}}),/owner_named_identity_requires_independent_authoring_source/);assert.doesNotThrow(()=>f.api.assertIndependentWorldIdentity(definition,{kind:'native_gm_camera',details:{text:'Rust Chair'}}));assert.doesNotThrow(()=>f.api.assertIndependentWorldIdentity(definition,{kind:'ai_gm_input',details:{text:'I ask about local work.'}}));
});

test('current public origin is an identity receipt and grants no execution permission',t=>{
 const f=fixture(t),{row,event}=f.identity();const result=f.api.worldIdentityOrigin(f.db,'g',row,{mode:'party'});assert.equal(result.version,1);assert.equal(result.receipt,event.event_key);assert.equal(result.execution_authority,false);assert.equal(f.db.listCanon('g',{includeGM:true}).length,0);
});

test('character-private origin never crosses to party or another character audience',t=>{
 const f=fixture(t),{row}=f.identity('character');assert.equal(f.api.worldIdentityOrigin(f.db,'g',row,{mode:'party'}),null);assert.equal(f.api.worldIdentityOrigin(f.db,'g',row,{...f.scope,actorCharacterId:f.other.id,actorUserId:'other'}),null);assert.equal(f.api.worldIdentityOrigin(f.db,'g',row,f.scope).version,1);
});

test('source retraction and current NPC identity change make origin unavailable without altering historical receipt',t=>{
 const f=fixture(t),{row}=f.identity('party',{kind:'npc',key:'ordinary-clerk'});assert.equal(f.api.worldIdentityOrigin(f.db,'g',row,{mode:'party'}).version,1);f.db.upsertNpcProfile('g',{npcKey:'ordinary-clerk',displayName:'Changed Person'});assert.equal(f.api.worldIdentityOrigin(f.db,'g',row,{mode:'party'}),null);assert.deepEqual(f.db.getCityRecord('g','autonomous_entity',row.record_key),row);
 indexWorldEvent(f.db,'g',{key:row.source_event,status:'retracted'});assert.equal(f.api.worldIdentityOrigin(f.db,'g',row,{mode:'party'}),null);
});

test('original-format saved identity reader survives database reopen without becoming a new grant',t=>{
 const f=fixture(t),{row}=f.identity('party',{legacy:true});f.reopen();const saved=f.db.getCityRecord('g','autonomous_entity',row.record_key),origin=f.api.worldIdentityOrigin(f.db,'g',saved,{mode:'party'});assert.equal(origin.version,0);assert.equal(origin.execution_authority,false);assert.deepEqual(saved,row);
});

test('GM-private identity ancestry remains GM-only across reopen and explicitly denies publication authority',t=>{
 const f=fixture(t),{row}=f.identity('gm',{privateSeed:true});const proof=f.api.privateWorldIdentityForGm(f.db,'g',row);assert.equal(proof.version,2);assert.equal(proof.execution_authority,false);assert.equal(proof.publication_authority,false);assert.equal(f.api.worldIdentityOrigin(f.db,'g',row,f.scope),null);f.reopen();assert.deepEqual(f.api.privateWorldIdentityForGm(f.db,'g',f.db.getCityRecord('g','autonomous_entity',row.record_key)),proof);
});

test('contradictory private labels and changed seed/frame source fail historical private identity qualification',t=>{
 const f=fixture(t),{row}=f.identity('gm',{privateSeed:true});assert.equal(f.api.privateWorldIdentityForGm(f.db,'g',{...row,visibility:'party'}),null);assert.equal(f.api.privateWorldIdentityForGm(f.db,'g',{...row,subject_key:f.pc.id}),null);assert.equal(f.api.privateWorldIdentityForGm(f.db,'g',{...row,data:{...row.data,summary:'Changed private definition'}}),null);
 indexWorldEvent(f.db,'g',{key:'seed-source',status:'retracted'});assert.equal(f.api.privateWorldIdentityForGm(f.db,'g',row),null);
});

test('actual original source provider preserves independent-origin and protected-identity checks and rejects JSON context',t=>{
 const f=fixture(t);assert.throws(()=>original.verifiedWorldAuthoringContext(f.db,'g',{authorized:true}),/native_world_authoring_context/);assert.throws(()=>original.assertWorldIdentityNames(f.db,'g',{key:'new',name:'Traveller',aliases:[]}),/protected_character_or_proxy_identity/);assert.doesNotThrow(()=>original.assertIndependentWorldIdentity({key:'ordinary',name:'Ordinary',aliases:[]},{kind:'native_gm_camera'}));
});
