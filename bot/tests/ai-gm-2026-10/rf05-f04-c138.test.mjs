import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {reviewAiIntent,registerIntentAdapter} from '../../src/ai-intents.js';
import {reviewAiIntent as publicReview,intentWorldPrimitives,intentWorldOperations} from '../../src/frameworks/intent/public.js';
import {intentReviewExecution} from '../../src/frameworks/intent/contracts/review-execution.js';
import {stateRevision} from '../../src/kernel/state-revision.js';

const worldFunctions=Object.fromEntries(Object.keys(intentWorldOperations).filter(key=>key!=='bind').map(key=>[key,()=>false]));
intentWorldOperations.bind(worldFunctions);

intentWorldPrimitives.bind({requireCitySource(db,guild,key){assert.equal(key,'source');return {event_key:key};},
 cityObject(){},cityInteger(){},indexWorldEvent(){},cityAudit(db){if(db.failAudit)throw new Error('audit failed');db.sql.prepare('INSERT INTO events VALUES (?)').run('audit');}});
registerIntentAdapter('dialogue',{current:()=>null,impact:()=>({cost:0,review:true}),apply(db){db.sql.prepare('INSERT INTO events VALUES (?)').run('effect');if(db.failApply)throw new Error('apply failed');return {receipt:'synthetic-adapter'};}});
const intent=()=>({version:1,feature:'dialogue',target_key:'target',expected_revision:'absent',policy_revision:2,source_prerequisites:[],payload:{source_event:'source',op:'interpret',npc_key:'npc',topic:'offer',interpretation:'subjective offer',confidence:40}});
function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE records (key TEXT PRIMARY KEY,value TEXT); CREATE TABLE events (kind TEXT)');
 const db={sql,policyRevision:2,flags:{dialogue_history:true},getCityCalendar(){return {flags:this.flags};},isDirectorPaused:()=>false,
  getCityRecord(guild,kind,key){assert.equal(guild,'g');if(kind==='ai_delegation')return {data:{revision:this.policyRevision}};const row=sql.prepare('SELECT value FROM records WHERE key=?').get(key);return row?JSON.parse(row.value):null;},
  saveCityRecord(guild,input){assert.equal(guild,'g');const {key,...rest}=input;const row={...rest,record_key:key};sql.prepare('INSERT OR REPLACE INTO records VALUES (?,?)').run(key,JSON.stringify(row));return row;},
  transaction(fn){sql.exec('BEGIN');try{const result=fn();sql.exec('COMMIT');return result;}catch(error){sql.exec('ROLLBACK');throw error;}},
  privateCausalMarker(){sql.prepare('INSERT INTO events VALUES (?)').run('marker');return 'original-marker';},
  retainPrivateCausality(guild,marker){assert.equal(marker,'original-marker');sql.prepare('INSERT INTO events VALUES (?)').run('retain');}};
 db.saveCityRecord('g',{key:'review',kind:'ai_intent',status:'pending',visibility:'gm',data:{intent:intent(),scope:{mode:'gm'},session_id:'session',origin:'source',history:Array.from({length:25},(_,i)=>({decision:`old-${i}`}))}});
 return {db,close:()=>sql.close(),row:()=>db.getCityRecord('g','ai_intent','review'),events:()=>sql.prepare('SELECT kind FROM events').all().map(x=>x.kind)};
}
function review(f,decision,extra={}){return reviewAiIntent(f.db,'g',{key:'review',decision,expected_revision:stateRevision(f.row()),...extra},'gm');}

test('review action body and public compatibility identity remain original',async()=>{
 assert.equal(reviewAiIntent,publicReview);
 const source=await readFile(new URL('../../src/frameworks/intent/review-action.js',import.meta.url),'utf8');
 const body=source.slice(source.indexOf('export function reviewAiIntent')).replace(/\r\n/g,'\n');
 assert.equal(createHash('sha256').update(body).digest('hex'),'c2347c4db13b236d709d490fb5bb4f557eb2cf9ac2ca68c8f95f967284861077');
 assert.throws(()=>intentReviewExecution.bind({preflight(){},applyNative(){}}),/replacement forbidden/);
});
test('defer, reject and modify preserve revision gates, bounded history and ordinary-effect refusal',()=>{
 for(const decision of ['defer','reject','modify']){const f=fixture();try{
  const before=f.row();assert.throws(()=>reviewAiIntent(f.db,'g',{key:'review',decision,expected_revision:'stale'},'gm'),/changed/);
  assert.throws(()=>reviewAiIntent(f.db,'g',{key:'review',decision,expected_revision:stateRevision(before)},''),/Authenticated/);
  if(decision==='modify'){const bound={...before,data:{...before.data,origin:'ordinary-effect:bound'}};f.db.saveCityRecord('g',{...bound,key:'review'});assert.throws(()=>review(f,decision,{replacement_intent:intent()}),/fresh proposal/);f.db.saveCityRecord('g',{...before,key:'review'});}
  const after=review(f,decision,{replacement_intent:intent()});assert.equal(after.visibility,'gm');assert.equal(after.data.history.length,20);assert.equal(after.data.reviewed_by,'gm');assert.equal(after.status,{defer:'deferred',reject:'rejected',modify:'pending'}[decision]);assert.deepEqual(f.events(),['audit']);
 }finally{f.close();}}
});
test('approval runs original preflight and native callback in one SQLite transaction with policy freshness',()=>{
 const f=fixture();try{
  f.db.flags.dialogue_history=false;assert.throws(()=>review(f,'approve'),/disabled/);assert.deepEqual(f.events(),[]);
  f.db.flags.dialogue_history=true;f.db.policyRevision=3;assert.throws(()=>review(f,'approve'),/Policy changed/);assert.deepEqual(f.events(),[]);
  f.db.policyRevision=2;const after=review(f,'approve');assert.equal(after.status,'accepted');assert.deepEqual(after.data.result,{receipt:'synthetic-adapter'});assert.deepEqual(f.events(),['effect','audit']);assert.throws(()=>review(f,'approve'),/Reviewable/);
 }finally{f.close();}
});
test('application and audit failures roll back both SQLite review and effect state',()=>{
 for(const fail of ['failApply','failAudit']){const f=fixture();try{const before=f.row();f.db[fail]=true;assert.throws(()=>review(f,'approve'),/failed/);assert.deepEqual(f.row(),before);assert.deepEqual(f.events(),[]);}finally{f.close();}}
});
test('original private native helper retains causal marker order within caller transaction',()=>{
 const f=fixture();try{const result=f.db.transaction(()=>intentReviewExecution.applyNative(f.db,'g',intent(),'review','gm',{}, {apply(db){db.sql.prepare('INSERT INTO events VALUES (?)').run('private-effect');return 'original-result';}},true));assert.equal(result,'original-result');assert.deepEqual(f.events(),['marker','private-effect','retain']);}finally{f.close();}
});
