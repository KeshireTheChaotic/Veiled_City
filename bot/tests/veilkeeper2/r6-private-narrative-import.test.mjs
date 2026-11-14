import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openPrivateHookStore} from '../../src/v2/private-hook-store.js';
import {createCharacterPackageService} from '../../src/v2/character-package-service.js';

const digest=v=>createHash('sha256').update(v).digest('hex');
const narrative=()=>({attachmentId:'attachment',sourceFilename:'Mara.md',text:'A private, unverified memory.\n',sha256:digest('original attachment bytes')});
const packet=()=>({schema:'veiled-city-gm-hooks-import-v3.3.3',hooks:[{key:'contact',premise:'A former friend watches the docks.'}],canon_suggestions:[{key:'origin',value:'An unverified origin',visibility:'public'}]});
function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'vk2-narrative-')),path=join(dir,'private.sqlite');let store=openPrivateHookStore(path);
 t.after(()=>{store?.close();rmSync(dir,{recursive:true,force:true});});
 const proof={campaign:'campaign',principal:'gm',role:'human_gm',sourceRef:'command-1',revision:'1'};let reads=0,onRead=()=>{};
 const service=createCharacterPackageService({authenticate:()=>{onRead(++reads);return {...proof};},readCharacter:()=>({id:'pc',guild_id:'campaign',owner_user_id:'owner',name:'Mara',data:{}}),readRevision:()=>'sheet-1',repository:store,hookStore:store});
 return {path,proof,service,get store(){return store;},import:doc=>service.importHooks({}, {characterId:'pc',payload:packet(),narrative:doc}),reopen(){store.close();store=null;store=openPrivateHookStore(path);},revokeAt(n){onRead=count=>{if(count===n)proof.role='owner';};}};
}

test('hooks, pending suggestions and private narrative survive cold reopen and exact replay',t=>{
 const f=fixture(t),doc=narrative(),receipt=f.import(doc);assert.equal(receipt.narrativeRevision,1);assert.deepEqual(f.import(doc),receipt);
 doc.text='Mutated caller copy';f.reopen();const saved=f.store.readNarrative('campaign','pc');
 assert.equal(saved.text,narrative().text);assert.equal(saved.visibility,'gm');assert.equal(saved.sourceRef,'command-1');assert.equal(saved.importedBy,'gm');
 for(const key of ['executionAuthority','publicationAuthority','canonAuthority'])assert.equal(saved[key],false);
 assert.equal(f.store.narrativeHistory('campaign','pc').length,1);assert.equal(f.store.history('campaign','pc','contact').length,1);
 assert.equal(f.store.proposals('campaign','pc')[0].status,'pending');assert.equal(f.store.currentCanon('campaign','origin'),null);
 assert.equal(f.store.readNarrative('other','pc'),null);assert.equal(f.store.readNarrative('campaign','other'),null);
 assert.equal(f.store.readPlanningRecord('campaign','attachment'),null);
});

test('changed narrative conflicts on the same source; a new source keeps immutable history',t=>{
 const f=fixture(t);f.import(narrative());const changed={...narrative(),text:'A correction remains private.\n',sha256:digest('changed bytes')};
 assert.throws(()=>f.import(changed),/replay conflict/);assert.equal(f.store.readNarrative('campaign','pc').revision,1);
 f.proof.sourceRef='command-2';f.import(changed);assert.deepEqual(f.store.narrativeHistory('campaign','pc').map(r=>r.text),[narrative().text,changed.text]);
 f.proof.sourceRef='command-1';assert.equal(f.import(narrative()).narrativeRevision,1);assert.equal(f.store.readNarrative('campaign','pc').revision,2);
});

test('final authority revocation rolls back narrative, hooks, suggestions and import receipt together',t=>{
 const f=fixture(t);f.revokeAt(5);assert.throws(()=>f.import(narrative()),/authority/);
 assert.equal(f.store.readNarrative('campaign','pc'),null);assert.deepEqual(f.store.history('campaign','pc','contact'),[]);
 assert.deepEqual(f.store.proposals('campaign','pc'),[]);assert.equal(f.store.receipt('campaign','command-1'),null);
});

test('imports without narrative preserve the current narrative and malformed documents make no writes',t=>{
 const f=fixture(t);f.import(narrative());f.proof.sourceRef='command-2';assert.equal(f.import(null).narrativeRevision,null);assert.equal(f.store.readNarrative('campaign','pc').revision,1);
 const invalid=[{...narrative(),text:' '},{...narrative(),text:'é'.repeat(65537)},{...narrative(),sha256:'bad'},{...narrative(),sourceFilename:'x.json'},{...narrative(),attachmentId:''},{...narrative(),visibility:'public'}];
 for(const [i,doc] of invalid.entries()){f.proof.sourceRef=`invalid-${i}`;assert.throws(()=>f.import(doc),/private narrative/);assert.equal(f.store.receipt('campaign',f.proof.sourceRef),null);}
 assert.equal(f.store.narrativeHistory('campaign','pc').length,1);assert.equal(f.store.history('campaign','pc','contact').length,2);
});

test('older private store schema is held before any schema or data mutation',t=>{
 const f=fixture(t),db=new DatabaseSync(f.path);db.exec('DROP TABLE vk2_private_narratives');db.close();
 const before=digest(readFileSync(f.path));assert.throws(()=>openPrivateHookStore(f.path),/reviewed migration/);assert.equal(digest(readFileSync(f.path)),before);
 const check=new DatabaseSync(f.path,{readOnly:true});try{assert.equal(check.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table'").get().n,9);}finally{check.close();}
});
