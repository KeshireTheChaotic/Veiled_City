import test from 'node:test';
import assert from 'node:assert/strict';
import {notSent,validatePublicationAcknowledgement,outboxSummary} from '../../src/frameworks/publication/delivery-receipts.js';
import {notSent as rootNotSent,validatePublicationAcknowledgement as rootValidate,outboxSummary as rootSummary} from '../../src/publication-outbox.js';
import {notSent as publicNotSent,validatePublicationAcknowledgement as publicValidate,outboxSummary as publicSummary} from '../../src/frameworks/publication/public.js';

test('historical and public receipt exports retain single implementation identity',()=>{
  assert.equal(notSent,rootNotSent);assert.equal(notSent,publicNotSent);assert.equal(validatePublicationAcknowledgement,rootValidate);assert.equal(rootValidate,publicValidate);assert.equal(outboxSummary,rootSummary);assert.equal(rootSummary,publicSummary);
});
test('proven non-send creates original Error with original certainty and message',()=>{
  const error=notSent('Exact guard rejected');assert.ok(error instanceof Error);assert.equal(error.message,'Exact guard rejected');assert.equal(error.deliveryCertainty,'not_sent');
});
test('exact valid acknowledgement returns original receipt and permits dynamic destination only when unpinned',()=>{
  const receipt={messageId:'message',channelId:'channel',ok:true,extra:'preserved'};
  assert.equal(validatePublicationAcknowledgement({channel_id:'channel'},receipt),receipt);
  assert.equal(validatePublicationAcknowledgement({channel_id:null},receipt),receipt);
  assert.equal(validatePublicationAcknowledgement({},receipt),receipt);
});
test('missing/blank/failed/mismatched receipts remain uncertain without mutating original rows',()=>{
  const row={channel_id:'channel'},before=structuredClone(row);
  for(const receipt of [null,{}, {messageId:'message'}, {messageId:' ',channelId:'channel'}, {messageId:2,channelId:'channel'}, {messageId:'message',channelId:' '}, {messageId:'message',channelId:'other'}, {messageId:'message',channelId:'channel',ok:false}]){
    assert.throws(()=>validatePublicationAcknowledgement(row,receipt),error=>error.deliveryCertainty==='uncertain'&&error.message==='Delivery needs an exact acknowledged Discord message/channel receipt.');
  }
  assert.deepEqual(row,before);
});
test('summary preserves durable field names/uncertainty/defaults without exposing payload or audience secrets',()=>{
  const row={id:'p',turn_id:'turn',surface:'private_user:owner',ordinal:2,visibility:'character',status:'uncertain',attempt_count:3,discord_message_id:null,last_failure:null,payload:'private text',target_user_id:'owner',target_character_id:'pc'},before=structuredClone(row);
  assert.deepEqual(outboxSummary(row),{id:'p',turn_id:'turn',surface:'private_user:owner',ordinal:2,visibility:'character',status:'uncertain',attempts:3,discord_message_id:null,uncertain:true,last_failure:''});
  assert.deepEqual(row,before);
  assert.equal(outboxSummary({...row,status:'failed',discord_message_id:'message',last_failure:'NOT_SENT: guard'}).uncertain,false);
});
