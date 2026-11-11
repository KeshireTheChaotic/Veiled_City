import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {EventEmitter} from 'node:events';
import {ChannelType,PermissionsBitField,PermissionFlagsBits as P} from 'discord.js';
import {openDeathPromptStore} from '../../src/v2/death-prompts.js';
import {createDiscordDeathPrompts} from '../../src/v2/discord-death-prompts.js';
import {createDiscordDeathDecisions} from '../../src/v2/discord-death-decisions.js';
import {createDiscordAudienceReader} from '../../src/v2/discord-audience-reader.js';
import {openComponentDecisionStore} from '../../src/v2/component-decision-store.js';
function fixture(t,{allocation=false}={}){
  const dir=mkdtempSync(join(tmpdir(),'vk3-death-delivery-')),filename=join(dir,'prompts.sqlite');let store=openDeathPromptStore(filename),calls=0,mode='ok',saved,now=Date.now();
  const check=()=>{},terms={purpose:'death_review',campaignId:'g',sceneId:'s',actorId:'pc',ownerUserId:'owner',controlRevision:'1',requestRef:'incoming-death:attack',level:2,hopeCap:6,allowedMoves:['risk_it_all','avoid_death','blaze_of_glory']},route={guildId:'g',channelId:'ch',sceneId:'s',ownerUserId:'owner'};
  if(allocation)Object.assign(terms,{purpose:'death_allocation',budget:5,markedHp:6,markedStress:3,allowedMoves:[],allowedAllocations:[{decision:'allocate:2:3',hp:2,stress:3},{decision:'allocate:3:2',hp:3,stress:2},{decision:'allocate:4:1',hp:4,stress:1},{decision:'allocate:5:0',hp:5,stress:0}]});
  const row=store.issue({terms,channelId:'ch',expiresAt:now+60000},{check});
  const member=id=>({id,permissions:new PermissionsBitField([]),roles:{cache:new Map()}}),members=new Map(['bot','owner'].map(id=>[id,member(id)]));
  const channel={id:'ch',guildId:'g',type:ChannelType.GuildText,permissionsFor:()=>new PermissionsBitField([P.ViewChannel,P.SendMessages]),send:async payload=>{
    calls++;assert.deepEqual(payload.allowedMentions,{parse:[]});assert.equal(payload.enforceNonce,true);assert.equal(payload.nonce.length,24);assert.deepEqual(payload.components,row.payload.components);
    if(mode==='reject')throw new Error('Transport failed');saved={id:'death-message',guildId:'g',channelId:'ch',author:{id:'bot',bot:true},webhookId:null,system:false,content:payload.content,components:payload.components};
    if(mode==='drift'){members.set('outsider',member('outsider'));guild.memberCount=3;}
    if(mode==='stale-terms')terms.level=3;
    return saved;
  },messages:{fetch:async input=>{assert.deepEqual(input,{message:'death-message',force:true});if(mode==='read-fails')throw new Error('Readback interrupted');if(mode==='wrong-body')return {...saved,content:'Changed risks'};if(mode==='wrong-bot')return {...saved,author:{id:'other',bot:true}};if(mode==='webhook')return {...saved,webhookId:'webhook'};if(mode==='wrong-components')return {...saved,components:[]};return saved;}}};
  const guild={id:'g',memberCount:2,members:{list:async()=>members,fetch:async()=>members},roles:{fetch:async()=>new Map([['gm',{}]])},channels:{fetch:async()=>channel}},client=Object.assign(new EventEmitter(),{user:{id:'bot'},guilds:{fetch:async()=>guild}});
  const transport=()=>createDiscordDeathPrompts({client,promptStore:store,readTerms:()=>terms,readRoute:()=>route});
  t.after(()=>{store.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep));rmSync(dir,{recursive:true,force:true});});
  return {row,terms,route,check,client,get saved(){return saved;},get store(){return store;},get calls(){return calls;},transport,setMode(value){mode=value;},addOutsider(){members.set('outsider',member('outsider'));guild.memberCount=members.size;},addObserver(){const gm=member('gm-user');gm.roles.cache.set('gm',{});members.set(gm.id,gm);guild.memberCount=members.size;},reopen(){store.close();store=openDeathPromptStore(filename);}};
}
test('exact native death risk prompt is sent once, read back and durably activated',async t=>{
  const f=fixture(t),p=await f.transport().publish(f.row.id,{check:f.check});assert.equal(p.status,'active');assert.equal(p.publication.status,'delivered');assert.equal(p.delivery.messageId,'death-message');assert.equal(f.calls,1);f.reopen();assert.equal(f.store.readPrompt(f.row.options[0].customId).status,'active');
  await assert.rejects(f.transport().publish(f.row.id,{check:f.check}),/unattempted/);assert.equal(f.calls,1);assert.deepEqual(await f.transport().reconcile(f.row.id,{check:f.check}),p);
});
test('unauthorized recipient cannot claim or send owner death risks',async t=>{
  const f=fixture(t);f.addOutsider();await assert.rejects(f.transport().publish(f.row.id,{check:f.check}),/audience_mismatch/);assert.equal(f.calls,0);assert.equal(f.store.read(f.row.id).status,'awaiting_delivery');
});
for(const mode of ['reject','drift','wrong-body','wrong-components','wrong-bot','webhook','stale-terms'])test(`failed or ambiguous native death delivery stays held without resend: ${mode}`,async t=>{
  const f=fixture(t);f.setMode(mode);await assert.rejects(f.transport().publish(f.row.id,{check:f.check}));assert.equal(f.calls,1);assert.equal(f.store.read(f.row.id).status,'uncertain');f.reopen();
  await assert.rejects(f.transport().publish(f.row.id,{check:f.check}));assert.equal(f.calls,1);assert.notEqual(f.store.readPrompt(f.row.options[0].customId).status,'active');
});
test('cold native transport reconciles saved send response without another message',async t=>{
  const f=fixture(t);f.setMode('read-fails');await assert.rejects(f.transport().publish(f.row.id,{check:f.check}),/Readback interrupted/);assert.equal(f.store.read(f.row.id).publication.response.messageId,'death-message');
  f.reopen();f.setMode('ok');const restored=await f.transport().reconcile(f.row.id,{check:f.check});assert.equal(restored.status,'active');assert.equal(f.calls,1);
});
test('no saved send response, changed body or revoked prompt cannot be reconciled',async t=>{
  const f=fixture(t);f.setMode('reject');await assert.rejects(f.transport().publish(f.row.id,{check:f.check}));f.setMode('ok');await assert.rejects(f.transport().reconcile(f.row.id,{check:f.check}),/Saved native death send response/);
  const g=fixture(t);g.setMode('wrong-body');await assert.rejects(g.transport().publish(g.row.id,{check:g.check}));await assert.rejects(g.transport().reconcile(g.row.id,{check:g.check}),/readback/);g.store.revoke(g.row.id,{check:g.check});g.setMode('ok');await assert.rejects(g.transport().reconcile(g.row.id,{check:g.check}));assert.equal(g.calls,1);
});
test('two native transports racing for one prompt produce exactly one claimed send',async t=>{
  const f=fixture(t),results=await Promise.allSettled([f.transport().publish(f.row.id,{check:f.check}),f.transport().publish(f.row.id,{check:f.check})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.calls,1);assert.equal(f.store.read(f.row.id).status,'active');
});
test('claimed prompt cannot acknowledge a different native send response',t=>{
  const f=fixture(t),claimed=f.store.claim(f.row.id,{check:f.check,audienceFingerprint:'a'.repeat(64)}),attemptId=claimed.publication.attemptId,response={campaignId:'g',promptRef:f.row.id,attemptId,channelId:'ch',messageId:'actual',audienceFingerprint:'a'.repeat(64)};
  f.store.recordResponse(f.row.id,attemptId,{check:f.check,readResponse:()=>response});assert.throws(()=>f.store.recordResponse(f.row.id,attemptId,{check:f.check,readResponse:()=>({...response,messageId:'other'})}),/Immutable/);
  assert.throws(()=>f.store.acknowledge(f.row.id,{check:f.check,readDelivery:()=>({status:'delivered',campaignId:'g',channelId:'ch',messageId:'other',payloadHash:f.row.payloadHash,recipientIds:['owner'],attemptId,audienceFingerprint:'a'.repeat(64)})}),/claimed/);assert.equal(f.store.read(f.row.id).status,'delivering');
});
test('published GM observer role and exact audience binding reach observed owner clicks',async t=>{
  const f=fixture(t);f.route.gmRoleId='gm';f.addObserver();await f.transport().publish(f.row.id,{check:f.check});
  const decisions=openComponentDecisionStore(),reader=createDiscordDeathDecisions({client:f.client,promptStore:f.store,readTerms:()=>f.terms,audienceReader:createDiscordAudienceReader({client:f.client}),decisionStore:decisions});t.after(()=>{reader.close();decisions.close();});
  const interaction={id:'owner-click',client:f.client,isButton:()=>true,user:{id:'owner',bot:false},guildId:'g',channelId:'ch',message:f.saved,customId:f.row.options[0].customId};f.client.emit('interactionCreate',interaction);const record=await reader.accept(interaction);assert.equal(record.audienceGmRoleId,'gm');assert.equal(record.audienceFingerprint,f.store.read(f.row.id).delivery.audienceFingerprint);
  f.addOutsider();await assert.rejects(reader.accept(interaction));
});
test('native recovery allocation prompt publishes the exact saved splits without choosing one',async t=>{
  const f=fixture(t,{allocation:true}),delivered=await f.transport().publish(f.row.id,{check:f.check});assert.equal(delivered.status,'active');assert.match(f.saved.content,/clears 5 marked slots/);assert.deepEqual(f.saved.components[0].components.map(b=>b.label),['Clear 2 HP, 3 Stress','Clear 3 HP, 2 Stress','Clear 4 HP, 1 Stress','Clear 5 HP, 0 Stress']);assert.equal(f.calls,1);assert.equal(delivered.options.every(o=>o.disabled===false),true);
});
