import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';import '../../src/audience-native-v9.js';import '../../src/native-group-features.js';import * as OriginalSalience from '../../src/narrative-salience.js';
import {initializeKnowledgeWorld,initializeKnowledgeNarrative,initializeNpcEvidenceProjection,initializeNpcObservations,initializeNpcCognition,initializeSessionSceneWorld,initializeNativeSessionMovement} from '../../src/application/composition/public.js';
import * as Npc from '../../src/frameworks/npc/public.js';import * as Narrative from '../../src/frameworks/narrative/public.js';import * as Knowledge from '../../src/frameworks/knowledge/public.js';import * as World from '../../src/frameworks/world/public.js';import * as Legacy from '../../src/npc-cognition.js';
initializeKnowledgeWorld();initializeKnowledgeNarrative();initializeNativeSessionMovement();initializeSessionSceneWorld();initializeNpcObservations();initializeNpcEvidenceProjection();initializeNpcCognition();
function fixture(t){const dir=mkdtempSync(path.join(tmpdir(),'vc-c25-')),file=path.join(dir,'fresh.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);db.ensureCampaign('city');t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});return {get db(){return db;},reopen(){db.close();db=new VeiledDB(file,schema);return db;},seed(){return Npc.seedNpcCognition({db,guildId:'city',actorId:'fresh-c25-gm',content:{read:()=>JSON.stringify([{name:'Bell Keeper',public:'A watchful artisan.',knows:['The harbor bell stopped.'],does_not:['Who cut its rope?'],secret:'A hidden family debt.',want:'Repair the harbor bell.'},{name:'Canal Pilot',knows:['The east lock is open.']}])}});}};}
function retrieve(db,options={}){return Npc.retrieveNpcCognition(db,'city',{worldDirector:true,recordRecall:false,...options});}
test('fixed cognition consumers preserve exact callbacks and reject missing or replaced sources',()=>{
 for(const [make,method] of [[Npc.createNpcNarrativeContextConsumer,'narrativeContextEligible'],[Npc.createNpcKnowledgeClustersConsumer,'clusterContext'],[Npc.createNpcSessionViewConsumer,'sceneView']]){const p=make();assert.throws(()=>p[method](),{code:'NPC_COGNITION_COMPOSITION'});assert.throws(()=>p.bind(null),TypeError);const result={native:true},args=[{},'city','npc','source'];const fn=(...actual)=>{assert.deepEqual(actual,args);return result;};p.bind(fn);p.bind(fn);assert.equal(p[method](...args),result);assert.throws(()=>p.bind(()=>false),/replacement/);}
});
test('original Narrative context eligibility is unchanged across archived pins query location and availability branches',()=>{
 let importance={status:'prompt_archived',pins:[]},calls=0;const db={getCityCalendar:()=>({flags:{narrative_salience:true}}),getCityRecord:(g,kind,key)=>kind==='autonomous_entity'?{data:{key:'bell-keeper',name:'Bell Keeper',aliases:['Keeper']}}:null};
 const rule=Narrative.createNarrativeContextEligibility({narrativeImportance:()=>{calls++;return importance;}}).narrativeContextEligible;
 assert.equal(rule(db,'city','npc:bell-keeper',{mode:'party'}),false);assert.equal(rule(db,'city','npc:bell-keeper',{mode:'party'},{query:'Ask the Bell Keeper'}),true);
 importance={...importance,pins:['human_proxy']};assert.equal(rule(db,'city','npc:bell-keeper',{mode:'party'}),true);importance={status:'active',pins:[]};assert.equal(rule(db,'city','npc:bell-keeper',{mode:'party'}),true);
 importance={status:'prompt_archived',pins:[]};assert.equal(rule(db,'city','location:quay',{mode:'party'},{location:'quay'}),true);
 db.getCityCalendar=()=>({flags:{}});const before=calls;assert.equal(rule(db,'city','npc:bell-keeper',{mode:'party'}),true);assert.equal(calls,before);
 const source=Narrative.createNarrativeImportanceSource();assert.throws(()=>source.narrativeImportance(),{code:'NARRATIVE_IMPORTANCE_COMPOSITION'});const fn=()=>importance;source.provide(fn);source.provide(fn);assert.equal(source.narrativeImportance(),importance);assert.throws(()=>source.provide(()=>null),/replacement/);
 assert.equal(OriginalSalience.narrativeContextEligible,Narrative.narrativeContextEligible);assert.equal(OriginalSalience.nativeSalienceAvailable,Narrative.nativeSalienceAvailable);
});
test('actual native dossiers retrieve GM-private beliefs unknowns secrets and goals without altering PC or canonical state',t=>{
 const f=fixture(t);f.seed();for(const k of ['retrieveNpcCognition','dossierDecisionProfile','seedNpcCognition'])assert.equal(Legacy[k],Npc[k]);
 const before=f.db.db.serialize();const packets=retrieve(f.db);assert.equal(packets.length,2);const bell=packets.find(p=>p.npc_key==='bell-keeper');assert.ok(bell);
 assert.equal(bell.knowledge.find(k=>k.knowledge_key==='seed.unknown.1').belief_state,'unknown');assert.equal(bell.knowledge.find(k=>k.knowledge_key==='seed.self_secret').is_secret,1);assert.match(bell.goals[0].objective,/Repair/);assert.match(bell.continuity_authority,/not canon\/consent/);
 assert.deepEqual(f.db.db.serialize(),before);assert.equal(f.db.listFactsForGM('city',{limit:100}).length,0);assert.equal(f.db.listCharacters('city','owner').length,0);
});
test('recordRecall changes only selected existing memory recall and survives restart',t=>{
 const f=fixture(t);f.seed();const old=f.db.listNpcMemories('city','bell-keeper',{status:'active',limit:20})[0];assert.ok(old);const goals=f.db.listNpcGoals('city','bell-keeper',{status:'active'});
 const p=retrieve(f.db,{npcKey:'bell-keeper',recordRecall:true});assert.equal(p.length,1);assert.ok(p[0].memories.some(m=>m.id===old.id));assert.equal(f.db.getNpcMemory(old.id).recall_count,old.recall_count+1);assert.deepEqual(f.db.listNpcGoals('city','bell-keeper',{status:'active'}),goals);
 f.reopen();assert.equal(f.db.getNpcMemory(old.id).recall_count,old.recall_count+1);const current=retrieve(f.db,{npcKey:'bell-keeper'});assert.equal(current[0].memories[0].recall_count,old.recall_count+1);
});
test('retracted native knowledge remains historical testimony with inactive evidence after restart',t=>{
 const f=fixture(t);f.seed();const k=f.db.getNpcKnowledge('city','bell-keeper','seed.known.1');assert.equal(retrieve(f.db,{npcKey:'bell-keeper'})[0].knowledge.find(x=>x.knowledge_key===k.knowledge_key).evidence_active,true);
 World.indexWorldEvent(f.db,'city',{key:k.source_ref,status:'retracted'});f.reopen();const historical=retrieve(f.db,{npcKey:'bell-keeper'})[0].knowledge.find(x=>x.knowledge_key===k.knowledge_key);assert.equal(historical.evidence_active,false);assert.equal(historical.content,k.content);assert.equal(historical.belief_state,'known');
});
test('actual Knowledge clusters stay actor-relative inside cognition and never become canon',t=>{
 const f=fixture(t);f.seed();const db=f.db;db.setCityCalendar('city',{...db.getCityCalendar('city'),flags:{memory_consolidation:true}});const memory=db.listNpcMemories('city','bell-keeper',{status:'active',limit:10})[0];const source=World.indexWorldEvent(db,'city',{key:'cluster-source',kind:'observation',title:'Private memory review',source_id:'fresh-c25-gm',visibility:'gm'});
 Knowledge.manageMemoryCluster(db,'city',{key:'bell-cluster',actor_type:'npc',actor_key:'bell-keeper',source_event:source.event_key,topic:'Family debt',sources:[{kind:'npc_memory',key:memory.id}]},'fresh-c25-gm');
 assert.equal(retrieve(db,{npcKey:'bell-keeper'})[0].memory_clusters.length,1);assert.equal(retrieve(db,{npcKey:'canal-pilot'})[0].memory_clusters.length,0);assert.equal(db.listFactsForGM('city',{limit:100}).length,0);
});
test('scene-enabled cognition does not invent an NPC viewpoint attendance or player movement',t=>{
 const f=fixture(t);f.seed();const db=f.db;db.setCityCalendar('city',{...db.getCityCalendar('city'),flags:{scene_continuity:true}});db.startSession('city','Fresh C25 scene');const before=db.listCityRecords('city',{kind:'scene_presence',includeGM:true});
 const packet=retrieve(db,{npcKey:'bell-keeper'})[0];assert.ok(packet.scene_observations);assert.equal(packet.scene_observations.occupants.length,0);assert.deepEqual(db.listCityRecords('city',{kind:'scene_presence',includeGM:true}),before);assert.equal(db.roster(db.getActiveSession('city').id).length,0);
});
test('cognition seeding rolls back original native profiles evidence and seed receipt when audit fails',t=>{
 const f=fixture(t),db=f.db,original=db.recordMutation;db.recordMutation=function(g,input){if(input.mutationType==='npc_cognition_seed')throw new Error('fresh C25 seed failure');return original.call(this,g,input);};assert.throws(()=>f.seed(),/fresh C25 seed failure/);db.recordMutation=original;
 assert.equal(db.getNpcProfile('city','bell-keeper'),null);assert.equal(db.getSeedRun('city','npc_cognition_v1'),null);assert.equal(db.listWorldEvents('city',{includeGM:true,limit:100}).length,0);assert.equal(f.seed().profiles,2);assert.equal(retrieve(db).length,2);
});
