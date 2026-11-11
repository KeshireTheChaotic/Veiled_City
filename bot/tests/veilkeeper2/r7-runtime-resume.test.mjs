import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {EventEmitter,once} from 'node:events';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync,existsSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {startNative} from '../../src/v2/native-start.js';
import {openLegacyReadOnlyRepository} from '../../src/v2/legacy-readonly-repository.js';
import {openSourceRegistry} from '../../src/v2/source-registry.js';
import {createCanonicalActorReaders} from '../../src/v2/canonical-actor-readers.js';
import {createSourceAuthority} from '../../src/v2/source-authority.js';
import {createHopeConsentIngress} from '../../src/v2/rules/hope-consent-ingress.js';
import {createNativeActionAuthority} from '../../src/v2/native-action-authority.js';
import {prepareRuntimeDirectory} from '../../src/v2/runtime-directory.js';
function fixture(t){
 const base=mkdtempSync(join(tmpdir(),'vk2-runtime-resume-')),legacyDb=join(base,'legacy.sqlite'),directory=join(base,'native'),gid='1467249344947159291',log=[];
 const db=new DatabaseSync(legacyDb);db.exec('CREATE TABLE characters(id TEXT,guild_id TEXT,owner_user_id TEXT,name TEXT,status TEXT,character_json TEXT); CREATE TABLE campaigns(guild_id TEXT,gm_role_id TEXT);');db.close();
 const env={VK2_NATIVE:'1',VK2_NATIVE_DIR:directory,VK2_LEGACY_DB:legacyDb,VK2_ALLOWED_GUILD_ID:gid,DISCORD_TOKEN:'synthetic-test-token'},clients=[];
 const options={env,createClient:()=>{const client=Object.assign(new EventEmitter(),{user:{id:'test-bot'},guilds:{fetch:async()=>{throw new Error('No live requests in this fixture');}},login:async()=>{log.push('login');},destroy:async()=>{log.push('destroy');}});clients.push(client);return client;},onError:()=>{}};
 t.after(()=>{assert.ok(resolve(base).startsWith(resolve(tmpdir())+sep));rmSync(base,{recursive:true,force:true});});return {base,legacyDb,directory,gid,env,options,log,clients};
}
const identity=gid=>({id:'pending',campaignId:gid,sceneId:'scene',actorId:'pc',ownerUserId:'u',sourceRef:'saved-source',sourceRevision:'1',kind:'hope_cost'});

