import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {ChannelType,PermissionsBitField,PermissionFlagsBits as P} from 'discord.js';
import {createDiscordIntake} from '../../src/v2/discord-intake.js';
import {createDiscordMessageReader} from '../../src/v2/discord-message-reader.js';
import {createNativeRoot} from '../../src/v2/native-root.js';
import {openInteractionReceipts} from '../../src/v2/interaction-receipts.js';
import {openCostPromptStore} from '../../src/v2/cost-prompt-store.js';
import {openSourceRegistry} from '../../src/v2/source-registry.js';
import {createSourceAuthority} from '../../src/v2/source-authority.js';
import {createCanonicalActorReaders} from '../../src/v2/canonical-actor-readers.js';
async function fixture(t,{sendFailure=false,readbackTamper=false,provider=null}={}){
  const directory=mkdtempSync(join(tmpdir(),'vk2-root-cost-')),client=new EventEmitter(),errors=[],sent=[],replies=[],members=new Map(['bot','u'].map(id=>[id,{id,permissions:new PermissionsBitField([]),roles:{cache:new Map()}}]));
  const character={id:'pc',guild_id:'c',owner_user_id:'u',status:'active',data:{level:2,resources:{hp:{current:0,max:6},armor:{current:3,max:3},stress:{current:0,max:6},hope:3,hope_max:6},gm_private:'cost-hook-canary'}};
  const sourceMessage={id:'attempt',guildId:'c',channelId:'private',author:{id:'u',bot:false},content:'I use the ability.',webhookId:null,system:false};
  const channel={id:'private',guildId:'c',type:ChannelType.GuildText,permissionsFor:()=>new PermissionsBitField([P.ViewChannel,P.SendMessages]),messages:{fetch:async({message})=>{if(message==='attempt')return sourceMessage;const value=sent.find(m=>m.id===message);if(!value)throw new Error('Unknown message');return readbackTamper?{...value,content:'It costs 1 Hope.'}:value;}},send:async body=>{const message={...structuredClone(body),id:'notice-'+(sent.length+1),guildId:'c',channelId:'private',author:{id:'bot',bot:true},webhookId:null,system:false};sent.push(message);if(sendFailure)throw new Error('Response lost after send');return message;}};
  const guild={id:'c',memberCount:2,members:{list:async()=>members},roles:{fetch:async()=>new Map()},channels:{fetch:async()=>channel}};client.user={id:'bot'};client.guilds={fetch:async()=>guild};
  const repository={getCharacter:()=>structuredClone(character),listCharacters:()=>[character]},root=createNativeRoot({client,directory,characterRepository:repository,campaignRepository:{getCampaign:()=>({guild_id:'c',gm_role_id:'gm'})},rng:()=>1,provider,onError:(error,context)=>errors.push({message:error.message,...context})});
  const registry=openSourceRegistry(join(directory,'sources.sqlite'));t.after(()=>{root.close();registry.close();assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep));rmSync(directory,{recursive:true,force:true});});
  const records=[{kind:'session',data:{id:'sess',campaignId:'c',status:'active'}},{kind:'scene',data:{id:'s',campaignId:'c',sessionId:'sess',status:'active',participants:[{userId:'u',actorId:'pc',presence:'present'}]}},{kind:'actor',data:{id:'pc',campaignId:'c',sceneId:'s',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'}},{kind:'channel',data:{id:'private',campaignId:'c',sceneId:'s',kind:'private',ownerUserId:'u',permissionsVerified:true,recipientIds:['u'],writerIds:['u']}},{kind:'message',data:{id:'attempt',campaignId:'c',channelId:'private',userId:'u',deleted:false,text:sourceMessage.content}}];
  root.sceneStore.commitSnapshot({campaignId:'c',principal:'gm',sourceRef:'setup',records:records.map(r=>({...r,expectedRevision:null}))},{check:()=>{}});
  root.actionStore.initializeHope({campaignId:'c',actorId:'pc',ownerUserId:'u',hope:3,cap:6},{check:()=>{}});root.actionStore.initializePcDefenses({campaignId:'c',actorId:'pc',ownerUserId:'u',controlRevision:'1',hp:{current:0,max:6},armorSlots:{current:3,max:3}},{check:()=>{}});root.actionStore.initializePcLife({campaignId:'c',actorId:'pc',ownerUserId:'u',controlRevision:'1',sourceRef:'profile',sourceRevision:'1',level:2,stress:{current:0,max:6}},{check:()=>{}});
  await createDiscordIntake({messageReader:createDiscordMessageReader({client}),sceneStore:root.sceneStore}).ingest({guildId:'c',channelId:'private',sceneId:'s',messageId:'attempt',userId:'u',actorId:'pc',mode:'private',ownerUserId:'u'});
  const canonical=createCanonicalActorReaders({sceneStore:root.sceneStore,actionStore:root.actionStore,characterRepository:repository}),authority=createSourceAuthority({...canonical.readers,sourceRegistry:registry}),source=authority.authenticate({campaignId:'c',messageId:'attempt',userId:'u',actorId:'pc'}),identity={id:'cost',campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',sourceRef:source.id,sourceRevision:source.revision,kind:'hope_cost'};
  root.actionStore.create(identity,{check:()=>{}});root.actionStore.registerHopeTerms({...identity,revision:'terms-1',controlRevision:'1',cost:{resource:'hope',slot:'base',amount:2}},{check:()=>{}});
  function event(id,decision='accept',over={}){const message=sent[0],token=message.components[0].components[decision==='accept'?0:1].custom_id;return {id,client,guildId:'c',channelId:'private',message,user:{id:'u',bot:false},customId:token,isButton:()=>true,deferReply:async body=>{replies.push({id,defer:body});},editReply:async body=>{replies.push({id,...body});},...over};}
  return {root,source,sent,replies,errors,event,members,guild,channel,directory};
}
test('composed native root delivers exact cost, observes owner button, commits once and rejects repeated expense',async t=>{
  const f=await fixture(t),notice=await f.root.costs.present(f.source,'cost');assert.equal(notice.prompt.status,'active');assert.equal(f.sent.length,1);assert.match(f.sent[0].content,/2 Hope/);assert.equal(f.root.actionStore.readHope('c','pc').hope,3);assert.equal(JSON.stringify(f.sent).includes('cost-hook-canary'),false);
  const event=f.event('click');event.client.emit('interactionCreate',event);await f.root.drain();assert.equal(f.root.actionStore.readHope('c','pc').hope,1);assert.equal(f.root.actionStore.read('c','cost').status,'resolved');assert.equal(f.replies.filter(r=>r.content==='2 Hope spent.').length,1);assert.deepEqual(f.errors,[]);
  event.client.emit('interactionCreate',event);await f.root.drain();assert.equal(f.replies.filter(r=>r.content==='2 Hope spent.').length,1);const again=f.event('second-click');again.client.emit('interactionCreate',again);await f.root.drain();assert.equal(f.root.actionStore.readHope('c','pc').hope,1);assert.equal(f.root.actionStore.readHope('c','pc').revision,2);
});
test('actual owner decline cancels the action without any Hope cost',async t=>{
  const f=await fixture(t);await f.root.costs.present(f.source,'cost');const event=f.event('reject','reject');event.client.emit('interactionCreate',event);await f.root.drain();assert.equal(f.root.actionStore.read('c','cost').status,'cancelled');assert.equal(f.root.actionStore.readHope('c','pc').hope,3);assert.equal(f.root.actionStore.readOutcome('c','cost'),null);assert.match(f.replies.at(-1).content,/Declined/);
});
test('wrong owner and altered observed cost payload cannot supply consent',async t=>{
  for(const variant of ['owner','payload']){const f=await fixture(t);await f.root.costs.present(f.source,'cost');const event=f.event('invalid');if(variant==='owner')event.user={id:'v',bot:false};else event.message={...event.message,content:'Spend 1 Hope?'};event.client.emit('interactionCreate',event);await f.root.drain();assert.equal(f.root.actionStore.readHope('c','pc').hope,3);assert.equal(f.root.actionStore.read('c','cost').status,'awaiting_consent');assert.equal(f.root.actionStore.readOutcome('c','cost'),null);assert.ok(f.errors.length);assert.match(f.replies.at(-1).content,/native review/);}
});
test('lost send acknowledgement is durable uncertainty and repeated requests never resend or spend',async t=>{
  const f=await fixture(t,{sendFailure:true});await assert.rejects(f.root.costs.present(f.source,'cost'),/Response lost/);await f.root.drain();const result=f.root.costs.request(f.source,'cost');assert.equal(result.status,'native_review_required');const cold=openCostPromptStore(join(f.directory,'cost-prompts.sqlite'));try{assert.equal(cold.read(result.request_ref).status,'uncertain');assert.equal(cold.read(result.request_ref).publication.response,null);}finally{cold.close();}await assert.rejects(f.root.costs.reconcile(result.request_ref),/no resend/);await f.root.drain();assert.equal(f.sent.length,1);assert.equal(f.root.actionStore.readHope('c','pc').hope,3);
});
test('changed readback and a newly shared audience prevent delivery acknowledgement and native spending',async t=>{
  const tamper=await fixture(t,{readbackTamper:true});await assert.rejects(tamper.root.costs.present(tamper.source,'cost'),/delivered native cost/);await tamper.root.drain();assert.equal(tamper.root.costs.request(tamper.source,'cost').status,'native_review_required');const event=tamper.event('tampered');event.client.emit('interactionCreate',event);await tamper.root.drain();assert.equal(tamper.root.actionStore.readHope('c','pc').hope,3);
  const drift=await fixture(t);await drift.root.costs.present(drift.source,'cost');drift.members.set('v',{id:'v',permissions:new PermissionsBitField([]),roles:{cache:new Map()}});drift.guild.memberCount=3;const e=drift.event('shared');e.client.emit('interactionCreate',e);await drift.root.drain();assert.equal(drift.root.actionStore.readHope('c','pc').hope,3);assert.equal(drift.root.actionStore.read('c','cost').status,'awaiting_consent');
});


test('generic tools discover an unaccepted native cost and request consent without inventing acceptance or spending',async t=>{
  let calls=0;const f=await fixture(t,{provider:{generate:async input=>{
    calls++;if(calls===1)return {toolCalls:[{id:'discover',name:'context_read',arguments:{topic:'actions'}}]};
    if(calls===2){const available=input.history[0].toolResults[0].result;assert.equal(available.operations.length,1);assert.equal(available.operations[0].action.kind,'hope_cost.request_consent');return {toolCalls:[{id:'request',name:'action_propose',arguments:available.operations[0]}]};}
    assert.equal(input.history[1].toolResults[0].result.status,'awaiting_consent');assert.equal(input.history[1].toolResults[0].result.effects_committed,false);return {text:'The native cost awaits your decision.'};
  }}});
  const turn=await f.root.turns.respond({guildId:'c',channelId:'private',sceneId:'s',messageId:'attempt',userId:'u',actorId:'pc',mode:'private',ownerUserId:'u'});await f.root.drain();assert.equal(turn.metrics.modelCalls,3);assert.equal(turn.metrics.toolCalls,2);assert.equal(f.sent.length,1);assert.equal(f.root.actionStore.readHope('c','pc').hope,3);assert.equal((await f.root.turns.inspectPublication(turn.publication.id)).sent,false);
  const event=f.event('approved');event.client.emit('interactionCreate',event);await f.root.drain();assert.equal(f.root.actionStore.readHope('c','pc').hope,1);assert.deepEqual(f.errors,[]);
});

test('concurrent accept and decline decisions cannot both apply or charge twice',async t=>{
  const f=await fixture(t);await f.root.costs.present(f.source,'cost');const a=f.event('accept-race'),b=f.event('decline-race','reject');a.client.emit('interactionCreate',a);b.client.emit('interactionCreate',b);await f.root.drain();const state=f.root.actionStore.read('c','cost'),hope=f.root.actionStore.readHope('c','pc');assert.ok(['resolved','cancelled'].includes(state.status));assert.equal(hope.hope,state.status==='resolved'?1:3);assert.equal(hope.revision,state.status==='resolved'?2:1);
});


test('uncertain interaction confirmation preserves the real expense and replay does not send or charge again',async t=>{
  const f=await fixture(t);await f.root.costs.present(f.source,'cost');let edits=0;const event=f.event('lost-reply','accept',{editReply:async()=>{edits++;throw new Error('confirmation acknowledgement lost');}});event.client.emit('interactionCreate',event);await f.root.drain();assert.equal(f.root.actionStore.readHope('c','pc').hope,1);const receipts=openInteractionReceipts(join(f.directory,'interactions.sqlite'));try{const row=receipts.read(event.id);assert.equal(row.processing,'committed');assert.equal(row.reply,'uncertain');assert.ok(row.receipt);}finally{receipts.close();}event.client.emit('interactionCreate',event);await f.root.drain();assert.equal(edits,1);assert.equal(f.root.actionStore.readHope('c','pc').hope,1);
});

test('an uncertain defer acknowledgement cannot record consent or create a native expense',async t=>{
  const f=await fixture(t);await f.root.costs.present(f.source,'cost');let defers=0;const event=f.event('lost-defer','accept',{deferReply:async()=>{defers++;throw new Error('defer acknowledgement lost');}});event.client.emit('interactionCreate',event);await f.root.drain();event.client.emit('interactionCreate',event);await f.root.drain();assert.equal(defers,1);assert.equal(f.root.actionStore.readHope('c','pc').hope,3);assert.equal(f.root.actionStore.read('c','cost').status,'awaiting_consent');assert.equal(f.root.actionStore.readOutcome('c','cost'),null);
});
