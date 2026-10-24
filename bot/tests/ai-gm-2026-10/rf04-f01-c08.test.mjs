import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {connectCity,changeCityService,recalculateInfrastructure,applyNpcServiceOutcome,indexWorldEvent,requireWorldLocation} from '../../src/frameworks/world/public.js';

function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'rf04-world-network-')),file=join(dir,'network.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);
 db.ensureCampaign('g');indexWorldEvent(db,'g',{key:'source',title:'Reviewed work',source_id:'gm:reviewer'});
 for(const key of ['harbor','market'])db.setSimulationEntity('g','location',key,{name:key,description:'existing',civic_services:{unrelated:{condition:17}}});
 const node=(key,condition=70,extra={})=>db.saveCityRecord('g',{kind:'infrastructure',key,source_event:'source',data:{name:key,service:'lighting',native_condition:condition,effective_condition:condition,locations:['harbor'],redundancy:'all',...extra}});
 const edge=(from,to)=>connectCity(db,'g',{kind:'infrastructure',from,to,source_event:'source'},'reviewer');
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});return {get db(){return db;},node,edge,reopen(){db.close();db=new VeiledDB(file,schema);}};
}
const condition=(db,key)=>db.getCityRecord('g','infrastructure',key).data.effective_condition;

test('dependency propagation uses all and any redundancy while preserving independent location state',t=>{
 const f=fixture(t);f.node('weak',50);f.node('strong',70);f.node('all',80);f.node('any',80,{redundancy:'any'});f.edge('weak','all');f.edge('strong','all');f.edge('weak','any');f.edge('strong','any');
 assert.equal(condition(f.db,'all'),50);assert.equal(condition(f.db,'any'),70);assert.equal(f.db.getSimulationEntity('g','location','harbor').state.description,'existing');assert.equal(f.db.getSimulationEntity('g','location','harbor').state.civic_services.unrelated.condition,17);assert.equal(f.db.getSimulationEntity('g','location','harbor').state.civic_services.all.condition,50);
 assert.ok(f.db.mutationsForEntity('g','all').every(r=>r.visibility==='gm'));
});

test('cycle and self-edge rejection leave the established topology unchanged',t=>{
 const f=fixture(t);f.node('a');f.node('b');f.edge('a','b');assert.throws(()=>f.edge('b','a'),/cycle/);assert.throws(()=>f.edge('a','a'),/Self-dependency/);assert.equal(f.db.cityEdges('g','infrastructure').length,1);assert.equal(condition(f.db,'a'),70);
});

test('major deterioration produces one pending proposal across restart without applying an outcome',t=>{
 const f=fixture(t);f.node('generator',90);const input={key:'generator',source_event:'source',condition:20};const proposed=changeCityService(f.db,'g',input,'reviewer');assert.equal(proposed.kind,'change');assert.equal(proposed.status,'pending');assert.equal(condition(f.db,'generator'),90);assert.equal(proposed.visibility,'gm');
 f.reopen();assert.deepEqual(changeCityService(f.db,'g',input,'reviewer'),proposed);assert.equal(f.db.mutationsForEntity('g',proposed.record_key).length,1);assert.equal(condition(f.db,'generator'),90);
});

test('actual mixed civic review applies pending World service once and retains original receipt',async t=>{
 const f=fixture(t),source=await import('../../src/city-civic.js');f.node('generator',90);const pending=changeCityService(f.db,'g',{key:'generator',source_event:'source',condition:20},'gm');
 const result=source.reviewCivicChange(f.db,'g',{key:pending.record_key,decision:'approve'},'human');assert.equal(result.status,'completed');assert.equal(condition(f.db,'generator'),20);assert.equal(result.data.reviews.length,1);assert.throws(()=>source.reviewCivicChange(f.db,'g',{key:pending.record_key,decision:'approve'},'human'),/Pending civic change not found/);assert.equal(f.db.getCityRecord('g','change',pending.record_key).data.reviews.length,1);
});

test('a significant dependency connection remains queued until explicit review',async t=>{
 const f=fixture(t);f.node('source-low',10);f.node('site',90);const pending=f.edge('source-low','site');assert.equal(pending.kind,'change');assert.equal(f.db.cityEdges('g','infrastructure').length,0);assert.equal(condition(f.db,'site'),90);
 const source=await import('../../src/city-civic.js');source.reviewCivicChange(f.db,'g',{key:pending.record_key,decision:'approve'},'human');assert.equal(f.db.cityEdges('g','infrastructure').length,1);assert.equal(condition(f.db,'site'),10);
});

