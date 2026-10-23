import test from 'node:test';import assert from 'node:assert/strict';
import {createInteractionTextDelivery} from '../../src/frameworks/discord/public.js';
function interaction({deferred=false,replied=false,reject=null}={}){
  const calls=[],value={deferred,replied,calls};
  for(const method of ['reply','editReply','followUp'])value[method]=async payload=>{calls.push([method,payload]);if(reject)throw reject;};return value;
}
test('reply and follow-ups retain exact first-only attachments/components and suppressed mentions',async()=>{
  const input={text:'opaque'},args=[],files=[{name:'note.md'}],components=[{type:1}],events=[];
  const send=createInteractionTextDelivery({splitDiscordText:(...values)=>{args.push(values);return ['first','second','third'];}}),i=interaction();
  const count=await send(i,input,{ephemeral:true,limit:77,files,components,beforeSend:()=>events.push(i.calls.length)});
  assert.equal(count,3);assert.deepEqual(args,[[input,77]]);assert.deepEqual(events,[0,1,2]);
  assert.deepEqual(i.calls.map(([method])=>method),['reply','followUp','followUp']);
  assert.equal(i.calls[0][1].files,files);assert.equal(i.calls[0][1].components,components);
  assert.deepEqual(i.calls[1][1],{content:'second',ephemeral:true,allowedMentions:{parse:[]}});
});
test('deferred and replied interactions edit once without changing established ephemeral state',async()=>{
  const send=createInteractionTextDelivery({splitDiscordText:()=>['only']});
  for(const flags of [{deferred:true},{replied:true}]){const i=interaction(flags);assert.equal(await send(i,'text',{ephemeral:false}),1);
    assert.deepEqual(i.calls,[['editReply',{content:'only',allowedMentions:{parse:[]}}]]);}
});
test('stale-source beforeSend failure aborts before any send and preserves original error identity',async()=>{
  const stale=new Error('native source invalidated'),i=interaction(),send=createInteractionTextDelivery({splitDiscordText:()=>['one','two']});
  await assert.rejects(send(i,'text',{beforeSend(){throw stale;}}),e=>e===stale);assert.deepEqual(i.calls,[]);
});
test('uncertain transport failure is returned unchanged with no retry or extra part',async()=>{
  const uncertain=Object.assign(new Error('mock uncertain'),{certainty:'uncertain'}),i=interaction({reject:uncertain}),send=createInteractionTextDelivery({splitDiscordText:()=>['one','two']});
  await assert.rejects(send(i,'text'),e=>e===uncertain);assert.equal(i.calls.length,1);assert.equal(i.calls[0][0],'reply');
});
test('per-part source fencing remains between acknowledged first part and unsent siblings',async()=>{
  const stale=new Error('changed before sibling'),i=interaction(),send=createInteractionTextDelivery({splitDiscordText:()=>['one','two']});
  await assert.rejects(send(i,'text',{beforeSend(){if(i.calls.length)throw stale;}}),e=>e===stale);assert.equal(i.calls.length,1);
});
test('explicit capabilities fail before use and independent delivery functions do not share runtime state',async()=>{
  assert.throws(()=>createInteractionTextDelivery({}),/splitting capability/);
  const a=interaction(),b=interaction(),left=createInteractionTextDelivery({splitDiscordText:()=>['left']}),right=createInteractionTextDelivery({splitDiscordText:()=>['right']});
  await Promise.all([left(a,'x'),right(b,'x')]);assert.equal(a.calls[0][1].content,'left');assert.equal(b.calls[0][1].content,'right');
});
