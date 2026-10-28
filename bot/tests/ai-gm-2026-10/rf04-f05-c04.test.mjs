import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createNativeNarrativeSource,nativeNarrativeSource} from '../../src/frameworks/narrative/public.js';
import {createNarrativeAuthorshipConsumer,worldNarrativeAuthorship} from '../../src/frameworks/world/public.js';
import {connectNarrativeWorld} from '../../src/framework-to-framework/narrative--world/public.js';
import {initializeNarrativeWorld,initializeEnvironmentScene,initializeNpcWorldEvidence,initializeSessionWorldEvents,initializeKnowledgeWorld} from '../../src/application/composition/public.js';
import {registerNarrativeContext,mintNarrativeAudience,revalidateNarrativeAudience} from '../../src/audience-native-v9.js';
import {verifiedWorldAuthoringContext,worldIdentityOrigin} from '../../src/world-authorship.js';
import {buildNarrativeContext} from '../../src/narrative-authority-context.js';
import {captureWorldInput,establishNarrativeEntity} from '../../src/autonomous-world.js';
import {indexWorldEvent} from '../../src/frameworks/world/public.js';

const root=fileURLToPath(new URL('../../../',import.meta.url));
initializeEnvironmentScene();
initializeNpcWorldEvidence();
initializeSessionWorldEvents();
initializeKnowledgeWorld();
initializeNarrativeWorld();

function fixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vc-rf04-narrative-world-'));
  const filename=path.join(dir,'disposable.sqlite'),schema=path.join(root,'bot/sql/schema.sql');
  let db=new VeiledDB(filename,schema);
  const guild='audit-guild';
  db.ensureCampaign(guild);
  db.upsertPlayer(guild,'reader-one','Reader One');db.upsertPlayer(guild,'reader-two','Reader Two');
  const one=db.createCharacter(guild,'reader-one','Mira Ash',{resources:{hope:3}});
  const two=db.createCharacter(guild,'reader-two','Dane Wren',{resources:{hope:4}});
  const session=db.startSession(guild,'Runtime source reconciliation','manual');
  for(const [user,pc] of [['reader-one',one],['reader-two',two]]){
    db.assignCharacter(session.id,user,pc.id);db.setPresence(session.id,user,'present');
  }
  db.setCityCalendar(guild,{flags:{narrative_authority:true,playable_narration:true,narrative_camera:true}});
  db.setSimulationEntity(guild,'location','lantern-arcade',{name:'Lantern Arcade',place_type:'arcade',visibility:'party'});
  const scope={mode:'party',actorUserId:'reader-one',actorCharacterId:one.id};
  const source=captureWorldInput(db,guild,'reader-one',one.id,'native-request','Describe Lantern Arcade.');
  assert.ok(source?.event_key,'real authenticated source producer must succeed');
  t.after(()=>{db.db.close();fs.rmSync(dir,{recursive:true,force:true});});
  return {guild,one,two,session,scope,source,get db(){return db;},
    reopen(){db.db.close();db=new VeiledDB(filename,schema);return db;},
    context(){return buildNarrativeContext(db,guild,scope,source.event_key);}};
}
const identity=(key='paper-court')=>({kind:'location',key,name:'Paper Court',aliases:[],summary:'A rain-dark courtyard with a creaking noticeboard.',
  location_key:'',parent_location_key:'lantern-arcade',role:'courtyard'});

test('unconfigured native sources and World consumers fail closed; fixed binding cannot be replaced',()=>{
  const source=createNativeNarrativeSource();
  assert.throws(()=>source.nativeSource(),{code:'NARRATIVE_SOURCE_COMPOSITION'});
  assert.throws(()=>source.provideContext(null),TypeError);
  const factory=()=>({});source.provideContext(factory);source.provideContext(factory);
  assert.throws(()=>source.provideContext(()=>({})),/replacement forbidden/);
  const consumer=createNarrativeAuthorshipConsumer();
  assert.throws(()=>consumer.mintNarrativeAudience({}),{code:'NARRATIVE_WORLD_COMPOSITION'});
  assert.throws(()=>consumer.bind({}),TypeError);
  const linked=connectNarrativeWorld({consumer}),native=nativeNarrativeSource.nativeSource();
  assert.equal(linked,consumer);assert.equal(consumer.bind(native),consumer);
  assert.throws(()=>consumer.bind({...native}),/replacement forbidden/);
});

