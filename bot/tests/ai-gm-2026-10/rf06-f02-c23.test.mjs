import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/frameworks/persistence/database.js';
const schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));
function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'veiled-rf06-r23-')),path=join(dir,'synthetic.sqlite');let db=new VeiledDB(path,schema);db.upsertPlayer('guild','owner','Mara');db.upsertPlayer('other','owner','Other Mara');
  t.after(()=>{db.close();assert.equal(dirname(dir),resolve(tmpdir()));assert.ok(dir.startsWith(join(resolve(tmpdir()),'veiled-rf06-r23-')));rmSync(dir,{recursive:true,force:true});});
  return {get db(){return db;},reopen(){db.close();db=new VeiledDB(path,schema);}};
}

test('original SQLite row/absence semantics and guild/private-channel filters remain exact',t=>{
  const f=fixture(t),row=f.db.getPlayer('guild','owner');assert.equal(Object.getPrototypeOf(row),null);assert.equal(row.display_name,'Mara');assert.equal(f.db.getPlayer('missing','owner'),undefined);
  assert.equal(f.db.setPrivateChannel('guild','owner','channel'),undefined);assert.equal(f.db.getPlayerByPrivateChannel('guild','channel').discord_user_id,'owner');assert.equal(f.db.getPlayerByPrivateChannel('other','channel'),undefined);assert.equal(f.db.getPlayer('other','owner').private_channel_id,null);
});
test('original JSON merge/default/false and return object encoding remain intact',t=>{
  const f=fixture(t);f.db.setAccessibility('guild','owner',{legacy_option:'kept',screen_reader:true});const next=f.db.setAccessibility('guild','owner',{screen_reader:false,response_length:'compact'});assert.equal(Object.getPrototypeOf(next),Object.prototype);assert.equal(next.legacy_option,'kept');assert.equal(next.screen_reader,false);assert.equal(next.mechanics,'standard');assert.equal(f.db.getPlayer('guild','owner').accessibility_json,JSON.stringify(next));
});
test('setAccessibility still dispatches through the current VeiledDB getPlayer override exactly once',t=>{
  const f=fixture(t),original=f.db.getPlayer;let calls=0;
  f.db.getPlayer=function(guild,user){assert.equal(this,f.db);calls++;return {...original.call(this,guild,user),accessibility_json:'{"custom_reader":true}'};};
  const next=f.db.setAccessibility('guild','owner',{response_length:'compact'});assert.equal(calls,1);assert.deepEqual(next,{custom_reader:true,response_length:'compact'});f.db.getPlayer=original;assert.equal(f.db.getPlayer('guild','owner').accessibility_json,JSON.stringify(next));
});
test('missing player and malformed legacy JSON retain original errors without an update',t=>{
  const f=fixture(t);let before=f.db.db.prepare('SELECT total_changes() n').get().n;assert.throws(()=>f.db.setAccessibility('guild','missing',{}),{message:'Player not registered.'});assert.equal(f.db.setPrivateChannel('guild','missing','channel'),undefined);assert.equal(f.db.db.prepare('SELECT total_changes() n').get().n,before);
  f.db.db.prepare('UPDATE players SET accessibility_json=? WHERE guild_id=? AND discord_user_id=?').run('not-json','guild','owner');before=f.db.db.prepare('SELECT total_changes() n').get().n;assert.throws(()=>f.db.setAccessibility('guild','owner',{}),SyntaxError);assert.equal(f.db.db.prepare('SELECT total_changes() n').get().n,before);
});
test('same connection outer rollback/nested savepoint contains both preference writes',t=>{
  const f=fixture(t),connection=f.db.db,before=f.db.getPlayer('guild','owner'),error=new Error('synthetic outer rollback');
  assert.throws(()=>f.db.transaction(()=>{f.db.setPrivateChannel('guild','owner','temporary');f.db.transaction(()=>f.db.setAccessibility('guild','owner',{screen_reader:true}));throw error;}),actual=>actual===error);
  const after=f.db.getPlayer('guild','owner');assert.equal(after.private_channel_id,before.private_channel_id);assert.equal(after.accessibility_json,before.accessibility_json);assert.equal(f.db.db,connection);assert.equal(f.db._transactionDepth,0);
});
test('native SQLite update failure preserves prior JSON and exception without added transaction',t=>{
  const f=fixture(t),before=f.db.getPlayer('guild','owner').accessibility_json;f.db.db.exec("CREATE TEMP TRIGGER rf23_abort BEFORE UPDATE OF accessibility_json ON players BEGIN SELECT RAISE(ABORT,'synthetic preference failure'); END;");assert.throws(()=>f.db.setAccessibility('guild','owner',{screen_reader:true}),/synthetic preference failure/);assert.equal(f.db.getPlayer('guild','owner').accessibility_json,before);assert.equal(f.db._transactionDepth,0);
});
test('original preference rows remain compatible after close/reopen without schema drift',t=>{
  const f=fixture(t);f.db.setPrivateChannel('guild','owner','channel');const expected=f.db.setAccessibility('guild','owner',{screen_reader:true,response_length:'expanded'});f.reopen();assert.equal(f.db.getPlayerByPrivateChannel('guild','channel').accessibility_json,JSON.stringify(expected));assert.equal(f.db.schemaVersion(),460);assert.equal(f.db.getPlayer('other','owner').private_channel_id,null);
});