test('withdrawn or foreign source and invalid service values cannot change established service',t=>{
 const f=fixture(t);f.node('generator');for(const input of [{source_event:'missing',condition:60},{source_event:'source',condition:101},{source_event:'source',condition:1.5}])assert.throws(()=>changeCityService(f.db,'g',{key:'generator',...input},'gm'));
 indexWorldEvent(f.db,'g',{key:'source',status:'retracted'});assert.throws(()=>changeCityService(f.db,'g',{key:'generator',source_event:'source',condition:60},'gm'),/active source/);assert.equal(condition(f.db,'generator'),70);
});

test('propagation audit failure rolls back edge, service and location projections in one real transaction',t=>{
 const f=fixture(t);f.node('supply',50);f.node('consumer',70);const before=f.db.getSimulationEntity('g','location','harbor'),original=f.db.recordMutation;
 f.db.recordMutation=function(g,m){if(m.mutationType==='location_service')throw Error('injected projection audit failure');return original.call(this,g,m);};
 assert.throws(()=>f.edge('supply','consumer'),/injected projection/);assert.equal(f.db.cityEdges('g','infrastructure').length,0);assert.equal(condition(f.db,'consumer'),70);assert.deepEqual(f.db.getSimulationEntity('g','location','harbor'),before);assert.equal(f.db.mutationsForEntity('g','consumer').length,0);
});

test('service-condition audit failure preserves all upstream and downstream state',t=>{
 const f=fixture(t);f.node('supply',70);f.node('consumer',80);f.edge('supply','consumer');const original=f.db.recordMutation;
 f.db.recordMutation=function(g,m){if(m.mutationType==='service_condition')throw Error('injected condition audit failure');return original.call(this,g,m);};
 assert.throws(()=>changeCityService(f.db,'g',{key:'supply',source_event:'source',condition:60},'gm'),/injected condition/);assert.equal(condition(f.db,'supply'),70);assert.equal(condition(f.db,'consumer'),70);
});

test('route and channel records grant neither PC movement nor recipient knowledge',t=>{
 const f=fixture(t);f.db.upsertNpcProfile('g',{npcKey:'porter',displayName:'Porter'});connectCity(f.db,'g',{kind:'route',from:'harbor',to:'market',duration:12,source_event:'source'},'gm');connectCity(f.db,'g',{kind:'channel',from:'npc:porter',to:'audience:party',source_event:'source'},'gm');
 assert.equal(f.db.cityEdges('g','route')[0].duration_minutes,12);assert.equal(f.db.getNpcKnowledge('g','porter','source'),undefined);assert.equal(f.db.listGuildCharacters('g').length,0);assert.equal(f.db.listCityRecords('g',{kind:'message',includeGM:true}).length,0);assert.throws(()=>requireWorldLocation(f.db,'another-campaign','harbor'),/not established/);assert.throws(()=>connectCity(f.db,'g',{kind:'route',from:'harbor',to:'market',duration:0,source_event:'source'},'gm'));
});

test('resolved NPC repair affects only established location-linked services and preserves native caller transaction',t=>{
 const f=fixture(t);f.node('lamp',65);f.node('elsewhere',65,{locations:['market']});const mutation=f.db.recordMutation('g',{mutationType:'npc_action_resolved',entityKey:'npc:porter',after:{success:true}});indexWorldEvent(f.db,'g',{key:'mutation:'+mutation.id,title:'Native action source',source_kind:'mutation',source_id:mutation.id});
 f.db.transaction(()=>applyNpcServiceOutcome(f.db,'g',{type:'repair',location_key:'harbor'},mutation));assert.equal(condition(f.db,'lamp'),75);assert.equal(condition(f.db,'elsewhere'),65);assert.equal(f.db.getSimulationClock('g').minute,0);
 assert.throws(()=>f.db.transaction(()=>{applyNpcServiceOutcome(f.db,'g',{type:'sabotage',location_key:'harbor'},mutation);throw Error('outer native rollback');}),/outer native rollback/);assert.equal(condition(f.db,'lamp'),75);
});

test('source reexport identity preserves current civic callers without duplicate service implementations',async t=>{
 const source=await import('../../src/city-civic.js');assert.equal(source.connectCity,connectCity);assert.equal(source.changeCityService,changeCityService);assert.equal(source.applyNpcServiceOutcome,applyNpcServiceOutcome);
 const f=fixture(t);f.node('unconnected');assert.equal(recalculateInfrastructure(f.db,'g','source'),1);assert.equal(condition(f.db,'unconnected'),70);
});
