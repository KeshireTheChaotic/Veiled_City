import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB,createCommandReceiptStore} from '../../src/frameworks/persistence/public.js';
import {assertCommandReceiptStore,replayReceiptIfPresent,installReceiptCapture} from '../../src/frameworks/discord/public.js';
import {connectDiscordCommandReceipts} from '../../src/framework-to-framework/discord--persistence/public.js';
const schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));
function fixture(t){
  const directory=mkdtempSync(join(tmpdir(),'veiled-rf06-r12-')),path=join(directory,'synthetic.sqlite');let db=new VeiledDB(path,schema);db.ensureCampaign('guild');
  t.after(()=>{db.close();assert.equal(dirname(directory),resolve(tmpdir()));assert.ok(directory.startsWith(join(resolve(tmpdir()),'veiled-rf06-r12-')));rmSync(directory,{recursive:true,force:true});});
  return {get db(){return db;},store:()=>connectDiscordCommandReceipts(db),reopen(){db.close();db=new VeiledDB(path,schema);}};
}
const interaction=reply=>({id:'interaction',guildId:'guild',commandName:'vc-character',user:{id:'owner'},reply,editReply:reply});

test('qualified per-connection view forwards original receiver/callback/value/error without exposing SQL handle',()=>{
  assert.throws(()=>assertCommandReceiptStore({}),TypeError);assert.throws(()=>createCommandReceiptStore({}),TypeError);
  const expected={},error=new Error('synthetic original failure'),callback=()=>expected;
  const db={getOperationReceipt(...args){assert.equal(this,db);assert.deepEqual(args,['guild','interaction']);return expected;},recordOperationReceipt(){throw error;},getActiveSession(){},recordMutation(){},transaction(fn){assert.equal(this,db);assert.equal(fn,callback);return fn();}};
  const store=connectDiscordCommandReceipts(db);assert.ok(Object.isFrozen(store));assert.equal(store.db,undefined);assert.equal(assertCommandReceiptStore(store),store);
  assert.equal(store.getOperationReceipt('guild','interaction'),expected);assert.equal(store.transaction(callback),expected);assert.throws(()=>store.recordOperationReceipt(),actual=>actual===error);
});
test('actual SQLite receipt and ledger survive failed response and reopen; duplicate replays without another ledger row',async t=>{
  const f=fixture(t),error=new Error('synthetic uncertain reply'),i=interaction(()=>{throw error;});
  installReceiptCapture({db:f.store(),interaction:i,group:'character',sub:'create'});
  await assert.rejects(i.reply({content:'Owned character saved.'}),actual=>actual===error);
  const receipt=f.db.getOperationReceipt('guild','interaction');assert.equal(receipt.status,'completed');assert.equal(receipt.actor_user_id,'owner');assert.equal(receipt.response_text,'Owned character saved.');
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM mutation_ledger').get().n,1);f.reopen();
  const sent=[];assert.equal(await replayReceiptIfPresent({db:f.store(),interaction:interaction(p=>sent.push(p)),group:'character',sub:'create'}),true);
  assert.equal(sent.length,1);assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM mutation_ledger').get().n,1);assert.equal(f.db.schemaVersion(),460);
});
test('actual SQLite ledger insert failure rolls back earlier receipt and prevents response',async t=>{
  const f=fixture(t);f.db.db.exec("CREATE TEMP TRIGGER rf12_abort BEFORE INSERT ON mutation_ledger BEGIN SELECT RAISE(ABORT,'synthetic ledger failure'); END;");let sends=0;
  const i=interaction(()=>sends++);installReceiptCapture({db:f.store(),interaction:i,group:'character',sub:'create'});
  await assert.rejects(i.reply({content:'Must remain uncommitted'}),/synthetic ledger failure/);
  assert.equal(sends,0);assert.equal(f.db.getOperationReceipt('guild','interaction'),undefined);assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM mutation_ledger').get().n,0);assert.equal(f.db._transactionDepth,0);
});
test('same-connection nested savepoint and asynchronous callback rejection retain rollback behavior',t=>{
  const f=fixture(t),store=f.store(),error=new Error('synthetic outer rollback');
  assert.throws(()=>store.transaction(()=>{store.recordOperationReceipt('guild',{interactionId:'nested',commandKey:'character:create',actorUserId:'owner'});store.transaction(()=>store.recordMutation('guild',{sourceLayer:'command',mutationType:'command:character:create'}));throw error;}),actual=>actual===error);
  assert.equal(store.getOperationReceipt('guild','nested'),undefined);assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM mutation_ledger').get().n,0);
  assert.throws(()=>store.transaction(()=>{store.recordOperationReceipt('guild',{interactionId:'async',commandKey:'character:create',actorUserId:'owner'});return Promise.resolve();}),/callbacks must be synchronous/);
  assert.equal(store.getOperationReceipt('guild','async'),undefined);assert.equal(f.db._transactionDepth,0);
});
test('original guild plus interaction receipt identity remains separate on the same connection',t=>{
  const f=fixture(t),store=f.store();f.db.ensureCampaign('other');
  store.recordOperationReceipt('guild',{interactionId:'same',commandKey:'character:create',actorUserId:'owner',responseText:'owner result'});
  store.recordOperationReceipt('other',{interactionId:'same',commandKey:'character:create',actorUserId:'other-owner',responseText:'other result'});
  assert.equal(store.getOperationReceipt('guild','same').response_text,'owner result');assert.equal(store.getOperationReceipt('other','same').response_text,'other result');assert.equal(store.getOperationReceipt('missing','same'),undefined);
});
