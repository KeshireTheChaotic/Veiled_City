import test from 'node:test';
import assert from 'node:assert/strict';
import {upsertBotMessage} from '../../src/frameworks/publication/reference-delivery.js';
import {initializePublicationDiscord} from '../../src/application/composition/publication-discord.js';
initializePublicationDiscord();
function fixture({prior=null,fetchError=null,editError=null,sendError=null,unavailable=false}={}){
  const calls=[],message={id:'saved-message',async edit(text){calls.push(['edit',text]);if(editError)throw editError;}},created={id:'new-message'};
  const ch={id:'channel',isTextBased:()=>true,messages:{fetch:async id=>{calls.push(['fetch-message',id]);if(fetchError)throw fetchError;return message;}},send:async text=>{calls.push(['send',text]);if(sendError)throw sendError;return created;}};
  const guild={id:'guild',channels:{fetch:async id=>{calls.push(['channel',id]);return unavailable?null:ch;}}},db={getPublished:(...args)=>{calls.push(['get',...args]);return prior;},setPublished:(...args)=>calls.push(['set',...args])};
  return {calls,message,created,options:{db,guild,channelId:'channel',surface:'caseboard',key:'case-1',content:'Verified description',beforeWrite:()=>calls.push(['guard'])}};
}
const saved={message_id:'saved-message',channel_id:'channel'};

test('missing channel returns null without reading receipt, guard or send',async()=>{
  const f=fixture({unavailable:true});assert.equal(await upsertBotMessage(f.options),null);assert.deepEqual(f.calls,[['channel','channel']]);
});
test('existing same-channel reference edits exact message after source guard without new receipt/send',async()=>{
  const f=fixture({prior:saved});assert.equal(await upsertBotMessage(f.options),f.message);
  assert.deepEqual(f.calls,[['channel','channel'],['get','guild','caseboard','case-1'],['fetch-message','saved-message'],['guard'],['edit','Verified description']]);
});
test('only confirmed missing message permits replacement and receipt follows acknowledged send',async()=>{
  for(const error of [Object.assign(new Error('gone'),{code:10008}),Object.assign(new Error('gone'),{status:404})]){
    const f=fixture({prior:saved,fetchError:error});assert.equal(await upsertBotMessage(f.options),f.created);
    assert.deepEqual(f.calls.slice(-3),[['guard'],['send','Verified description'],['set','guild','caseboard','case-1','channel','new-message']]);
  }
});
test('uncertain/nonmissing fetch errors propagate unchanged without replacement',async()=>{
  for(const error of [new Error('timeout'),Object.assign(new Error('string code'),{code:'10008'}),Object.assign(new Error('forbidden'),{status:403})]){
    const f=fixture({prior:saved,fetchError:error});await assert.rejects(upsertBotMessage(f.options),actual=>actual===error);
    assert.ok(!f.calls.some(call=>['guard','send','set','edit'].includes(call[0])));
  }
});
test('ambiguous edit or send never falls through to another send or receipt',async()=>{
  const error=new Error('synthetic uncertain write');let f=fixture({prior:saved,editError:error});
  await assert.rejects(upsertBotMessage(f.options),actual=>actual===error);assert.equal(f.calls.filter(c=>c[0]==='edit').length,1);assert.ok(!f.calls.some(c=>c[0]==='send'||c[0]==='set'));
  f=fixture({sendError:error});await assert.rejects(upsertBotMessage(f.options),actual=>actual===error);assert.equal(f.calls.filter(c=>c[0]==='send').length,1);assert.ok(!f.calls.some(c=>c[0]==='set'));
});
test('late source/visibility guard rejects both edit and create before external write',async()=>{
  for(const prior of [null,saved]){
    const f=fixture({prior}),error=Object.assign(new Error('source changed'),{code:'NARRATIVE_PVP'});f.options.beforeWrite=()=>{throw error;};
    await assert.rejects(upsertBotMessage(f.options),actual=>actual===error);assert.ok(!f.calls.some(c=>['edit','send','set'].includes(c[0])));
  }
});
test('different stored channel creates on current channel and preserves exact 1990-character cap',async()=>{
  const f=fixture({prior:{...saved,channel_id:'old-channel'}});f.options.content='x'.repeat(2100);
  await upsertBotMessage(f.options);assert.ok(!f.calls.some(c=>c[0]==='fetch-message'));assert.equal(f.calls.find(c=>c[0]==='send')[1].length,1990);
});
