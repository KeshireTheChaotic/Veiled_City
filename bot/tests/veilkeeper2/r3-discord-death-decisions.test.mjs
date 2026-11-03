import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {openSourceRegistry} from '../../src/v2/source-registry.js';
import {createSourceAuthority} from '../../src/v2/source-authority.js';
import {openActionStore} from '../../src/v2/rules/action-store.js';
import {createDeathDecisionIngress} from '../../src/v2/rules/death-decision-ingress.js';
import {openDeathPromptStore,deathPromptPayload} from '../../src/v2/death-prompts.js';
import {openComponentDecisionStore} from '../../src/v2/component-decision-store.js';
import {createDiscordDeathDecisions} from '../../src/v2/discord-death-decisions.js';
import {createComponentChoiceSources} from '../../src/v2/component-choice-sources.js';
import {createDiscordDeathDispatcher} from '../../src/v2/discord-death-dispatcher.js';
import {openInteractionReceipts} from '../../src/v2/interaction-receipts.js';
import {MessageFlags,ChannelType,PermissionsBitField,PermissionFlagsBits as P} from 'discord.js';
import {createNativeDeathWorkflow} from '../../src/v2/native-death-workflow.js';
import {createDeathInteractionReconciliation} from '../../src/v2/death-interaction-reconciliation.js';
import {createDiscordDeathCommands} from '../../src/v2/discord-death-commands.js';

