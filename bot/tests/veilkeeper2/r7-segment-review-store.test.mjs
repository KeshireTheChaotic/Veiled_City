import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {openTurnStore} from '../../src/v2/turn-store.js';
import {createOfflinePublicationQueue} from '../../src/v2/publication-queue.js';
function fixture(t){
  const directory=mkdtempSync(join(tmpdir(),'vk2-review-store-')),path=join(directory,'turn.sqlite'),store=openTurnStore(path);
  t.after(()=>{store.close();assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep));rmSync(directory,{recursive:true,force:true});});
  const audience={campaign:'c',scene:'s',source_ref:'source',revision:'1',recipients:['u']},text='Rain taps the glass.\n\nYou agree to pay.';
  const queue=createOfflinePublicationQueue({gateway:{inspect:()=>({grant:{},text,traceId:'t'})},contextAuthority:{audience:()=>audience}}),id=queue.queue({}).id;
  const claim=store.claim({campaignId:'c',sourceRef:'source',sourceRevision:'1'}),draft={...queue.inspect(id),delivery:{channelId:'ch',mode:'party',messageId:'m'}};
  store.saveDraft(claim,draft,{check:()=>{}});
  return {store,path,claim,queue,id,review:queue.review(id),check:()=>{}};
}
test('restart preserves private review, original raw draft and no publication grant',t=>{
  const f=fixture(t),before=f.store.inspectNative('c','source').data.fingerprint;
  assert.deepEqual(f.store.saveReview(f.claim,f.review,{check:f.check}),{sequence:1,fingerprint:f.store.inspectNative('c','source').data.review.fingerprint,created:true});
  const cold=openTurnStore(f.path);try{
    const row=cold.inspectNative('c','source');assert.equal(row.status,'draft_saved');assert.equal(row.data.fingerprint,before);assert.deepEqual(row.data.review.value,f.review);assert.equal(row.data.review.value.sent,false);assert.equal(row.data.review.value.status,'requires_semantic_review');assert.match(row.data.draft.text,/You agree/);assert.doesNotMatch(row.data.review.value.candidateText,/You agree/);assert.equal(cold.claim({campaignId:'c',sourceRef:'source',sourceRevision:'1'}).status,'awaiting_revalidation');
  }finally{cold.close();}
});
test('identical review replay is idempotent and changed reviews use compare-and-swap with immutable history',t=>{
  const f=fixture(t);f.store.saveReview(f.claim,f.review,{check:f.check});assert.equal(f.store.saveReview(f.claim,f.review,{check:f.check}).created,false);
  const changed=f.queue.repair(f.id,f.review.segments[1].id,'The clerk offers an alternative.'),peer=openTurnStore(f.path);
  try{
    assert.throws(()=>peer.saveReview(f.claim,changed,{check:f.check,expectedSequence:0}),/sequence conflict/);
    assert.equal(peer.saveReview(f.claim,changed,{check:f.check,expectedSequence:1}).sequence,2);
    const row=f.store.inspectNative('c','source');assert.equal(row.data.review.value.heldCount,0);assert.deepEqual(row.data.reviewHistory[0].value,f.review);assert.equal(row.data.review.value.sent,false);
  }finally{peer.close();}
});
test('forged dispositions, source substitution and final authorization failure cannot overwrite reviews',t=>{
  const f=fixture(t);
  for(const review of [{...f.review,sent:true},{...f.review,candidateText:'You agree to pay.'},{...f.review,heldCount:0},{...f.review,id:'other'},{...f.review,segments:[]}])assert.throws(()=>f.store.saveReview(f.claim,review,{check:f.check}));
  assert.throws(()=>f.store.saveReview({...f.claim,token:'forged'},f.review,{check:f.check}),/source-bound/);
  let checks=0;assert.throws(()=>f.store.saveReview(f.claim,f.review,{check:()=>{if(++checks===2)throw new Error('source revoked');}}),/source revoked/);assert.equal(f.store.inspectNative('c','source').data.review,undefined);
  f.store.saveReview(f.claim,f.review,{check:f.check});const row=f.store.inspectNative('c','source');
  f.store.beginPublication('c','source',{approvedFingerprint:row.data.fingerprint,approval:{principal:'gm'},check:f.check});assert.throws(()=>f.store.saveReview(f.claim,f.review,{check:f.check}),/source-bound/);assert.equal(f.store.inspectNative('c','source').status,'publishing');
});
