import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createMemoryClusters} from '../../src/frameworks/knowledge/public.js';
import {cityObject,cityKey,cityAudit,requireCitySource,indexWorldEvent} from '../../src/frameworks/world/public.js';
import * as original from '../../src/memory-clusters.js';
import {retrieveNpcCognition} from '../../src/npc-cognition.js';

function notes(t){
 const folder=mkdtempSync(join(tmpdir(),'rf04-cluster-c02-')),file=join(folder,'notes.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);db.ensureCampaign('records');db.setCityCalendar('records',{flags:{memory_consolidation:true}});indexWorldEvent(db,'records',{key:'inspection',title:'Bridge inspection report',source_id:'gm:inspection'});for(const npc of ['surveyor','porter'])db.upsertNpcProfile('records',{npcKey:npc,displayName:npc});
 const first=db.addNpcMemory('records',{npcKey:'surveyor',content:'One witness reports a loose bridge plank',confidence:60,importance:30,sourceRef:'inspection'}),second=db.addNpcMemory('records',{npcKey:'surveyor',content:'Another witness disputes that report',confidence:45,importance:20,sourceRef:'inspection',status:'challenged'}),other=db.addNpcMemory('records',{npcKey:'porter',content:'Porter-only testimony',confidence:80,sourceRef:'inspection'}),api=createMemoryClusters({cityObject,cityKey,cityAudit,requireCitySource});
 const input=(patch={})=>({key:'bridge-index',actor_type:'npc',actor_key:'surveyor',source_event:'inspection',topic:'Bridge testimony',sources:[{kind:'npc_memory',key:first.id},{kind:'npc_memory',key:second.id}],...patch}),manage=(patch={})=>api.manageMemoryCluster(db,'records',input(patch),'human-gm'),context=(actor='surveyor')=>api.clusterContext(db,'records','npc',actor,'bridge');
 t.after(()=>{db.close();rmSync(folder,{recursive:true,force:true});});return {api,get db(){return db;},first,second,other,input,manage,context,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('private actor cluster preserves contradictory testimony, source confidence and all original memories',t=>{
 const f=notes(t),row=f.manage();assert.equal(row.visibility,'gm');assert.equal(row.data.authority,'memory_not_canon');assert.equal(row.data.excerpts[0].confidence,60);assert.equal(row.data.excerpts[1].status,'challenged');assert.match(row.data.uncertainty,/disagreements are retained/);assert.equal(f.db.getNpcMemory(f.first.id).content,f.first.content);assert.equal(f.db.getNpcMemory(f.second.id).content,f.second.content);assert.equal(f.db.listCanon('records',{includeGM:true}).length,0);assert.equal(f.db.getSimulationEntity('records','npc','surveyor'),null);assert.equal(f.db.listCityRecords('records',{kind:'memory_cluster'}).length,0);
});

test('cross-actor memories, duplicate refs, foreign campaign memories and changed actor revisions cannot consolidate',t=>{
 const f=notes(t);assert.throws(()=>f.manage({sources:[{kind:'npc_memory',key:f.other.id}]}),/no cross-actor/);assert.throws(()=>f.manage({sources:[{kind:'npc_memory',key:f.first.id},{kind:'npc_memory',key:f.first.id}]}),/Duplicate/);f.db.ensureCampaign('elsewhere');f.db.upsertNpcProfile('elsewhere',{npcKey:'surveyor',displayName:'Other surveyor'});const foreign=f.db.addNpcMemory('elsewhere',{npcKey:'surveyor',content:'Other campaign testimony'});assert.throws(()=>f.manage({sources:[{kind:'npc_memory',key:foreign.id}]}),/no cross-actor/);f.manage();assert.throws(()=>f.manage({op:'revise',actor_key:'porter'}),/unchanged cluster actor/);assert.deepEqual(f.context('porter'),[]);
});

test('cluster restart and consolidate replay preserve revision and never replace source memories',t=>{
 const f=notes(t),row=f.manage();f.reopen();assert.deepEqual(f.manage(),row);assert.equal(f.context()[0].revision,1);assert.equal(f.db.listNpcMemories('records','surveyor').length,2);assert.equal(f.db.mutationsForEntity('records','bridge-index').length,1);
});

test('revision stores source history and reversion is idempotent without deleting or globally reconciling testimony',t=>{
 const f=notes(t);f.manage();const revised=f.manage({op:'revise',topic:'Revisited bridge testimony',sources:[{kind:'npc_memory',key:f.second.id}]});assert.equal(revised.data.revision,2);assert.equal(revised.data.history[0].revision,1);assert.equal(revised.data.history[0].excerpts[0].content,f.first.content);const reverted=f.manage({op:'revert'});assert.equal(reverted.status,'reverted');assert.deepEqual(f.manage({op:'revert'}),reverted);assert.deepEqual(f.context(),[]);assert.equal(f.db.listNpcMemories('records','surveyor').length,2);
});

test('retracted source removes current cluster context while retained history and original memories survive reopen',t=>{
 const f=notes(t),row=f.manage();indexWorldEvent(f.db,'records',{key:'inspection',status:'retracted'});assert.deepEqual(f.context(),[]);assert.equal(f.db.getCityRecord('records','memory_cluster','bridge-index').data.excerpts[0].content,row.data.excerpts[0].content);f.reopen();assert.deepEqual(f.context(),[]);assert.equal(f.db.getNpcMemory(f.first.id).content,f.first.content);assert.throws(()=>f.manage({op:'revise'}),/active source event/);
});

test('cluster creation audit failure rolls record and audit back without modifying source memories',t=>{
 const f=notes(t),record=f.db.recordMutation;f.db.recordMutation=()=>{throw Error('C02 audit fail');};assert.throws(()=>f.manage(),/C02 audit/);f.db.recordMutation=record;assert.equal(f.db.getCityRecord('records','memory_cluster','bridge-index'),null);assert.equal(f.db.getNpcMemory(f.first.id).content,f.first.content);assert.equal(f.db.mutationsForEntity('records','bridge-index').length,0);assert.equal(f.manage().data.revision,1);
});

test('faction, institutional and campaign clusters use only their separate recorded source domains',t=>{
 const f=notes(t),memory=f.db.putSimulationRecord('records',{kind:'memory',entityKey:'faction:builders',data:{content:'An attributed builders report',confidence:55}});f.manage({key:'guild-index',actor_type:'faction',actor_key:'builders',sources:[{kind:'memory',key:memory.id}]});assert.equal(f.api.clusterContext(f.db,'records','faction','builders')[0].claims[0].confidence,55);assert.throws(()=>f.manage({key:'wrong-faction',actor_type:'faction',actor_key:'another',sources:[{kind:'memory',key:memory.id}]}),/no cross-actor/);f.db.saveCityRecord('records',{kind:'report',key:'filed',actor_key:'office',source_event:'inspection',data:{content:'Filed institutional allegation',confidence:50}});f.manage({key:'office-index',actor_type:'institution',actor_key:'office',sources:[{kind:'report',key:'filed'}]});assert.equal(f.api.clusterContext(f.db,'records','institution','office')[0].claims[0].content,'Filed institutional allegation');const campaign=f.manage({key:'campaign-index',actor_type:'campaign',actor_key:'records',sources:[{kind:'event',key:'inspection'}]});assert.equal(campaign.data.authority,'memory_not_canon');assert.throws(()=>f.manage({key:'wrong-campaign',actor_type:'campaign',actor_key:'another',sources:[{kind:'event',key:'inspection'}]}),/no cross-actor/);
});

test('maintenance suggests source-backed consolidation with durable actor cursor and no automatic domain commitment',t=>{
 const f=notes(t),candidate=f.api.memoryMaintenanceCandidate(f.db,'records');assert.equal(candidate.expected,null);assert.equal(candidate.payload.op,'consolidate');assert.equal(candidate.payload.actor_key,'surveyor');assert.equal(candidate.payload.sources.length,2);assert.equal(f.db.getCityRecord('records','memory_cluster',candidate.target_key),null);assert.equal(f.db.getCityRecord('records','memory_cursor','actors').data.after,'npc:surveyor');f.reopen();assert.equal(f.api.memoryMaintenanceCandidate(f.db,'records'),null);assert.equal(f.db.listNpcMemories('records','surveyor').length,2);
});

test('maintenance recommends revert after lost source and retains prior cluster and memories until explicit handling',t=>{
 const f=notes(t);f.manage();indexWorldEvent(f.db,'records',{key:'replacement',title:'Another active source',source_id:'gm:replacement'});indexWorldEvent(f.db,'records',{key:'inspection',status:'retracted'});const candidate=f.api.memoryMaintenanceCandidate(f.db,'records');assert.equal(candidate.target_key,'bridge-index');assert.equal(candidate.payload.op,'revert');assert.equal(candidate.expected.status,'active');assert.equal(f.db.getCityRecord('records','memory_cluster','bridge-index').status,'active');assert.equal(f.db.listNpcMemories('records','surveyor').length,2);
});

test('disabled consolidation reads none and proposals hold without rewriting existing memory history',t=>{
 const f=notes(t);f.manage();f.db.setCityCalendar('records',{flags:{}});assert.deepEqual(f.context(),[]);assert.equal(f.api.memoryMaintenanceCandidate(f.db,'records'),null);assert.throws(()=>f.manage({op:'revert'}),/opt-in/);assert.equal(f.db.getCityRecord('records','memory_cluster','bridge-index').status,'active');
});

test('original cluster source reaches moved policy and actual NPC retrieval consumes its private actor-only claims',t=>{
 const f=notes(t),row=original.manageMemoryCluster(f.db,'records',f.input(),'human-gm');assert.equal(row.data.authority,'memory_not_canon');const packet=retrieveNpcCognition(f.db,'records',{npcKey:'surveyor',query:'bridge',recordRecall:false})[0];assert.equal(packet.memory_clusters.length,1);assert.equal(packet.memory_clusters[0].claims.length,2);assert.doesNotMatch(JSON.stringify(packet.memory_clusters),/Porter-only/);assert.equal(packet.memory_clusters[0].authority,'memory_not_canon');assert.equal(f.db.listCanon('records',{includeGM:true}).length,0);
});
