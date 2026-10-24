import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {cityContext,proposeCityOpportunity} from '../../src/frameworks/world/public.js';

function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'rf04-world-reference-')),file=join(dir,'reference.sqlite');let sql;
 const open=()=>{sql=new DatabaseSync(file);sql.exec('CREATE TABLE IF NOT EXISTS records(g TEXT,k TEXT,id TEXT,body TEXT,PRIMARY KEY(g,k,id));CREATE TABLE IF NOT EXISTS audit(body TEXT)');};open();
 const calls=[];let enabled=true,minute=15,fail=false;
 const db={
  listCityRecords(g,options){calls.push(options);return sql.prepare('SELECT body FROM records WHERE g=? ORDER BY rowid').all(g).map(r=>JSON.parse(r.body)).filter(r=>JSON.stringify(r).toLowerCase().includes(options.query)).slice(0,options.limit);},
  getCityRecord(g,k,id){const r=sql.prepare('SELECT body FROM records WHERE g=? AND k=? AND id=?').get(g,k,id);return r?JSON.parse(r.body):null;},
  saveCityRecord(g,value){const r={visibility:'gm',status:'active',...value,record_key:value.key};sql.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?,?)').run(g,r.kind,r.record_key,JSON.stringify(r));return r;},
  getCityCalendar(){return {flags:{opportunities:enabled}};},getSimulationClock(){return {minute};},
  recordMutation(g,value){if(fail)throw Error('audit rejected');sql.prepare('INSERT INTO audit VALUES(?)').run(JSON.stringify({g,...value}));return value;},
  transaction(fn){sql.exec('BEGIN IMMEDIATE');try{const r=fn();sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}},
 };
 t.after(()=>{sql.close();rmSync(dir,{recursive:true,force:true});});
 return {db,calls,put:(kind,key,data={},extra={})=>db.saveCityRecord('g',{kind,key,data,source_event:'source:'+key,...extra}),setEnabled:v=>enabled=v,setMinute:v=>minute=v,setFailure:v=>fail=v,reopen(){sql.close();open();},audit:()=>sql.prepare('SELECT body FROM audit').all().map(r=>JSON.parse(r.body))};
}

test('reference is private, deduplicated, read-only and contains no transfer grant',t=>{
 const f=fixture(t);f.put('district','harbor',{text:'harbor market secret'});f.put('institution','market',{text:'harbor market'});
 const result=cityContext(f.db,'g','harbor market harbor');
 assert.equal(result.authority,'GM_PRIVATE_REFERENCE_NOT_ACTOR_KNOWLEDGE');assert.equal(result.records.length,2);assert.ok(result.records.every(r=>r.visibility==='gm'));
 assert.equal(result.chars,result.records.reduce((n,r)=>n+JSON.stringify(r).length,0));assert.deepEqual(f.audit(),[]);assert.ok(f.calls.every(c=>c.includeGM===true&&c.limit===4));
 assert.deepEqual(cityContext(f.db,'g','   '),{records:[]});assert.equal(f.db.getCityRecord('g','district','harbor').data.text,'harbor market secret');
});

test('native and publication receipts stay excluded, including private compound actions',t=>{
 const f=fixture(t),kinds=['pvp_secret','character_visible_fact','character_perception_receipt','world_visible_fact','unsupported_action','gm_action_ruling','gm_action_review_receipt','owner_action_terminal','action_continuation','action_continuation_signal','native_notice','roll_publication','roll_party_publication','publication_reconciliation','roll_share_preview','roll_menu_token','roll_option_registry','pvp_ui_token','pvp_ui_delivery','compound_action'];
 kinds.forEach((kind,i)=>f.put(kind,'artifact'+i,{text:'receipt'+i},{visibility:'character'}));
 for(let i=0;i<kinds.length;i++)assert.equal(cityContext(f.db,'g','receipt'+i).records.length,0,kinds[i]);
 f.put('compound_action','public',{text:'eligiblecompound'},{visibility:'party'});assert.equal(cityContext(f.db,'g','eligiblecompound').records.length,1);
});

