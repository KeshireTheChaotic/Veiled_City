import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createWorldConsequences,indexWorldEvent} from '../../src/frameworks/world/public.js';
import {motivationKey} from '../../src/simulation-motivation.js';
import * as original from '../../src/city-consequences.js';

function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'rf04-world-consequence-')),file=join(dir,'causal.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema),ready=false,allowed=false,fail=false,calls=0;
 db.ensureCampaign('g');db.setCityCalendar('g',{flags:{consequences:true}});db.setSimulationEntity('g','location','harbor',{unchanged:true});
 const event=(key,kind='damage',details={},location='harbor')=>indexWorldEvent(db,'g',{key,title:key,kind,location_key:location,source_id:'gm:test',details});event('source','source');
 const handle=(database,g,row)=>{calls++;database.setSimulationEntity(g,'location','harbor',{effect:row.record_key});if(fail)throw Error('injected domain failure');return {applied:true};};
 const api=createWorldConsequences({handlers:{goal:handle,service:handle,transmit:handle},motivationKey,nativeWorldCoordinatorReady:()=>ready,nativeWorldOperationAllows:()=>allowed});
 const subscribe=(key='watch',extra={})=>api.subscribeConsequence(db,'g',{key,source_event:'source',handler:'service',entity_key:'bridge',location_key:'harbor',event_kinds:['damage'],payload:{delta:-5},...extra},'gm');
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});return {get db(){return db;},api,event,subscribe,calls:()=>calls,setReady:v=>ready=v,setAllowed:v=>allowed=v,setFailure:v=>fail=v,reopen(){db.close();db=new VeiledDB(file,schema);}};
}
function pending(f){f.subscribe();f.event('hit');return f.api.coordinateConsequences(f.db,'g')[0];}

test('subscription is a private source-bound proposal without execution or knowledge and can cancel',t=>{
 const f=fixture(t),s=f.subscribe();assert.equal(s.visibility,'gm');assert.equal(s.data.version,1);assert.equal(f.calls(),0);assert.throws(()=>f.subscribe(),/already exists/);
 const after=f.api.subscribeConsequence(f.db,'g',{key:'watch',op:'unsubscribe',source_event:'source'},'gm');assert.equal(after.status,'cancelled');f.event('hit');assert.deepEqual(f.api.coordinateConsequences(f.db,'g'),[]);assert.equal(f.calls(),0);
});

test('typed subscriptions reject unsupported handlers, missing source and unbounded events',t=>{
 const f=fixture(t);for(const patch of [{handler:'arbitrary'},{source_event:'missing'},{event_kinds:[]},{event_kinds:Array(9).fill('damage')},{payload:null}])assert.throws(()=>f.subscribe('bad',patch));assert.equal(f.db.getCityRecord('g','consequence_subscription','bad'),null);
});

test('pause, disabled flag and zero budget leave cursor and proposal state untouched',t=>{
 const f=fixture(t);f.subscribe();f.event('hit');f.db.setDirectorPaused('g',true);assert.deepEqual(f.api.coordinateConsequences(f.db,'g'),[]);f.db.setDirectorPaused('g',false);f.db.setCityCalendar('g',{flags:{consequences:false}});assert.deepEqual(f.api.coordinateConsequences(f.db,'g'),[]);f.setReady(true);assert.deepEqual(f.api.coordinateConsequences(f.db,'g',0),[]);assert.equal(f.db.getCityRecord('g','consequence_cursor','watch'),null);assert.equal(f.calls(),0);
});

test('source location and event class filter before durable pending proposals; restart does not duplicate',t=>{
 const f=fixture(t);f.subscribe();f.event('wrong-class','rain');f.event('wrong-place','damage',{},'elsewhere');f.event('hit');const rows=f.api.coordinateConsequences(f.db,'g');assert.equal(rows.length,1);const row=rows[0];assert.equal(row.status,'pending');assert.equal(row.visibility,'gm');assert.equal(row.source_event,'hit');assert.equal(row.data.not_actor_knowledge,true);assert.equal(f.calls(),0);
 f.reopen();assert.deepEqual(f.api.coordinateConsequences(f.db,'g'),[]);assert.equal(f.db.consequenceSourceCount('g','hit'),1);assert.equal(f.db.mutationsForEntity('g',row.record_key).length,1);
});

test('existing causal path, source fanout and per-pass budgets bound work without applying it',t=>{
 const f=fixture(t);f.subscribe();f.event('loop','damage',{causal_path:['watch']});f.event('deep','damage',{causal_path:['a','b','c','d']});f.event('full');for(let i=0;i<4;i++)f.db.saveCityRecord('g',{kind:'consequence',key:'old'+i,source_event:'full',data:{}});f.event('one');f.event('two');
 const first=f.api.coordinateConsequences(f.db,'g',1);assert.equal(first.length,1);assert.equal(first[0].source_event,'one');const second=f.api.coordinateConsequences(f.db,'g',1);assert.equal(second.length,1);assert.equal(second[0].source_event,'two');assert.equal(f.db.consequenceSourceCount('g','loop'),0);assert.equal(f.db.consequenceSourceCount('g','deep'),0);assert.equal(f.calls(),0);
});

