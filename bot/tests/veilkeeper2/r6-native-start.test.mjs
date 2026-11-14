import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {startNative} from '../../src/v2/native-start.js';
function setup(t){const base=mkdtempSync(join(tmpdir(),'vk3-start-')),log=[];t.after(()=>{assert.ok(resolve(base).startsWith(resolve(tmpdir())+sep));rmSync(base,{recursive:true,force:true});});
  const env={VK2_NATIVE:'1',VK2_NATIVE_DIR:join(base,'native'),VK2_GUILD_LEASE_DIR:join(base,'guild-leases'),VK2_LEGACY_DB:join(base,'legacy.sqlite'),DISCORD_TOKEN:'token',VK2_ALLOWED_GUILD_ID:'1467249344947159291'};
  writeFileSync(env.VK2_LEGACY_DB,'native-start-fixture-source');
  const repository={close:()=>log.push('repo-close')},client={login:async tk=>log.push(`login:${tk}`),destroy:async()=>log.push('client-destroy')};
  return {base,env,log,options:{env,createClient:()=>client,openRepository:f=>{log.push(`open:${f===env.VK2_LEGACY_DB}`);return repository;},createRoot:o=>{log.push(`root:${o.characterRepository===repository}`);return {close:()=>log.push('root-close')};},onError:()=>{}}};}