test('explicit native resume reopens real stores and preserves pending state without inventing a healthy actor',async t=>{
 const f=fixture(t),first=await startNative(f.options),runId=first.runId;first.root.actionStore.create(identity(f.gid),{check:()=>{}});const pending=first.root.actionStore.read(f.gid,'pending');await first.close();
 const next=await startNative({...f.options,env:{...f.env,VK2_RESUME:'1'}});try{assert.equal(next.runId,runId);assert.deepEqual(next.root.actionStore.read(f.gid,'pending'),pending);assert.equal(next.root.actionStore.readHope(f.gid,'pc'),null);assert.throws(()=>next.root.readOwnerRoute(f.gid,'pc'),/Verified owner private/);}finally{await next.close();}assert.deepEqual(f.log,['login','destroy','login','destroy']);
});
test('a live runtime keeps the directory exclusively claimed across manifest commits',async t=>{
 const f=fixture(t),first=await startNative(f.options);try{await assert.rejects(startNative({...f.options,env:{...f.env,VK2_RESUME:'1'}}),/locked/);assert.equal(f.clients.length,1);assert.equal(f.log.filter(x=>x==='login').length,1);}finally{await first.close();}const next=await startNative({...f.options,env:{...f.env,VK2_RESUME:'1'}});await next.close();
});
test('changed source, guild and manifest version are held before another client or root is created',async t=>{
 for(const change of ['source','guild','version']){const f=fixture(t),app=await startNative(f.options);app.root.actionStore.create(identity(f.gid),{check:()=>{}});await app.close();let env={...f.env,VK2_RESUME:'1'};
  if(change==='source'){const db=new DatabaseSync(f.legacyDb);db.exec('CREATE TABLE changed_source(id TEXT)');db.close();}else if(change==='guild')env.VK2_ALLOWED_GUILD_ID='1467249344947159292';else{const db=new DatabaseSync(join(f.directory,'runtime.sqlite')),row=db.prepare("SELECT data FROM vk2_runtime_manifest WHERE id='runtime'").get(),manifest=JSON.parse(row.data);manifest.format='unsupported-future-version';db.prepare("UPDATE vk2_runtime_manifest SET data=? WHERE id='runtime'").run(JSON.stringify(manifest));db.close();}
  await assert.rejects(startNative({...f.options,env}),/manifest source, guild or version mismatch/);assert.equal(f.clients.length,1);
 }
});
test('missing native state is not replaced with a new empty database on resume',async t=>{
 const f=fixture(t),app=await startNative(f.options);app.root.actionStore.create(identity(f.gid),{check:()=>{}});await app.close();const file=join(f.directory,'actions.sqlite');assert.ok(resolve(file).startsWith(resolve(f.base)+sep));unlinkSync(file);await assert.rejects(startNative({...f.options,env:{...f.env,VK2_RESUME:'1'}}),/store identity\/schema changed/);assert.equal(existsSync(file),false);assert.equal(f.clients.length,1);
});
test('unknown files, unexpected schema and historical unmarked directories require migration review',async t=>{
 for(const change of ['file','schema']){const f=fixture(t),app=await startNative(f.options);await app.close();if(change==='file')writeFileSync(join(f.directory,'unmapped.sqlite'),'unmapped fixture');else{const db=new DatabaseSync(join(f.directory,'actions.sqlite'));db.exec('CREATE TABLE extra_state(id TEXT)');db.close();}await assert.rejects(startNative({...f.options,env:{...f.env,VK2_RESUME:'1'}}),/requires review|explicit migration/);assert.equal(f.clients.length,1);}
 const f=fixture(t);const {mkdirSync}=await import('node:fs');mkdirSync(f.directory);writeFileSync(join(f.directory,'scenes.sqlite'),'old-unmarked-fixture');await assert.rejects(startNative({...f.options,env:{...f.env,VK2_RESUME:'1'}}),/reviewed manifest adoption/);assert.equal(existsSync(join(f.directory,'runtime.sqlite')),false);assert.equal(f.clients.length,0);
});
test('failed inference initialization releases the lock and can retry only with explicit resume',async t=>{
 const f=fixture(t);await assert.rejects(startNative({...f.options,env:{...f.env,VK2_INFERENCE:'1'},createProvider:async()=>{throw new Error('provider unavailable');}}),/provider unavailable/);assert.equal(f.clients.length,0);await assert.rejects(startNative(f.options),/VK2_RESUME=1/);const next=await startNative({...f.options,env:{...f.env,VK2_RESUME:'1'}});await next.close();assert.equal(f.clients.length,1);
});
test('an abrupt owned-process exit releases the OS lock and retains committed pending records',async t=>{
 const f=fixture(t),runtimeUrl=pathToFileURL(resolve('bot/src/v2/runtime-directory.js')).href,actionUrl=pathToFileURL(resolve('bot/src/v2/rules/action-store.js')).href;
 const script=`import {prepareRuntimeDirectory} from ${JSON.stringify(runtimeUrl)};import {openActionStore} from ${JSON.stringify(actionUrl)};const runtime=prepareRuntimeDirectory(${JSON.stringify({directory:f.directory,legacyDb:f.legacyDb,guildId:f.gid})});const actions=openActionStore(${JSON.stringify(join(f.directory,'actions.sqlite'))});actions.create(${JSON.stringify(identity(f.gid))},{check(){}});runtime.seal();process.stdout.write(runtime.runId+'\\n');process.stdin.resume();`;
 const child=spawn(process.execPath,['--input-type=module','-e',script],{stdio:['pipe','pipe','pipe'],windowsHide:true});t.after(()=>{if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');});let stderr='';child.stderr.on('data',c=>{stderr+=c;});
 const runId=await new Promise((resolveReady,reject)=>{const timer=setTimeout(()=>reject(new Error('child startup timeout '+stderr)),15000);child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',()=>{clearTimeout(timer);reject(new Error('child exited before ready '+stderr));});child.stdout.once('data',data=>{clearTimeout(timer);resolveReady(String(data).trim());});});
 assert.throws(()=>prepareRuntimeDirectory({directory:f.directory,legacyDb:f.legacyDb,guildId:f.gid,resume:true}),/locked/);const exited=once(child,'exit');child.kill('SIGKILL');await exited;
 const runtime=prepareRuntimeDirectory({directory:f.directory,legacyDb:f.legacyDb,guildId:f.gid,resume:true});try{assert.equal(runtime.runId,runId);const db=new DatabaseSync(join(f.directory,'actions.sqlite'),{readOnly:true});try{const row=JSON.parse(db.prepare("SELECT data FROM vk3_actions WHERE campaign=? AND id='pending'").get(f.gid).data);assert.equal(row.status,'pending');assert.equal(row.effectsCommitted,false);}finally{db.close();}}finally{runtime.close();}
});


test('whole-host resume preserves issued owner proofs, exact native consent and one committed expense',async t=>{
 const f=fixture(t),db=new DatabaseSync(f.legacyDb),data={level:2,resources:{hp:{current:0,max:6},armor:{current:3,max:3},stress:{current:0,max:6},hope:3,hope_max:6}},character={id:'pc',guild_id:f.gid,owner_user_id:'u',name:'Fixture PC',status:'active',character_json:JSON.stringify(data)};
 db.prepare('INSERT INTO characters VALUES(?,?,?,?,?,?)').run(character.id,character.guild_id,character.owner_user_id,character.name,character.status,character.character_json);db.close();
 const first=await startNative(f.options),root=first.root,check=()=>{};root.sceneStore.commitSnapshot({campaignId:f.gid,principal:'fixture-gm',sourceRef:'setup',records:[{kind:'session',data:{id:'session',campaignId:f.gid,status:'active'}},{kind:'scene',data:{id:'scene',campaignId:f.gid,sessionId:'session',status:'active',participants:[{userId:'u',actorId:'pc',presence:'present'}]}},{kind:'actor',data:{id:'pc',campaignId:f.gid,sceneId:'scene',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'}},{kind:'channel',data:{id:'private',campaignId:f.gid,sceneId:'scene',kind:'private',permissionsVerified:true,ownerUserId:'u',recipientIds:['u'],writerIds:['u']}},...['attempt','choice'].map(id=>({kind:'message',data:{id,campaignId:f.gid,channelId:'private',userId:'u',deleted:false,text:'Native fixture '+id}}))].map(r=>({...r,expectedRevision:null}))},{check});
 root.actionStore.initializeHope({campaignId:f.gid,actorId:'pc',ownerUserId:'u',hope:3,cap:6},{check});root.actionStore.initializePcDefenses({campaignId:f.gid,actorId:'pc',ownerUserId:'u',controlRevision:'1',hp:{current:0,max:6},armorSlots:{current:3,max:3}},{check});root.actionStore.initializePcLife({campaignId:f.gid,actorId:'pc',ownerUserId:'u',controlRevision:'1',sourceRef:'reviewed-fixture-profile',sourceRevision:'1',level:2,stress:{current:0,max:6}},{check});
 function adapters(root){const repository=openLegacyReadOnlyRepository(f.legacyDb),registry=openSourceRegistry(join(f.directory,'sources.sqlite')),canonical=createCanonicalActorReaders({sceneStore:root.sceneStore,actionStore:root.actionStore,characterRepository:repository}),sourceAuthority=createSourceAuthority({...canonical.readers,sourceRegistry:registry});return {sourceAuthority,readActor:canonical.readActor,close(){repository.close();registry.close();}};}
 let a=adapters(root);const source=a.sourceAuthority.authenticate({campaignId:f.gid,messageId:'attempt',userId:'u',actorId:'pc'}),choice=a.sourceAuthority.authenticate({campaignId:f.gid,messageId:'choice',userId:'u',actorId:'pc'}),id={...identity(f.gid),sourceRef:source.id,sourceRevision:source.revision};
 root.actionStore.create(id,{check});root.actionStore.registerHopeTerms({...id,revision:'1',controlRevision:'1',cost:{resource:'hope',slot:'base',amount:2}},{check});root.actionStore.transition({campaignId:f.gid,actionId:id.id,expectedRevision:1,sourceRef:'notice-fixture',to:'awaiting_consent'},{check});
 const ingress=createHopeConsentIngress({...a,actionStore:root.actionStore,readDecision:()=>({sourceRef:choice.id,sourceRevision:choice.revision,principal:'u',campaignId:f.gid,sceneId:'scene',actionRef:id.id,termsRevision:'1',actorId:'pc',amount:2,costSlot:'base',decision:'accept'})}),consent=ingress.record(choice,id.id),proposal={source_ref:choice.id,actor_ref:'pc',action:{kind:'hope_cost.commit',parameters:{action_ref:id.id,consent_ref:consent.id}}};
 const receipt=createNativeActionAuthority({...a,actionStore:root.actionStore}).propose(choice,proposal);assert.equal(root.actionStore.readHope(f.gid,'pc').hope,1);a.close();await first.close();
 const second=await startNative({...f.options,env:{...f.env,VK2_RESUME:'1'}});a=adapters(second.root);try{const native=createNativeActionAuthority({...a,actionStore:second.root.actionStore});assert.deepEqual(a.sourceAuthority.inspectReference(source.id,source.revision),source);assert.deepEqual(a.sourceAuthority.inspectReference(choice.id,choice.revision),choice);assert.deepEqual(second.root.actionStore.readConsent(f.gid,consent.id),consent);assert.deepEqual(native.propose(choice,proposal),receipt);assert.equal(second.root.actionStore.readHope(f.gid,'pc').hope,1);assert.equal(second.root.actionStore.readHope(f.gid,'pc').revision,2);}finally{a.close();await second.close();}
});
