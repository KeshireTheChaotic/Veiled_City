import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {openDeathPromptStore} from '../../src/v2/death-prompts.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fixture(t){let now=1000;const store=openDeathPromptStore(':memory:',{clock:()=>now});t.after(()=>store.close());const terms={purpose:'death_review',campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',controlRevision:'1',requestRef:'incoming-death:attack',level:2,hopeCap:6,allowedMoves:['risk_it_all','avoid_death','blaze_of_glory']},old=store.issue({terms,channelId:'private',expiresAt:2000},{check:()=>{}});store.acknowledge(old.id,{check:()=>{},readDelivery:()=>({status:'delivered',campaignId:'c',channelId:'private',messageId:'old-message',payloadHash:old.payloadHash,recipientIds:['u']})});now=3000;const approval={kind:'owner_requested_death_prompt_refresh',interactionId:'observed-command',promptRef:old.id,requestRef:terms.requestRef,campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',oldTermsHash:old.termsHash,termsHash:hash(terms),commandHash:'a'.repeat(64)},input={terms,channelId:'private',expiresAt:4000};return {store,old,approval,input};}
test('owner refresh is atomic under final native authorization failure and retains prior delivery',t=>{
  const f=fixture(t);let checks=0;assert.throws(()=>f.store.refresh(f.old.id,f.input,{check(){if(++checks===2)throw new Error('Owner authority revoked');},readApproval:()=>f.approval}),/revoked/);const old=f.store.read(f.old.id);assert.equal(old.status,'expired');assert.equal(old.messageId,'old-message');assert.equal(old.supersession,undefined);const next=f.store.ensure(f.input,{check:()=>{}});assert.equal(next.id,old.id);
});
test('same native owner supersession proof replays inertly and cannot be replaced by another proof',t=>{
  const f=fixture(t),options={check:()=>{},readApproval:()=>f.approval},next=f.store.refresh(f.old.id,f.input,options);assert.equal(f.store.refresh(f.old.id,f.input,options).id,next.id);assert.throws(()=>f.store.refresh(f.old.id,f.input,{...options,readApproval:()=>({...f.approval,interactionId:'other-command'})}),/supersession conflict/);assert.throws(()=>f.store.revoke(f.old.id,{check:()=>{}}));assert.equal(f.store.ensure(f.input,{check:()=>{}}).id,next.id);
});
