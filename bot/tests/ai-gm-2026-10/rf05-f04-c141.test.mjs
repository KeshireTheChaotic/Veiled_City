import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {decision,saveReceipt} from '../../src/frameworks/intent/delegation-receipts.js';
import {dispatchAiIntents,registerIntentAdapter} from '../../src/ai-intents.js';
import {intentWorldPrimitives,intentWorldOperations} from '../../src/frameworks/intent/public.js';
import {jsonHash} from '../../src/kernel/json-hash.js';
const world=Object.fromEntries(Object.keys(intentWorldOperations).filter(x=>x!=='bind').map(x=>[x,()=>false]));
world.prepareNativeWorldOperation=()=>null;world.inspectNativeWorldOperationReceipt=()=>{};intentWorldOperations.bind(world);
intentWorldPrimitives.bind({cityObject(){},cityInteger(){},requireCitySource(db,guild,key){assert.equal(key,'source');},
 indexWorldEvent(db,guild,input,actor){assert.equal(actor,'ai_policy');db.sql.prepare('INSERT INTO events VALUES (?)').run(input.key);return {event_key:input.key};},
 cityAudit(db){db.sql.prepare('INSERT INTO events VALUES (?)').run('audit');}});
registerIntentAdapter('dialogue',{current:()=>null,impact:()=>({cost:1}),apply(db){db.sql.prepare('INSERT INTO events VALUES (?)').run('effect');if(db.failEffect)throw new Error('synthetic effect failed');return {receipt:'synthetic'};}});
const proposal=()=>({version:1,feature:'dialogue',target_key:'target',expected_revision:'absent',policy_revision:2,source_prerequisites:[],payload:{source_event:'source',op:'interpret',npc_key:'npc',topic:'offer',interpretation:'subjective offer',confidence:40}});
function fixture(){const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE records(key TEXT PRIMARY KEY,value TEXT);CREATE TABLE events(kind TEXT)');
 const db={sql,policy:{revision:2,mode:'routine_delegated',allow:['dialogue.interpret'],expires_minute:20,max_operations:2,max_cost:3},
 getCityRecord(guild,kind,key){if(kind==='ai_delegation')return {data:this.policy};const row=sql.prepare('SELECT value FROM records WHERE key=?').get(key);return row?JSON.parse(row.value):null;},
 saveCityRecord(guild,{key,...data}){const row={...data,record_key:key};sql.prepare('INSERT OR REPLACE INTO records VALUES (?,?)').run(key,JSON.stringify(row));return row;},
 getWorldEvent:(guild,key)=>key==='source'?{event_key:key}:null,getSimulationClock:()=>({minute:3}),getCityCalendar:()=>({flags:{dialogue_history:true}}),isDirectorPaused:()=>false,
 transaction(fn){sql.exec('BEGIN');try{const value=fn();sql.exec('COMMIT');return value;}catch(error){sql.exec('ROLLBACK');throw error;}}};return {db,events:()=>sql.prepare('SELECT kind FROM events').all().map(x=>x.kind),close:()=>sql.close()};}
test('extracted policy and receipt bodies match original',async()=>{const s=await readFile(new URL('../../src/frameworks/intent/delegation-receipts.js',import.meta.url),'utf8');const b=s.slice(s.indexOf('function decision'),s.indexOf('export {decision,saveReceipt}')).replace(/\r\n/g,'\n');assert.equal(createHash('sha256').update(b).digest('hex'),'703d020a9fa569083ad3fee64ea0005fb65667c3a96ef90509193dd9c539bac0');});
test('delegation decision preserves precedence, human review, expiry and inclusive budgets',()=>{const f=fixture();try{const p=proposal(),budget={operations:0,cost:0};const call=(impact={cost:1})=>decision(f.db,'g',p,impact,budget);
 assert.equal(call().status,'accepted');f.db.policy.revision=3;assert.match(call().reason,/changed/);f.db.policy.revision=2;
 f.db.policy.mode='manual';assert.equal(call().status,'blocked');f.db.policy.mode='suggest_only';assert.equal(call().status,'pending');f.db.policy.mode='routine_delegated';assert.equal(call({cost:1,review:true}).status,'pending');
 f.db.policy.allow=[];assert.equal(call().status,'pending');f.db.policy.allow=['dialogue.interpret'];f.db.policy.expires_minute=3;assert.match(call().reason,/expired/);f.db.policy.expires_minute=20;
 budget.operations=2;assert.match(call().reason,/budget/);budget.operations=0;budget.cost=3;assert.match(call().reason,/budget/);budget.cost=2;assert.equal(call().status,'accepted');
 }finally{f.close();}});
test('receipt source, private metadata and deterministic rejected-source key persist unchanged',()=>{const f=fixture();try{
 const binding={key:'ordinary'};const row=saveReceipt(f.db,'g','receipt',proposal(),'pending','review',{scope:{mode:'private',actorUserId:'owner'},origin:'origin',sessionId:'s',ordinaryEffect:binding});
 assert.equal(row.source_event,'source');assert.deepEqual(row.data.ordinary_effect,binding);assert.equal(row.data.scope.actorUserId,'owner');
 const rejected=saveReceipt(f.db,'g','rejected',null,'blocked','invalid',{});assert.equal(rejected.source_event,`receipt:${jsonHash('rejected').slice(0,32)}`);assert.deepEqual(rejected.data.scope,{mode:'party'});assert.equal(rejected.data.intent,null);assert.equal(f.events().filter(x=>x==='audit').length,2);
 }finally{f.close();}});
test('actual dispatcher commits once, replays without effect/budget duplication and rolls back failed effect',()=>{for(const fail of [false,true]){const f=fixture();try{
 f.db.failEffect=fail;const budget={operations:0,cost:0};const context={origin:'source',budget};const [row]=dispatchAiIntents(f.db,'g',[proposal()],context);
 assert.equal(row.status,fail?'blocked':'accepted');assert.deepEqual(f.events(),fail?['audit']:['effect','audit']);
 if(fail){assert.match(row.data.diagnostic,/synthetic effect failed/);assert.deepEqual(budget,{operations:0,cost:0});}else{const [replay]=dispatchAiIntents(f.db,'g',[proposal()],context);assert.deepEqual(replay,row);assert.deepEqual(budget,{operations:1,cost:1});assert.deepEqual(f.events(),['effect','audit']);}
 }finally{f.close();}}});
