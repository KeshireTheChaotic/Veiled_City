import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {tierWorldAdditions,createKnowledgeWorldIdentityConsumer,createKnowledgeNarrativeVisibilityConsumer} from '../../src/frameworks/knowledge/public.js';
import {tierWorldAdditions as oldTier} from '../../src/entity-memory.js';
import {worldIdentityOrigin,resolvePlaceReference,preflightNpcIdentity,indexWorldEvent} from '../../src/frameworks/world/public.js';
import {worldIdentityOrigin as oldOrigin} from '../../src/world-authorship.js';
import {nativeNarrativeSource} from '../../src/frameworks/narrative/public.js';
import {connectKnowledgeIdentities} from '../../src/framework-to-framework/knowledge--world/public.js';
import {connectKnowledgeNarrative} from '../../src/framework-to-framework/knowledge--narrative/public.js';
import {initializeEnvironmentScene,initializeNpcWorldEvidence,initializeSessionWorldEvents,initializeKnowledgeWorld,
  initializeNarrativeWorld,initializeKnowledgeNarrative} from '../../src/application/composition/public.js';
import {captureWorldInput,establishNarrativeEntity} from '../../src/autonomous-world.js';
import {buildNarrativeContext} from '../../src/narrative-authority-context.js';
import '../../src/audience-native-v9.js';

const root=fileURLToPath(new URL('../../../',import.meta.url));
initializeEnvironmentScene();initializeNpcWorldEvidence();initializeSessionWorldEvents();
initializeKnowledgeWorld();initializeNarrativeWorld();initializeKnowledgeNarrative();
function nativeSetting(t){
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'vc-existing-identity-')),file=path.join(folder,'native.sqlite'),schema=path.join(root,'bot/sql/schema.sql');
  let db=new VeiledDB(file,schema);const guild='identity-retrieval';
  db.ensureCampaign(guild);db.upsertPlayer(guild,'frame-owner','Frame Owner');db.upsertPlayer(guild,'other-owner','Other Owner');
  const pc=db.createCharacter(guild,'frame-owner','Iva Knell',{resources:{hope:3}}),other=db.createCharacter(guild,'other-owner','Bren Alder');
  const session=db.startSession(guild,'Existing identity retrieval','manual');
  db.assignCharacter(session.id,'frame-owner',pc.id);db.setPresence(session.id,'frame-owner','present');
  db.setCityCalendar(guild,{flags:{narrative_authority:true,playable_narration:true,narrative_camera:true}});
  db.setSimulationEntity(guild,'location','rill-station',{name:'Rill Station',visibility:'party',place_type:'station'});
  const scope={mode:'party',actorUserId:'frame-owner',actorCharacterId:pc.id};
  const source=captureWorldInput(db,guild,'frame-owner',pc.id,'retrieval-frame','Show Rill Station.');
  const frame=buildNarrativeContext(db,guild,scope,source.event_key);
  const definition={aliases:[],key:'reed-gallery',kind:'location',location_key:'',name:'Reed Gallery',parent_location_key:'rill-station',role:'gallery',summary:'A narrow gallery of copper reeds and handwritten notices.'};
  const identity=establishNarrativeEntity(db,guild,definition,frame);
  t.after(()=>{db.db.close();fs.rmSync(folder,{recursive:true,force:true});});
  return {guild,pc,other,session,scope,source,identity,definition,get db(){return db;},reopen(){db.db.close();db=new VeiledDB(file,schema);}};
}

test('fixed identity/visibility ports fail closed and pairs supply the original native functions',()=>{
  const identities=createKnowledgeWorldIdentityConsumer(),visibility=createKnowledgeNarrativeVisibilityConsumer();
  assert.throws(()=>identities.worldIdentityOrigin(),{code:'KNOWLEDGE_WORLD_IDENTITY_COMPOSITION'});
  assert.throws(()=>visibility.narrativeSourceVisible(),{code:'KNOWLEDGE_NARRATIVE_COMPOSITION'});
  assert.throws(()=>identities.bind({}),TypeError);assert.throws(()=>visibility.bind(null),TypeError);
  let worldSource,narrativeSource;
  connectKnowledgeIdentities({consumer:{bind(source){worldSource=source;return this;}}});
  connectKnowledgeNarrative({consumer:{bind(source){narrativeSource=source;return this;}}});
  assert.equal(worldSource.resolvePlaceReference,resolvePlaceReference);assert.equal(worldSource.preflightNpcIdentity,preflightNpcIdentity);
  assert.equal(worldSource.worldIdentityOrigin,worldIdentityOrigin);
  assert.equal(narrativeSource,nativeNarrativeSource.nativeSource().narrativeSourceVisible);
  identities.bind(worldSource);visibility.bind(narrativeSource);
  assert.throws(()=>identities.bind({...worldSource,worldIdentityOrigin:()=>null}),/replacement forbidden/);
  assert.throws(()=>visibility.bind(()=>true),/replacement forbidden/);
});

