import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {openLegacyReadOnlyRepository} from '../../src/v2/legacy-readonly-repository.js';
import {inspectNativeConditionExpiryAncestry} from '../../src/v2/rules/condition-expiry-history.js';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fileHash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'vk2-expiry-history-')),file=join(dir,'legacy.sqlite'),db=new DatabaseSync(file);
  db.exec(`CREATE TABLE characters(id TEXT,guild_id TEXT,owner_user_id TEXT,character_json TEXT);
    CREATE TABLE campaigns(guild_id TEXT);
    CREATE TABLE city_records(guild_id TEXT,kind TEXT,record_key TEXT,actor_key TEXT,subject_key TEXT,status TEXT,visibility TEXT,source_event TEXT,data_json TEXT);
    CREATE TABLE world_events(guild_id TEXT,event_key TEXT,kind TEXT,status TEXT,source_id TEXT,visibility TEXT,subject_key TEXT,scene TEXT,session_id TEXT,details_json TEXT);`);
  const city=(kind,key,actor,subject,status,visibility,source,data)=>db.prepare('INSERT INTO city_records VALUES(?,?,?,?,?,?,?,?,?)').run('g',kind,key,actor,subject,status,visibility,source,JSON.stringify(data));
  const world=(key,kind,visibility,subject,details)=>db.prepare('INSERT INTO world_events VALUES(?,?,?,?,?,?,?,?,?,?)').run('g',key,kind,'active','native:unified-gm',visibility,subject,'scene','session',JSON.stringify(details));
  const condition={version:1,character:'pc',owner:'old-owner',actor:'npc',scene:'scene',condition:'Restrained',expiry:'next_spotlight',cast_spotlight:7,effect:'original-effect'};
  city('pc_native_condition','condition','pc','pc','expired','character','original-effect',condition);
  const spotlight={actor:'npc',scene:'scene',index:8,cost:'paid-action'};
  city('gm_action_cost_receipt','paid-action','npc',null,'committed','gm','paid-action-source',{spotlight});
  const repo=openLegacyReadOnlyRepository(file),cost=repo.getCityRecord('g','gm_action_cost_receipt','paid-action');
  world('paid-action:spotlight','native_gm_spotlight','gm',null,{payload_hash:hash(spotlight),cost_hash:hash(cost)});
  const before=[{native_ref:'condition',name:'Restrained',active:true},{native_ref:'independent',name:'Vulnerable',active:true}];
  const expiry={condition:'condition',condition_hash:hash(condition),spotlight:'paid-action:spotlight',spotlight_hash:hash(spotlight),character:'pc',before,after:before.map(c=>c.native_ref==='condition'?{...c,active:false}:c),before_pc:'historical-before',after_pc:'historical-after'};
  city('pc_native_condition_expiry','condition','pc','pc','resolved','character','expiry-event',expiry);
  world('expiry-event','native_condition_expiry','character','pc',expiry);
  t.after(()=>{repo.close();db.close();rmSync(dir,{recursive:true,force:true});});
  const read=()=>repo.withValidationSnapshot(()=>inspectNativeConditionExpiryAncestry(repo,'g',repo.getCityRecord('g','pc_native_condition','condition')));
  const update=(kind,key,edit)=>{const row=repo.getCityRecord('g',kind,key);edit(row.data);db.prepare('UPDATE city_records SET data_json=? WHERE kind=? AND record_key=?').run(JSON.stringify(row.data),kind,key);};
  const reseal=()=>{const c=repo.getCityRecord('g','gm_action_cost_receipt','paid-action');const e=repo.getCityRecord('g','pc_native_condition_expiry','condition').data;e.spotlight_hash=hash(c.data.spotlight);db.prepare('UPDATE city_records SET data_json=? WHERE kind=?').run(JSON.stringify(e),'pc_native_condition_expiry');db.prepare('UPDATE world_events SET details_json=? WHERE event_key=?').run(JSON.stringify(e),'expiry-event');db.prepare('UPDATE world_events SET details_json=? WHERE event_key=?').run(JSON.stringify({payload_hash:hash(c.data.spotlight),cost_hash:hash(c)}),'paid-action:spotlight');};
  return {file,db,repo,read,update,reseal};
}
test('historical paid spotlight expires only its own condition, without current PC authority or writes',t=>{
  const f=fixture(t),before=fileHash(f.file),r=f.read();assert.equal(r.status,'resolved');assert.equal(r.data.after[0].active,false);assert.equal(r.data.after[1].active,true);assert.equal(fileHash(f.file),before);
  assert.throws(()=>f.repo.withValidationSnapshot(()=>inspectNativeConditionExpiryAncestry(f.repo,'foreign',f.repo.getCityRecord('g','pc_native_condition','condition'))),/expiry_identity/);
});
for(const [name,sql] of [
  ['nonexpired condition',"UPDATE city_records SET status='active' WHERE kind='pc_native_condition'"],
  ['unresolved expiry',"UPDATE city_records SET status='pending' WHERE kind='pc_native_condition_expiry'"],
  ['missing expiry',"DELETE FROM city_records WHERE kind='pc_native_condition_expiry'"],
  ['revoked expiry publication',"UPDATE world_events SET status='deleted' WHERE event_key='expiry-event'"],
  ['wrong recipient',"UPDATE world_events SET subject_key='other' WHERE event_key='expiry-event'"],
  ['revoked spotlight',"UPDATE world_events SET status='deleted' WHERE event_key='paid-action:spotlight'"],
  ['fabricated spotlight source',"UPDATE world_events SET source_id='player:owner' WHERE event_key='paid-action:spotlight'"],
  ['missing cost',"DELETE FROM city_records WHERE kind='gm_action_cost_receipt'"],
  ['uncommitted cost',"UPDATE city_records SET status='prepared' WHERE kind='gm_action_cost_receipt'"],
  ['foreign guild cost',"UPDATE city_records SET guild_id='other' WHERE kind='gm_action_cost_receipt'"]
])test(`expiry rejects ${name}`,t=>{const f=fixture(t);f.db.exec(sql);assert.throws(f.read,/native_condition_expiry/);});
test('resealing cannot substitute a different actor/scene or an earlier or equal spotlight index',t=>{
  for(const [field,value] of [['actor','different-npc'],['scene','different-scene'],['index',7],['index',6]]){const f=fixture(t);f.update('gm_action_cost_receipt','paid-action',d=>{d.spotlight[field]=value;});f.reseal();assert.throws(f.read,/spotlight_cost/);}
});
test('matching expiry event hashes do not permit ending an independent condition',t=>{const f=fixture(t);f.update('pc_native_condition_expiry','condition',d=>{d.after[1].active=false;});f.reseal();assert.throws(f.read,/expiry_source/);});
test('original condition identity, policy and data hash are required even with sealed expiry',t=>{
  const stale=fixture(t),snapshot=stale.repo.getCityRecord('g','pc_native_condition','condition');snapshot.data.cast_spotlight=1;assert.throws(()=>stale.repo.withValidationSnapshot(()=>inspectNativeConditionExpiryAncestry(stale.repo,'g',snapshot)),/expiry_identity/);
  for(const [field,value] of [['expiry','until_freed'],['character','other-pc'],['cast_spotlight',9]]){const f=fixture(t);f.update('pc_native_condition','condition',d=>{d[field]=value;});assert.throws(f.read,/expiry_source/);}
});
