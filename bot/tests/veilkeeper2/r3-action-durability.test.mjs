import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {openActionStore} from '../../src/v2/rules/action-store.js';
const input={campaignId:'c',actionId:'a',costRef:'cost',expectedActionRevision:3,expectedHopeRevision:1},cost={id:'cost',actionRef:'a',campaignId:'c',actorId:'pc',ownerUserId:'u',sourceRef:'m',sourceRevision:'1',status:'accepted',ownerConfirmed:true,amount:2},check=()=>{};
function database(t){const dir=mkdtempSync(join(tmpdir(),'vk3-atomic-'));t.after(()=>{assert.ok(resolve(dir).startsWith(resolve(tmpdir())));rmSync(dir,{recursive:true,force:true});});const path=join(dir,'actions.sqlite'),s=openActionStore(path);
  s.initializeHope({campaignId:'c',actorId:'pc',ownerUserId:'u',hope:3,cap:6},{check});s.create({id:'a',campaignId:'c',actorId:'pc',ownerUserId:'u',sceneId:'s',sourceRef:'m',sourceRevision:'1',kind:'hope_cost'},{check});s.transition({campaignId:'c',actionId:'a',expectedRevision:1,sourceRef:'window',to:'awaiting_consent'},{check});s.transition({campaignId:'c',actionId:'a',expectedRevision:2,sourceRef:'consent',to:'ready_to_commit'},{check});s.close();return path;
}
function worker(path){return new Promise((accept,reject)=>{const code="import {pathToFileURL} from 'node:url'; const {openActionStore}=await import(pathToFileURL(process.argv[1])); const s=openActionStore(process.argv[2]); try{const r=s.commitHopeCost(JSON.parse(process.argv[3]),{readCost:()=>JSON.parse(process.argv[4]),check:()=>{}});process.stdout.write(JSON.stringify(r));}finally{s.close();}";
  const child=spawn(process.execPath,['--input-type=module','-e',code,fileURLToPath(new URL('../../src/v2/rules/action-store.js',import.meta.url)),path,JSON.stringify(input),JSON.stringify(cost)],{stdio:['ignore','pipe','pipe'],windowsHide:true});let output='',errors='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>errors+=b);child.on('error',reject);child.on('close',exit=>exit===0?accept(JSON.parse(output)):reject(new Error(errors)));});}
test('two independent processes commit one durable outcome and reopening cannot spend again',async t=>{
  const path=database(t),[first,second]=await Promise.all([worker(path),worker(path)]);assert.deepEqual(second,first);
  const s=openActionStore(path);try{assert.equal(s.read('c','a').status,'resolved');assert.equal(s.read('c','a').revision,4);assert.equal(s.readHope('c','pc').hope,1);assert.equal(s.readHope('c','pc').revision,2);assert.deepEqual(s.commitHopeCost(input,{readCost:()=>cost,check}),first);}finally{s.close();}
});
test('rolled-back authorization failure remains unresolved after reopening',t=>{
  const path=database(t);let s=openActionStore(path);try{let n=0;assert.throws(()=>s.commitHopeCost(input,{readCost:()=>cost,check:()=>{if(++n===2)throw new Error('revoked');}}));}finally{s.close();}
  s=openActionStore(path);try{assert.equal(s.read('c','a').status,'ready_to_commit');assert.equal(s.readHope('c','pc').hope,3);assert.equal(s.readOutcome('c','a'),null);assert.equal(s.commitHopeCost(input,{readCost:()=>cost,check}).effectsCommitted,true);}finally{s.close();}
});
