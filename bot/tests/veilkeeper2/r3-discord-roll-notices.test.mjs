import test from 'node:test';
import assert from 'node:assert/strict';
import {ChannelType,PermissionsBitField,PermissionFlagsBits as P} from 'discord.js';
import {nativeSpellcastFixture} from './helpers/native-spellcast-fixture.mjs';
import {attachOwnerClear} from './helpers/condition-history-fixture.mjs';
import {createDiscordRollNotices,ownerRollNoticeContent} from '../../src/v2/discord-roll-notices.js';

function fixture(t){
  const f=nativeSpellcastFixture(t);f.decision.modifierRefs=f.modifiers.previewMandatoryRefs(f.source,f.decision,f.locator);f.adjudications.save(f.source,f.decision,{check:f.check,spellcast:f.locator});const request=f.prepare().commitRequest(f.source,'pc',{adjudication_ref:'spellcast'});
  const sent=[],messages=new Map(),members=new Map(['bot','historical-owner'].map(id=>[id,{id,permissions:new PermissionsBitField([]),roles:{cache:new Map()}}])),original={id:'new-attempt',guildId:'g',channelId:'private',author:{id:'historical-owner',bot:false},content:f.source.text,webhookId:null,system:false};let onSend=null,readbackFail=false;
  const channel={id:'private',guildId:'g',type:ChannelType.GuildText,permissionsFor:()=>new PermissionsBitField([P.ViewChannel,P.SendMessages]),messages:{async fetch({message}){if(message==='new-attempt')return original;if(readbackFail)throw new Error('Readback temporarily unavailable');const row=messages.get(message);if(!row)throw new Error('Message missing');return row;}},async send(body){const result={...structuredClone(body),id:'notice-'+(sent.length+1),guildId:'g',channelId:'private',author:{id:'bot',bot:true},webhookId:null,system:false};sent.push(result);messages.set(result.id,result);if(onSend)await onSend(result);return result;}};
  const guild={id:'g',get memberCount(){return members.size;},members:{list:async()=>members},roles:{fetch:async()=>new Map()},channels:{fetch:async()=>channel}},client={user:{id:'bot'},guilds:{fetch:async()=>guild}};
  const publisher=()=>createDiscordRollNotices({client,sceneStore:f.scenes,sourceAuthority:f.authority,rollStore:f.rolls,preparation:f.prepare()});
  return {...f,request,sent,messages,members,original,publisher,onSend(fn){onSend=fn;},failReadback(value){readbackFail=value;},get rolls(){return f.rolls;},reopen(){f.reopenRolls();f.reopen();}};
}
test('native roll notice publishes exact qualified stakes/odds once to its actual source audience',async t=>{
  const f=fixture(t),before=f.actions.readHope('g','pc'),notice=await f.publisher().publish(f.source,f.request.id);
  assert.equal(f.sent.length,1);assert.equal(f.sent[0].content,ownerRollNoticeContent(f.request));assert.match(f.sent[0].content,/Disadvantage applies/);assert.doesNotMatch(f.sent[0].content,/native-only-condition-canary/);assert.deepEqual(f.sent[0].allowedMentions,{parse:[]});assert.equal(f.sent[0].enforceNonce,true);
  assert.equal(notice.status,'delivered');assert.equal(notice.channelId,'private');assert.equal(notice.termHash,f.request.termProof.hash);assert.equal(f.rolls.readNoticePublication('g',f.request.id).status,'delivered');assert.equal(f.rolls.readResultForRequest('g',f.request.id),null);assert.deepEqual(f.actions.readHope('g','pc'),before);
  await assert.rejects(()=>f.publisher().publish(f.source,f.request.id),/already attempted/);assert.equal(f.sent.length,1);
});
test('saved send response reconciles after cold reopen without resending or inventing owner dice',async t=>{
  const f=fixture(t);f.failReadback(true);await assert.rejects(()=>f.publisher().publish(f.source,f.request.id),/Readback/);const p=f.rolls.readNoticePublication('g',f.request.id);assert.equal(p.status,'uncertain');assert.equal(p.response.messageId,'notice-1');assert.equal(f.rolls.readDelivery('g',f.request.noticeRef),null);
  f.reopen();f.failReadback(false);assert.equal((await f.publisher().reconcile(f.source,f.request.id)).messageId,'notice-1');assert.equal(f.sent.length,1);assert.equal(f.rolls.readResultForRequest('g',f.request.id),null);assert.equal((await f.publisher().reconcile(f.source,f.request.id)).messageId,'notice-1');assert.equal(f.sent.length,1);
});
test('lost send acknowledgement retains an uncertain attempt and cannot resend or manufacture delivery',async t=>{
  const f=fixture(t);f.onSend(()=>{throw new Error('Response lost after send');});await assert.rejects(()=>f.publisher().publish(f.source,f.request.id),/Response lost/);assert.equal(f.sent.length,1);assert.equal(f.rolls.readNoticePublication('g',f.request.id).response,null);assert.equal(f.rolls.readNoticePublication('g',f.request.id).status,'uncertain');await assert.rejects(()=>f.publisher().publish(f.source,f.request.id),/already attempted/);await assert.rejects(()=>f.publisher().reconcile(f.source,f.request.id),/Saved native roll send response/);assert.equal(f.rolls.readDelivery('g',f.request.noticeRef),null);assert.equal(f.sent.length,1);
});
test('changed notice body cannot count as delivered terms or trigger a second send',async t=>{
  const f=fixture(t);f.onSend(message=>{message.content='Different stakes and Difficulty 1.';});await assert.rejects(()=>f.publisher().publish(f.source,f.request.id),/readback/);assert.equal(f.rolls.readDelivery('g',f.request.noticeRef),null);await assert.rejects(()=>f.publisher().reconcile(f.source,f.request.id),/readback/);assert.equal(f.sent.length,1);
});
test('changed audience after send retains the response but never acknowledges or republishes it',async t=>{
  const f=fixture(t);f.onSend(()=>{f.members.set('outsider',{id:'outsider',permissions:new PermissionsBitField([]),roles:{cache:new Map()}});});await assert.rejects(()=>f.publisher().publish(f.source,f.request.id));const p=f.rolls.readNoticePublication('g',f.request.id);assert.equal(p.status,'uncertain');assert.equal(p.response.messageId,'notice-1');assert.equal(f.rolls.readDelivery('g',f.request.noticeRef),null);await assert.rejects(()=>f.publisher().publish(f.source,f.request.id),/already attempted/);assert.equal(f.sent.length,1);
});
test('source edit or a real condition change during send withholds delivery and preserves returned transport identity',async t=>{
  for(const change of [f=>{f.original.content='Changed original declaration.';},f=>attachOwnerClear(f)]){const f=fixture(t);f.onSend(()=>change(f));await assert.rejects(()=>f.publisher().publish(f.source,f.request.id));assert.equal(f.rolls.readNoticePublication('g',f.request.id).response.messageId,'notice-1');assert.equal(f.rolls.readNoticePublication('g',f.request.id).status,'uncertain');assert.equal(f.rolls.readDelivery('g',f.request.noticeRef),null);assert.equal(f.sent.length,1);}
});
test('pre-send source edit and foreign source scopes never reach Discord publication',async t=>{
  const edited=fixture(t);edited.original.content='Edited before delivery.';await assert.rejects(()=>edited.publisher().publish(edited.source,edited.request.id));assert.equal(edited.sent.length,0);assert.equal(edited.rolls.readNoticePublication('g',edited.request.id),null);
  const foreign=fixture(t);await assert.rejects(()=>foreign.publisher().publish({...foreign.source,principal:'other'},foreign.request.id));assert.equal(foreign.sent.length,0);
});
test('request inspection binds all printed stakes/Difficulty and native identity to the approved adjudication',async t=>{
  const f=fixture(t),{status,...request}=f.request;const unqualified={...request,id:'wrong-request',noticeRef:'wrong-notice',difficulty:1,stakes:'Different outcome.'};f.rolls.createRequest(unqualified,{check:f.check});assert.throws(()=>f.prepare().inspectRequest(f.source,'wrong-request'),/differs/);await assert.rejects(()=>f.publisher().publish(f.source,'wrong-request'),/differs/);assert.equal(f.sent.length,0);
});
test('concurrent publication calls share one durable attempt and one actual transport send',async t=>{
  const f=fixture(t),results=await Promise.allSettled([f.publisher().publish(f.source,f.request.id),f.publisher().publish(f.source,f.request.id)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);assert.equal(f.sent.length,1);assert.equal(f.rolls.readNoticePublication('g',f.request.id).status,'delivered');assert.equal(f.rolls.readDelivery('g',f.request.noticeRef).messageId,'notice-1');
});
