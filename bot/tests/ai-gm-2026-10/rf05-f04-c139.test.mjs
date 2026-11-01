import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import '../../src/ai-intents.js';
import {reviewWorkflow} from '../../src/ai-review.js';
import {operationsIntentReview} from '../../src/frameworks/operations/public.js';
import {connectOperationsIntentReview} from '../../src/framework-to-framework/intent--operations/public.js';
import {intentWorldPrimitives} from '../../src/frameworks/intent/public.js';
import {stateRevision} from '../../src/kernel/state-revision.js';

intentWorldPrimitives.bind({requireCitySource(){},cityObject(){},cityInteger(){},indexWorldEvent(){},cityAudit(db,guild,kind,key,before,after,actor){
 assert.equal(guild,'g');assert.equal(kind,'ai_intent_review');assert.equal(actor,'gm');if(db.failAudit)throw db.failure;
 db.sql.prepare('INSERT INTO audits VALUES (?)').run(key);
}});
function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE records (key TEXT PRIMARY KEY,value TEXT); CREATE TABLE audits (key TEXT)');
 const db={sql,failure:new Error('audit boundary failure'),getCityRecord(guild,kind,key){assert.equal(this,db);assert.equal(guild,'g');assert.equal(kind,'ai_intent');const r=sql.prepare('SELECT value FROM records WHERE key=?').get(key);return r?JSON.parse(r.value):null;},
 saveCityRecord(guild,{key,...data}){assert.equal(this,db);assert.equal(guild,'g');const row={...data,record_key:key};sql.prepare('INSERT OR REPLACE INTO records VALUES (?,?)').run(key,JSON.stringify(row));return row;},
 transaction(fn){sql.exec('BEGIN');try{const result=fn();sql.exec('COMMIT');return result;}catch(error){sql.exec('ROLLBACK');throw error;}}};
 db.saveCityRecord('g',{key:'review',status:'pending',visibility:'gm',data:{intent:null,history:[]}});
 return {db,row:()=>db.getCityRecord('g','ai_intent','review'),close:()=>sql.close()};
}
test('Operations fixed review port fails closed and composes only the original review action',()=>{
 assert.throws(()=>reviewWorkflow({},'g',{},'gm'),{code:'OPERATIONS_INTENT_REVIEW_COMPOSITION'});
 assert.equal(connectOperationsIntentReview(),operationsIntentReview);connectOperationsIntentReview();
 assert.deepEqual(Object.keys(operationsIntentReview).sort(),['bind','reviewAiIntent']);
 assert.throws(()=>operationsIntentReview.bind({reviewAiIntent(){}}),/replacement forbidden/);
});
test('actual Operations workflow preserves GM review decisions, revisions and SQLite rollback',()=>{
 for(const kind of [undefined,'ai_intent']){const f=fixture();try{
  const input={kind,key:'review',decision:'defer',expected_revision:stateRevision(f.row())};
  assert.throws(()=>reviewWorkflow(f.db,'g',input,''),/Authenticated/);
  const deferred=reviewWorkflow(f.db,'g',input,'gm');assert.equal(deferred.status,'deferred');assert.equal(deferred.visibility,'gm');assert.equal(deferred.data.reviewed_by,'gm');
  assert.throws(()=>reviewWorkflow(f.db,'g',input,'gm'),/changed/);
  const reject={...input,decision:'reject',expected_revision:stateRevision(f.row())};const before=f.row();f.db.failAudit=true;
  assert.throws(()=>reviewWorkflow(f.db,'g',reject,'gm'),error=>error===f.db.failure);assert.deepEqual(f.row(),before);
  assert.equal(f.db.sql.prepare('SELECT COUNT(*) AS n FROM audits').get().n,1);
  f.db.failAudit=false;assert.equal(reviewWorkflow(f.db,'g',reject,'gm').status,'rejected');
 }finally{f.close();}}
});
test('production Application still initializes original Intent adapters before review commands',async()=>{
 const source=await readFile(new URL('../../src/story-commands.js',import.meta.url),'utf8');
 assert.match(source,/import\s*\{[^}]*delegationOperation[^}]*\}\s*from\s*["']\.\/ai-intents\.js["']/);
 const operations=await readFile(new URL('../../src/ai-review.js',import.meta.url),'utf8');
 assert.doesNotMatch(operations,/from\s*["']\.\/ai-intents\.js["']/);
});