test('legacy registration, public runtime and actual World verification share the original opaque grant store',t=>{
  const f=fixture(t),ctx=f.context(),native=nativeNarrativeSource.nativeSource();
  assert.equal(nativeNarrativeSource.nativeSource(),native);
  assert.equal(initializeNarrativeWorld(),worldNarrativeAuthorship);
  assert.equal(registerNarrativeContext(ctx),ctx);
  const legacy=mintNarrativeAudience(ctx),throughPair=worldNarrativeAuthorship.mintNarrativeAudience(ctx);
  assert.deepEqual(legacy.proof,throughPair.proof);
  assert.deepEqual(native.mintNarrativeAudience(ctx).proof,legacy.proof);
  assert.equal(legacy.authority.inspect(legacy.grant),legacy.proof);
  assert.throws(()=>throughPair.authority.inspect(legacy.grant),{code:'AUDIENCE_V9'});
  assert.throws(()=>native.mintNarrativeAudience(structuredClone({...ctx,db:null})),{code:'SCENE_FICTION'});
  const verified=verifiedWorldAuthoringContext(f.db,f.guild,ctx);
  assert.equal(verified.audience_ref,legacy.proof.proof_ref);
  assert.equal(verified.context.binding.viewpoint,'camera');
  assert.equal(f.db.getCharacter(f.one.id).data.location,undefined);
  assert.equal(f.db.getCharacter(f.one.id).data.resources.hope,3);
});

test('private source remains private through actual pair and World consumer, with GM and cross-recipient evidence excluded',t=>{
  const f=fixture(t),scene=f.context().binding.scene;
  const own=captureWorldInput(f.db,f.guild,'reader-one',f.one.id,'private-request','Describe Lantern Arcade.',{privateScene:true});
  const secret=indexWorldEvent(f.db,f.guild,{key:'hidden-cause',kind:'observation',title:'GM hidden cause',source_id:'human_gm',visibility:'gm',session_id:f.session.id,scene});
  const privateScope={...f.scope,mode:'private'},other={mode:'private',actorUserId:'reader-two',actorCharacterId:f.two.id};
  const native=nativeNarrativeSource.nativeSource(),ctx=buildNarrativeContext(f.db,f.guild,privateScope,own.event_key);
  assert.equal(native.narrativeSourceVisible(f.db,f.guild,own.event_key,privateScope),true);
  assert.equal(worldNarrativeAuthorship.narrativeSourceVisible(f.db,f.guild,own.event_key,f.scope),false);
  assert.equal(worldNarrativeAuthorship.narrativeSourceVisible(f.db,f.guild,own.event_key,other),false);
  assert.equal(worldNarrativeAuthorship.narrativeSourceVisible(f.db,f.guild,secret.event_key,privateScope),false);
  assert.equal(verifiedWorldAuthoringContext(f.db,f.guild,ctx).context.packet.audience.unit_visibility,'character');
  assert.throws(()=>buildNarrativeContext(f.db,f.guild,other,own.event_key),{code:'SCENE_FICTION'});
  const made=establishNarrativeEntity(f.db,f.guild,identity(),ctx);
  assert.equal(made.visibility,'character');assert.equal(made.subject_key,f.one.id);
  assert.equal(worldIdentityOrigin(f.db,f.guild,made,other),null);
  assert.ok(worldIdentityOrigin(f.db,f.guild,made,privateScope));
});

test('real ordinary World invention persists and replays with unchanged native identity receipt and PC state',t=>{
  const f=fixture(t),before=JSON.stringify([f.db.getCharacter(f.one.id),f.db.getCharacter(f.two.id)]),ctx=f.context();
  const made=establishNarrativeEntity(f.db,f.guild,identity(),ctx),stored=JSON.stringify(made);
  assert.equal(made.data.authority,'ordinary_GM_fiction_not_PC_effect');
  assert.ok(worldIdentityOrigin(f.db,f.guild,made,f.scope));
  f.reopen();
  const current=f.context(),replayed=establishNarrativeEntity(f.db,f.guild,identity(),current);
  assert.equal(JSON.stringify(replayed),stored);
  assert.equal(JSON.stringify([f.db.getCharacter(f.one.id),f.db.getCharacter(f.two.id)]),before);
  assert.ok(worldIdentityOrigin(f.db,f.guild,replayed,f.scope));
});

