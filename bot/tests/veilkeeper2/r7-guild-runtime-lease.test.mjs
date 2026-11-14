import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync,existsSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve,sep} from 'node:path';import {pathToFileURL} from 'node:url';import {spawn} from 'node:child_process';import {once} from 'node:events';
import {acquireGuildRuntimeLease,defaultGuildLeaseDirectory} from '../../src/v2/guild-runtime-lease.js';import {startNative} from '../../src/v2/native-start.js';
function fixture(t){const base=mkdtempSync(join(tmpdir(),'vk2-guild-lease-'));t.after(()=>{assert.ok(resolve(base).startsWith(resolve(tmpdir())+sep));rmSync(base,{recursive:true,force:true});});return {base,directory:join(base,'shared-leases'),guildId:'1467249344947159291'};}
test('same guild is exclusive across runtime directories while other guilds remain independent',t=>{
 const f=fixture(t),one=acquireGuildRuntimeLease(f);try{assert.throws(()=>acquireGuildRuntimeLease({...f,directory:join(f.directory,'.')}),/locked/);const other=acquireGuildRuntimeLease({...f,guildId:'1467249344947159292'});other.close();}finally{one.close();}const next=acquireGuildRuntimeLease(f);next.close();next.close();
});
test('worktrees resolve the same default lease directory without writing to Git metadata',t=>{
 const f=fixture(t),main=join(f.base,'main'),worktree=join(f.base,'worktree'),git=join(main,'.git'),internal=join(git,'worktrees','alternate');mkdirSync(internal,{recursive:true});mkdirSync(worktree);writeFileSync(join(worktree,'.git'),'gitdir: '+internal+'\n');writeFileSync(join(internal,'commondir'),'../..\n');
 assert.equal(defaultGuildLeaseDirectory(main),join(main,'.vk2-runtime-leases'));assert.equal(defaultGuildLeaseDirectory(worktree),defaultGuildLeaseDirectory(main));assert.equal(existsSync(defaultGuildLeaseDirectory(main)),false);
 assert.throws(()=>defaultGuildLeaseDirectory(f.base),/Explicit VK2_GUILD_LEASE_DIR/);
});
test('invalid guild and mismatched/foreign lease schemas are held without replacing data',t=>{
 const f=fixture(t);assert.throws(()=>acquireGuildRuntimeLease({...f,guildId:'../invalid'}),/scope/);assert.equal(existsSync(f.directory),false);mkdirSync(f.directory);const file=join(f.directory,`guild-${f.guildId}.sqlite`),db=new DatabaseSync(file);db.exec('CREATE TABLE existing_campaign_data(id TEXT);INSERT INTO existing_campaign_data VALUES(\'preserve\')');db.close();assert.throws(()=>acquireGuildRuntimeLease(f),/Dedicated/);const read=new DatabaseSync(file,{readOnly:true});try{assert.equal(read.prepare('SELECT id FROM existing_campaign_data').get().id,'preserve');}finally{read.close();}
});
test('a future lease version is held rather than silently adopted',t=>{
 const f=fixture(t),lease=acquireGuildRuntimeLease(f);lease.close();const db=new DatabaseSync(join(f.directory,`guild-${f.guildId}.sqlite`));db.exec('UPDATE vk2_guild_runtime_lease SET version=2');db.close();assert.throws(()=>acquireGuildRuntimeLease(f),/version/);
});
test('owned process crash releases its guild lease without deleting or timing out lease records',async t=>{
 const f=fixture(t),url=pathToFileURL(resolve('bot/src/v2/guild-runtime-lease.js')).href,code=`import {acquireGuildRuntimeLease} from ${JSON.stringify(url)};const lease=acquireGuildRuntimeLease(${JSON.stringify({directory:f.directory,guildId:f.guildId})});process.stdout.write('ready');setInterval(()=>{},1000);`;
 const child=spawn(process.execPath,['--input-type=module','-e',code],{stdio:['ignore','pipe','pipe']});try{await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw new Error('Lease child exited before readiness');})]);assert.throws(()=>acquireGuildRuntimeLease(f),/locked/);}finally{const exit=once(child,'exit');child.kill('SIGKILL');await exit;}
 const recovered=acquireGuildRuntimeLease(f);recovered.close();assert.equal(existsSync(join(f.directory,`guild-${f.guildId}.sqlite`)),true);
});
test('two native launchers with different store directories cannot create a second client or login',async t=>{
 const f=fixture(t),source=join(f.base,'legacy.sqlite');writeFileSync(source,'legacy fixture');let clients=0,logins=0,providerCalls=0;
 const env={VK2_NATIVE:'1',VK2_NATIVE_DIR:join(f.base,'one'),VK2_GUILD_LEASE_DIR:f.directory,VK2_ALLOWED_GUILD_ID:f.guildId,VK2_LEGACY_DB:source,DISCORD_TOKEN:'synthetic'},options={env,createClient:()=>{clients++;return {login:async()=>{logins++;},destroy:async()=>{}};},openRepository:()=>({close(){}}),createRoot:()=>({close(){}}),createProvider:async()=>{providerCalls++;return {};}};
 const first=await startNative(options);try{await assert.rejects(startNative({...options,env:{...env,VK2_NATIVE_DIR:join(f.base,'two'),VK2_INFERENCE:'1'}}),/locked/);assert.equal(existsSync(join(f.base,'two')),false);assert.equal(clients,1);assert.equal(logins,1);assert.equal(providerCalls,0);}finally{await first.close();}
 const second=await startNative({...options,env:{...env,VK2_NATIVE_DIR:join(f.base,'two')}});await second.close();assert.equal(logins,2);
});
test('startup preflight failure releases the shared lease before another directory is attempted',async t=>{
 const f=fixture(t),env={VK2_NATIVE:'1',VK2_NATIVE_DIR:join(f.base,'bad'),VK2_GUILD_LEASE_DIR:f.directory,VK2_ALLOWED_GUILD_ID:f.guildId,VK2_LEGACY_DB:join(f.base,'missing.sqlite'),DISCORD_TOKEN:'synthetic'};await assert.rejects(startNative({env}));const lease=acquireGuildRuntimeLease(f);lease.close();assert.equal(existsSync(env.VK2_NATIVE_DIR),false);
});
