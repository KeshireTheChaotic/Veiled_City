import './compose-startup.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import '../../src/audience-native-v9.js';
import {initializeKnowledgeWorld,initializeKnowledgeNarrative,initializeNpcEvidenceProjection,initializeSessionSceneWorld} from '../../src/application/composition/public.js';
import * as Narrative from '../../src/frameworks/narrative/public.js';
import * as Npc from '../../src/frameworks/npc/public.js';
import * as World from '../../src/frameworks/world/public.js';
import {narrativeSourceVisible,buildSceneFictionContext} from '../../src/scene-fiction-context.js';
import {captureWorldInput} from '../../src/autonomous-world.js';
initializeKnowledgeWorld();initializeKnowledgeNarrative();initializeNpcEvidenceProjection();initializeSessionSceneWorld();
const party={mode:'party'};
function fixture(t){const dir=mkdtempSync(path.join(tmpdir(),'vc-c24-')),file=path.join(dir,'fresh.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);db.ensureCampaign('city');t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});return {get db(){return db;},reopen(){db.close();db=new VeiledDB(file,schema);return db;}};}
function event(db,key,visibility='party',subject_key='',details={}){return World.indexWorldEvent(db,'city',{key,kind:'observation',title:'Fresh C24 source',source_kind:'gm',source_id:'fresh-c24-gm',visibility,subject_key,details},'fresh-c24-gm');}
test('Narrative fixed evidence consumers retain exact native calls and reject incomplete or replaced policies',()=>{
 const p=Narrative.createNarrativeKnowledgeEvidenceConsumer();assert.throws(()=>p.activeEvidence(),{code:'NARRATIVE_EVIDENCE_COMPOSITION'});assert.throws(()=>p.bind({}),TypeError);
 const calls=[],native=Object.fromEntries(['factVisibleTo','activeEvidence','evidenceType'].map(k=>[k,(...args)=>{calls.push([k,args]);return k;} ]));p.bind(native);p.bind(native);for(const k of Object.keys(native))assert.equal(p[k]('db','guild','source',party),k);assert.equal(calls.length,3);assert.throws(()=>p.bind({...native,activeEvidence:()=>true}),/replacement/);
 const actor=Narrative.createNarrativeNpcEvidenceConsumer();assert.throws(()=>actor.actorReferenceVisible(),{code:'NARRATIVE_NPC_EVIDENCE_COMPOSITION'});assert.throws(()=>actor.bind(null),TypeError);const failure=new Error('native actor error');const source=()=>{throw failure;};actor.bind(source);actor.bind(source);assert.throws(()=>actor.actorReferenceVisible(),e=>e===failure);assert.throws(()=>actor.bind(()=>true),/replacement/);
});
test('historical source and native grant adapter share the single Narrative-owned closure',()=>{
 assert.equal(narrativeSourceVisible,Narrative.narrativeSourceVisible);assert.equal(Narrative.nativeNarrativeSource.nativeSource().narrativeSourceVisible,narrativeSourceVisible);
 assert.equal(initializeKnowledgeNarrative(),initializeKnowledgeNarrative());assert.equal(initializeNpcEvidenceProjection(),initializeNpcEvidenceProjection());
});
test('actual disclosure and ancestry retain GM privacy and private recipient boundaries',t=>{
 const {db}=fixture(t);db.upsertPlayer('city','owner','Owner');const pc=db.createCharacter('city','owner','Fresh PC');const own={mode:'private',actorUserId:'owner',actorCharacterId:pc.id};
 event(db,'camera');event(db,'cause','gm');event(db,'owner-detail','character',pc.id);event(db,'nested-private','party','',{source_refs:['owner-detail']});event(db,'nested-gm','party','',{source_refs:['cause']});
 assert.equal(narrativeSourceVisible(db,'city','camera',party),true);assert.equal(narrativeSourceVisible(db,'city','cause',own),false);assert.equal(narrativeSourceVisible(db,'city','owner-detail',own),true);
 assert.equal(narrativeSourceVisible(db,'city','owner-detail',party),false);assert.equal(narrativeSourceVisible(db,'city','owner-detail',{...own,actorCharacterId:'other'}),false);
 assert.equal(narrativeSourceVisible(db,'city','nested-private',own),true);assert.equal(narrativeSourceVisible(db,'city','nested-private',party),false);assert.equal(narrativeSourceVisible(db,'city','nested-gm',own),false);
});
test('native NPC nonsecret import remains attributed actor evidence without making its GM source globally visible',t=>{
 const {db}=fixture(t);db.upsertNpcProfile('city',{npcKey:'witness',displayName:'Witness'});const ref=Npc.recordImportedNpcKnowledge(db,'city','witness','seen','A bell rang.');
 const k=db.upsertNpcKnowledge('city',{npcKey:'witness',knowledgeKey:'seen',content:'A bell rang.',beliefState:'known',sourceType:'seed',sourceRef:ref,isSecret:false});
 assert.equal(Narrative.narrativeNpcEvidence.actorReferenceVisible(db,'city','witness',ref,party),true);assert.equal(Narrative.narrativeNpcEvidence.actorReferenceVisible(db,'city','other',ref,party),false);
 assert.equal(narrativeSourceVisible(db,'city',ref,party),false);assert.equal(Npc.actorEvidenceVisible(db,'city','witness',k,party),true);
 assert.equal(db.listFactsForGM('city',{limit:100}).length,0);
});
test('cyclic ancestry missing references and unsupported artifact proof fail closed',t=>{
 const {db}=fixture(t);event(db,'cycle-a','party','',{source_refs:['cycle-b']});event(db,'cycle-b','party','',{source_refs:['cycle-a']});event(db,'missing-parent','party','',{source_refs:['absent']});
 assert.equal(narrativeSourceVisible(db,'city','cycle-a',party),false);assert.equal(narrativeSourceVisible(db,'city','missing-parent',party),false);
 World.indexWorldEvent(db,'city',{key:'invalid-unit:source',kind:'native_narrative_unit',title:'Invalid artifact rejection fixture',source_id:'native:narrative-authority',visibility:'party',details:{artifact_ref:'missing-artifact',payload_hash:'invalid'}});
 assert.equal(narrativeSourceVisible(db,'city','invalid-unit:source',party),false);
});
test('source retraction and failed native indexing remain truthful across database restart',t=>{
 const f=fixture(t);event(f.db,'parent');event(f.db,'child','party','',{source_refs:['parent']});assert.equal(narrativeSourceVisible(f.db,'city','child',party),true);
 World.indexWorldEvent(f.db,'city',{key:'parent',status:'retracted'});f.reopen();assert.equal(narrativeSourceVisible(f.db,'city','child',party),false);assert.equal(f.db.getWorldEvent('city','child').status,'active');
 const original=f.db.recordMutation;f.db.recordMutation=()=>{throw new Error('fresh indexing audit failure');};assert.throws(()=>event(f.db,'failed-source'),/fresh indexing audit failure/);f.db.recordMutation=original;assert.equal(f.db.getWorldEvent('city','failed-source'),null);
 event(f.db,'failed-source');assert.equal(narrativeSourceVisible(f.db,'city','failed-source',party),true);
});
test('scene context uses original visibility closure for authored location then holds missing native presence without choosing PC movement',t=>{
 const {db}=fixture(t);db.upsertPlayer('city','owner','Owner');const pc=db.createCharacter('city','owner','Fresh PC',{location:'quay'});const session=db.startSession('city','Fresh C24');db.assignCharacter(session.id,'owner',pc.id);db.setPresence(session.id,'owner','present');
 db.setCityCalendar('city',{...db.getCityCalendar('city'),flags:{playable_narration:true}});World.configureSimulationEntity(db,'city','location','quay',{name:'Quay',visibility:'party'});
 const origin=event(db,'quay-origin');db.saveCityRecord('city',{kind:'autonomous_entity',key:'location:quay',status:'active',visibility:'party',source_event:origin.event_key,data:{key:'quay',name:'Quay'}});
 const input=captureWorldInput(db,'city','owner',pc.id,'fresh-c24-message','What is visible here?');assert.ok(input);assert.equal(db.ownerAuthoredSource('city',input.event_key,'owner'),true);
 const before=db.getCharacter(pc.id),scope={mode:'party',actorUserId:'owner',actorCharacterId:pc.id};
 assert.throws(()=>buildSceneFictionContext(db,'city',scope,input.event_key),e=>e.code==='SCENE_FICTION'&&e.diagnostic.category==='viewpoint');
 assert.deepEqual(db.getCharacter(pc.id),before);assert.equal(db.listCityRecords('city',{kind:'scene_presence',includeGM:true}).length,0);
});
