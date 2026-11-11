import test from 'node:test';
import assert from 'node:assert/strict';
import {openCostPromptStore} from '../../src/v2/cost-prompt-store.js';
const terms={campaignId:'c',sceneId:'s',channelId:'ch',ownerUserId:'u',actorId:'pc',actionRef:'a',termsRevision:'1',costSlot:'base',amount:2,expiresAt:2000},check=()=>{};
test('opaque server tokens stay inactive until exact delivery and can be revoked',()=>{const s=openCostPromptStore(':memory:',{clock:()=>1000});try{const p=s.issue(terms,{check});assert.notEqual(p.acceptToken,p.rejectToken);assert.ok(p.acceptToken.length<=100);assert.equal(s.readPrompt(p.acceptToken).status,'awaiting_delivery');s.acknowledge(p.id,'message',{check});assert.equal(s.readPrompt(p.acceptToken).decision,'accept');assert.equal(s.readPrompt(p.rejectToken).decision,'reject');assert.throws(()=>s.acknowledge(p.id,'other',{check}),/conflict/);s.revoke(p.id,{check});assert.equal(s.readPrompt(p.acceptToken).status,'revoked');}finally{s.close();}});
test('expired tokens and forged lookup cannot qualify owner decisions',()=>{let now=1000;const s=openCostPromptStore(':memory:',{clock:()=>now});try{const p=s.issue(terms,{check});s.acknowledge(p.id,'message',{check});now=2001;assert.equal(s.readPrompt(p.acceptToken).status,'expired');assert.equal(s.readPrompt('forged'),null);assert.throws(()=>s.acknowledge(p.id,'message',{check}));}finally{s.close();}});
test('final delivery authorization failure preserves inactive prompt',()=>{const s=openCostPromptStore(':memory:',{clock:()=>1000});try{const p=s.issue(terms,{check});let n=0;assert.throws(()=>s.acknowledge(p.id,'message',{check:()=>{if(++n===2)throw new Error('revoked');}}));assert.equal(s.readPrompt(p.acceptToken).status,'awaiting_delivery');}finally{s.close();}});


test('repeated ensured controls reuse one native identity and old unbound controls require reconciliation',()=>{
  const s=openCostPromptStore(':memory:',{clock:()=>1000});try{const input={...terms,sourceRef:'source',sourceRevision:'1'},first=s.ensure(input,{check});assert.equal(s.ensure({...input,expiresAt:2500},{check}).id,first.id);assert.throws(()=>s.ensure({...input,channelId:'other'},{check}),/reconciliation/);}finally{s.close();}
  const old=openCostPromptStore(':memory:',{clock:()=>1000});try{old.issue(terms,{check});assert.throws(()=>old.ensure({...terms,sourceRef:'source',sourceRevision:'1'},{check}),/reconciliation/);}finally{old.close();}
});