test('saved proof is revalidated after SQLite restart but JSON cannot replace an issued grant',t=>{
  const f=fixture(t),ctx=f.context(),issued=mintNarrativeAudience(ctx),saved=structuredClone(issued.proof);
  f.reopen();
  const current=revalidateNarrativeAudience(f.db,f.guild,saved,f.scope);
  assert.deepEqual(current.proof,saved);
  assert.deepEqual(worldNarrativeAuthorship.revalidateNarrativeAudience(f.db,f.guild,saved,f.scope).proof,saved);
  assert.throws(()=>current.authority.inspect(saved),{code:'AUDIENCE_V9'});
  assert.throws(()=>current.authority.inspect(issued.grant),{code:'AUDIENCE_V9'});
  assert.throws(()=>worldNarrativeAuthorship.revalidateNarrativeAudience(f.db,f.guild,saved,{...f.scope,mode:'private'}),{code:'SCENE_FICTION'});
});

test('source, scene and controller changes hold old authoring contexts without rewriting saved receipts',t=>{
  const f=fixture(t),ctx=f.context(),made=establishNarrativeEntity(f.db,f.guild,identity(),ctx),stored=JSON.stringify(made);
  f.db.assignCharacter(f.session.id,'reader-one',f.one.id);
  assert.throws(()=>verifiedWorldAuthoringContext(f.db,f.guild,ctx),{code:'SCENE_FICTION'});
  const nextSource=captureWorldInput(f.db,f.guild,'reader-one',f.one.id,'request-after-controller-change','Describe Lantern Arcade.');
  const fresh=buildNarrativeContext(f.db,f.guild,f.scope,nextSource.event_key),director=f.db.getDirectorState(f.session.id);
  f.db.setDirectorState(f.session.id,{...director,scene_number:director.scene_number+1});
  assert.throws(()=>verifiedWorldAuthoringContext(f.db,f.guild,fresh),{code:'SCENE_FICTION'});
  f.db.setDirectorState(f.session.id,director);
  indexWorldEvent(f.db,f.guild,{key:nextSource.event_key,status:'retracted'});
  assert.throws(()=>verifiedWorldAuthoringContext(f.db,f.guild,fresh),{code:'SCENE_FICTION'});
  assert.equal(JSON.stringify(f.db.getCityRecord(f.guild,'autonomous_entity',made.record_key)),stored);
});

test('real World transaction rolls identity and receipt back on audit failure before a safe retry',t=>{
  const f=fixture(t),ctx=f.context(),original=f.db.recordMutation;
  f.db.recordMutation=function(guild,mutation){if(mutation.mutationType==='world_event_index')throw new Error('deterministic audit failure');return original.call(this,guild,mutation);};
  assert.throws(()=>establishNarrativeEntity(f.db,f.guild,identity(),ctx),/deterministic audit failure/);
  assert.equal(f.db.getSimulationEntity(f.guild,'location','paper-court'),null);
  assert.equal(f.db.getCityRecord(f.guild,'autonomous_entity','location:paper-court'),null);
  f.db.recordMutation=original;
  assert.ok(establishNarrativeEntity(f.db,f.guild,identity(),ctx));
  assert.equal(f.db.getCharacter(f.one.id).data.location,undefined);
});

test('actual bootstrap reaches the pair before services; the adapter imports only its two public owners',()=>{
  const startup=fs.readFileSync(path.join(root,'bot/src/index.js'),'utf8');
  assert.ok(startup.includes('initializeNarrativeWorld();'));
  assert.ok(startup.indexOf('initializeNarrativeWorld();')<startup.indexOf('const config=loadConfig()'));
  const pair=fs.readFileSync(path.join(root,'bot/src/framework-to-framework/narrative--world/public.js'),'utf8');
  assert.deepEqual([...new Set([...pair.matchAll(/from ['"]([^'"]+)['"]/g)].map(m=>m[1]))].sort(),
    ['../../frameworks/narrative/public.js','../../frameworks/world/public.js']);
  const legacy=fs.readFileSync(path.join(root,'bot/src/world-authorship.js'),'utf8');
  assert.ok(legacy.includes('worldNarrativeAuthorship'));
  assert.equal(/from ['"]\.\/(audience-native-v9|scene-fiction-context)\.js['"]/.test(legacy),false);
});