test('native start requires explicit opt-in and complete configuration',async t=>{
  const s=setup(t);await assert.rejects(startNative({...s.options,env:{...s.env,VK2_NATIVE:undefined}}),/VK2_NATIVE=1/);await assert.rejects(startNative({...s.options,env:{...s.env,DISCORD_TOKEN:''}}),/required/);assert.deepEqual(s.log,[]);assert.equal(existsSync(s.env.VK2_NATIVE_DIR),false);
});
test('automatic private Director cadence is separately opt-in and its flag is passed to native composition',async t=>{
 for(const enabled of [false,true]){const f=setup(t);let received;const app=await startNative({...f.options,env:{...f.env,...(enabled?{VK2_DIRECTOR:'1'}:{})},createRoot:o=>{received=o.directorEnabled;return {close(){}};}});await app.close();assert.equal(received,enabled);}
});
test('native start refuses an existing store directory with content',async t=>{
  const s=setup(t);await startNative(s.options).then(a=>a.close());writeFileSync(join(s.env.VK2_NATIVE_DIR,'scenes.sqlite'),'x');s.log.length=0;await assert.rejects(startNative(s.options),/new or empty directory/);assert.deepEqual(s.log,[]);
});
test('native start composes read-only repository, root and login, then closes in reverse order once',async t=>{
  const s=setup(t),app=await startNative(s.options);assert.deepEqual(s.log,['open:true','root:true','login:token']);await app.close();await app.close();assert.deepEqual(s.log.slice(3),['root-close','repo-close','client-destroy']);
});
test('a failed login closes everything it opened',async t=>{
  const s=setup(t),failing={...s.options,createClient:()=>({login:async()=>{throw new Error('bad token');},destroy:async()=>s.log.push('client-destroy')})};await assert.rejects(startNative(failing),/bad token/);assert.deepEqual(s.log,['open:true','root:true','root-close','repo-close','client-destroy']);
});
test('inference is a second opt-in and receives only the environment, never defaults',async t=>{
  const s=setup(t);let seen=0,passed;const options={...s.options,createRoot:o=>{passed=o.provider;return {close(){}};},createProvider:async env=>{seen++;assert.equal(env.VK2_INFERENCE,'1');return {generate:async()=>({})};}};
  await startNative(options).then(a=>a.close());assert.equal(seen,0);assert.equal(passed,null);
  const b=setup(t);const on={...options,env:{...b.env,VK2_INFERENCE:'1'},createClient:b.options.createClient,openRepository:b.options.openRepository};await startNative(on).then(a=>a.close());assert.equal(seen,1);assert.equal(typeof passed.generate,'function');
});
test('the real provider factory refuses missing keys, models and unbounded budgets',async()=>{
  const {createOpenAIProviderFromEnv}=await import('../../src/v2/native-start.js');
  await assert.rejects(createOpenAIProviderFromEnv({}),/OPENAI_API_KEY and VK2_MODEL/);await assert.rejects(createOpenAIProviderFromEnv({OPENAI_API_KEY:'k',VK2_MODEL:'m',VK2_MAX_TURNS:'500'}),/VK2_MAX_TURNS/);await assert.rejects(createOpenAIProviderFromEnv({OPENAI_API_KEY:'k',VK2_MODEL:'m',VK2_MAX_TURNS:'0'}),/VK2_MAX_TURNS/);
});
test('only the named guild is served and a legacy env file is loaded by path without being read here',async t=>{
  const s=setup(t),seen=[];await assert.rejects(startNative({...s.options,env:{...s.env,VK2_ALLOWED_GUILD_ID:undefined}}),/VK2_ALLOWED_GUILD_ID/);await assert.rejects(startNative({...s.options,env:{...s.env,VK2_ALLOWED_GUILD_ID:'not-a-guild'}}),/VK2_ALLOWED_GUILD_ID/);
  const env={...s.env,VK2_ENV_FILE:'D:/legacy/.env',DISCORD_TOKEN:undefined};let passed;const options={...s.options,env,loadEnvFile:file=>{seen.push(file);env.DISCORD_TOKEN='from-file';},createRoot:o=>{passed=o;return {close(){}};},createClient:()=>({login:async tk=>seen.push(`login:${tk===('from-file')}`),destroy:async()=>{}})};
  await startNative(options).then(a=>a.close());assert.deepEqual(seen,['D:/legacy/.env','login:true']);assert.deepEqual([...passed.allowedGuildIds],['1467249344947159291']);
});
test('ChatGPT mode needs a model but no API key, and keeps the call budget',async()=>{
  const {createOpenAIProviderFromEnv}=await import('../../src/v2/native-start.js');
  await assert.rejects(createOpenAIProviderFromEnv({AI_AUTH_MODE:'chatgpt'}),/VK2_MODEL or OPENAI_GM_MODEL/);
  const p=await createOpenAIProviderFromEnv({AI_AUTH_MODE:'chatgpt',OPENAI_GM_MODEL:'model-x',VK2_MAX_TURNS:'2'});assert.equal(typeof p.generate,'function');assert.equal(p.remaining,2);
  await assert.rejects(createOpenAIProviderFromEnv({AI_AUTH_MODE:'api_key',VK2_MODEL:'m'}),/OPENAI_API_KEY/);
});
test('explicit GM configuration comes only from opt-in variables and is passed to the root',async t=>{
  const {gmPolicyFromEnv}=await import('../../src/v2/native-start.js');
  assert.deepEqual(gmPolicyFromEnv({}),{gmRoleId:null,gmUserIds:[],allowAdministrators:false});assert.deepEqual(gmPolicyFromEnv({VK2_GM_ROLE_ID:'12345',VK2_GM_USER_IDS:' 111111, 222222 ',VK2_GM_ALLOW_ADMINISTRATORS:'1'}),{gmRoleId:'12345',gmUserIds:['111111','222222'],allowAdministrators:true});
  assert.equal(gmPolicyFromEnv({VK2_GM_ALLOW_ADMINISTRATORS:'true'}).allowAdministrators,false);for(const bad of [{VK2_GM_ROLE_ID:'abc'},{VK2_GM_USER_IDS:'1,x'}])assert.throws(()=>gmPolicyFromEnv(bad),/Discord ids/);
  const s=setup(t);let passed;await startNative({...s.options,env:{...s.env,VK2_GM_ALLOW_ADMINISTRATORS:'1'},createRoot:o=>{passed=o;return {close(){}};}}).then(a=>a.close());assert.deepEqual(passed.gmPolicy,{gmRoleId:null,gmUserIds:[],allowAdministrators:true});
});
