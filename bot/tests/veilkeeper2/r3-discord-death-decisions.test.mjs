import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
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
  return {client,channel,features,snapshot,issue,accept,stage,get actions(){return actions;},get reader(){return reader;},get prompts(){return prompts;},get bridge(){return bridge;},get ingress(){return ingress;},get sources(){return sources;},get decisions(){return decisions;},reopen(){close();open();},expire(){now+=60001;},setFingerprint(v){fingerprint=v;},beforeAudience(fn){beforeAudience=fn;}};
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
