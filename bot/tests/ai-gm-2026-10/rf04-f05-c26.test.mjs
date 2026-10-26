import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';import '../../src/audience-native-v9.js';
import {initializeKnowledgeWorld,initializeKnowledgeNarrative,initializeNpcEvidenceProjection} from '../../src/application/composition/public.js';
import * as Knowledge from '../../src/frameworks/knowledge/public.js';import * as World from '../../src/frameworks/world/public.js';import * as Npc from '../../src/frameworks/npc/public.js';
import {ContextPlanner as LegacyPlanner} from '../../src/context-planner.js';import {historyContext as historicalHistory,updateCityCivic} from '../../src/city-civic.js';
initializeKnowledgeWorld();initializeKnowledgeNarrative();initializeNpcEvidenceProjection();
function fixture(t){const dir=mkdtempSync(path.join(tmpdir(),'vc-c26-')),file=path.join(dir,'fresh.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);db.ensureCampaign('city');t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});return {get db(){return db;},reopen(){db.close();db=new VeiledDB(file,schema);return db;}};}
function add(db,key,visibility,extra={}){return db.addFact('city',{key,content:`Harbor ${key}`,visibility,source:'gm',...extra});}
function source(db,key){return World.indexWorldEvent(db,'city',{key,kind:'observation',title:'Harbor source',source_id:'fresh-c26-gm',visibility:'gm'});}
function history(db,key,ref,summary){return updateCityCivic(db,'city',{kind:'history',key,source_event:ref,data:{title:'Harbor record',summary,preserves_contradictions:true,source_events:[ref]}},'fresh-c26-gm');}
test('fixed Knowledge history consumer fails before binding and preserves exact native results and errors',()=>{
 const p=Knowledge.createKnowledgeWorldHistoryConsumer();assert.throws(()=>p.historyContext(),{code:'KNOWLEDGE_HISTORY_COMPOSITION'});assert.throws(()=>p.bind({}),TypeError);const result=[],args=[{},'city','harbor'];const fn=(...actual)=>{assert.deepEqual(actual,args);return result;};p.bind(fn);p.bind(fn);assert.equal(p.historyContext(...args),result);assert.throws(()=>p.bind(()=>[]),/replacement/);
 const error=new Error('native query failure'),q=Knowledge.createKnowledgeWorldHistoryConsumer();q.bind(()=>{throw error;});assert.throws(()=>q.historyContext(),e=>e===error);
});
test('application compatibility class and saved World reader retain exact owner identities',()=>{
 assert.equal(LegacyPlanner,Knowledge.ContextPlanner);assert.equal(historicalHistory,World.historyContext);assert.equal(initializeKnowledgeWorld(),initializeKnowledgeWorld());
});
test('actual NPC planning excludes global private facts and other actors before ranking',t=>{
 const {db}=fixture(t);Npc.seedNpcCognition({db,guildId:'city',content:{read:()=>JSON.stringify([{name:'Harbor Keeper',knows:['Harbor native testimony.'],secret:'Harbor hidden promise.'},{name:'Other Keeper',knows:['Harbor other actor testimony.']}])}});
 const global=add(db,'global-cause','gm'),party=add(db,'global-observation','party');const before=db.db.serialize();const result=new Knowledge.ContextPlanner(db).plan('city',{actorType:'npc',actorKey:'harbor-keeper',query:'harbor',maxTokens:6000});
 assert.ok(result.segments.some(s=>s.source==='npc_knowledge:harbor-keeper:seed.known.1'));assert.ok(result.segments.every(s=>!s.source.includes('other-keeper')&&!s.source.includes(global)&&!s.source.includes(party)));assert.match(result.withheld.join(' '),/other actor knowledge/);assert.deepEqual(db.db.serialize(),before);
});
test('owner private exact-source expansion cannot retrieve another recipient or GM fact',t=>{
 const {db}=fixture(t);db.upsertPlayer('city','owner','Owner');db.upsertPlayer('city','other','Other');const pc=db.createCharacter('city','owner','Fresh PC'),other=db.createCharacter('city','other','Other PC');
 const own=add(db,'own','character',{subjectCharacterId:pc.id}),alien=add(db,'alien','character',{subjectCharacterId:other.id}),gm=add(db,'gm','gm');const planner=new Knowledge.ContextPlanner(db),scope={actorType:'character',actorKey:pc.id,userId:'owner',characterId:pc.id,query:'harbor',maxTokens:6000,sourceRefs:[`fact:${own}`,`fact:${alien}`,`fact:${gm}`]};
 const result=planner.plan('city',scope);assert.ok(result.segments.some(x=>x.source===`fact:${own}`));assert.ok(result.segments.every(x=>![`fact:${alien}`,`fact:${gm}`].includes(x.source)));assert.throws(()=>planner.plan('city',{...scope,userId:'other'}),/current owner/);
});
test('bounded context pages preserve omissions and reject invalid exact-source requests',t=>{
 const {db}=fixture(t);const ids=[];for(let i=0;i<55;i++)ids.push(add(db,`fact-${i}`,'party',{content:`Harbor ${i} ${'detail '.repeat(85)}`}));const planner=new Knowledge.ContextPlanner(db);
 const result=planner.plan('city',{actorType:'player',scope:'party',query:'harbor',maxTokens:100});assert.equal(result.fact_page.next_page,1);assert.ok(result.omissions.length>0);assert.ok(result.estimated_tokens<=100);
 const second=planner.plan('city',{actorType:'player',scope:'party',factPage:1,maxTokens:6000});assert.equal(second.fact_page.sources.length,5);assert.equal(second.fact_page.next_page,null);
 assert.throws(()=>planner.plan('city',{sourceRefs:['event:wrong']}),/bounded exact fact/);assert.throws(()=>planner.plan('city',{sourceRefs:ids.slice(0,13).map(x=>`fact:${x}`)}),/bounded exact fact/);assert.throws(()=>planner.plan('city',{factPage:-1}),/bounded/);
});
test('native World history reaches GM context as summary-only and tracks retracted original source after restart',t=>{
 const f=fixture(t),s=source(f.db,'history-origin');history(f.db,'harbor-history',s.event_key,'Harbor witnesses disagree about the bell.');let planner=new Knowledge.ContextPlanner(f.db);const before=f.db.db.serialize();
 const result=planner.plan('city',{actorType:'gm',scope:'gm',query:'harbor',maxTokens:6000}),segment=result.segments.find(x=>x.source.startsWith('history:'));assert.ok(segment);assert.equal(segment.data.authority,'SUMMARY_NOT_CANON');assert.equal(segment.data.sources[0].status,'active');assert.deepEqual(f.db.db.serialize(),before);
 const party=planner.plan('city',{actorType:'player',scope:'party',query:'harbor',maxTokens:6000});assert.ok(party.segments.every(x=>!x.source.startsWith('history:')));
 World.indexWorldEvent(f.db,'city',{key:s.event_key,status:'retracted'});f.reopen();planner=new Knowledge.ContextPlanner(f.db);assert.equal(planner.plan('city',{actorType:'gm',scope:'gm',query:'harbor',maxTokens:6000}).segments.find(x=>x.source.startsWith('history:')).data.sources[0].status,'retracted');assert.equal(f.db.listCanon('city',{includeGM:true}).length,0);
});
test('saved World history extraction keeps original six-term four-summary and aggregate bounds',t=>{
 const {db}=fixture(t),s=source(db,'bounded-history-origin');for(let i=0;i<5;i++)history(db,`bounded-${i}`,s.event_key,`Harbor ${i} `+'record '.repeat(700));const original=db.listCityRecords,queries=[];db.listCityRecords=function(g,opts){if(opts.kind==='history')queries.push({...opts});return original.call(this,g,opts);};
 const rows=World.historyContext(db,'city','harbor harbor harbor harbor harbor harbor harbor extra');db.listCityRecords=original;assert.equal(queries.length,6);assert.ok(queries.every(q=>q.limit===4&&q.includeGM===true));assert.ok(rows.length>=1&&rows.length<=4);assert.ok(rows.reduce((n,r)=>n+JSON.stringify(r).length,0)<=10000);assert.ok(rows.every(r=>r.authority==='SUMMARY_NOT_CANON'&&r.sources.length===1));
});
