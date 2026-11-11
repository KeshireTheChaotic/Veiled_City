import test from 'node:test';
import assert from 'node:assert/strict';
import {join,dirname} from 'node:path';
import {nativeRollNoticeFixture} from './helpers/native-roll-notice-fixture.mjs';
import {openComponentDecisionStore} from '../../src/v2/component-decision-store.js';
import {createDiscordOwnerRollChoices} from '../../src/v2/discord-owner-roll-choices.js';

async function fixture(t,{publish=true}={}){
  let decisions,observer;t.after(()=>{observer?.close();decisions?.close();});
  const f=nativeRollNoticeFixture(t);if(publish)await f.publisher().publish(f.source,f.request.id);
  const file=join(dirname(f.file),'owner-choices.sqlite');decisions=openComponentDecisionStore(file);
  const makeObserver=()=>createDiscordOwnerRollChoices({client:f.client,sceneStore:f.scenes,sourceAuthority:f.authority,rollStore:f.rolls,preparation:f.prepare(),notices:f.publisher(),decisionStore:decisions,clock:()=>30000});observer=makeObserver();
  const event=(id='choice',over={})=>({id,client:f.client,guildId:'g',channelId:'private',user:{id:'historical-owner',bot:false},createdTimestamp:20000,isChatInputCommand:()=>true,commandName:'vc-roll',options:{getSubcommand:()=> 'resolve',getString:()=>f.request.id,getInteger(){throw new Error('Owner cannot provide faces or modifiers');}},...over});
  const accept=async e=>{f.client.emit('interactionCreate',e);return observer.accept(e);};
  return {...f,get decisions(){return decisions;},get observer(){return observer;},event,accept,reopenChoices(){observer.close();decisions.close();decisions=openComponentDecisionStore(file);observer=makeObserver();},reopenAll(){observer.close();decisions.close();f.reopen();decisions=openComponentDecisionStore(file);observer=makeObserver();},get rolls(){return f.rolls;}};
}
test('observed owner command records exact delivered terms as evidence without dice or execution authority',async t=>{
  const f=await fixture(t),before=f.actions.readHope('g','pc'),choice=await f.accept(f.event());assert.equal(choice.decision,'roll');assert.equal(choice.requestRef,f.request.id);assert.equal(choice.actorId,'pc');assert.equal(choice.purpose,'owner_roll_choice_evidence');assert.equal(choice.executionAuthority,false);assert.equal(choice.effectsCommitted,false);assert.equal(choice.termHash,f.request.termProof.hash);assert.equal(f.rolls.readResultForRequest('g',f.request.id),null);assert.deepEqual(f.actions.readHope('g','pc'),before);assert.equal(f.sent.length,1);assert.doesNotMatch(JSON.stringify(choice),/native-only-condition-canary/);
});
test('cold decision-store reopen and SDK replay preserve one immutable observation and no dice',async t=>{
  const f=await fixture(t),e=f.event(),first=await f.accept(e);f.reopenChoices();assert.deepEqual(f.observer.readNative(e.id),first);const replay=await f.accept(e);assert.deepEqual(replay,first);assert.equal(replay.sequence,1);assert.equal(f.rolls.readResultForRequest('g',f.request.id),null);assert.equal(f.sent.length,1);
});
test('unobserved, bot, foreign-owner, foreign-channel and freeform dice commands cannot record a choice',async t=>{
  const f=await fixture(t);await assert.rejects(()=>f.observer.accept(f.event('unobserved')),/observed/);
  for(const e of [f.event('bot',{user:{id:'historical-owner',bot:true}}),f.event('other',{user:{id:'other',bot:false}}),f.event('channel',{channelId:'other'}),f.event('free',{options:{getSubcommand:()=> 'duality'}})]){await assert.rejects(()=>f.accept(e));assert.equal(f.decisions.get(e.id),null);}assert.equal(f.rolls.readResultForRequest('g',f.request.id),null);
});
test('a choice before the actual notice timestamp, an expired interaction or missing delivery is rejected',async t=>{
  const f=await fixture(t);for(const createdTimestamp of [5000,-300000,35001]){const e=f.event('time-'+createdTimestamp,{createdTimestamp});await assert.rejects(()=>f.accept(e));assert.equal(f.decisions.get(e.id),null);}
  const noNotice=await fixture(t,{publish:false});await assert.rejects(()=>noNotice.accept(noNotice.event('no-notice')));assert.equal(noNotice.decisions.get('no-notice'),null);
});
test('changed visible notice/source and replay principal cannot be promoted into a saved choice',async t=>{
  const body=await fixture(t);body.sent[0].content='Changed odds.';await assert.rejects(()=>body.accept(body.event()));assert.equal(body.decisions.get('choice'),null);
  const source=await fixture(t);source.original.content='Edited declaration.';await assert.rejects(()=>source.accept(source.event()));assert.equal(source.decisions.get('choice'),null);
  const replay=await fixture(t);await replay.accept(replay.event());await assert.rejects(()=>replay.accept(replay.event('choice',{user:{id:'other',bot:false}})),/replay conflict/);
});
test('persisted choice can be read but cannot remain current after native terms change',async t=>{
  const f=await fixture(t);await f.accept(f.event());f.db.exec("UPDATE world_events SET status='revoked' WHERE event_key='request:source'");assert.throws(()=>f.observer.readNative('choice'));assert.equal(f.decisions.readCommand('choice').record.decision,'roll');assert.equal(f.rolls.readResultForRequest('g',f.request.id),null);
});
test('atomic RNG storage derives faces internally once and preserves exact request/observation binding on replay',async t=>{
  const f=await fixture(t),choice=await f.accept(f.event()),input={interactionId:choice.interactionId,ownerUserId:choice.ownerUserId,bindingHash:choice.bindingHash};let calls=0;
  // Unit native authorization fixture only; this is not a feature activation/readiness adapter.
  const check=()=>{f.check();assert.equal(f.observer.readNative(choice.interactionId).bindingHash,choice.bindingHash);f.prepare().inspectRequest(f.source,f.request.id);};
  const faces=[10,8,2],roll=f.rolls.generateOwnerRoll('g',f.request.id,input,{check,rng:sides=>{assert.equal(sides,calls<2?12:6);return faces[calls++];}});assert.equal(calls,3);assert.equal(roll.hope,10);assert.equal(roll.fear,8);assert.deepEqual(roll.advDice,[2]);assert.equal(roll.interactionBindingHash,choice.bindingHash);assert.equal(roll.termHash,f.request.termProof.hash);
  f.reopenAll();assert.deepEqual(f.rolls.generateOwnerRoll('g',f.request.id,input,{check:f.check,rng(){throw new Error('No reroll');}}),roll);assert.equal(f.actions.readHope('g','pc').hope,4);
});
test('persisted Fear hold blocks native RNG before drawing and accepts no caller-supplied faces',async t=>{
  const f=await fixture(t),choice=await f.accept(f.event()),input={interactionId:choice.interactionId,ownerUserId:choice.ownerUserId,bindingHash:choice.bindingHash};let calls=0;
  assert.throws(()=>f.rolls.generateOwnerRoll('g',f.request.id,{...input,ownerUserId:'other-owner'},{check:f.check,rng(){calls++;return 1;}}),/qualified owner request/);assert.equal(calls,0);
  f.rolls.holdForFear('g',f.request.id,'native-fear',{check:f.check});assert.throws(()=>f.rolls.generateOwnerRoll('g',f.request.id,input,{check:f.check,rng(){calls++;return 1;}}),/Fear interruption/);assert.equal(calls,0);assert.equal(f.rolls.readResultForRequest('g',f.request.id),null);assert.throws(()=>f.rolls.generateOwnerRoll('g',f.request.id,{...input,hope:12},{check:f.check,rng(){calls++;return 12;}}),/interaction binding/);assert.equal(calls,0);
});
test('owner choice cannot predate a later notice edit even when the visible body matches',async t=>{
  const f=await fixture(t);f.sent[0].editedTimestamp=25000;await assert.rejects(()=>f.accept(f.event()),/follow exact delivered stakes/);assert.equal(f.decisions.get('choice'),null);assert.equal(f.rolls.readResultForRequest('g',f.request.id),null);
});
