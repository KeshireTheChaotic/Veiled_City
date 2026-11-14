import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {ChannelType,PermissionsBitField,PermissionFlagsBits as P} from 'discord.js';
import {startNative} from '../../src/v2/native-start.js';
import {createRuntimeSnapshot,restoreRuntimeSnapshot,inspectRuntimeSnapshot} from '../../src/v2/runtime-snapshots.js';

const hash=f=>createHash('sha256').update(readFileSync(f)).digest('hex');

function fixture(t){
 const base=mkdtempSync(join(tmpdir(),'vk2-import-runtime-')),legacy=join(base,'legacy.sqlite'),directory=join(base,'native'),guildId='11111';
 const db=new DatabaseSync(legacy);db.exec(readFileSync(new URL('../../sql/schema.sql',import.meta.url),'utf8'));db.exec('ALTER TABLE facts ADD COLUMN archived INTEGER NOT NULL DEFAULT 0');db.prepare('INSERT INTO campaigns(guild_id,gm_role_id) VALUES(?,?)').run(guildId,'role');db.prepare('INSERT INTO characters(id,guild_id,owner_user_id,name,character_json) VALUES(?,?,?,?,?)').run('pc',guildId,'22222','Mira','{}');db.close();
 const member={id:'22222',guild:{id:guildId},user:{id:'22222',bot:false},roles:{cache:new Map([['role',{}]])},permissions:new PermissionsBitField(0n)},channel={id:'33333',guildId,type:ChannelType.GuildText,permissionsFor:()=>new PermissionsBitField(P.ViewChannel|P.SendMessages)};
 let logins=0,app,fetches=0;const errors=[],replies=[],client=Object.assign(new EventEmitter(),{user:{id:'bot'},guilds:{fetch:async()=>({id:guildId,members:{fetch:async()=>member},roles:{fetch:async()=>new Map([['role',{}]])},channels:{fetch:async()=>channel}})},login:async()=>{logins++;},destroy:async()=>{}});
 const env={VK2_NATIVE:'1',VK2_NATIVE_DIR:directory,VK2_GUILD_LEASE_DIR:join(base,'leases'),VK2_LEGACY_DB:legacy,VK2_ALLOWED_GUILD_ID:guildId,DISCORD_TOKEN:'synthetic'};
 const packet=Buffer.from(JSON.stringify({character_name:'Mira',hooks:[{key:'native',premise:'PRIVATE-IMPORTED-HOOK'}],canon_suggestions:[{key:'origin',value:'PRIVATE-PENDING-CANON'}]})),md=Buffer.from('PRIVATE-NARRATIVE\n');
 const file={id:'44444',name:'hooks.json',size:packet.length,url:'https://cdn.discordapp.com/attachments/33333/44444/hooks.json'},narrative={id:'44445',name:'Mira.md',size:md.length,url:'https://cdn.discordapp.com/attachments/33333/44445/Mira.md'};
 const fetchImpl=async url=>{fetches++;return new Response(url.includes('44445')?md:packet);};
 function event(id,sub='import-gm-hooks'){const e={id,client,guildId,channelId:'33333',user:{id:'22222',bot:false},createdTimestamp:Date.now(),commandName:'vc-character',isChatInputCommand:()=>true,options:{getSubcommand:()=>sub,getString:k=>k==='character'?'pc':k==='format'?'all':null,getAttachment:k=>k==='file'?file:narrative},deferred:false,replied:false,ephemeral:null,deferReply:async value=>{e.deferred=true;e.ephemeral=true;replies.push({defer:value});},editReply:async value=>replies.push(value),reply:async value=>replies.push(value)};return e;}
 t.after(async()=>{await app?.close();rmSync(base,{recursive:true,force:true});});
 return {base,legacy,directory,env,client,errors,replies,guildId,get app(){return app;},get logins(){return logins;},get fetches(){return fetches;},event,async start(over={}){const {createNativeRoot}=await import('../../src/v2/native-root.js');app=await startNative({env:{...env,...over},createClient:()=>client,createRoot:o=>createNativeRoot({...o,gmImportFetch:fetchImpl}),onError:(e,c)=>errors.push({message:e.message,...c})});return app;},async dispatch(e){client.emit('interactionCreate',e);await app.root.drain();}};
}