test('proposal callback failure rolls cursor, pending receipt and audit back together',t=>{
 const f=fixture(t);f.subscribe();f.event('hit');assert.throws(()=>f.api.coordinateConsequences(f.db,'g',2,{onProposed(){throw Error('injected proposal failure');}}),/injected proposal failure/);assert.equal(f.db.getCityRecord('g','consequence_cursor','watch'),null);assert.equal(f.db.consequenceSourceCount('g','hit'),0);assert.equal(f.api.coordinateConsequences(f.db,'g').length,1);
});

test('defer and reject preserve proposal history without invoking any domain handler',t=>{
 const f=fixture(t),row=pending(f);const deferred=f.api.reviewConsequence(f.db,'g',{key:row.record_key,decision:'defer'},'gm');assert.equal(deferred.status,'pending');const rejected=f.api.reviewConsequence(f.db,'g',{key:row.record_key,decision:'reject'},'gm');assert.equal(rejected.status,'rejected');assert.deepEqual(f.api.reviewConsequence(f.db,'g',{key:row.record_key,decision:'approve'},'gm'),rejected);assert.equal(f.calls(),0);
});

test('native grant rejection fails closed as a durable private blocked record before domain effects',t=>{
 const f=fixture(t),row=pending(f);const result=f.api.reviewConsequence(f.db,'g',{key:row.record_key,decision:'approve'},'native',{nativeAuthority:{},nativePayload:{}});assert.equal(result.status,'blocked');assert.match(result.data.error,/authority\/source\/subscription changed/);assert.equal(result.visibility,'gm');assert.equal(f.calls(),0);assert.deepEqual(f.db.getSimulationEntity('g','location','harbor').state,{unchanged:true});
});

test('handler failure rolls domain effect back while retaining blocked receipt, then retry applies once',t=>{
 const f=fixture(t),row=pending(f);f.setFailure(true);const blocked=f.api.reviewConsequence(f.db,'g',{key:row.record_key,decision:'approve'},'gm');assert.equal(blocked.status,'blocked');assert.deepEqual(f.db.getSimulationEntity('g','location','harbor').state,{unchanged:true});assert.equal(f.db.getWorldEvent('g','effect:'+motivationKey(row.record_key)),null);
 f.setFailure(false);const completed=f.api.reviewConsequence(f.db,'g',{key:row.record_key,decision:'approve'},'gm');assert.equal(completed.status,'completed');assert.deepEqual(f.db.getSimulationEntity('g','location','harbor').state,{effect:row.record_key});assert.equal(f.calls(),2);f.reopen();assert.deepEqual(f.api.reviewConsequence(f.db,'g',{key:row.record_key,decision:'approve'},'gm'),completed);assert.equal(f.calls(),2);
});

test('retracted pending source blocks execution and retains the original proposal reference',t=>{
 const f=fixture(t),row=pending(f);indexWorldEvent(f.db,'g',{key:'hit',status:'retracted'});const result=f.api.reviewConsequence(f.db,'g',{key:row.record_key,decision:'approve'},'gm');assert.equal(result.status,'blocked');assert.equal(result.source_event,'hit');assert.equal(f.calls(),0);
});

test('actual original service handler reaches extracted workflow and World engine, replaying once after restart',t=>{
 const f=fixture(t);f.db.saveCityRecord('g',{kind:'infrastructure',key:'bridge',source_event:'source',data:{native_condition:70,effective_condition:70,locations:['harbor'],redundancy:'all'}});
 original.subscribeConsequence(f.db,'g',{key:'actual',handler:'service',entity_key:'bridge',source_event:'source',event_kinds:['infrastructure_damage'],location_key:'harbor',payload:{delta:-5}},'gm');f.event('physical-hit','infrastructure_damage');const [row]=original.coordinateConsequences(f.db,'g');assert.ok(row);const result=original.reviewConsequence(f.db,'g',{key:row.record_key,decision:'approve'},'gm');assert.equal(result.status,'completed');assert.equal(f.db.getCityRecord('g','infrastructure','bridge').data.native_condition,65);assert.equal(f.calls(),0);
 const effect=f.db.getWorldEvent('g','effect:'+motivationKey(row.record_key));assert.equal(effect.visibility,'gm');assert.deepEqual(effect.details.causal_path,['actual']);f.reopen();assert.deepEqual(original.reviewConsequence(f.db,'g',{key:row.record_key,decision:'approve'},'gm'),result);assert.equal(f.db.getCityRecord('g','infrastructure','bridge').data.native_condition,65);
});
