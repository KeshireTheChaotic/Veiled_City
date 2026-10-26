import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import '../../src/audience-native-v9.js';
import {initializeKnowledgeWorld,initializeKnowledgeNarrative,initializeNpcEvidenceProjection} from '../../src/application/composition/public.js';
import * as Npc from '../../src/frameworks/npc/public.js';
import * as World from '../../src/frameworks/world/public.js';
import * as Legacy from '../../src/npc-cognition-projection.js';
import {seedNpcCognition} from '../../src/npc-cognition.js';
initializeKnowledgeWorld();initializeKnowledgeNarrative();initializeNpcEvidenceProjection();
const party={mode:'party'},privateScope={mode:'private',actorUserId:'owner',actorCharacterId:'pc'};
function fixture(t){
 const dir=mkdtempSync(path.join(tmpdir(),'vc-c23-')),file=path.join(dir,'fresh.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));
 let db=new VeiledDB(file,schema);db.ensureCampaign('city');
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
 return {get db(){return db;},reopen(){db.close();db=new VeiledDB(file,schema);return db;},seed(){return seedNpcCognition({db,content:{read:p=>{assert.equal(p,'GM_PRIVATE/NPCS/npcs.json');return JSON.stringify([{name:'Harbor Witness',knows:['The lantern flashed twice.'],does_not:['Who caused the blackout?'],secret:'A hidden debt.'}]);}},guildId:'city',actorId:'fresh-human-gm'});}};
}
function known(db){return db.getNpcKnowledge('city','harbor-witness','seed.known.1');}
function row(ref){return {source_ref:ref,is_secret:0,belief_state:'known'};}
function event(db,key,visibility='party',subject_key='',details={}){return World.indexWorldEvent(db,'city',{key,kind:'observation',title:'Fresh source',source_kind:'gm',source_id:'fresh-c23-gm',visibility,subject_key,details},'fresh-c23-gm');}
test('fixed NPC evidence consumers fail closed before binding and preserve exact results/errors',()=>{
 for(const [make,method] of [[Npc.createNpcNarrativeVisibilityConsumer,'narrativeSourceVisible'],[Npc.createNpcSessionPrincipalConsumer,'conversationPrincipal'],[Npc.createNpcWorldEvidenceEventConsumer,'indexWorldEvent']]){
  const p=make(),args=[{},'guild','source',party],sentinel={native:true};
  assert.throws(()=>p[method](...args),{code:'NPC_EVIDENCE_COMPOSITION'});assert.throws(()=>p.bind(null),TypeError);
  const fn=(...actual)=>{assert.deepEqual(actual,args);return sentinel;};p.bind(fn);p.bind(fn);assert.equal(p[method](...args),sentinel);assert.throws(()=>p.bind(()=>false),/replacement/);
  const error=new Error('native rejection'),q=make();q.bind(()=>{throw error;});assert.throws(()=>q[method](),e=>e===error);
 }
});
test('actual native dossier seed grants attributed nonsecret testimony only and preserves service identity',t=>{
 const f=fixture(t),db=f.db;const counts=f.seed();assert.equal(counts.profiles,1);assert.equal(counts.knowledge,3);
 for(const name of ['recordImportedNpcKnowledge','actorEvidenceVisible','actorReferenceVisible'])assert.equal(Legacy[name],Npc[name]);
 const k=known(db),source=db.getWorldEvent('city',k.source_ref);assert.equal(source.kind,'native_npc_knowledge_import');assert.equal(source.visibility,'gm');
 assert.equal(Npc.actorEvidenceVisible(db,'city','harbor-witness',k,party),true);assert.equal(Npc.actorReferenceVisible(db,'city','harbor-witness',k.source_ref,party),true);
 for(const key of ['seed.unknown.1','seed.self_secret'])assert.equal(Npc.actorEvidenceVisible(db,'city','harbor-witness',db.getNpcKnowledge('city','harbor-witness',key),party),false);
 assert.equal(db.listFactsForGM('city',{limit:100}).length,0);assert.equal(db.listCharacters('city','owner').length,0);
 assert.throws(()=>f.seed(),/already completed/);
});
test('import proof rejects different actor content key belief secret and forged payload hash',t=>{
 const f=fixture(t);f.seed();const db=f.db,k=known(db);
 assert.equal(Npc.actorEvidenceVisible(db,'city','other',k,party),false);
 for(const change of [{content:'A fabricated cause.'},{knowledge_key:'wrong'},{belief_state:'believed'},{is_secret:1},{source_ref:'missing'}])assert.equal(Npc.actorEvidenceVisible(db,'city','harbor-witness',{...k,...change},party),false);
 const e=db.getWorldEvent('city',k.source_ref);db.saveWorldEvent('city',{...e,key:e.event_key,details:{...e.details,payload_hash:'forged'}});
 assert.equal(Npc.actorEvidenceVisible(db,'city','harbor-witness',k,party),false);
});
test('original Narrative visibility excludes GM sources and cross-recipient private ancestry',t=>{
 const {db}=fixture(t);db.upsertPlayer('city','owner','Owner');const pc=db.createCharacter('city','owner','Fresh PC');const own={...privateScope,actorCharacterId:pc.id};
 const publicEvent=event(db,'public-camera'),gm=event(db,'private-cause','gm'),privateEvent=event(db,'private-observation','character',pc.id);
 assert.equal(Npc.actorEvidenceVisible(db,'city','witness',row(publicEvent.event_key),party),true);
 assert.equal(Npc.actorEvidenceVisible(db,'city','witness',row(gm.event_key),own),false);
 assert.equal(Npc.actorEvidenceVisible(db,'city','witness',row(privateEvent.event_key),party),false);
 assert.equal(Npc.actorEvidenceVisible(db,'city','witness',row(privateEvent.event_key),own),true);
 assert.equal(Npc.actorEvidenceVisible(db,'city','witness',row(privateEvent.event_key),{...own,actorCharacterId:'other'}),false);
 const nested=event(db,'public-label-private-ancestry','party','',{source_refs:[gm.event_key]});assert.equal(Npc.actorEvidenceVisible(db,'city','witness',row(nested.event_key),party),false);
});
test('retraction survives SQLite reopen without rewriting historical NPC knowledge',t=>{
 const f=fixture(t);f.seed();const k=known(f.db),before=JSON.stringify(k);
 World.indexWorldEvent(f.db,'city',{key:k.source_ref,status:'retracted'},'fresh-human-gm');
 assert.equal(Npc.actorEvidenceVisible(f.db,'city','harbor-witness',k,party),false);f.reopen();
 assert.equal(JSON.stringify(known(f.db)),before);assert.equal(Npc.actorReferenceVisible(f.db,'city','harbor-witness',k.source_ref,party),false);
});
test('native seed audit failure rolls back profiles knowledge and import source before retry',t=>{
 const f=fixture(t),db=f.db,original=db.recordMutation;db.recordMutation=function(g,input){if(input.mutationType==='npc_cognition_seed')throw new Error('fresh audit failure');return original.call(this,g,input);};
 assert.throws(()=>f.seed(),/fresh audit failure/);db.recordMutation=original;
 assert.equal(db.getNpcProfile('city','harbor-witness'),null);assert.equal(db.listWorldEvents('city',{includeGM:true,limit:100}).length,0);assert.equal(db.getSeedRun('city','npc_cognition_v1'),null);
 assert.equal(f.seed().knowledge,3);assert.equal(Npc.actorEvidenceVisible(db,'city','harbor-witness',known(db),party),true);
});
test('unsupported human speech and recursive actor-proof narrative cannot manufacture testimony authority',t=>{
 const {db}=fixture(t);const speech=World.indexWorldEvent(db,'city',{key:'unsupported-speech',kind:'authored_speech',title:'Malformed speech rejection fixture',source_id:'player:absent',visibility:'party',details:{author:'absent',character_id:'absent',typed_intent:'missing-native-intent',listeners:['witness'],quote:'Not a declaration.'}});
 assert.equal(Npc.actorEvidenceVisible(db,'city','witness',{...row(speech.event_key),source_type:'heard'},party),false);
 const recursive=World.indexWorldEvent(db,'city',{key:'recursive-proof',kind:'native_narrative_unit',title:'Invalid recursive rejection fixture',source_id:'native:narrative-authority',visibility:'party',details:{actor_evidence_refs:['recursive-proof']}});
 assert.equal(Npc.actorEvidenceVisible(db,'city','witness',row(recursive.event_key),party),false);
 assert.equal(Npc.actorReferenceVisible(db,'city','witness',speech.event_key,party),false);
});
