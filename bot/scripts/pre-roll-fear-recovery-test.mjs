/** Authenticated recovery cannot turn transport uncertainty into permission or rewrite native effects. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {writeFearReservation,fearReservationHash as hash} from '../src/fear-reservations.js';
import {recoverPreRollFear,assertPreRollFearDeathTerminal} from '../src/pre-roll-fear-recovery.js';

function fixture(f){
  const pc=f.pcs[0],binding={version:1,request:'recovery-action',request_revision:'native-request',owner:pc.owner_user_id,
    character:pc.id,principal_revision:'principal',session:f.session.id,scene:'recovery-scene',scope:{mode:'private'},
    npc:'guard',entry_ref:'attack',entry_hash:'entry',board:'board',origin:{source:'revocable-owner-source'},base_cost:1,
    printed_fear_cost:0,decision:'native-decision'};
  f.db.changeFear(f.guild,2);
  const row=writeFearReservation(f.db,f.guild,binding,'awaiting_announcement'),
    interaction={id:'gm-recovery',guildId:f.guild,user:{id:'authenticated-gm'}},authorize=(_db,i)=>i.user.id==='authenticated-gm';
  const review=()=>recoverPreRollFear(f.db,interaction,{op:'pre-roll-fear-review',key:row.record_key},authorize);
  const cancel=revision=>recoverPreRollFear(f.db,interaction,{op:'pre-roll-fear-cancel',key:row.record_key,
    expected_revision:revision,reason:'Exact unused intervention cancelled after review.'},authorize);
  return {row,binding,interaction,authorize,review,cancel};
}
function publication(f,x,status){
  const turn=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:'fear-recovery-notice',actorPrincipal:'gm',audience:'private'}),
    part=f.db.enqueuePublication(f.guild,{turnId:turn.turn_id,surface:'private',ordinal:0,visibility:'character',
      targetUserId:x.binding.owner,targetCharacterId:x.binding.character,payload:'Reserved native interruption.',payloadHash:'hash'});
  f.db.saveCityRecord(f.guild,{kind:'pre_roll_fear_publication',key:`pre-roll-fear-publication:${hash(x.row.record_key)}`,
    source_event:x.row.source_event,visibility:'gm',data:{turn_id:turn.turn_id}});
  f.db.updatePublication(part.id,{status,attemptCount:1,...(status==='delivered'?{discordMessageId:'ack',channelId:'dm'}:{})});
  return part;
}
test('GM recovery releases only immutable unused reservation, survives revoked context and is idempotent without pool refund',()=>nativeFixture(f=>{
  const x=fixture(f),v=x.review();assert.equal(v.status,'awaiting_announcement');assert.equal(v.effect_committed,false);
  assert.throws(()=>recoverPreRollFear(f.db,{...x.interaction,user:{id:'player-0'}},
    {op:'pre-roll-fear-review',key:x.row.record_key},x.authorize),/authenticated GM/i);
  assert.throws(()=>x.cancel('forged revision'),/revision|changed/i);
  const done=x.cancel(v.revision);assert.equal(done.status,'cancelled');assert.equal(f.db.getCampaign(f.guild).fear,2);
  assert.equal(x.cancel(v.revision).status,'cancelled');f.restart();assert.equal(x.review().status,'cancelled');
  assert.equal(f.db.getCampaign(f.guild).fear,2);
}));
test('acknowledged but unexecuted cancellation is safe; uncertain delivery must use exact publication reconciliation first',()=>nativeFixture(f=>{
  const x=fixture(f),part=publication(f,x,'uncertain'),v=x.review();
  assert.throws(()=>x.cancel(v.revision),/uncertain|delivery/i);
  assert.equal(f.db.getCityRecord(f.guild,'pre_roll_fear_interrupt',x.row.record_key).status,'awaiting_announcement');
  f.db.updatePublication(part.id,{status:'delivered',discordMessageId:'ack',channelId:'dm'});
  assert.throws(()=>x.cancel(v.revision),/revision|changed/i);
  assert.equal(x.cancel(x.review().revision).status,'cancelled');assert.equal(f.db.getCampaign(f.guild).fear,2);
}));
test('committed native cost, dice and forged lifecycle projection never qualify as unused cancellation',()=>nativeFixture(f=>{
  const x=fixture(f),v=x.review();
  f.db.saveCityRecord(f.guild,{kind:'gm_action_cost_receipt',key:`gm-action-cost:${hash([x.binding.decision,x.row.record_key])}`,
    status:'committed',visibility:'gm',source_event:x.row.source_event,data:{decision:x.binding.decision}});
  assert.throws(()=>x.cancel(v.revision),/committed|revision|changed/i);
  f.db.saveCityRecord(f.guild,{...x.row,key:x.row.record_key,status:'cancelled'});
  assert.throws(x.review,/ancestry|mutation/i);assert.equal(f.db.getCampaign(f.guild).fear,2);
}));
test('last-HP interruption cannot finish from a forged or pending owner death outcome',()=>nativeFixture(f=>{
  const pc=f.pcs[0],attack={record_key:'incoming-last-hp',subject_key:pc.id},source=fixture(f).row.source_event;
  f.db.saveCityRecord(f.guild,{kind:'pc_effect_receipt',key:`${attack.record_key}:damage`,status:'resolved',visibility:'character',subject_key:pc.id,source_event:source,
    data:{after:{hp:{current:6,max:6}}}});
  assert.throws(()=>assertPreRollFearDeathTerminal(f.db,f.guild,attack),/death|owner/i);
  f.db.saveCityRecord(f.guild,{kind:'pc_death_outcome',key:`${attack.record_key}:death:outcome`,status:'resolved',visibility:'character',subject_key:pc.id,source_event:source,
    data:{result:'recovered'}});
  assert.throws(()=>assertPreRollFearDeathTerminal(f.db,f.guild,attack),/death|native|private/i);
}));
test('saved NPC dice block cancellation even if the reservation projection still says awaiting announcement',()=>nativeFixture(f=>{
  const x=fixture(f);
  f.db.saveCityRecord(f.guild,{kind:'pc_incoming_attack',key:'already-rolled-incoming',status:'awaiting_armor',
    visibility:'character',subject_key:x.binding.character,source_event:x.row.source_event,
    data:{offer:{input:{ruling:`ai-decision:${x.binding.decision}`}},roll:'native-saved-roll'}});
  const v=x.review();assert.equal(v.effect_committed,true);assert.equal(v.can_cancel,false);
  assert.throws(()=>x.cancel(v.revision),/committed/i);assert.equal(f.db.getCampaign(f.guild).fear,2);
}));
