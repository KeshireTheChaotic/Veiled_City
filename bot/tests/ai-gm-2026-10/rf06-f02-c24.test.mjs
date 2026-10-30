import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/frameworks/persistence/database.js';
const schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));
function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'veiled-rf06-r24-')),file=join(dir,'synthetic.sqlite');let db=new VeiledDB(file,schema);db.ensureCampaign('guild');db.ensureCampaign('other');
  t.after(()=>{db.close();assert.equal(dirname(dir),resolve(tmpdir()));assert.ok(dir.startsWith(join(resolve(tmpdir()),'veiled-rf06-r24-')));rmSync(dir,{recursive:true,force:true});});
  return {get db(){return db;},reopen(){db.close();db=new VeiledDB(file,schema);},put(table,id,state='{}',guild='guild',date='2026-01-01 00:00:00'){assert.ok(['campaign_backups','campaign_snapshots'].includes(table));db.db.prepare(`INSERT INTO ${table}(id,guild_id,label,state_json,created_at) VALUES(?,?,?,?,?)`).run(id,guild,id,state,date);}};
}
const changes=db=>db.db.prepare('SELECT total_changes() n').get().n;

test('historical backup/snapshot JSON readers retain distinct empty, malformed, scalar and missing results',t=>{
  const f=fixture(t);for(const table of ['campaign_backups','campaign_snapshots']){f.put(table,'valid','{"legacy":{"v":1}}');f.put(table,'empty','');f.put(table,'malformed','broken');f.put(table,'scalar','null');}
  const before=changes(f.db);assert.deepEqual(f.db.getBackup('valid').state,{legacy:{v:1}});assert.deepEqual(f.db.getSnapshot('valid').state,{legacy:{v:1}});assert.deepEqual(f.db.getBackup('empty').state,{});assert.throws(()=>f.db.getSnapshot('empty'),SyntaxError);assert.throws(()=>f.db.getBackup('malformed'),SyntaxError);assert.throws(()=>f.db.getSnapshot('malformed'),SyntaxError);assert.equal(f.db.getBackup('scalar').state,null);assert.equal(f.db.getSnapshot('scalar').state,null);assert.equal(f.db.getBackup('missing'),null);assert.equal(f.db.getSnapshot('missing'),null);assert.equal(changes(f.db),before);
});
test('backup list preserves projection, guild scope, ordering and original bounded numeric limits',t=>{
  const f=fixture(t);for(let i=0;i<55;i++)f.put('campaign_backups',`b${i}`,'{}','guild',`2026-01-${String(i+1).padStart(2,'0')}`);f.put('campaign_backups','secret','{}','other','2099');const before=changes(f.db);
  assert.equal(f.db.listBackups('guild').length,20);assert.equal(f.db.listBackups('guild',undefined).length,20);assert.equal(f.db.listBackups('guild',0).length,20);assert.equal(f.db.listBackups('guild','3').length,3);assert.equal(f.db.listBackups('guild',-4).length,1);assert.equal(f.db.listBackups('guild',200).length,50);const row=f.db.listBackups('guild',1)[0];assert.equal(row.id,'b54');assert.equal(Object.getPrototypeOf(row),null);assert.deepEqual(Object.keys(row).sort(),['created_at','created_by','id','label','reason']);assert.deepEqual(f.db.listBackups('absent'),[]);assert.equal(changes(f.db),before);
});
test('snapshot lists retain original unbounded SQL limit behavior and native binding errors',t=>{
  const f=fixture(t);for(let i=0;i<15;i++)f.put('campaign_snapshots',`s${i}`,'{}','guild',String(i).padStart(2,'0'));f.put('campaign_snapshots','secret','{}','other','99');const before=changes(f.db);
  assert.equal(f.db.listSnapshots('guild').length,12);assert.equal(f.db.listSnapshots('guild',undefined).length,12);assert.equal(f.db.listSnapshots('guild',0).length,0);assert.equal(f.db.listSnapshots('guild',-1).length,15);assert.equal(f.db.listSnapshots('guild',2)[0].id,'s14');assert.throws(()=>f.db.listSnapshots('guild',null));assert.deepEqual(f.db.listSnapshots('absent'),[]);assert.equal(changes(f.db),before);
});
test('mutation ledger preserves combined source/type filters, default/clamped limits and parameter errors',t=>{
  const f=fixture(t);for(let i=0;i<105;i++)f.db.db.prepare('INSERT INTO mutation_ledger(id,guild_id,actor_type,source_layer,mutation_type,created_at) VALUES(?,?,?,?,?,?)').run(`m${i}`,'guild','gm',i%2?'command':'native',i%3?'change':'read',String(i).padStart(3,'0'));f.db.db.prepare('INSERT INTO mutation_ledger(id,guild_id,actor_type,source_layer,mutation_type) VALUES(?,?,?,?,?)').run('hidden','other','gm','native','read');const before=changes(f.db);
  assert.equal(f.db.listMutationLedger('guild').length,40);assert.equal(f.db.listMutationLedger('guild',{limit:1000}).length,100);assert.equal(f.db.listMutationLedger('guild',{limit:-1}).length,1);assert.equal(f.db.listMutationLedger('guild',{limit:0}).length,40);const rows=f.db.listMutationLedger('guild',{sourceLayer:'native',mutationType:'read',limit:100});assert.equal(rows.length,18);assert.ok(rows.every(r=>r.source_layer==='native'&&r.mutation_type==='read'&&r.guild_id==='guild'));assert.equal(rows[0].id,'m102');assert.throws(()=>f.db.listMutationLedger('guild',null),TypeError);assert.equal(changes(f.db),before);
});
test('preview dispatches current class readers in order with exact receiver/options and stops at guard',t=>{
  const f=fixture(t),db=f.db,calls=[],saved={guild_id:'guild',state:{tables:{players:[1,2],sessions:[1]}}};
  const methods={getBackup(id){assert.equal(this,db);calls.push(['backup',id]);return saved;},listPlayers(guild){assert.equal(this,db);calls.push(['players',guild]);return [1];},listGuildCharacters(guild,options){assert.equal(this,db);calls.push(['characters',guild,options]);return [1,2,3];},listFactsForGM(guild,options){assert.equal(this,db);calls.push(['facts',guild,options]);return [1,2];}};
  Object.assign(db,methods);const before=changes(db),result=db.backupPreview('guild','overridden');assert.equal(result.backup,saved);assert.deepEqual(result.current,{players:1,characters:3,facts:2,sessions:0});assert.deepEqual(result.counts,{players:2,characters:0,facts:0,sessions:1});assert.deepEqual(calls,[['backup','overridden'],['players','guild'],['characters','guild',{includeClosed:true}],['facts','guild',{limit:100}]]);assert.equal(changes(db),before);
  calls.length=0;assert.throws(()=>db.backupPreview('other','overridden'),{message:'Backup not found.'});assert.deepEqual(calls,[['backup','overridden']]);const error=new Error('current reader failure');db.getBackup=function(){throw error;};assert.throws(()=>db.backupPreview('guild','x'),actual=>actual===error);
});
test('same connection reads see caller uncommitted writes and nested savepoint rollback without owning commit',t=>{
  const f=fixture(t),db=f.db,connection=db.db,outer=new Error('outer rollback'),inner=new Error('inner rollback');
  assert.throws(()=>db.transaction(()=>{f.put('campaign_backups','pending','{"tables":{"players":[{}]}}');f.put('campaign_snapshots','pending','{"old":true}');assert.equal(db.getBackup('pending').state.tables.players.length,1);assert.equal(db.backupPreview('guild','pending').counts.players,1);assert.equal(db.listBackups('guild').length,1);assert.equal(db.getSnapshot('pending').state.old,true);assert.equal(db.listSnapshots('guild').length,1);assert.throws(()=>db.transaction(()=>{f.put('campaign_backups','nested');assert.ok(db.getBackup('nested'));throw inner;}),e=>e===inner);assert.equal(db.getBackup('nested'),null);assert.ok(db.getBackup('pending'));throw outer;}),e=>e===outer);
  assert.equal(db.getBackup('pending'),null);assert.equal(db.getSnapshot('pending'),null);assert.equal(db.db,connection);assert.equal(db._transactionDepth,0);
});
test('closed/reopened readers preserve stored historical shapes and unchanged schema',t=>{
  const f=fixture(t);f.put('campaign_backups','persisted','{"version":1,"tables":{}}');f.put('campaign_snapshots','persisted','{"legacy":true}');f.reopen();const before=changes(f.db);assert.deepEqual(f.db.getBackup('persisted').state,{version:1,tables:{}});assert.deepEqual(f.db.getSnapshot('persisted').state,{legacy:true});assert.equal(f.db.db.prepare('PRAGMA user_version').get().user_version,460);assert.equal(changes(f.db),before);
});