test('weather annotations use fictional time without rewriting original evidence',t=>{
 const f=fixture(t);f.put('weather','rain',{text:'rainfall',start:10,end:20});
 for(const [minute,state] of [[9,'forecast'],[10,'active'],[19,'active'],[20,'past']]){f.setMinute(minute);assert.equal(cityContext(f.db,'g','rainfall').records[0].temporal_state,state);}
 assert.equal(f.db.getCityRecord('g','weather','rain').temporal_state,undefined);assert.deepEqual(f.audit(),[]);
});

test('existing retrieval budgets and deterministic order remain unchanged',t=>{
 const f=fixture(t);for(let i=0;i<12;i++)f.put('district','district'+i,{text:'term'+i});
 const r=cityContext(f.db,'g',Array.from({length:12},(_,i)=>'term'+i).join(' '));
 assert.equal(f.calls.length,6);assert.equal(r.records.length,8);assert.equal(r.records[0].record_key,'district0');
 f.put('institution','oversize',{text:'oversized',body:'x'.repeat(10001)});assert.equal(cityContext(f.db,'g','oversized').records.length,0);
});

test('disabled and insufficient context never writes an opportunity',t=>{
 const f=fixture(t);f.put('district','harbor',{text:'harbor'});f.setEnabled(false);assert.deepEqual(proposeCityOpportunity(f.db,'g','harbor','gm'),{enabled:false});assert.equal(f.calls.length,0);
 f.setEnabled(true);f.put('cycle','harbor-cycle',{text:'harbor'});f.put('institution','harbor-closed',{text:'harbor'},{status:'removed'});
 assert.deepEqual(proposeCityOpportunity(f.db,'g','harbor','gm'),{enabled:true,proposals:[]});assert.deepEqual(f.audit(),[]);
});

test('world proposals remain source-bound private suggestions and replay once after reopen',t=>{
 const f=fixture(t);f.put('district','harbor',{text:'harbor market'},{source_event:'source:z'});f.put('institution','market',{text:'harbor market'},{source_event:'source:a'});
 const result=proposeCityOpportunity(f.db,'g','harbor market','gm-owner');assert.equal(result.status,'proposed');assert.equal(result.visibility,'gm');assert.equal(result.source_event,'source:a');
 assert.deepEqual(result.data.sources,['source:a','source:z']);assert.equal(result.data.authority,'proposal_only');assert.equal(result.data.does_not_define_culprit,true);assert.equal(result.data.records.length,2);
 assert.equal(f.audit().length,1);assert.equal(f.audit()[0].visibility,'gm');assert.equal(f.audit()[0].actorId,'gm-owner');
 f.reopen();assert.deepEqual(proposeCityOpportunity(f.db,'g','market harbor','different-gm'),result);assert.equal(f.audit().length,1);
});

test('proposal and audit share a transaction; failed audit leaves no partial proposal',t=>{
 const f=fixture(t);f.put('district','harbor',{text:'harbor market'});f.put('institution','market',{text:'harbor market'});f.setFailure(true);
 assert.throws(()=>proposeCityOpportunity(f.db,'g','harbor','gm'),/audit rejected/);assert.equal(f.db.getCityRecord('g','opportunity','opportunity:source:harbor:source:market'),null);assert.deepEqual(f.audit(),[]);
 f.setFailure(false);assert.equal(proposeCityOpportunity(f.db,'g','harbor','gm').status,'proposed');assert.equal(f.audit().length,1);
});

test('original mixed-module callers reach the moved World policies',async t=>{
 const f=fixture(t),legacy=await import('../../src/city-core.js');f.put('district','harbor',{text:'harbor'});f.put('institution','harbor-office',{text:'harbor'});
 assert.deepEqual(legacy.cityContext(f.db,'g','harbor'),cityContext(f.db,'g','harbor'));
 const result=legacy.proposeCityOpportunity(f.db,'g','harbor','gm');assert.equal(result.data.authority,'proposal_only');assert.equal(f.audit().length,1);
});
