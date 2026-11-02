import test from 'node:test';
import assert from 'node:assert/strict';
import {openPrivateHookStore} from '../../src/v2/private-hook-store.js';
import {createCharacterPackageService} from '../../src/v2/character-package-service.js';
function fixture(t){
  const store=openPrivateHookStore();t.after(()=>store.close());
  const proof={principal:'gm',campaign:'c',role:'human_gm',sourceRef:'import',revision:'1'},state={calls:0,onAuth:()=>{}};
  const service=createCharacterPackageService({authenticate:()=>{state.onAuth(++state.calls);return {...proof};},readCharacter:()=>({id:'pc',guild_id:'c',owner_user_id:'owner',name:'Mara',data:{}}),readRevision:()=>'1',repository:store,hookStore:store});
  function suggest(value,source='import'){proof.sourceRef=source;service.importHooks({}, {characterId:'pc',payload:{schema:'veiled-city-gm-hooks-v3.3.3',canon_suggestions:[{key:'tower.origin',value,visibility:'gm'}]}});return store.proposals('c','pc').find(p=>p.proposed_value===value).id;}
  function review(proposalId,patch={},source='review'){proof.sourceRef=source;return service.reviewCanon({}, {characterId:'pc',proposalId,resolution:'accept',visibility:'gm',expectedRevision:null,...patch});}
  return {store,proof,state,service,suggest,review};
}
test('only a separate human-GM command can accept an imported proposal; approval grants no delivery',t=>{
  const f=fixture(t),id=f.suggest('Built by the old guild');assert.equal(f.store.currentCanon('c','tower.origin'),null);
  assert.throws(()=>f.review(id,{},'import'),/Separate human/);
  f.proof.role='owner';f.proof.principal='owner';assert.throws(()=>f.review(id),/authority/);
  f.proof.role='human_gm';f.proof.principal='gm';const receipt=f.review(id);
  assert.equal(receipt.status,'accepted');assert.equal(receipt.publicationAuthority,false);assert.equal(receipt.knowledgeAcknowledged,false);
  assert.equal(receipt.entry.provenance.import_source,'import');assert.equal(receipt.entry.provenance.reviewed_by,'gm');
  assert.equal(f.store.currentCanon('c','tower.origin').value,'Built by the old guild');assert.equal(f.store.proposals('c','pc')[0].status,'accepted');
});
test('conflicting value or broader visibility requires explicit replacement against the current revision',t=>{
  const f=fixture(t),first=f.suggest('Old guild');f.review(first);const second=f.suggest('New guild','import-2');
  const conflict=f.review(second,{expectedRevision:1},'review-2');assert.equal(conflict.status,'conflict');assert.equal(f.store.currentCanon('c','tower.origin').value,'Old guild');
  const accepted=f.review(second,{expectedRevision:1,replaceExisting:true,visibility:'party'},'review-3');assert.equal(accepted.status,'accepted');assert.equal(accepted.entry.revision,2);
  assert.equal(accepted.entry.supersedes_id,conflict.existing.id);assert.deepEqual(f.store.canonHistory('c','tower.origin').map(r=>r.value),['Old guild','New guild']);
  assert.equal(f.store.canonReview('c','review-2').status,'conflict');
});
test('stale review and altered replay cannot update canon; exact replay preserves original receipt',t=>{
  const f=fixture(t),a=f.suggest('First'),original=f.review(a);assert.deepEqual(f.review(a),original);
  assert.throws(()=>f.review(a,{note:'different'}),/replay conflict/);
  const b=f.suggest('Second','import-2');assert.throws(()=>f.review(b,{},'stale'),/revision conflict/);
  f.review(b,{expectedRevision:1,replaceExisting:true},'second-review');assert.deepEqual(f.review(a),original);
  assert.equal(f.store.currentCanon('c','tower.origin').revision,2);assert.equal(f.store.canonHistory('c','tower.origin').length,2);
});
test('reject and custom resolution preserve source proposal and synchronized review state',t=>{
  const f=fixture(t),a=f.suggest('Unverified');const rejected=f.review(a,{resolution:'reject'});assert.equal(rejected.status,'rejected');assert.equal(f.store.currentCanon('c','tower.origin'),null);
  const b=f.suggest('Another proposal','import-2');const custom=f.review(b,{resolution:'custom',customValue:'Reviewed mundane origin',note:'Scope narrowed'},'custom-review');
  assert.equal(custom.entry.value,'Reviewed mundane origin');const p=f.store.proposals('c','pc').find(p=>p.id===b);
  assert.equal(p.proposed_value,'Another proposal');assert.equal(p.resolution_value,'Reviewed mundane origin');assert.equal(p.resolution_note,'Scope narrowed');
  assert.throws(()=>f.review(b,{},'again'),/Pending/);
});
test('revoked authority at transaction completion rolls back ledger, proposal state and review receipt',t=>{
  const f=fixture(t),id=f.suggest('Origin');f.state.calls=0;f.state.onAuth=n=>{if(n===3)f.proof.role='owner';};
  assert.throws(()=>f.review(id),/authority/);assert.equal(f.store.currentCanon('c','tower.origin'),null);assert.equal(f.store.canonReview('c','review'),null);
  assert.equal(f.store.proposals('c','pc')[0].status,'pending');
});
test('closed review arguments and target campaign/character bindings reject forged escalation',t=>{
  const f=fixture(t),id=f.suggest('Origin');assert.throws(()=>f.review(id,{principal:'human_gm'}),/Closed/);
  f.proof.campaign='other';assert.throws(()=>f.review(id),/authority/);f.proof.campaign='c';
  assert.throws(()=>f.review('missing'),/Pending/);assert.throws(()=>f.review(id,{visibility:'everyone'}),/Explicit/);
  assert.throws(()=>f.review(id,{resolution:'custom',customValue:''}),/Explicit/);assert.equal(f.store.currentCanon('c','tower.origin'),null);
});
