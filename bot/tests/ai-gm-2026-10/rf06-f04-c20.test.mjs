import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB,createAdministrativeReadStore} from '../../src/frameworks/persistence/public.js';
import {handleAdministrativeReadCommand,assertAdministrativeReadStore,byPrefix} from '../../src/frameworks/discord/public.js';
import {connectDiscordAdministrativeReads} from '../../src/framework-to-framework/discord--persistence/public.js';
const schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));
function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'veiled-rf06-r20-')),db=new VeiledDB(join(dir,'synthetic.sqlite'),schema);db.ensureCampaign('guild');db.ensureCampaign('other');db.upsertPlayer('guild','owner','Mara');
  t.after(()=>{db.close();assert.equal(dirname(dir),resolve(tmpdir()));assert.ok(dir.startsWith(join(resolve(tmpdir()),'veiled-rf06-r20-')));rmSync(dir,{recursive:true,force:true});});
  const calls=[],interaction={guildId:'guild',options:{getInteger:()=>null,getString:()=>null},reply:async payload=>calls.push(['reply',payload]),followUp:async payload=>calls.push(['follow',payload])};return {db,calls,interaction,store:connectDiscordAdministrativeReads(db)};
}

test('original prefix selection retains exact priority, first ambiguous prefix and empty-input behavior',()=>{
  const rows=[{id:'abcd-1'},{id:'abcd-2'},{id:'ab'}];assert.equal(byPrefix(rows,' AB '),rows[2]);assert.equal(byPrefix(rows,'ABC'),rows[0]);assert.equal(byPrefix(rows,''),rows[0]);assert.equal(byPrefix(rows,'missing'),undefined);
});
test('administrative interface exposes only original reads and preserves receiver/value/error',()=>{
  assert.throws(()=>assertAdministrativeReadStore({}),TypeError);assert.throws(()=>createAdministrativeReadStore({}),TypeError);const value=[],error=new Error('synthetic original failure'),db={listBackups(guild,limit){assert.equal(this,db);assert.deepEqual([guild,limit],['guild',20]);return value;},backupPreview(){throw error;},listMutationLedger(){},listSnapshots(){}};
  const store=connectDiscordAdministrativeReads(db);assert.ok(Object.isFrozen(store));assert.deepEqual(Object.keys(store).sort(),['backupPreview','listBackups','listMutationLedger','listSnapshots']);assert.equal(store.db,undefined);assert.equal(store.listBackups('guild',20),value);assert.throws(()=>store.backupPreview(),actual=>actual===error);
});
test('real SQLite backup/preview/snapshot views retain original counts and guild isolation with no writes',async t=>{
  const f=fixture(t),state=JSON.stringify({tables:{players:[{},{}],characters:[{}],facts:[],sessions:[{}]}}),insert=f.db.db.prepare('INSERT INTO campaign_backups(id,guild_id,label,reason,state_json,created_by) VALUES(?,?,?,?,?,?)');insert.run('backup-123','guild','Synthetic backup','Read fixture',state,'owner');insert.run('backup-other','other','Other secret','Hidden',state,'other');f.db.db.prepare('INSERT INTO campaign_snapshots(id,guild_id,label,reason,state_json) VALUES(?,?,?,?,?)').run('snapshot-123','guild','Synthetic snapshot','Read fixture',state);
  const before=f.db.db.prepare('SELECT total_changes() n').get().n;
  await handleAdministrativeReadCommand(f.interaction,{sub:'backups',store:f.store});assert.ok(f.calls[0][1].content.includes('Synthetic backup'));assert.ok(!f.calls[0][1].content.includes('Other secret'));
  f.calls.length=0;await handleAdministrativeReadCommand(f.interaction,{sub:'restore-preview',store:f.store,backupId:'backup-1'});assert.match(f.calls[0][1].content,/Backup: 2 players • 1 characters • 0 facts • 1 sessions/);assert.match(f.calls[0][1].content,/Current: 1 players • 0 characters • 0\+ facts • 0 sessions/);
  f.calls.length=0;await handleAdministrativeReadCommand(f.interaction,{sub:'snapshots',store:f.store});assert.ok(f.calls[0][1].content.includes('Synthetic snapshot'));assert.equal(f.calls[0][1].ephemeral,true);assert.equal(f.db.db.prepare('SELECT total_changes() n').get().n,before);
});
test('empty views retain exact responses and missing preview uses original NotFoundError',async t=>{
  const f=fixture(t);for(const [sub,content]of [['backups','No campaign backups yet.'],['snapshots','No snapshots yet.'],['ledger','No mutation-ledger entries recorded yet.']]){f.calls.length=0;await handleAdministrativeReadCommand(f.interaction,{sub,store:f.store});assert.deepEqual(f.calls,[['reply',{content,ephemeral:true}]]);}
  f.calls.length=0;await assert.rejects(handleAdministrativeReadCommand(f.interaction,{sub:'restore-preview',store:f.store,backupId:'absent'}),error=>error.code==='NOT_FOUND'&&error.message==='Backup not found.');assert.deepEqual(f.calls,[]);
});
test('actual mutation ledger view is read-only, private and ordered across bounded chunks',async t=>{
  const f=fixture(t);for(let n=0;n<10;n++)f.db.recordMutation('guild',{sourceLayer:'command',mutationType:'fixture:read',rationale:`Fixture row ${n} `+'x'.repeat(400)});const before=f.db.db.prepare('SELECT total_changes() n').get().n;
  await handleAdministrativeReadCommand(f.interaction,{sub:'ledger',store:f.store});assert.ok(f.calls.length>1);assert.equal(f.calls[0][0],'reply');assert.ok(f.calls.slice(1).every(c=>c[0]==='follow'));assert.ok(f.calls.every(c=>c[1].ephemeral&&c[1].content.length<=1900));assert.equal(f.db.db.prepare('SELECT total_changes() n').get().n,before);
});
test('storage/response errors propagate without retry and unknown subcommand does not access storage',async()=>{
  const error=new Error('synthetic read failure');let sends=0;await assert.rejects(handleAdministrativeReadCommand({guildId:'guild',reply:()=>sends++},{sub:'backups',store:{listBackups(){throw error;}}}),actual=>actual===error);assert.equal(sends,0);assert.equal(await handleAdministrativeReadCommand({}, {sub:'unknown',store:new Proxy({},{get(){throw Error('Unexpected read');}})}),false);
});
