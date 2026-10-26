import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';import '../../src/audience-native-v9.js';import '../../src/native-group-features.js';
import {initializeKnowledgeWorld,initializeKnowledgeNarrative,initializeNpcEvidenceProjection,initializeNpcObservations,initializeNpcCognition,initializeWorldActorControl,initializeWorldExecution,initializeSessionSceneWorld,initializeNativeSessionMovement,initializeWorldCandidateContext} from '../../src/application/composition/public.js';
import * as World from '../../src/frameworks/world/public.js';import * as Knowledge from '../../src/frameworks/knowledge/public.js';import * as Npc from '../../src/frameworks/npc/public.js';import {simulationCandidates as legacyCandidates,prepareNpcDirector} from '../../src/simulation.js';
initializeWorldActorControl();initializeWorldExecution();initializeNativeSessionMovement();initializeSessionSceneWorld();initializeKnowledgeWorld();initializeKnowledgeNarrative();initializeNpcObservations();initializeNpcEvidenceProjection();initializeNpcCognition();initializeWorldCandidateContext();
function fixture(t,count=2){const dir=mkdtempSync(path.join(tmpdir(),'vc-c28-')),file=path.join(dir,'fresh.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);db.ensureCampaign('city');Npc.seedNpcCognition({db,guildId:'city',content:{read:()=>JSON.stringify(Array.from({length:count},(_,i)=>({name:`Harbor Keeper ${i}`,knows:[`Harbor witness ${i}.`],secret:`Harbor private debt ${i}.`,want:`Repair harbor bell ${i}.`})))}});for(let i=0;i<count;i++)World.configureSimulationEntity(db,'city','npc',`harbor-keeper-${i}`,{location_key:'quay',activity_tier:'supporting'});t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});return {get db(){return db;},reopen(){db.close();db=new VeiledDB(file,schema);return db;}};}
const candidates=(db,opts={})=>World.simulationCandidates(db,'city',{layer:'scene',query:'harbor',...opts});
test('World candidate consumers fail before source binding and preserve exact original results and errors',()=>{
 for(const[make,method]of[[World.createWorldNpcCognitionConsumer,'retrieveNpcCognition'],[World.createWorldKnowledgeClustersConsumer,'clusterContext']]){const p=make();assert.throws(()=>p[method](),{code:'WORLD_CANDIDATE_CONTEXT_COMPOSITION'});assert.throws(()=>p.bind(null),TypeError);const result=[],args=[{},'city','npc','key'];const fn=(...actual)=>{assert.deepEqual(actual,args);return result;};p.bind(fn);p.bind(fn);assert.equal(p[method](...args),result);assert.throws(()=>p.bind(()=>[]),/replacement/);const error=new Error('native failure'),q=make();q.bind(()=>{throw error;});assert.throws(()=>q[method](),e=>e===error);}
 assert.equal(legacyCandidates,World.simulationCandidates);
});
test('native NPC candidates preserve subjective actor knowledge and read without recalls or global facts',t=>{
 const {db}=fixture(t);const global=db.addFact('city',{key:'global-secret',content:'Harbor hidden causal fact.',visibility:'gm'}),before=db.db.serialize();const packets=candidates(db);assert.equal(packets.length,2);const first=packets.find(p=>p.key==='harbor-keeper-0');assert.ok(first.memories.length>0);assert.ok(first.knowledge.some(k=>k.content==='Harbor witness 0.'));assert.ok(first.knowledge.every(k=>k.npc_key==='harbor-keeper-0'));assert.ok(!JSON.stringify(packets).includes(global));assert.ok(!JSON.stringify(packets).includes('Harbor hidden causal fact.'));assert.deepEqual(db.db.serialize(),before);
});
test('original supporting relevance downtime dormant removed and native player-control checks remain active',t=>{
 const {db}=fixture(t);assert.equal(candidates(db,{query:'unrelated'}).length,0);assert.equal(candidates(db,{query:'unrelated',layer:'downtime'}).length,2);
 World.configureSimulationEntity(db,'city','npc','harbor-keeper-0',{activity_tier:'dormant'});World.configureSimulationEntity(db,'city','npc','harbor-keeper-1',{owner_control_type:'player'});assert.equal(candidates(db,{layer:'downtime'}).length,0);
 World.configureSimulationEntity(db,'city','npc','harbor-keeper-0',{activity_tier:'active',removed:true});assert.equal(candidates(db,{layer:'downtime'}).length,0);
});
test('active native proxy excludes its NPC from autonomous candidates',t=>{
 const {db}=fixture(t);db.upsertPlayer('city','proxy','Proxy');const session=db.startSession('city','Fresh C28 proxy');db.setPresence(session.id,'proxy','present');const offer=db.upsertNpcProxy('city',session.id,{npcName:'harbor-keeper-0',userId:'proxy'});db.activateNpcProxy(offer.id,'proxy');
 assert.deepEqual(candidates(db).map(p=>p.key),['harbor-keeper-1']);assert.equal(World.worldActorControl(db,'city','npc','harbor-keeper-0'),'proxy');
});
test('native goal dependency completion gates candidate eligibility without inventing completion',t=>{
 const {db}=fixture(t);db.upsertNpcGoal('city',{npcKey:'harbor-keeper-0',goalKey:'seed.primary',objective:'Repair harbor bell 0.',dependencies:['prerequisite'],source:'gm'});assert.ok(!candidates(db).some(p=>p.key==='harbor-keeper-0'));
 db.upsertNpcGoal('city',{npcKey:'harbor-keeper-0',goalKey:'prerequisite',objective:'Obtain access.',status:'completed',source:'gm'});assert.ok(candidates(db).some(p=>p.key==='harbor-keeper-0'));assert.equal(db.getNpcGoal('city','harbor-keeper-0','prerequisite').status,'completed');
});
test('actor-specific memory clusters remain distinct across database restart',t=>{
 const f=fixture(t),db=f.db;db.setCityCalendar('city',{...db.getCityCalendar('city'),flags:{memory_consolidation:true}});const memory=db.listNpcMemories('city','harbor-keeper-0',{status:'active',limit:10})[0],source=World.indexWorldEvent(db,'city',{key:'cluster-source',kind:'observation',title:'Harbor memory review',source_id:'fresh-c28-gm',visibility:'gm'});
 Knowledge.manageMemoryCluster(db,'city',{key:'harbor-cluster',actor_type:'npc',actor_key:'harbor-keeper-0',source_event:source.event_key,topic:'Harbor private debt',sources:[{kind:'npc_memory',key:memory.id}]},'fresh-c28-gm');let rows=candidates(db);assert.equal(rows.find(x=>x.key==='harbor-keeper-0').memory_clusters.length,1);assert.equal(rows.find(x=>x.key==='harbor-keeper-1').memory_clusters.length,0);f.reopen();rows=candidates(f.db);assert.equal(rows.find(x=>x.key==='harbor-keeper-0').memory_clusters.length,1);
});
test('actual Director preparation receives owner candidate packets once and paused Director never calls model boundary',async t=>{
 const {db}=fixture(t),before=db.db.serialize();let calls=0;const gm={async planNpcActions(input){calls++;assert.equal(input.candidates.length,2);assert.ok(input.candidates.every(x=>x.type==='npc'&&x.memories.length));return {actions:[]};}};
 const result=await prepareNpcDirector({db,gm,guildId:'city',layer:'scene',cycleKey:'fresh-c28',query:'harbor'});assert.equal(calls,1);assert.equal(result.candidates.length,2);assert.deepEqual(result.proposed,{actions:[]});assert.deepEqual(db.db.serialize(),before);
 db.setDirectorPaused('city',true);const paused=await prepareNpcDirector({db,gm,guildId:'city',layer:'scene',cycleKey:'fresh-c28-paused',query:'harbor'});assert.equal(paused.paused,true);assert.equal(calls,1);
});
test('native density selection retains original affordable actor and packet caps',t=>{
 const {db}=fixture(t,10);db.setCityCalendar('city',{...db.getCityCalendar('city'),flags:{activity_density:true}});for(let i=0;i<10;i++)World.configureSimulationEntity(db,'city','npc',`harbor-keeper-${i}`,{activity_tier:'active'});
 const rows=candidates(db);assert.ok(rows.length>0&&rows.length<=4);assert.ok(rows.every(r=>JSON.stringify(r).length<=12000));assert.ok(2+rows.reduce((n,r)=>n+JSON.stringify(r).length+1,0)<=24000);
 const zero=Object.fromEntries(['influence','materials','information','manpower','leverage','wounds','stress','favors'].map(k=>[k,0]));for(let i=0;i<10;i++)World.configureSimulationEntity(db,'city','npc',`harbor-keeper-${i}`,{resources:zero});assert.equal(candidates(db).length,0);
});