function fixture(t,{features=[]}={}){
  const dir=mkdtempSync(join(tmpdir(),'vk3-death-ingress-')),client=new EventEmitter();client.user={id:'bot'};
  let now=1000,scenes,registry,actions,prompts,decisions,reader,bridge,ingress,sources;
  const check=()=>{},channel={id:'private',campaignId:'c',sceneId:'s',kind:'private',ownerUserId:'u',permissionsVerified:true,recipientIds:['u'],writerIds:['u']};
  let fingerprint='a'.repeat(64),beforeAudience=()=>{};
  const audienceReader={read:async()=>{beforeAudience();return {channelRecord:channel,fingerprint};}};
  const snapshot=()=>{const {life,defenses,hope}=actions.readPcLife('c','pc');return {actorId:'pc',ownerUserId:life.ownerUserId,controlRevision:life.controlRevision,status:life.status,data:{level:life.level,death_state:life.deathState,resources:{hp:defenses.hp,armor:defenses.armorSlots,stress:life.stress,hope:hope.hope,hope_max:hope.cap},features}};};
  function open(){
    scenes=openSceneStore(join(dir,'scenes.sqlite'));registry=openSourceRegistry(join(dir,'sources.sqlite'));actions=openActionStore(join(dir,'actions.sqlite'));prompts=openDeathPromptStore(join(dir,'prompts.sqlite'),{clock:()=>now});decisions=openComponentDecisionStore(join(dir,'decisions.sqlite'));
    sources=createSourceAuthority({...scenes.readers,sourceRegistry:registry,readActor:(c,a)=>{const base=scenes.readers.readActor(c,a);return base?{...base,status:actions.readPcLife(c,a)?.life.status??base.status}:null;}});
    ingress=createDeathDecisionIngress({actionStore:actions,sourceAuthority:sources,readActorSnapshot:snapshot,readDecision:ref=>bridge.readDecision(ref)});
    reader=createDiscordDeathDecisions({client,promptStore:prompts,readTerms:ingress.readTerms,audienceReader,decisionStore:decisions});
    bridge=createComponentChoiceSources({decisionReader:reader,sceneStore:scenes,sourceAuthority:sources,audienceReader});
  }
  function close(){reader.close();decisions.close();prompts.close();actions.close();registry.close();scenes.close();}
  open();t.after(()=>{close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep));rmSync(dir,{recursive:true,force:true});});
  scenes.commitSnapshot({campaignId:'c',principal:'admin',sourceRef:'setup',records:[{kind:'channel',data:channel},{kind:'session',data:{id:'session',campaignId:'c',status:'active'}},{kind:'scene',data:{id:'s',campaignId:'c',sessionId:'session',status:'active',participants:[{actorId:'pc',userId:'u',presence:'present'}]}},{kind:'actor',data:{id:'pc',campaignId:'c',sceneId:'s',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'}},{kind:'message',data:{id:'attempt',campaignId:'c',userId:'u',channelId:'private',deleted:false,text:'My actual attempted action.'}}].map(r=>({...r,expectedRevision:null}))},{check});
  actions.initializePcDefenses({campaignId:'c',actorId:'pc',ownerUserId:'u',controlRevision:'1',hp:{current:5,max:6},armorSlots:{current:0,max:3}},{check});actions.initializeHope({campaignId:'c',actorId:'pc',ownerUserId:'u',hope:3,cap:6},{check});actions.initializePcLife({campaignId:'c',actorId:'pc',ownerUserId:'u',controlRevision:'1',sourceRef:'profile',sourceRevision:'1',level:2,stress:{current:3,max:6}},{check});
  const original=sources.authenticate({campaignId:'c',actorId:'pc',messageId:'attempt',userId:'u'}),attack={id:'attack',campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',controlRevision:'1',resultRef:'roll',resultHash:'native-hit',termsHash:'native-terms',sourceRef:original.id,sourceRevision:original.revision,damage:10,major:8,severe:16,defenses:{resistance:'none',armorReduction:1,armorAllowed:true}},armor={id:'armor',kind:'incoming_armor_choice',campaignId:'c',sceneId:'s',attackRef:'attack',actorId:'pc',ownerUserId:'u',controlRevision:'1',resultRef:'roll',resultHash:'native-hit',termsHash:'native-terms',sourceRef:original.id,sourceRevision:original.revision,useArmor:false};
  actions.commitIncomingDamage({campaignId:'c',attackRef:'attack',expectedRevision:1},{check,readAttack:()=>attack,readArmorChoice:()=>armor});
  function issue(purpose='death_review',decision='reviewed',deliver=true){
    const terms=ingress.readTerms('c','incoming-death:attack',purpose),p=prompts.issue({terms,channelId:'private',expiresAt:now+60000},{check:()=>assert.deepEqual(ingress.readTerms('c','incoming-death:attack',purpose),terms)});
    if(deliver)prompts.acknowledge(p.id,{check,readDelivery:()=>({status:'delivered',campaignId:'c',channelId:'private',messageId:`notice-${p.id}`,payloadHash:p.payloadHash,recipientIds:['u']})});
    const option=p.options.find(o=>o.decision===decision),interaction={id:`click-${p.id}`,client,isButton:()=>true,user:{id:'u',bot:false},guildId:'c',channelId:'private',message:{id:`notice-${p.id}`,author:{id:'bot',bot:true},...structuredClone(p.payload)},customId:option.customId};
    return {p,interaction,observe:()=>client.emit('interactionCreate',interaction)};
  }
  async function accept(event){event.observe();return reader.accept(event.interaction);}
  async function stage(event){await accept(event);const source=await bridge.ingest(event.interaction.id);return ingress.record(source);}
  return {client,channel,features,snapshot,issue,accept,stage,clock:()=>now,get scenes(){return scenes;},get actions(){return actions;},get reader(){return reader;},get prompts(){return prompts;},get bridge(){return bridge;},get ingress(){return ingress;},get sources(){return sources;},get decisions(){return decisions;},reopen(){close();open();},expire(){now+=60001;},setFingerprint(v){fingerprint=v;},beforeAudience(fn){beforeAudience=fn;}};
}

test('delivered review and exact owner move survive cold stores, then native fate draws exactly once',async t=>{
  const f=fixture(t),review=f.issue();const r=await f.stage(review);assert.equal(r.status,'reviewed');assert.equal(f.actions.readIncomingDeathOutcome('c','attack'),null);
  f.reopen();assert.equal(f.reader.readNative(review.interaction.id).sequence,1);assert.deepEqual(f.ingress.record(await f.bridge.ingest(review.interaction.id)),r);
  const choice=f.issue('death_choice','risk_it_all'),c=await f.stage(choice);assert.equal(c.evidence.reviewRef,review.interaction.id);assert.equal(c.evidence.sequence,2);assert.equal(c.evidence.move,'risk_it_all');assert.equal(f.actions.readIncomingDeathOutcome('c','attack'),null);
  f.reopen();assert.deepEqual(f.ingress.record(await f.bridge.ingest(choice.interaction.id)),c);
  let draws=0;const result=f.actions.resolveIncomingDeath('c','attack',{check:()=>{},sourceAuthority:f.sources,readActorSnapshot:f.snapshot,rng:()=>{draws++;return 6;}});assert.equal(draws,2);assert.equal(result.result,'recovered');
  f.reopen();assert.deepEqual(f.actions.resolveIncomingDeath('c','attack',{check:()=>{},sourceAuthority:f.sources,readActorSnapshot:f.snapshot,rng(){throw new Error('No reroll');}}),result);assert.throws(()=>f.reader.readNative(choice.interaction.id),/Pending canonical/);
});
test('unobserved, wrong owner, altered body, other bot and wrong message cannot record death decisions',async t=>{
  for(const change of [e=>e.interaction.user.id='other',e=>e.interaction.message.content+=' changed',e=>e.interaction.message.author.id='other-bot',e=>e.interaction.message.id='other',e=>e.interaction.channelId='other']){
    const f=fixture(t),e=f.issue();await assert.rejects(f.reader.accept(e.interaction),/Observed/);change(e);await assert.rejects(f.accept(e));assert.equal(f.decisions.get(e.interaction.id),null);assert.equal(f.actions.readIncomingDeathReview('c','attack'),null);
  }
});
test('delivery, expiry, revocation and explicit risk review are mandatory',async t=>{
  const f=fixture(t);assert.throws(()=>f.issue('death_choice','avoid_death'),/saved owner risk review/);
  const undelivered=f.issue('death_review','reviewed',false);await assert.rejects(f.accept(undelivered));
  const revoked=f.issue();f.prompts.revoke(revoked.p.id,{check:()=>{}});await assert.rejects(f.accept(revoked));
  const expired=f.issue();f.expire();await assert.rejects(f.accept(expired));assert.equal(f.actions.readIncomingDeathChoice('c','attack'),null);
});
test('private audience and terms are rechecked after awaiting Discord permission reads',async t=>{
  for(const mutate of [f=>f.channel.recipientIds.push('outsider'),f=>f.features.push('new native feature'),(f,e)=>e.interaction.message.content='edited during read',(f,e)=>e.interaction.id='changed-click',f=>f.reader.close()]){
    const f=fixture(t),e=f.issue();f.beforeAudience(()=>mutate(f,e));await assert.rejects(f.accept(e));assert.equal(f.decisions.get(e.interaction.id),null);
  }
});
test('fresh permission fingerprint drift cannot turn a saved click into a source',async t=>{
  const f=fixture(t),e=f.issue();await f.accept(e);f.setFingerprint('b'.repeat(64));await assert.rejects(f.bridge.ingest(e.interaction.id),/audience changed/);assert.equal(f.actions.readIncomingDeathReview('c','attack'),null);
});
test('owned death mappings disable affected choices while leaving other supported moves available',async t=>{
  const f=fixture(t,{features:['Reanimated']});await f.stage(f.issue());const disabled=f.issue('death_choice','risk_it_all');assert.equal(disabled.p.options.find(o=>o.decision==='risk_it_all').disabled,true);await assert.rejects(f.accept(disabled));
  const allowed=f.issue('death_choice','avoid_death'),receipt=await f.stage(allowed);assert.equal(receipt.evidence.move,'avoid_death');
});
test('native delivery acknowledgement rejects a different payload or audience and cannot activate a revoked prompt',t=>{
  const f=fixture(t),e=f.issue('death_review','reviewed',false),base={status:'delivered',campaignId:'c',channelId:'private',messageId:'notice',payloadHash:e.p.payloadHash,recipientIds:['u']};
  for(const patch of [{payloadHash:'wrong'},{recipientIds:['u','outsider']},{channelId:'other'}])assert.throws(()=>f.prompts.acknowledge(e.p.id,{check:()=>{},readDelivery:()=>({...base,...patch})}));
  f.prompts.revoke(e.p.id,{check:()=>{}});assert.throws(()=>f.prompts.acknowledge(e.p.id,{check:()=>{},readDelivery:()=>base}));
  assert.deepEqual(deathPromptPayload(e.p.payload),deathPromptPayload({...e.p.payload,components:e.p.payload.components.map(row=>({toJSON:()=>row}))}));
});
test('previous death envelopes without a GM role field retain native replay for unconfigured roles',async t=>{
  const f=fixture(t),e=f.issue();await f.accept(e);const envelope=f.decisions.get(e.interaction.id);delete envelope.record.audienceGmRoleId;
  const oldStore=openComponentDecisionStore();oldStore.put(envelope);const reader=createDiscordDeathDecisions({client:f.client,promptStore:f.prompts,readTerms:f.ingress.readTerms,audienceReader:{read:async()=>{throw new Error('Replay must not invent a fresh event');}},decisionStore:oldStore});t.after(()=>{reader.close();oldStore.close();});
  assert.equal(reader.readNative(e.interaction.id).principal,'u');assert.equal(reader.readNative(e.interaction.id).sequence,1);
});
async function pendingRecovery(f,faces=[5,1]){
  await f.stage(f.issue());await f.stage(f.issue('death_choice','risk_it_all'));const stream=[...faces];return f.actions.resolveIncomingDeath('c','attack',{check:()=>{},sourceAuthority:f.sources,readActorSnapshot:f.snapshot,rng:()=>stream.shift()});
}
test('explicit owner recovery button commits the chosen native split and preserves dice across cold replay',async t=>{
  const f=fixture(t),initial=await pendingRecovery(f),e=f.issue('death_allocation','allocate:3:2');assert.match(e.p.payload.content,/clears 5 marked slots/);assert.equal(f.actions.readPcLife('c','pc').defenses.hp.current,6);assert.equal(f.actions.readPcLife('c','pc').life.stress.current,3);
  await f.accept(e);f.reopen();const source=await f.bridge.ingest(e.interaction.id),resolved=f.ingress.record(source);assert.equal(resolved.status,'resolved');assert.deepEqual(resolved.roll,initial.roll);assert.equal(resolved.after.defenses.hp.current,3);assert.equal(resolved.after.life.stress.current,1);assert.equal(resolved.after.hope.hope,3);
  const evidence=resolved.allocation.evidence;assert.equal(evidence.hp,3);assert.equal(evidence.stress,2);assert.equal(evidence.sequence,3);f.reopen();assert.throws(()=>f.reader.readNative(e.interaction.id),/Pending canonical/);
  assert.deepEqual(f.actions.allocateIncomingDeathRecovery('c','attack',{check:()=>{},sourceAuthority:f.sources,readActorSnapshot:f.snapshot,readEvidence:()=>evidence}),resolved);assert.deepEqual(f.actions.resolveIncomingDeath('c','attack',{check:()=>{},sourceAuthority:f.sources,readActorSnapshot:f.snapshot,rng(){throw new Error('No new dice');}}),resolved);
});
test('legal recovery buttons include leaving all HP marked and cap recovery at all marked slots',async t=>{
  for(const [faces,decision,hp,stress] of [[[3,1],'allocate:0:3',6,0],[[10,1],'allocate:6:3',0,0]]){
    const f=fixture(t);await pendingRecovery(f,faces);const e=f.issue('death_allocation',decision);for(const a of e.p.terms.allowedAllocations){assert.equal(a.hp+a.stress,e.p.terms.budget);assert.ok(a.hp<=6&&a.stress<=3);}
    const resolved=await f.stage(e);assert.equal(resolved.after.defenses.hp.current,hp);assert.equal(resolved.after.life.stress.current,stress);
  }
});
test('allocation controls require a saved Hope outcome and never infer a choice from silence',async t=>{
  const f=fixture(t);assert.throws(()=>f.issue('death_allocation','allocate:3:2'));await pendingRecovery(f);const e=f.issue('death_allocation','allocate:3:2');f.expire();await assert.rejects(f.accept(e));assert.equal(f.actions.readIncomingDeathOutcome('c','attack').status,'awaiting_allocation');assert.equal(f.actions.readPcLife('c','pc').defenses.hp.current,6);
});
test('changed native allocation frame or other owner cannot clear resources',async t=>{
  for(const mutate of [(f,e)=>e.interaction.user.id='other',f=>f.features.push('changed frame')]){
    const f=fixture(t);await pendingRecovery(f);const e=f.issue('death_allocation','allocate:3:2');mutate(f,e);await assert.rejects(f.accept(e));assert.equal(f.actions.readIncomingDeathOutcome('c','attack').status,'awaiting_allocation');assert.equal(f.actions.readPcLife('c','pc').life.stress.current,3);
  }
});
test('maximum native Hope budget exposes all thirteen splits in valid five-button rows',t=>{
  const store=openDeathPromptStore();t.after(()=>store.close());const terms={purpose:'death_allocation',campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',controlRevision:'1',requestRef:'incoming-death:attack',level:2,hopeCap:6,allowedMoves:[],budget:12,markedHp:12,markedStress:12,allowedAllocations:Array.from({length:13},(_,hp)=>({decision:`allocate:${hp}:${12-hp}`,hp,stress:12-hp}))};
  const prompt=store.issue({terms,channelId:'private',expiresAt:Date.now()+60000},{check:()=>{}});assert.equal(prompt.options.length,13);assert.deepEqual(prompt.payload.components.map(row=>row.components.length),[5,5,3]);assert.equal(prompt.options[0].label,'Clear 0 HP, 12 Stress');assert.equal(prompt.options[12].label,'Clear 12 HP, 0 Stress');
});
function dispatcherFixture(t,f){
  const receipts=openInteractionReceipts(),errors=[],replies=[];let defers=0;
  const dispatcher=createDiscordDeathDispatcher({client:f.client,promptStore:f.prompts,decisionReader:f.reader,choiceSources:f.bridge,ingress:f.ingress,receipts,onError:(error,meta)=>errors.push({error,meta})});t.after(()=>{dispatcher.close();receipts.close();});
  async function emit(event,{failReply=false}={}){Object.assign(event.interaction,{deferred:false,replied:false,async deferReply(options){assert.equal(options.flags,MessageFlags.Ephemeral);defers++;this.deferred=true;},async editReply(options){assert.deepEqual(options.allowedMentions,{parse:[]});replies.push(options.content);if(failReply)throw new Error('Private reply transport failure');this.replied=true;}});event.observe();await dispatcher.drain();return receipts.read(event.interaction.id);}
  return {dispatcher,receipts,emit,errors,replies,get defers(){return defers;}};
}
test('client listener drives real native review, choice and allocation while fate stays engine-controlled',async t=>{
  const f=fixture(t),d=dispatcherFixture(t,f),review=f.issue();assert.equal((await d.emit(review)).processing,'committed');assert.equal(f.actions.readIncomingDeathReview('c','attack').evidence.id,review.interaction.id);assert.equal(f.actions.readIncomingDeathOutcome('c','attack'),null);
  const choice=f.issue('death_choice','risk_it_all');assert.equal((await d.emit(choice)).processing,'committed');assert.equal(f.actions.readIncomingDeathChoice('c','attack').evidence.id,choice.interaction.id);assert.equal(f.actions.readIncomingDeathOutcome('c','attack'),null);
  const faces=[5,1],initial=f.actions.resolveIncomingDeath('c','attack',{check:()=>{},sourceAuthority:f.sources,readActorSnapshot:f.snapshot,rng:()=>faces.shift()});assert.equal(initial.status,'awaiting_allocation');
  const allocation=f.issue('death_allocation','allocate:3:2'),row=await d.emit(allocation);assert.equal(row.processing,'committed');assert.equal(row.reply,'delivered');const resolved=f.actions.readIncomingDeathOutcome('c','attack');assert.equal(resolved.after.defenses.hp.current,3);assert.equal(resolved.after.life.stress.current,1);assert.deepEqual(resolved.roll,initial.roll);assert.equal(d.defers,3);assert.equal(d.errors.length,0);
  allocation.observe();await d.dispatcher.drain();assert.equal(d.defers,3);assert.deepEqual(f.actions.readIncomingDeathOutcome('c','attack'),resolved);
});
test('real native choice remains saved when private dispatcher confirmation fails',async t=>{
  const f=fixture(t),d=dispatcherFixture(t,f),review=f.issue(),row=await d.emit(review,{failReply:true});assert.equal(row.processing,'committed');assert.equal(row.reply,'uncertain');assert.equal(f.actions.readIncomingDeathReview('c','attack').evidence.id,review.interaction.id);review.observe();await d.dispatcher.drain();assert.equal(d.defers,1);assert.equal(d.replies.length,1);
});
test('real native owner rejection produces only a private generic hold and no death evidence',async t=>{
  const f=fixture(t),d=dispatcherFixture(t,f),review=f.issue();review.interaction.user.id='outsider';const row=await d.emit(review);assert.equal(row.processing,'held');assert.equal(f.actions.readIncomingDeathReview('c','attack'),null);assert.equal(d.replies.length,1);assert.match(d.replies[0],/native review/);assert.doesNotMatch(d.replies[0],/pc|attack|SECRET|risks required/);
});
function workflowFixture(t,f,{faces=[5,1]}={}){
  const dir=mkdtempSync(join(tmpdir(),'vk3-workflow-')),file=join(dir,'interactions.sqlite'),sent=[],errors=[],replies=[],draws=[];let receipts=openInteractionReceipts(file),workflow,mode='ok',nextInteraction=1;
  const member=id=>({id,permissions:new PermissionsBitField([]),roles:{cache:new Map()}}),members=new Map(['bot','u'].map(id=>[id,member(id)])),route={guildId:'c',channelId:'private',sceneId:'s',ownerUserId:'u'};
  const channel={id:'private',guildId:'c',type:ChannelType.GuildText,permissionsFor:()=>new PermissionsBitField([P.ViewChannel,P.SendMessages]),async send(payload){if(mode==='send-fails')throw new Error('Send uncertain');assert.deepEqual(payload.allowedMentions,{parse:[]});assert.equal(payload.enforceNonce,true);const message={id:`delivered-${sent.length+1}`,guildId:'c',channelId:'private',author:{id:'bot',bot:true},webhookId:null,system:false,content:payload.content,components:payload.components};sent.push(message);return message;},messages:{async fetch({message}){if(mode==='read-fails')throw new Error('Readback failed');return sent.find(m=>m.id===message);}}};
  const guild={id:'c',memberCount:2,members:{fetch:async()=>members},roles:{fetch:async()=>new Map()},channels:{fetch:async()=>channel}};f.client.guilds={fetch:async()=>guild};
  function open(){workflow=createNativeDeathWorkflow({client:f.client,actionStore:f.actions,sceneStore:f.scenes,sourceAuthority:f.sources,readActorSnapshot:f.snapshot,readRoute:()=>route,promptStore:f.prompts,decisionStore:f.decisions,interactionReceipts:receipts,clock:f.clock,rng:sides=>{draws.push(sides);if(!faces.length)throw new Error('Unexpected extra RNG');return faces.shift();},onError:(error,metadata)=>errors.push({error,metadata})});}
  open();t.after(()=>{workflow.close();receipts.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep));rmSync(dir,{recursive:true,force:true});});
  async function click(decision){const message=sent.at(-1),prompt=f.prompts.readPrompt(message.components[0].components[0].custom_id),option=prompt.options.find(o=>o.decision===decision);assert.ok(option,decision);const event={id:`workflow-click-${nextInteraction++}`,client:f.client,isButton:()=>true,user:{id:'u',bot:false},guildId:'c',channelId:'private',message,customId:option.customId,deferred:false,replied:false,async deferReply(options){assert.equal(options.flags,MessageFlags.Ephemeral);this.deferred=true;},async editReply(options){assert.deepEqual(options.allowedMentions,{parse:[]});replies.push(options.content);this.replied=true;}};f.client.emit('interactionCreate',event);await workflow.drain();return {event,row:receipts.read(event.id)};}
  return {sent,errors,replies,draws,click,present:()=>workflow.present('c','attack',{check:()=>{}}),setMode(value){mode=value;},get receipts(){return receipts;},get workflow(){return workflow;},reopen(){workflow.close();receipts.close();f.reopen();receipts=openInteractionReceipts(file);open();}};
}
test('composed native workflow progresses private review, fate and owner allocation with one saved prompt per stage',async t=>{
  const f=fixture(t),w=workflowFixture(t,f);const first=await w.present();assert.equal(first.purpose,'death_review');assert.equal(w.sent.length,1);assert.equal((await w.present()).promptRef,first.promptRef);assert.equal(w.sent.length,1);
  assert.equal((await w.click('reviewed')).row.processing,'committed');assert.equal(w.sent.length,2);assert.equal(w.draws.length,0);w.reopen();await w.present();assert.equal(w.sent.length,2);
  assert.equal((await w.click('risk_it_all')).row.processing,'committed');assert.deepEqual(w.draws,[12,12]);assert.equal(w.sent.length,3);assert.equal(f.actions.readIncomingDeathOutcome('c','attack').status,'awaiting_allocation');w.reopen();await w.present();assert.equal(w.sent.length,3);
  assert.equal((await w.click('allocate:3:2')).row.processing,'committed');assert.equal(f.actions.readPcLife('c','pc').defenses.hp.current,3);assert.equal(f.actions.readPcLife('c','pc').life.stress.current,1);assert.equal((await w.present()).status,'resolved');assert.equal(w.sent.length,3);assert.equal(w.draws.length,2);assert.deepEqual(w.errors,[]);
});
for(const [move,faces,status,result,drawCount] of [['risk_it_all',[1,12],'resolved','dead',2],['avoid_death',[2],'resolved','unconscious',1],['blaze_of_glory',[],'awaiting_final_action','blaze_pending',0]])test(`composed native workflow resolves ${move} without inventing a final action`,async t=>{
  const f=fixture(t),w=workflowFixture(t,f,{faces});await w.present();await w.click('reviewed');await w.click(move);const outcome=f.actions.readIncomingDeathOutcome('c','attack');assert.equal(outcome.status,status);assert.equal(outcome.result,result);assert.equal(w.draws.length,drawCount);assert.equal(w.sent.length,2);w.reopen();assert.equal((await w.present()).status,status);assert.equal(w.draws.length,drawCount);assert.deepEqual(w.errors,[]);
});
test('native workflow reconciles saved delivery without issuing another prompt',async t=>{
  const f=fixture(t),w=workflowFixture(t,f);w.setMode('read-fails');await assert.rejects(w.present(),/Readback failed/);assert.equal(w.sent.length,1);w.reopen();w.setMode('ok');assert.equal((await w.present()).status,'presented');assert.equal(w.sent.length,1);
});
test('native workflow cannot bypass an uncertain send or expired prompt by issuing a fresh one',async t=>{
  const f=fixture(t),w=workflowFixture(t,f);w.setMode('send-fails');await assert.rejects(w.present());w.reopen();w.setMode('ok');assert.equal((await w.present()).status,'native_review_required');assert.equal(w.sent.length,0);
  const g=fixture(t),v=workflowFixture(t,g);await v.present();for(let i=0;i<11;i++)g.expire();assert.equal((await v.present()).status,'native_review_required');assert.equal(v.sent.length,1);
});
test('native workflow resumes a durably saved owner choice before fate and draws once',async t=>{
  const f=fixture(t);await f.stage(f.issue());await f.stage(f.issue('death_choice','risk_it_all'));f.reopen();const w=workflowFixture(t,f);assert.equal((await w.present()).purpose,'death_allocation');assert.equal(w.draws.length,2);w.reopen();await w.present();assert.equal(w.draws.length,2);assert.equal(w.sent.length,1);
});
test('competing workflow presentation calls share one durable prompt and send',async t=>{
  const f=fixture(t),w=workflowFixture(t,f),results=await Promise.allSettled([w.present(),w.present()]);assert.ok(results.some(r=>r.status==='fulfilled'));assert.equal(w.sent.length,1);const first=results.find(r=>r.status==='fulfilled').value;assert.equal((await w.present()).promptRef,first.promptRef);assert.equal(w.sent.length,1);
});
test('changed workflow terms cannot bypass an earlier uncertain prompt',async t=>{
  const f=fixture(t),w=workflowFixture(t,f);w.setMode('send-fails');await assert.rejects(w.present());f.features.push('New owned fact');w.setMode('ok');await assert.rejects(w.present(),/Existing death prompts require native reconciliation/);assert.equal(w.sent.length,0);assert.equal(w.draws.length,0);
});
test('failed next-prompt publication preserves committed review and holds progression without a fresh send',async t=>{
  const f=fixture(t),w=workflowFixture(t,f);await w.present();w.setMode('send-fails');const click=await w.click('reviewed');assert.equal(click.row.processing,'committed');assert.equal(click.row.hold,'progression');assert.equal(f.actions.readIncomingDeathReview('c','attack').evidence.id,click.event.id);assert.equal(f.actions.readIncomingDeathChoice('c','attack'),null);w.reopen();w.setMode('ok');assert.equal((await w.present()).status,'native_review_required');assert.equal(w.sent.length,1);assert.equal(w.draws.length,0);
});
test('native workflow Critical clears HP and Stress without requesting an allocation',async t=>{
  const f=fixture(t),w=workflowFixture(t,f,{faces:[6,6]});await w.present();await w.click('reviewed');await w.click('risk_it_all');assert.equal(f.actions.readPcLife('c','pc').defenses.hp.current,0);assert.equal(f.actions.readPcLife('c','pc').life.stress.current,0);assert.equal(f.actions.readIncomingDeathOutcome('c','attack').result,'recovered');assert.equal(w.sent.length,2);assert.equal(w.draws.length,2);assert.deepEqual(w.errors,[]);
});
const receiptHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function receiptGap(t,f,event,{ack='deferred'}={}){
  const receipts=openInteractionReceipts(),d=f.decisions.get(event.interaction.id).record,binding={id:d.interactionId,campaignId:d.campaignId,sceneId:d.sceneId,actorId:d.actorId,principal:d.principal,channelId:d.channelId,messageId:d.messageId,promptRef:d.promptRef,tokenHash:receiptHash(event.interaction.customId)};receipts.claim(binding,{check:()=>{}});receipts.acknowledge(binding.id,ack,{check:()=>{}});receipts.hold(binding.id,'receipt',{check:()=>{}});t.after(()=>receipts.close());
  return {receipts,reconcile:(check=()=>{})=>createDeathInteractionReconciliation({interactionReceipts:receipts,decisionStore:f.decisions,promptStore:f.prompts,actionStore:f.actions,sourceAuthority:f.sources,readActorSnapshot:f.snapshot}).reconcile(binding.id,{check})};
}
test('canonical review reconciliation repairs only transport bookkeeping and withholds unsent confirmation',async t=>{
  const f=fixture(t),e=f.issue(),saved=await f.stage(e),gap=receiptGap(t,f,e),before=f.actions.readPcLife('c','pc');f.reopen();const row=gap.reconcile();assert.equal(row.processing,'committed');assert.equal(row.reply,'withheld');assert.equal(row.ack,'deferred');assert.equal(row.hold,'receipt');assert.equal(row.receipt.id,saved.id);assert.equal(row.receipt.hash,receiptHash(saved));assert.deepEqual(gap.reconcile(),row);assert.deepEqual(f.actions.readPcLife('c','pc'),before);assert.throws(()=>gap.receipts.claimReply(e.interaction.id,{check:()=>{}}));
});
test('canonical choice reconciliation survives native death and expiry without renewing active control',async t=>{
  const f=fixture(t);await f.stage(f.issue());const e=f.issue('death_choice','risk_it_all');await f.stage(e);const gap=receiptGap(t,f,e),faces=[1,12];f.actions.resolveIncomingDeath('c','attack',{check:()=>{},sourceAuthority:f.sources,readActorSnapshot:f.snapshot,rng:()=>faces.shift()});f.expire();f.reopen();assert.equal(f.actions.readPcLife('c','pc').life.status,'dead');const row=gap.reconcile();assert.equal(row.processing,'committed');assert.equal(row.reply,'withheld');assert.equal(f.actions.readPcLife('c','pc').life.status,'dead');assert.throws(()=>f.sources.inspectReference(row.reconciliation.sourceRef,row.reconciliation.sourceRevision));
});
test('canonical allocation reconciliation preserves the exact saved split and native dice',async t=>{
  const f=fixture(t);await pendingRecovery(f);const e=f.issue('death_allocation','allocate:3:2'),saved=await f.stage(e),gap=receiptGap(t,f,e),before=f.actions.readPcLife('c','pc');f.reopen();assert.equal(gap.reconcile().receipt.hash,receiptHash(saved));assert.deepEqual(f.actions.readPcLife('c','pc'),before);assert.deepEqual(f.actions.readIncomingDeathOutcome('c','attack').roll,saved.roll);
});
test('missing canonical consequence or edited owner source cannot repair an interaction gap',async t=>{
  const f=fixture(t),e=f.issue();await f.accept(e);const missing=receiptGap(t,f,e);assert.throws(()=>missing.reconcile(),/canonical affected-owner/);assert.equal(missing.receipts.read(e.interaction.id).processing,'held');
  const g=fixture(t),other=g.issue();await g.stage(other);const edited=receiptGap(t,g,other),{revision,...message}=g.scenes.readers.readMessage('c',other.interaction.id);g.scenes.commitSnapshot({campaignId:'c',principal:'u',sourceRef:'edit',records:[{kind:'message',data:{...message,text:'Edited owner source'},expectedRevision:Number(revision)}]},{check:()=>{}});assert.throws(()=>edited.reconcile());assert.equal(edited.receipts.read(other.interaction.id).receipt,null);
});
test('caller denial and final native authorization rollback leave reconciliation held',async t=>{
  const f=fixture(t),e=f.issue();await f.stage(e);const gap=receiptGap(t,f,e);assert.throws(()=>gap.reconcile(()=>{throw new Error('Caller denied');}),/Caller denied/);let calls=0;assert.throws(()=>gap.reconcile(()=>{if(++calls===5)throw new Error('Final authorization revoked');}),/Final authorization revoked/);const row=gap.receipts.read(e.interaction.id);assert.equal(row.processing,'held');assert.equal(row.receipt,null);assert.equal(row.reconciliation,undefined);assert.equal(row.reply,'not_started');
});
test('canonical repair preserves uncertain acknowledgement and never permits a reply retry',async t=>{
  const f=fixture(t),e=f.issue();await f.stage(e);const gap=receiptGap(t,f,e,{ack:'uncertain'}),row=gap.reconcile();assert.equal(row.processing,'committed');assert.equal(row.ack,'uncertain');assert.equal(row.reply,'withheld');assert.throws(()=>gap.receipts.claimReply(e.interaction.id,{check:()=>{}}));
});
test('composed native reconciliation rechecks caller scope after cold reopen and sends nothing',async t=>{
  const f=fixture(t),w=workflowFixture(t,f);await w.present();const review=await w.click('reviewed');w.reopen();const count=w.sent.length;assert.throws(()=>w.workflow.reconcile(review.event.id),/caller authorization/);const row=w.workflow.reconcile(review.event.id,{check:()=>{}});assert.equal(row.processing,'committed');assert.equal(row.reply,'delivered');assert.equal(w.sent.length,count);assert.equal(w.draws.length,0);
});
function commandFixture(t,f,w){
  const replies=[],errors=[];let defers=0,sequence=0;
  const commands=createDiscordDeathCommands({client:f.client,workflow:w.workflow,actionStore:f.actions,sceneStore:f.scenes,readActorSnapshot:f.snapshot,readRoute:()=>({guildId:'c',channelId:'private',sceneId:'s',ownerUserId:'u'}),interactionReceipts:w.receipts,onError:(error,meta)=>errors.push({error,meta})});t.after(()=>commands.close());
  function event(input={op:'death-review',request:'incoming-death:attack'},{commandName='vc-roll',userId='u'}={}){return {id:`native-command-${++sequence}`,client:f.client,commandName,guildId:'c',channelId:'private',user:{id:userId,bot:false},isChatInputCommand:()=>true,isButton:()=>false,options:{getSubcommandGroup:()=>commandName==='vc'?'roll':null,getSubcommand:()=> 'effect',getString:()=>JSON.stringify(input)},deferred:false,replied:false,async deferReply(options){assert.equal(options.flags,MessageFlags.Ephemeral);defers++;this.deferred=true;},async editReply(options){assert.deepEqual(options.allowedMentions,{parse:[]});replies.push(options.content);this.replied=true;}};}
  async function run(e){f.client.emit('interactionCreate',e);return commands.handle(e);}
  return {commands,event,run,replies,errors,get defers(){return defers;}};
}
test('native command aliases privately present controls without accepting risks or rolling',async t=>{
  const f=fixture(t),w=workflowFixture(t,f),c=commandFixture(t,f,w);for(const commandName of ['vc-roll','vc']){const e=c.event(undefined,{commandName});assert.equal((await c.run(e)).status,'committed');assert.equal(w.receipts.read(e.id).binding.kind,'discord_command');}
  assert.equal(w.sent.length,1);assert.equal(w.draws.length,0);assert.equal(c.defers,2);assert.equal(f.actions.readIncomingDeathReview('c','attack'),null);assert.equal(f.actions.readIncomingDeathChoice('c','attack'),null);assert.deepEqual(c.errors,[]);
});
test('native command must be client-observed and refuses other owners without reading their controls',async t=>{
  const f=fixture(t),w=workflowFixture(t,f),c=commandFixture(t,f,w),unseen=c.event();await assert.rejects(c.commands.handle(unseen),/Observed/);await assert.rejects(c.run(c.event(undefined,{userId:'outsider'})),/owned native/);assert.equal(c.defers,0);assert.equal(w.sent.length,0);assert.equal(w.draws.length,0);
});
test('native command duplicate and cold claim cannot repeat publication or private response',async t=>{
  const f=fixture(t),w=workflowFixture(t,f),c=commandFixture(t,f,w),e=c.event();await c.run(e);assert.equal((await c.run(e)).status,'already_claimed');assert.equal(c.defers,1);c.commands.close();w.reopen();const restored=commandFixture(t,f,w);assert.equal((await restored.run(e)).status,'already_claimed');assert.equal(restored.defers,0);assert.equal(w.sent.length,1);
});
test('native command observation leaves legacy operations and natural speech untouched',async t=>{
  const f=fixture(t),w=workflowFixture(t,f),c=commandFixture(t,f,w);for(const input of [{op:'death-review',request:'legacy-request'},{op:'death-choose',request:'incoming-death:attack',move:'risk_it_all'},{op:'inbox'},{op:'death-review',request:'incoming-death:attack',owner:'other'}])assert.equal(await c.run(c.event(input)),false);const speech={id:'chat',client:f.client,isChatInputCommand:()=>false,content:'I ask the guard for directions.'};f.client.emit('interactionCreate',speech);assert.equal(await c.commands.handle(speech),false);assert.equal(c.defers,0);assert.equal(w.sent.length,0);
});
test('native command rechecks session authority after private defer and gives only a generic hold',async t=>{
  const f=fixture(t),w=workflowFixture(t,f),c=commandFixture(t,f,w),e=c.event(),base=e.deferReply;e.deferReply=async function(options){await base.call(this,options);const {revision,...session}=f.scenes.readers.readSession('c','session');f.scenes.commitSnapshot({campaignId:'c',principal:'admin',sourceRef:'end-session',records:[{kind:'session',data:{...session,status:'ended'},expectedRevision:Number(revision)}]},{check:()=>{}});};
  assert.equal((await c.run(e)).status,'native_review_required');assert.equal(w.receipts.read(e.id).processing,'held');assert.equal(c.replies.length,1);assert.doesNotMatch(c.replies[0],/attack|session|source:|SECRET/);assert.equal(w.sent.length,0);assert.equal(w.draws.length,0);
});
test('native command reconciles only the current owner receipt without replaying effects or prompts',async t=>{
  const f=fixture(t),w=workflowFixture(t,f);await w.present();const review=await w.click('reviewed'),c=commandFixture(t,f,w),count=w.sent.length;const e=c.event({op:'death-reconcile',interaction:review.event.id});assert.equal((await c.run(e)).status,'committed');assert.equal(w.sent.length,count);assert.equal(w.draws.length,0);assert.match(c.replies[0],/No effects or replies were replayed/);assert.equal(w.receipts.read(review.event.id).reply,'delivered');
});
test('native command public invocation still publishes controls only to the owner private route',async t=>{
  const f=fixture(t),w=workflowFixture(t,f),c=commandFixture(t,f,w);f.scenes.commitSnapshot({campaignId:'c',principal:'admin',sourceRef:'party-setup',records:[{kind:'channel',expectedRevision:null,data:{id:'party',campaignId:'c',sceneId:'s',kind:'party',permissionsVerified:true,recipientIds:['u'],writerIds:['u']}}]},{check:()=>{}});
  const guild=await f.client.guilds.fetch(),fetch=guild.channels.fetch,privateChannel=await fetch('private');guild.channels.fetch=async channelId=>channelId==='party'?{...privateChannel,id:'party'}:fetch(channelId);
  const event=c.event();event.channelId='party';assert.equal((await c.run(event)).status,'committed');assert.equal(w.sent.length,1);assert.equal(w.sent[0].channelId,'private');assert.equal(c.defers,1);assert.equal(f.actions.readIncomingDeathReview('c','attack'),null);
});
test('native command refreshed permission snapshot rejects a new private observer before publication',async t=>{
  const f=fixture(t),w=workflowFixture(t,f),c=commandFixture(t,f,w),guild=await f.client.guilds.fetch(),members=await guild.members.fetch();members.set('outsider',{id:'outsider',permissions:new PermissionsBitField([]),roles:{cache:new Map()}});guild.memberCount=members.size;
  const event=c.event();assert.equal((await c.run(event)).status,'native_review_required');assert.equal(w.receipts.read(event.id).processing,'held');assert.equal(w.sent.length,0);assert.equal(w.draws.length,0);assert.equal(c.replies.length,1);assert.doesNotMatch(c.replies[0],/private_channel_audience|outsider|incoming-death/);
});
test('native command confirmation failure preserves completed presentation without replaying it',async t=>{
  const f=fixture(t),w=workflowFixture(t,f),c=commandFixture(t,f,w),event=c.event();let replies=0;event.editReply=async()=>{replies++;throw new Error('Private reply unavailable');};assert.equal((await c.run(event)).status,'committed');assert.equal(w.receipts.read(event.id).reply,'uncertain');assert.equal((await c.run(event)).status,'already_claimed');assert.equal(w.sent.length,1);assert.equal(replies,1);assert.equal(c.defers,1);
});
