import test from 'node:test';
import assert from 'node:assert/strict';
import {ChannelType,PermissionsBitField,PermissionFlagsBits as P} from 'discord.js';
import {openRollStore} from '../../src/v2/rules/roll-store.js';
import {openFearReservations} from '../../src/v2/rules/fear-reservations.js';
import {createFearOpportunityReader} from '../../src/v2/rules/fear-opportunity-reader.js';
import {createPreRollFearCoordinator} from '../../src/v2/rules/pre-roll-fear-coordinator.js';
import {createDiscordFearAnnouncements} from '../../src/v2/discord-fear-announcements.js';
function fixture(t){
  const rolls=openRollStore(),fear=openFearReservations(),check=()=>{};t.after(()=>{rolls.close();fear.close();});
  rolls.createRequest({id:'q',campaignId:'g',sceneId:'s',actorId:'pc',ownerUserId:'owner',controlRevision:'1',noticeRef:'roll-notice',stakes:'The guard hears.',difficulty:12,modifier:0,experience:0,advantage:0,disadvantage:0,sourceRef:'source',sourceRevision:'1'},{check});rolls.acknowledgeDelivery('g','q',{messageId:'notice-message',recipientIds:['owner']},{check});fear.initialize('g',1,{check});
  const owner={id:'pc',kind:'pc',status:'active',campaignId:'g',sceneId:'s',ownerUserId:'owner',controllerUserId:'owner',controlRole:'owner',controlRevision:'1'},npc={id:'npc',kind:'npc',status:'active',campaignId:'g',sceneId:'s',controllerUserId:null};
  const opportunityReader=createFearOpportunityReader({rollStore:rolls,sourceAuthority:{inspectReference:()=>({campaign:'g',scene:'s',principal:'owner',actors:['pc']})},readActor:(_c,id)=>id==='pc'?owner:npc,inspectGmDecision:()=>({id:'decision',status:'gm_action_ready',issuer:'native_gm_decision',campaignId:'g',sceneId:'s',requestRef:'q',npcId:'npc',targetActorId:'pc',operation:'commit_adversary_attack',feature:'standard_attack',advantage:false,disadvantage:false,experienceRef:null,printedFearCost:0})});
  const coordinator=createPreRollFearCoordinator({rollStore:rolls,fearStore:fear,opportunityReader});coordinator.reserve('g','q',{check});
  const member=id=>({id,permissions:new PermissionsBitField([]),roles:{cache:new Map()}}),members=new Map(['bot','owner'].map(id=>[id,member(id)]));let calls=0,mode='ok',saved;
  const channel={id:'ch',guildId:'g',type:ChannelType.GuildText,permissionsFor:()=>new PermissionsBitField([P.ViewChannel,P.SendMessages]),send:async payload=>{calls++;assert.deepEqual(payload.allowedMentions,{parse:[]});assert.equal(payload.enforceNonce,true);assert.equal(payload.nonce.length,24);if(mode==='reject')throw new Error('Transport failed');saved={id:'fear-message',guildId:'g',channelId:'ch',author:{id:'bot',bot:true},webhookId:null,system:false,content:payload.content};if(mode==='drift'){members.set('outsider',member('outsider'));guild.memberCount=3;}return saved;},messages:{fetch:async input=>{assert.deepEqual(input,{message:'fear-message',force:true});return mode==='wrong-body'?{...saved,content:'changed'}:saved;}}};
  const guild={id:'g',memberCount:2,members:{list:async()=>members,fetch:async()=>members},roles:{fetch:async()=>new Map()},channels:{fetch:async()=>channel}},client={user:{id:'bot'},guilds:{fetch:async()=>guild}},route={guildId:'g',channelId:'ch',sceneId:'s',ownerUserId:'owner'};
  const transport=createDiscordFearAnnouncements({client,coordinator,fearStore:fear,readRoute:()=>route});
  return {fear,rolls,check,transport,newTransport:()=>createDiscordFearAnnouncements({client,coordinator,fearStore:fear,readRoute:()=>route}),failReadback(){channel.messages.fetch=async()=>{throw new Error('Readback interrupted');};},restoreReadback(){channel.messages.fetch=async()=>saved;},get calls(){return calls;},setMode(v){mode=v;},addOutsider(){members.set('outsider',member('outsider'));guild.memberCount=3;}};
}
test('native audience-scoped send is read back and acknowledged once without spending Fear or releasing dice',async t=>{
  const f=fixture(t),result=await f.transport.publish('g','q',{check:f.check});assert.equal(result.status,'announced');assert.equal(result.publication.status,'delivered');assert.equal(f.calls,1);assert.equal(f.fear.reserved('g'),1);assert.equal(f.rolls.readFearHold('g','q').status,'held');
  await assert.rejects(f.transport.publish('g','q',{check:f.check}),/already attempted/);assert.equal(f.calls,1);
});
test('unqualified owner audience cannot claim or send an announcement',async t=>{
  const f=fixture(t);f.addOutsider();await assert.rejects(f.transport.publish('g','q',{check:f.check}),/audience_mismatch/);assert.equal(f.calls,0);assert.equal(f.fear.readPublication('g','q').status,'not_started');
});
for(const mode of ['reject','drift','wrong-body'])test(`ambiguous or invalid Discord delivery stays held without resend: ${mode}`,async t=>{
  const f=fixture(t);f.setMode(mode);await assert.rejects(f.transport.publish('g','q',{check:f.check}));assert.equal(f.calls,1);assert.equal(f.fear.readPublication('g','q').status,'uncertain');assert.equal(f.fear.read('g','q').status,'awaiting_announcement');assert.equal(f.rolls.readFearHold('g','q').status,'held');
  await assert.rejects(f.transport.publish('g','q',{check:f.check}));assert.equal(f.calls,1);
});

test('a new transport instance reconciles saved native send response without sending again',async t=>{
  const f=fixture(t);f.failReadback();await assert.rejects(f.transport.publish('g','q',{check:f.check}),/Readback interrupted/);
  assert.equal(f.fear.readPublication('g','q').response.messageId,'fear-message');assert.equal(f.fear.readPublication('g','q').status,'uncertain');
  f.restoreReadback();const resumed=f.newTransport(),result=await resumed.reconcile('g','q',{check:f.check});assert.equal(result.status,'announced');assert.equal(f.calls,1);
  assert.deepEqual(await resumed.reconcile('g','q',{check:f.check}),result);assert.equal(f.calls,1);assert.equal(f.rolls.readFearHold('g','q').status,'held');
});

test('no native response or invalid readback cannot be reconciled into acknowledged delivery',async t=>{
  const failed=fixture(t);failed.setMode('reject');await assert.rejects(failed.transport.publish('g','q',{check:failed.check}));
  await assert.rejects(failed.transport.reconcile('g','q',{check:failed.check}),/Durable native Fear send response/);assert.equal(failed.calls,1);
  const altered=fixture(t);altered.setMode('wrong-body');await assert.rejects(altered.transport.publish('g','q',{check:altered.check}));
  await assert.rejects(altered.transport.reconcile('g','q',{check:altered.check}),/reconciliation evidence/);assert.equal(altered.fear.read('g','q').status,'awaiting_announcement');assert.equal(altered.calls,1);
});
