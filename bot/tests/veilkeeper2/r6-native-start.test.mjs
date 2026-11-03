import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {startNative} from '../../src/v2/native-start.js';
function setup(t){const base=mkdtempSync(join(tmpdir(),'vk3-start-')),log=[];t.after(()=>{assert.ok(resolve(base).startsWith(resolve(tmpdir())+sep));rmSync(base,{recursive:true,force:true});});
  const env={VK2_NATIVE:'1',VK2_NATIVE_DIR:join(base,'native'),VK2_LEGACY_DB:join(base,'legacy.sqlite'),DISCORD_TOKEN:'token'};
  const repository={close:()=>log.push('repo-close')},client={login:async tk=>log.push(`login:${tk}`),destroy:async()=>log.push('client-destroy')};
  return {base,env,log,options:{env,createClient:()=>client,openRepository:f=>{log.push(`open:${f===env.VK2_LEGACY_DB}`);return repository;},createRoot:o=>{log.push(`root:${o.characterRepository===repository}`);return {close:()=>log.push('root-close')};},onError:()=>{}}};}
test('native start requires explicit opt-in and complete configuration',async t=>{
  const s=setup(t);await assert.rejects(startNative({...s.options,env:{...s.env,VK2_NATIVE:undefined}}),/VK2_NATIVE=1/);await assert.rejects(startNative({...s.options,env:{...s.env,DISCORD_TOKEN:''}}),/required/);assert.deepEqual(s.log,[]);assert.equal(existsSync(s.env.VK2_NATIVE_DIR),false);
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
