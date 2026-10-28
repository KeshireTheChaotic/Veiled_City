import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Worker} from 'node:worker_threads';
import {VeiledDB} from '../../src/db.js';
import {createNpcEvidenceProvider,npcEvidenceProvider} from '../../src/frameworks/npc/public.js';
import {createNpcEvidenceConsumer,indexWorldEvent} from '../../src/frameworks/world/public.js';
import {connectNpcWorldEvidence} from '../../src/framework-to-framework/npc--world/public.js';
import {initializeNpcWorldEvidence} from '../../src/application/composition/public.js';
import * as npc from '../../src/frameworks/npc/public.js';
import * as world from '../../src/frameworks/world/public.js';
import {transferSupply,supplyRevision} from '../../src/frameworks/world/public.js';
import {checkProject} from '../../tooling/architecture/read-project.mjs';

function fixture(t){
 initializeNpcWorldEvidence();const dir=mkdtempSync(join(tmpdir(),'rf04-npc-world-pair-')),file=join(dir,'pair.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);db.ensureCampaign('g');db.setCityCalendar('g',{flags:{narrative_authority:true,playable_narration:true,supply_dependencies:true}});
 for(const [key,materials] of [['courier',6],['receiver',1]]){db.upsertNpcProfile('g',{npcKey:key,displayName:key});db.setSimulationEntity('g','npc',key,{activity_tier:'supporting',location_key:'harbor',resources:{information:2,materials}});}
 indexWorldEvent(db,'g',{key:'policy',title:'Explicit delegation fixture',source_id:'gm:policy'});db.saveCityRecord('g',{kind:'ai_delegation',key:'campaign',source_event:'policy',data:{mode:'routine_delegated',revision:1,allow:['goal.propose'],private_allow:[],expires_minute:100}});
 indexWorldEvent(db,'g',{key:'evidence',title:'Attributed report',source_id:'gm:source',visibility:'gm'});indexWorldEvent(db,'g',{key:'delivery',title:'Already adjudicated material delivery',source_id:'gm:source',visibility:'gm',details:{resource_transfer:{from:'courier',to:'receiver',amount:2,resource:'materials',human_reviewed:true}}});
 for(const key of ['evidence','delivery'])db.upsertNpcKnowledge('g',{npcKey:'courier',knowledgeKey:key,content:'A sourced subjective report about '+key,beliefState:'suspected',confidence:60,sourceType:'told_by_npc',sourceRef:key,isSecret:true});
 const intent=()=>({feature:'goal',target_key:'goal-proposal',policy_revision:1,payload:{op:'propose',source_event:'evidence',actor_type:'npc',actor_key:'courier',information_key:'evidence',goal_key:'check-report',objective:'Investigate the attributed report.',priority:50,confidence:60,horizon:'near',dependencies:[],acceptable_methods:['investigate']}});
 const grant=()=>world.prepareNativeWorldOperation(db,'g',intent(),{scope:{mode:'party'},nativeEffectKey:'native-effect'});
 const supply=()=>({op:'transfer',source_event:'delivery',from:'courier',to:'receiver',amount:2,information_key:'delivery',from_revision:supplyRevision(db.getSimulationEntity('g','npc','courier')),to_revision:supplyRevision(db.getSimulationEntity('g','npc','receiver'))});
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});return {get db(){return db;},file,schema,intent,grant,supply,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('fixed source and World consumer fail closed until composed and forbid replacement',()=>{
 const provider=createNpcEvidenceProvider(),consumer=createNpcEvidenceConsumer();assert.throws(()=>provider.actorSourceFunction(),e=>e.code==='NPC_WORLD_EVIDENCE_COMPOSITION');assert.throws(()=>provider.provideSource({authorized:true}),TypeError);assert.throws(()=>consumer.actorSource({},'g',{}),e=>e.code==='NPC_WORLD_EVIDENCE_COMPOSITION');const source=()=>({evidence:'checked'}),factory=()=>source;provider.provideSource(factory);provider.provideSource(factory);assert.equal(provider.actorSourceFunction(),source);assert.throws(()=>provider.provideSource(()=>source),/already provided/);consumer.bind(source);assert.throws(()=>consumer.bind(()=>({evidence:'replacement'})),/replacement forbidden/);
});

test('adapter forwards original exact inputs and original checked result without manufacturing authority',()=>{
 const consumer=createNpcEvidenceConsumer(),db={},query={actor_type:'npc',actor_key:'courier',information_key:'report',source_event:'source'},options={requireResources:false},result={evidence:{belief_state:'rumor',is_secret:1},event:{visibility:'gm'}},seen=[];const connected=connectNpcWorldEvidence({consumer,source:(...args)=>{seen.push(args);return result;}});assert.equal(connected.actorSource(db,'g',query,options),result);assert.equal(seen.length,1);assert.equal(seen[0][0],db);assert.equal(seen[0][2],query);assert.equal(seen[0][3],options);assert.equal(result.execution_authority,undefined);assert.equal(result.publication_authority,undefined);
});

test('production initialization is idempotent and uses the original single NPC source engine',()=>{
 assert.equal(initializeNpcWorldEvidence(),initializeNpcWorldEvidence());assert.equal(npcEvidenceProvider.actorSourceFunction(),npcEvidenceProvider.actorSourceFunction());assert.equal(typeof npcEvidenceProvider.actorSourceFunction(),'function');
});

test('actual NPC evidence and World authority mint an exact live grant without canon or PC effects',t=>{
 const f=fixture(t),grant=f.grant(),input=f.intent();assert.ok(grant);assert.equal(world.nativeWorldOperationAllows(f.db,'g',grant,'goal','propose',{...input.payload,key:input.target_key}),true);assert.equal(world.nativeWorldOperationOrigin(grant).feature,'goal');assert.equal(world.nativeWorldOperationAllows(f.db,'g',JSON.parse(JSON.stringify(grant)),'goal','propose',input.payload),false);assert.equal(f.db.listCanon('g',{includeGM:true}).length,0);assert.equal(f.db.listGuildCharacters('g').length,0);assert.equal(f.db.getSimulationEntity('g','npc','courier').state.resources.information,2);
});

test('actual native goal proposal and approval persist and replay once through the connected NPC service',t=>{
 const f=fixture(t),grant=f.grant(),input=f.intent();const pending=npc.proposeGoalTransition(f.db,'g',{key:input.target_key,...input.payload},'ai_policy',{nativeAuthority:grant});assert.equal(pending.status,'pending');assert.equal(pending.data.source_belief,'suspected');const done=npc.reviewGoalTransition(f.db,'g',{key:pending.record_key,decision:'approve'},'ai_policy',{nativeAuthority:grant});assert.equal(done.status,'approved');assert.equal(f.db.getNpcGoal('g','courier','check-report').status,'active');assert.equal(f.db.mutationsForEntity('g',pending.record_key).length,2);f.reopen();assert.deepEqual(npc.reviewGoalTransition(f.db,'g',{key:pending.record_key,decision:'approve'},'ai_policy',{nativeAuthority:grant}),done);assert.equal(f.db.mutationsForEntity('g',pending.record_key).length,2);assert.equal(f.db.getSimulationEntity('g','npc','courier').state.resources.information,2);
});

test('current actor control is rechecked by the native domain after a grant and before goal approval',t=>{
 const f=fixture(t),grant=f.grant(),input=f.intent();npc.proposeGoalTransition(f.db,'g',{key:input.target_key,...input.payload},'ai_policy',{nativeAuthority:grant});const before=f.db.getSimulationEntity('g','npc','courier');f.db.setSimulationEntity('g','npc','courier',{...before.state,owner_user_id:'human-owner'});assert.throws(()=>npc.reviewGoalTransition(f.db,'g',{key:input.target_key,decision:'approve'},'ai_policy',{nativeAuthority:grant}),/rightful principal/);assert.equal(f.db.getNpcGoal('g','courier','check-report'),null);assert.equal(f.db.getCityRecord('g','goal_transition',input.target_key).status,'pending');
});

test('a model label or objective event cannot substitute for separately acquired NPC knowledge',t=>{
 const f=fixture(t);f.db.upsertNpcKnowledge('g',{npcKey:'courier',knowledgeKey:'evidence',content:'Unattributed assertion',beliefState:'known',confidence:100,sourceRef:'unrelated'});assert.throws(()=>world.prepareNativeWorldOperation(f.db,'g',{...f.intent(),authorized:true},{scope:{mode:'party'}}),/legitimately acquired evidence/);assert.equal(f.db.getNpcGoal('g','courier','check-report'),null);assert.equal(f.db.listCanon('g',{includeGM:true}).length,0);
});

test('policy and source changes invalidate the actual grant without overwriting pending history',t=>{
 const f=fixture(t),grant=f.grant(),input=f.intent();const row=npc.proposeGoalTransition(f.db,'g',{key:input.target_key,...input.payload},'ai_policy',{nativeAuthority:grant});indexWorldEvent(f.db,'g',{key:'evidence',status:'retracted'});assert.equal(world.nativeWorldOperationAllows(f.db,'g',grant,'goal','propose',{key:input.target_key,...input.payload}),false);assert.throws(()=>npc.reviewGoalTransition(f.db,'g',{key:input.target_key,decision:'approve'},'ai_policy',{nativeAuthority:grant}),/authority changed/);assert.deepEqual(f.db.getCityRecord('g','goal_transition',input.target_key),row);
});

test('actual connected supply path checks original NPC evidence and replays one durable private receipt after restart',t=>{
 const f=fixture(t),input=f.supply(),row=transferSupply(f.db,'g',input,'human-gm');assert.deepEqual(row.data.before,[6,1]);assert.deepEqual(row.data.after,[4,3]);assert.equal(row.visibility,'gm');assert.equal(f.db.mutationsForEntity('g',row.record_key).length,1);f.reopen();assert.deepEqual(transferSupply(f.db,'g',input,'other'),row);assert.deepEqual(['courier','receiver'].map(k=>f.db.getSimulationEntity('g','npc',k).state.resources.materials),[4,3]);assert.equal(f.db.mutationsForEntity('g',row.record_key).length,1);
});

test('source control failure and actual SQLite audit failure leave both supply balances and receipt unchanged',t=>{
 const f=fixture(t),input=f.supply(),old=f.db.getSimulationEntity('g','npc','courier');f.db.setSimulationEntity('g','npc','courier',{...old.state,owner_control_type:'admin'});assert.throws(()=>transferSupply(f.db,'g',f.supply(),'human-gm'),/rightful principal/);f.db.setSimulationEntity('g','npc','courier',old.state);const record=f.db.recordMutation;f.db.recordMutation=()=>{throw Error('injected connected supply audit failure');};assert.throws(()=>transferSupply(f.db,'g',input,'human-gm'),/injected connected supply audit/);f.db.recordMutation=record;assert.deepEqual(['courier','receiver'].map(k=>f.db.getSimulationEntity('g','npc',k).state.resources.materials),[6,1]);assert.equal(f.db.getCityRecord('g','supply_transfer',supplyRevision(['delivery'])),null);
});

test('actual PC identity cannot be disguised as an autonomous NPC through the composed source interface',t=>{
 const f=fixture(t),pc=f.db.createCharacter('g','owner','Player'),input=f.intent();input.payload.actor_key=pc.id;assert.throws(()=>world.prepareNativeWorldOperation(f.db,'g',input,{scope:{mode:'party'}}),/Player characters/);assert.equal(f.db.getCharacter(pc.id).data.resources.hope,2);assert.equal(f.db.getCharacter(pc.id).data.location,undefined);
});

test('current startup source binds pair before runtime services and retains static NPC provider registration reachability',()=>{
 const root=fileURLToPath(new URL('../../../',import.meta.url)),r=checkProject(root,{phase:'RF04'}),source=readFileSync(new URL('../../src/index.js',import.meta.url),'utf8');const call=source.indexOf('initializeNpcWorldEvidence();');assert.ok(call>=0);assert.ok(call<source.indexOf('const config=loadConfig()'));assert.ok(call<source.indexOf('const db=new VeiledDB'));
 const pair='bot/src/framework-to-framework/npc--world/public.js',targets=r.edges.filter(e=>e.from===pair).map(e=>e.to);assert.deepEqual(new Set(targets),new Set(['bot/src/frameworks/npc/public.js','bot/src/frameworks/world/public.js']));for(const from of ['bot/src/native-world-operations.js','bot/src/frameworks/world/public.js'])assert.equal(r.edges.some(e=>e.from===from&&e.to==='bot/src/simulation-motivation.js'),false);
 const seen=new Set(),queue=['bot/src/index.js'];while(queue.length){const next=queue.shift();if(seen.has(next))continue;seen.add(next);for(const edge of r.edges)if(edge.from===next&&edge.to)queue.push(edge.to);}assert.equal(r.summary.pass,true);assert.equal(r.summary.unowned,0);
});


test('saved supply receipt replays in a fresh process without live NPC/World composition', {timeout:15000},async t=>{
 const f=fixture(t),input=f.supply(),saved=transferSupply(f.db,'g',input,'human-gm'),dbModule=new URL('../../src/db.js',import.meta.url).href,supplyModule=new URL('../../src/frameworks/world/public.js',import.meta.url).href;
 const result=await new Promise((resolve,reject)=>{let terminal;const worker=new Worker(
  "const {parentPort,workerData}=require('node:worker_threads');(async()=>{let db;try{const {VeiledDB}=await import(workerData.dbModule);const {transferSupply}=await import(workerData.supplyModule);db=new VeiledDB(workerData.file,workerData.schema);const row=transferSupply(db,'g',workerData.input,'fresh-reader');parentPort.postMessage({row});}catch(e){parentPort.postMessage({error:e.message});}finally{db?.close();}})();",
  {eval:true,workerData:{file:f.file,schema:f.schema,input,dbModule,supplyModule}});worker.on('message',value=>{terminal=value;});worker.once('error',reject);worker.once('exit',code=>code===0&&terminal&&!terminal.error?resolve(terminal.row):reject(Error(terminal?.error||'Fresh reader worker exit '+code)));});
 assert.deepEqual(result,saved);assert.equal(f.db.mutationsForEntity('g',saved.record_key).length,1);assert.deepEqual(['courier','receiver'].map(k=>f.db.getSimulationEntity('g','npc',k).state.resources.materials),[4,3]);
});
