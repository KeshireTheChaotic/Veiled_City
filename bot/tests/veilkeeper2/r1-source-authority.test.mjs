import test from 'node:test';
import assert from 'node:assert/strict';
import {createSourceAuthority} from '../../src/v2/source-authority.js';

function fixture(){
  const message={id:'m',campaignId:'c',userId:'u',channelId:'ch',revision:'1',deleted:false,text:'Interesting.'};
  const channel={id:'ch',campaignId:'c',sceneId:'scene',revision:'1',kind:'party',permissionsVerified:true,recipientIds:['u','v'],writerIds:['u','v']};
  const scene={id:'scene',campaignId:'c',sessionId:'session',status:'active',revision:'1',participants:[{userId:'u',actorId:'pc',presence:'present'}]};
  const session={id:'session',campaignId:'c',revision:'1',status:'active'};
  const actor={id:'pc',campaignId:'c',sceneId:'scene',status:'active',kind:'pc',ownerUserId:'u',controllerUserId:'u',controlRole:'owner',controlRevision:'1'};
  const authority=createSourceAuthority({readMessage:()=>message,readChannel:()=>channel,readScene:()=>scene,readSession:()=>session,readActor:()=>actor});
  const event={campaignId:'c',messageId:'m',userId:'u',actorId:'pc'};
  return {authority,event,message,channel,scene,session,actor};
}
test('uses native message text and exact recipient set, with stable immutable source identity',()=>{
  const f=fixture(),proof=f.authority.authenticate(f.event);
  assert.equal(proof.text,'Interesting.');assert.deepEqual(proof.recipients,['u','v']);
  assert.deepEqual(f.authority.authenticate(f.event),proof);
  proof.recipients.push('outsider');assert.equal(f.authority.revalidate(proof),false);
});
test('rejects spoofed users, extra authority properties, absent characters and cross-scene actors',()=>{
  for(const change of [f=>{f.event.userId='v';},f=>{f.event.role='gm';},f=>{f.scene.participants[0].presence='absent';},f=>{f.actor.sceneId='other';},f=>{f.actor.campaignId='other';}]){
    const f=fixture();change(f);assert.throws(()=>f.authority.authenticate(f.event),/authenticated scene source/);
  }
});
test('private channel must be verified and entitled solely to its owner',()=>{
  const f=fixture();f.channel.kind='private';f.channel.ownerUserId='u';
  assert.throws(()=>f.authority.authenticate(f.event));
  f.channel.recipientIds=['u'];const proof=f.authority.authenticate(f.event);assert.deepEqual(proof.recipients,['u']);
  f.channel.permissionsVerified=false;assert.equal(f.authority.revalidate(proof),false);
});
test('source revokes when recipient membership, message content, session or control changes',()=>{
  for(const change of [f=>f.channel.recipientIds.push('outsider'),f=>{f.message.text='Edited';},f=>{f.message.deleted=true;},f=>{f.session.status='ended';},f=>{f.actor.controlRevision='2';},f=>{f.scene.revision='2';}]){
    const f=fixture(),proof=f.authority.authenticate(f.event);change(f);assert.equal(f.authority.revalidate(proof),false);
  }
});
test('human-controlled NPC proxy requires explicit delegation and keeps proxy identity',()=>{
  const f=fixture();Object.assign(f.actor,{kind:'npc',controlRole:'proxy',ownerUserId:null});
  assert.throws(()=>f.authority.authenticate(f.event));
  Object.assign(f.actor,{proxyAuthorized:true,delegationRef:'delegation:1'});
  const proof=f.authority.authenticate(f.event);
  assert.equal(f.authority.inspectControl(proof).role,'proxy');
  f.actor.proxyAuthorized=false;assert.equal(f.authority.revalidate(proof),false);
});
test('missing reader records, ambiguous attendance and forged source proofs fail closed',()=>{
  const f=fixture();assert.equal(f.authority.revalidate({id:'forged'}),false);
  f.scene.participants.push({...f.scene.participants[0]});assert.throws(()=>f.authority.authenticate(f.event));
  assert.throws(()=>createSourceAuthority({}),/readers/);
});
test('native historical reference inspection rechecks issued source and revision',()=>{
  const f=fixture(),proof=f.authority.authenticate(f.event);assert.deepEqual(f.authority.inspectReference(proof.id,proof.revision),proof);
  assert.throws(()=>f.authority.inspectReference(proof.id,'other'));assert.throws(()=>f.authority.inspectReference('forged',proof.revision));f.message.text='Edited decision';assert.throws(()=>f.authority.inspectReference(proof.id,proof.revision));
});
