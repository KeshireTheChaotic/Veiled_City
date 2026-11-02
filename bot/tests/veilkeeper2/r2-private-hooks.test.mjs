import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {openPrivateHookStore} from '../../src/v2/private-hook-store.js';
import {createCharacterPackageService} from '../../src/v2/character-package-service.js';

const packet=()=>({schema:'veiled-city-gm-hooks-import-v3.3.3',hooks:[{key:'contact',premise:'A former friend watches the docks.',targets:[{type:'npc',key:'friend'}]}],canon_suggestions:[{key:'origin',value:'An unverified origin',visibility:'public'}]});
function fixture(t,path){
  const store=openPrivateHookStore(path);t.after(()=>store.close());
  const proof={campaign:'c',principal:'gm',role:'human_gm',sourceRef:'command-1',revision:'1'},character={id:'pc',guild_id:'c',owner_user_id:'owner',name:'Mara',data:{}};
  const state={reads:0,onRead:()=>{}};
  const service=createCharacterPackageService({authenticate:()=>{state.reads++;state.onRead(state.reads);return {...proof};},readCharacter:()=>character,readRevision:()=>'1',repository:store,hookStore:store});
  return {store,service,proof,state,character,import:payload=>service.importHooks({}, {characterId:'pc',payload})};
}
test('private hooks and pending canon survive reopening and identical command replay adds nothing',t=>{
  const dir=mkdtempSync(join(tmpdir(),'vk2-private-')),path=join(dir,'hooks.sqlite'),f=fixture(t,path);
  t.after(()=>{assert.ok(resolve(dir).startsWith(resolve(tmpdir())));rmSync(dir,{recursive:true,force:true});});
  const input=packet(),receipt=f.import(input);assert.deepEqual(f.import(input),receipt);
  const reopened=openPrivateHookStore(path);try{
    assert.equal(reopened.listCharacterGmHooks('c','pc').length,1);assert.equal(reopened.history('c','pc','contact').length,1);
    assert.equal(reopened.proposals('c','pc')[0].status,'pending');assert.equal(reopened.proposals('c','pc')[0].canon_authority,false);
    assert.equal(reopened.receipt('c','command-1').status,'imported_private');assert.equal(receipt.relationshipsApplied,0);
  }finally{reopened.close();}
});
test('altered command replay conflicts while a new authorized import keeps immutable prior versions',t=>{
  const f=fixture(t),p=packet();f.import(p);p.hooks[0].premise='A corrected private seed';
  assert.throws(()=>f.import(p),/replay conflict/);assert.equal(f.store.history('c','pc','contact').length,1);
  f.proof.sourceRef='command-2';p.hooks[0].status='resolved';f.import(p);
  assert.deepEqual(f.store.listCharacterGmHooks('c','pc'),[]);assert.equal(f.store.history('c','pc','contact').length,2);
  assert.equal(f.store.history('c','pc','contact')[0].premise,'A former friend watches the docks.');
  f.proof.sourceRef='command-1';f.import(packet());assert.deepEqual(f.store.listCharacterGmHooks('c','pc'),[]);
});
test('bad final canon suggestion rolls back hooks, proposals and receipt together',t=>{
  const f=fixture(t),p=packet();p.canon_suggestions.push({key:'bad',value:''});
  assert.throws(()=>f.import(p),/requires key and value/);assert.deepEqual(f.store.listCharacterGmHooks('c','pc'),[]);
  assert.deepEqual(f.store.proposals('c','pc'),[]);assert.equal(f.store.receipt('c','command-1'),null);
});
test('role revocation at final transaction check rolls back every private write',t=>{
  const f=fixture(t);f.state.onRead=n=>{if(n===5)f.proof.role='owner';};
  assert.throws(()=>f.import(packet()),/authority/);assert.equal(f.state.reads,5);
  assert.equal(f.store.receipt('c','command-1'),null);assert.deepEqual(f.store.history('c','pc','contact'),[]);
});
test('players cannot import private hooks and canon suggestions are excluded from default seed reads',t=>{
  const f=fixture(t);f.proof.role='owner';f.proof.principal='owner';assert.throws(()=>f.import(packet()),/authority/);
  f.proof.role='human_gm';const p=packet();p.hooks.push({key:'canon-extra',type:'canon_suggestion',premise:'A speculative secret'});f.import(p);
  assert.equal(f.store.listCharacterGmHooks('c','pc').length,1);assert.equal(f.store.listCharacterGmHooks('c','pc',{includeCanonSuggestions:true}).length,2);
  assert.deepEqual(f.store.listCharacterGmHooks('other','pc'),[]);assert.deepEqual(f.store.listCharacterGmHooks('c','other'),[]);
  const exported=f.service.exportPackage({}, {characterId:'pc',scope:'hooks'});assert.equal(exported.imported_gm_hooks.length,2);
});
test('colliding normalized keys abort rather than silently overwrite distinct imported hooks',t=>{
  const f=fixture(t),p=packet();p.hooks=[{key:'A B',premise:'First'},{key:'a-b',premise:'Second'}];
  assert.throws(()=>f.import(p),/Colliding/);assert.equal(f.store.receipt('c','command-1'),null);assert.deepEqual(f.store.history('c','pc','a-b'),[]);
});