test('actual native-created identity is retrieved without promoting an unsupported proposal or changing PC/native state',t=>{
  const f=nativeSetting(t),before=JSON.stringify(f.db.getCharacter(f.pc.id)),count=f.db.db.prepare('SELECT COUNT(*) n FROM mutation_ledger').get().n;
  assert.equal(oldTier,tierWorldAdditions);assert.equal(oldOrigin,worldIdentityOrigin);
  const known={kind:'location',key:'reed-gallery',name:'Reed Gallery'},unknown={kind:'location',key:'unrooted-court',name:'Unrooted Court'};
  const result={world_additions:[known,unknown]},out=tierWorldAdditions(result,'',{db:f.db,guild:f.guild,scope:f.scope});
  assert.deepEqual(out.durable,[known]);assert.equal(out.durable[0],known);assert.deepEqual(result.world_additions,[known]);
  assert.deepEqual(out.ephemeral.map(x=>x.key),['unrooted-court']);
  assert.equal(f.db.getSimulationEntity(f.guild,'location','unrooted-court'),null);
  assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);
  assert.equal(JSON.stringify(f.db.getCharacter(f.pc.id)),before);
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM mutation_ledger').get().n,count);
  const proof=worldIdentityOrigin(f.db,f.guild,f.identity,f.scope);
  assert.equal(proof.version,1);assert.equal(proof.execution_authority,false);assert.equal(proof.grant,undefined);
});

test('private native identity is reusable only by its entitled audience and cannot cross campaign or party scope',t=>{
  const f=nativeSetting(t),scope={...f.scope,mode:'private'};
  const source=captureWorldInput(f.db,f.guild,'frame-owner',f.pc.id,'private-retrieval-frame','Show Rill Station.',{privateScene:true});
  const frame=buildNarrativeContext(f.db,f.guild,scope,source.event_key);
  establishNarrativeEntity(f.db,f.guild,{...f.definition,key:'quill-room',name:'Quill Room'},frame);
  const proposed={kind:'location',key:'quill-room',name:'Quill Room'};
  const inspect=(audience,guild=f.guild)=>tierWorldAdditions({world_additions:[proposed]},'',{db:f.db,guild,scope:audience});
  assert.equal(inspect(scope).durable.length,1);
  assert.equal(inspect(f.scope).durable.length,0);
  assert.equal(inspect({mode:'private',actorUserId:'other-owner',actorCharacterId:f.other.id}).durable.length,0);
  assert.equal(inspect(scope,'different-campaign').durable.length,0);
});

test('receipt/source retraction across SQLite restart holds retrieval and leaves saved identity rows unchanged',t=>{
  const f=nativeSetting(t),saved=JSON.stringify(f.identity),proposed={kind:'location',key:'reed-gallery',name:'Reed Gallery'};
  const inspect=()=>tierWorldAdditions({world_additions:[proposed]},'',{db:f.db,guild:f.guild,scope:f.scope});
  assert.equal(inspect().durable.length,1);f.reopen();assert.equal(inspect().durable.length,1);
  indexWorldEvent(f.db,f.guild,{key:f.source.event_key,status:'retracted'});
  assert.equal(inspect().durable.length,0);assert.equal(worldIdentityOrigin(f.db,f.guild,f.identity,f.scope),null);
  assert.equal(JSON.stringify(f.db.getCityRecord(f.guild,'autonomous_entity',f.identity.record_key)),saved);
});

test('legacy established NPC references remain reusable without inventing presence, knowledge or cooperation',t=>{
  const f=nativeSetting(t);
  f.db.upsertNpcProfile(f.guild,{npcKey:'porter-marin',displayName:'Marin',role:'porter'});
  f.db.upsertReference(f.guild,{kind:'npc',key:'porter-marin',name:'Marin',summary:'A recorded local porter.',visibility:'party'});
  const result=tierWorldAdditions({world_additions:[{kind:'npc',key:'porter-marin',name:'Marin'}]},'',{db:f.db,guild:f.guild,scope:f.scope});
  assert.equal(result.durable.length,1);
  assert.equal(f.db.getSimulationEntity(f.guild,'npc','porter-marin'),null);
  assert.deepEqual(f.db.listNpcKnowledge(f.guild,'porter-marin',{limit:20}),[]);
  assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);
});

test('actual GM and startup use public contracts; both integrations import exactly their two owners',()=>{
  assert.match(fs.readFileSync(path.join(root,'bot/src/gm.js'),'utf8'),/import \{ tierWorldAdditions \} from "\.\/frameworks\/knowledge\/public\.js"/);
  const startup=fs.readFileSync(path.join(root,'bot/src/index.js'),'utf8');
  assert.ok(startup.indexOf('initializeKnowledgeNarrative();')>startup.indexOf('initializeNarrativeWorld();'));
  assert.ok(startup.indexOf('initializeKnowledgeNarrative();')<startup.indexOf('const config=loadConfig()'));
  for(const [pair,owners] of [['knowledge--world',['knowledge','world']],['knowledge--narrative',['knowledge','narrative']]]){
    const code=fs.readFileSync(path.join(root,`bot/src/framework-to-framework/${pair}/public.js`),'utf8');
    assert.deepEqual([...code.matchAll(/from ['"]([^'"]+)['"]/g)].map(m=>m[1]).sort(),owners.map(owner=>`../../frameworks/${owner}/public.js`));
  }
});