test('native import route commits and cold resume exports private source in all formats without player disclosure',async t=>{
 const f=fixture(t),before=hash(f.legacy);await f.start({VK2_PRIVATE_IMPORTS:'1'});await f.dispatch(f.event('55555'));assert.equal(f.fetches,2);assert.equal(f.app.root.privateHookStore.readNarrative('11111','pc').text,'PRIVATE-NARRATIVE\n');assert.equal(f.app.root.privateHookStore.proposals('11111','pc')[0].status,'pending');await f.app.close();
 await f.start({VK2_RESUME:'1'});assert.ok(f.app.root.privateHookStore);await f.dispatch(f.event('55555'));assert.equal(f.fetches,2);await f.dispatch(f.event('55556','export-gm'));
 const files=f.replies.filter(r=>r.files).flatMap(r=>r.files);assert.equal(files.length,9);for(const extension of ['json','md','docx']){const priv=files.find(x=>x.name.startsWith('GM_PRIVATE')&&x.name.endsWith('.'+extension));assert.ok(priv.attachment.includes(Buffer.from('PRIVATE-NARRATIVE')));}
 assert.ok(files.find(x=>x.name==='GM_HOOKS_Mira.json').attachment.includes(Buffer.from('PRIVATE-IMPORTED-HOOK')));assert.ok(files.find(x=>x.name==='GM_CANON_Mira.json').attachment.includes(Buffer.from('PRIVATE-PENDING-CANON')));
 await f.dispatch(f.event('55557','export'));const playerFiles=f.replies.filter(r=>r.files).flatMap(r=>r.files).slice(9);assert.equal(playerFiles.length,3,JSON.stringify(f.errors));assert.ok(playerFiles.every(x=>!x.attachment.includes(Buffer.from('PRIVATE-'))));assert.equal(hash(f.legacy),before);assert.deepEqual(f.errors,[]);
});

test('enabling imports on an old manifested runtime holds before root login and leaves the sealed files unchanged',async t=>{
 const f=fixture(t);await f.start();assert.equal(f.app.root.privateHookStore,null);await f.app.close();const file=join(f.directory,'runtime.sqlite'),before=hash(file),logins=f.logins;
 await assert.rejects(f.start({VK2_RESUME:'1',VK2_PRIVATE_IMPORTS:'1'}),/reviewed private import store migration/);assert.equal(f.logins,logins);assert.equal(hash(file),before);assert.equal(existsSync(join(f.directory,'private-hooks.sqlite')),false);
});

test('snapshot and restore preserve committed private hooks narrative canon proposals and import receipts',async t=>{
 const f=fixture(t);await f.start({VK2_PRIVATE_IMPORTS:'1'});await f.dispatch(f.event('55555'));const runId=f.app.runId;await f.app.close();const original=hash(join(f.directory,'private-hooks.sqlite'));
 const snapshot=createRuntimeSnapshot({directory:f.directory,legacyDb:f.legacy,guildId:f.guildId,leaseDirectory:f.env.VK2_GUILD_LEASE_DIR,destination:join(f.base,'snapshot')});assert.equal(inspectRuntimeSnapshot(snapshot.directory).files.find(x=>x.name==='private-hooks.sqlite').sha256,original);
 const restored=restoreRuntimeSnapshot({snapshotDirectory:snapshot.directory,expectedHash:snapshot.snapshotHash,destination:join(f.base,'restored'),leaseDirectory:f.env.VK2_GUILD_LEASE_DIR});assert.equal(hash(join(restored.directory,'private-hooks.sqlite')),original);
 await f.start({VK2_NATIVE_DIR:restored.directory,VK2_LEGACY_DB:restored.legacyDb,VK2_RESUME:'1',VK2_RESTORED_SNAPSHOT_HASH:snapshot.snapshotHash});assert.equal(f.app.runId,runId);assert.equal(f.app.root.privateHookStore.readNarrative('11111','pc').text,'PRIVATE-NARRATIVE\n');assert.equal(f.app.root.privateHookStore.proposals('11111','pc')[0].status,'pending');await f.dispatch(f.event('55555'));assert.equal(f.fetches,2);
});
