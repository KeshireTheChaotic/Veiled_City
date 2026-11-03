import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {openTurnStore} from '../../src/v2/turn-store.js';
const source={campaignId:'c',sourceRef:'m',sourceRevision:'1'},draft={text:'Unreviewed draft',status:'awaiting_review',sent:false,knowledgeAcknowledged:false};
test('one durable claimant wins and restart preserves uncertainty without returning a lease',t=>{
  const dir=mkdtempSync(join(tmpdir(),'vk2-turn-')),path=join(dir,'turn.sqlite'),a=openTurnStore(path),b=openTurnStore(path);
  try{const claim=a.claim(source);assert.equal(claim.status,'claimed');const replay=b.claim(source);assert.equal(replay.status,'requires_reconciliation');assert.equal(Object.hasOwn(replay,'token'),false);assert.throws(()=>b.claim({...source,sourceRevision:'2'}),/revision conflict/);}finally{a.close();b.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())));rmSync(dir,{recursive:true,force:true});}
});
test('saved draft remains withheld and replay cannot overwrite it',()=>{
  const store=openTurnStore();try{const claim=store.claim(source);store.saveDraft(claim,draft,{check:()=>{}});assert.equal(store.claim(source).status,'awaiting_revalidation');assert.equal(store.inspectNative('c','m').data.draft.sent,false);
    store.saveDraft(claim,draft,{check:()=>{}});assert.throws(()=>store.saveDraft(claim,{...draft,text:'Changed'},{check:()=>{}}),/Immutable/);
  }finally{store.close();}
});
test('revoked final authorization rolls back the draft and forged lease fails',()=>{
  const store=openTurnStore();try{const claim=store.claim(source);let n=0;assert.throws(()=>store.saveDraft(claim,draft,{check:()=>{if(++n===2)throw new Error('revoked');}}),/revoked/);assert.equal(store.inspectNative('c','m').data,null);
    assert.throws(()=>store.saveDraft({...claim,token:'forged'},draft,{check:()=>{}}),/mismatch/);
  }finally{store.close();}
});
test('recentDrafts returns newest saved drafts for review within a bound and ignores unsaved claims',async()=>{
  const {openTurnStore}=await import('../../src/v2/turn-store.js'),s=openTurnStore(),save=ref=>{const c=s.claim({campaignId:'c',sourceRef:ref,sourceRevision:'1'});if(ref!=='open')s.saveDraft(c,{text:`draft ${ref}`,sent:false,knowledgeAcknowledged:false,status:'awaiting_review'},{check:()=>{}});};
  try{for(const ref of ['a','b','open','c'])save(ref);assert.deepEqual(s.recentDrafts('c',2).map(d=>d.source),['c','b']);assert.equal(s.recentDrafts('c').length,3);assert.deepEqual(s.recentDrafts('other'),[]);for(const bad of [0,21,1.5])assert.throws(()=>s.recentDrafts('c',bad),/bounded/);}finally{s.close();}
});
