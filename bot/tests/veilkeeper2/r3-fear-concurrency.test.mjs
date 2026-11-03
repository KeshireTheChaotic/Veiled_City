import test from 'node:test';
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openRollStore} from '../../src/v2/rules/roll-store.js';
function database(t){
  const dir=mkdtempSync(join(tmpdir(),'vk2-fear-race-')),path=join(dir,'rolls.sqlite');
  t.after(()=>{assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep));rmSync(dir,{recursive:true,force:true});});
  const s=openRollStore(path),check=()=>{};
  try{s.createRequest({id:'q',campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',controlRevision:'1',noticeRef:'notice',stakes:'The guard hears.',difficulty:12,modifier:0,experience:0,advantage:0,disadvantage:0,sourceRef:'source',sourceRevision:'1'},{check});s.acknowledgeDelivery('c','q',{messageId:'message',recipientIds:['u']},{check});}finally{s.close();}
  return path;
}
function worker(path,operation){
  const child=fork(fileURLToPath(new URL('./fixtures/fear-race-worker.mjs',import.meta.url)),[path,operation],{execArgv:[],stdio:['ignore','ignore','pipe','ipc'],windowsHide:true});
  let readyResolve,readyReject,resultResolve,resultReject,exitResolve,exitReject,gotResult=false,stderr='';
  const ready=new Promise((a,b)=>{readyResolve=a;readyReject=b;}),result=new Promise((a,b)=>{resultResolve=a;resultReject=b;}),exit=new Promise((a,b)=>{exitResolve=a;exitReject=b;});
  // Attach rejection observers immediately; callers await all three below.
  for(const p of [ready,result,exit])p.catch(()=>{});
  child.stderr.on('data',b=>stderr+=b);
  child.on('message',m=>{if(m==='ready')readyResolve();else{gotResult=true;resultResolve(m);}});
  child.on('error',error=>{readyReject(error);resultReject(error);exitReject(error);});
  child.on('exit',code=>{if(code!==0||!gotResult){const e=new Error(`Worker ${operation} exited ${code}: ${stderr}`);readyReject(e);resultReject(e);exitReject(e);}else exitResolve();});
  return {ready,result,exit,run:()=>child.send('run'),kill:()=>{if(child.exitCode===null)child.kill();}};
}
for(const order of ['hold-first','roll-first','simultaneous'])test(`separate processes serialize Fear hold versus owner dice: ${order}`,{timeout:15000},async t=>{
  const path=database(t),hold=worker(path,'hold'),roll=worker(path,'roll');
  t.after(()=>{hold.kill();roll.kill();});await Promise.all([hold.ready,roll.ready]);
  if(order==='simultaneous'){hold.run();roll.run();}
  else{const first=order==='hold-first'?hold:roll,second=first===hold?roll:hold;first.run();await first.result;second.run();}
  const results=await Promise.all([hold.result,roll.result]);await Promise.all([hold.exit,roll.exit]);
  assert.equal(results.filter(r=>r.ok).length,1);if(order!=='simultaneous')assert.equal(results[order==='hold-first'?0:1].ok,true);
  const s=openRollStore(path);try{
    if(results[0].ok){assert.equal(s.readFearHold('c','q').status,'held');assert.equal(s.readResultForRequest('c','q'),null);assert.match(results[1].error,/interruption holds/);}
    else{assert.equal(s.readFearHold('c','q'),null);assert.equal(s.readResultForRequest('c','q').id,'dice');assert.match(results[0].error,/Unrolled/);}
  }finally{s.close();}
});
