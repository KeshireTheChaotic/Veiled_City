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
