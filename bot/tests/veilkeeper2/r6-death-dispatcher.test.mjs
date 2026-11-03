import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {MessageFlags} from 'discord.js';
import {openInteractionReceipts} from '../../src/v2/interaction-receipts.js';
import {createDiscordDeathDispatcher} from '../../src/v2/discord-death-dispatcher.js';
function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'vk3-dispatch-')),file=join(dir,'interactions.sqlite'),client=new EventEmitter(),order=[],errors=[];let receipts=openInteractionReceipts(file),mode='ok',dispatcher,release;
  const token=`vk2death:${'a'.repeat(48)}`,prompt={id:'prompt',terms:{campaignId:'c',sceneId:'s',actorId:'pc'}},source={id:'source',revision:'1'};
  const decision={purpose:'death_choice',requestRef:'incoming-death:attack'},receipt={id:'incoming-death-choice:attack',status:'choice_saved',evidence:{id:'click',sourceRef:'source',sourceRevision:'1',actorId:'pc',campaignId:'c',sceneId:'s',ownerUserId:'u',requestRef:decision.requestRef}};
  const event={id:'click',client,isButton:()=>true,user:{id:'u',bot:false},guildId:'c',channelId:'private',message:{id:'prompt-message'},customId:token,deferred:false,replied:false,async deferReply(options){order.push('defer');assert.deepEqual(options,{flags:MessageFlags.Ephemeral});if(mode==='defer-fails')throw new Error('SECRET transport detail');this.deferred=true;},async editReply(options){order.push('reply');assert.deepEqual(options.allowedMentions,{parse:[]});assert.doesNotMatch(options.content,/SECRET/);if(mode==='reply-fails')throw new Error('SECRET reply error');this.replied=true;}};
  function open(){dispatcher=createDiscordDeathDispatcher({client,promptStore:{readPrompt:id=>id===token?prompt:null},decisionReader:{async accept(){order.push('decision');if(mode==='decision-waits')await new Promise(resolve=>{release=resolve;});if(mode==='decision-fails')throw new Error('SECRET owner authority');return decision;}},choiceSources:{async ingest(){order.push('source');if(mode==='source-fails')throw new Error('SECRET native source');return source;}},ingress:{record(){order.push('effects');if(mode==='effects-fails')throw new Error('SECRET consequence rejected');return receipt;}},receipts:new Proxy({}, {get:(_target,key)=>key==='complete'&&mode==='receipt-fails'?()=>{throw new Error('Receipt storage unavailable');}:typeof receipts[key]==='function'?receipts[key].bind(receipts):receipts[key]}),onError:(error,meta)=>errors.push({error,meta})});}
  open();t.after(()=>{dispatcher.close();receipts.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep));rmSync(dir,{recursive:true,force:true});});
  return {client,event,order,errors,receipt,emit:()=>client.emit('interactionCreate',event),get dispatcher(){return dispatcher;},get receipts(){return receipts;},setMode(value){mode=value;},release:()=>release(),reopen(){dispatcher.close();receipts.close();receipts=openInteractionReceipts(file);event.deferred=false;event.replied=false;open();}};
}
test('native listener privately defers, records one outcome and confirms with a durable receipt',async t=>{
  const f=fixture(t);f.emit();await f.dispatcher.drain();assert.deepEqual(f.order,['defer','decision','source','effects','reply']);const row=f.receipts.read('click');assert.equal(row.ack,'deferred');assert.equal(row.processing,'committed');assert.equal(row.reply,'delivered');assert.equal(row.receipt.id,f.receipt.id);assert.match(row.receipt.hash,/^[a-f0-9]{64}$/);assert.equal(f.errors.length,0);
});
test('duplicate observed gateway events and cold restart cannot reprocess or reply again',async t=>{
  const f=fixture(t);f.emit();f.emit();await f.dispatcher.drain();assert.equal(f.order.filter(v=>v==='effects').length,1);f.reopen();f.emit();await f.dispatcher.drain();assert.deepEqual(f.order,['defer','decision','source','effects','reply']);
});
test('other controls, commands, unknown tokens and other clients remain untouched',async t=>{
  const f=fixture(t);let peerCalls=0;f.client.on('interactionCreate',()=>peerCalls++);for(const patch of [{customId:'legacy:button'},{customId:`vk2death:${'b'.repeat(48)}`},{client:new EventEmitter()},{isButton:()=>false},{user:{id:'bot',bot:true}}])f.client.emit('interactionCreate',{...f.event,...patch});await f.dispatcher.drain();assert.equal(peerCalls,5);assert.deepEqual(f.order,[]);assert.equal(f.receipts.read('click'),null);
});
test('uncertain defer response cannot accept a decision or publish a confirmation',async t=>{
  const f=fixture(t);f.setMode('defer-fails');f.emit();await f.dispatcher.drain();assert.deepEqual(f.order,['defer']);assert.equal(f.receipts.read('click').ack,'uncertain');assert.equal(f.receipts.read('click').processing,'held');f.reopen();f.setMode('ok');f.emit();await f.dispatcher.drain();assert.deepEqual(f.order,['defer']);
});
for(const mode of ['decision-fails','source-fails','effects-fails','receipt-fails'])test(`native failure is privately held without exposing details or retrying: ${mode}`,async t=>{
  const f=fixture(t);f.setMode(mode);f.emit();await f.dispatcher.drain();assert.equal(f.receipts.read('click').processing,'held');assert.equal(f.receipts.read('click').reply,'delivered');const before=[...f.order];f.setMode('ok');f.emit();await f.dispatcher.drain();assert.deepEqual(f.order,before);assert.ok(f.errors.length>0);
});
test('saved native outcome survives uncertain confirmation and is never applied twice',async t=>{
  const f=fixture(t);f.setMode('reply-fails');f.emit();await f.dispatcher.drain();assert.equal(f.receipts.read('click').processing,'committed');assert.equal(f.receipts.read('click').reply,'uncertain');assert.equal(f.receipts.read('click').receipt.id,f.receipt.id);f.reopen();f.setMode('ok');f.emit();await f.dispatcher.drain();assert.equal(f.order.filter(v=>v==='effects').length,1);assert.equal(f.order.filter(v=>v==='reply').length,1);
});
test('closing while owner permission reads wait prevents source/effect processing',async t=>{
  const f=fixture(t);f.setMode('decision-waits');f.emit();await new Promise(resolve=>setImmediate(resolve));f.dispatcher.close();f.release();await f.dispatcher.drain();assert.deepEqual(f.order,['defer','decision']);assert.equal(f.receipts.read('click').hold,'closed');assert.equal(f.receipts.read('click').processing,'held');
});
test('already acknowledged controls and changed native interaction scope cannot be processed',async t=>{
  const f=fixture(t);f.event.deferred=true;f.emit();await f.dispatcher.drain();assert.deepEqual(f.order,[]);assert.equal(f.receipts.read('click').processing,'held');
  const g=fixture(t);g.event.deferReply=async()=>{g.event.channelId='other';};g.emit();await g.dispatcher.drain();assert.equal(g.order.includes('effects'),false);assert.equal(g.receipts.read('click').processing,'held');
});
test('durable receipt API rejects replaced identities, repeated replies and arbitrary commit data',t=>{
  const store=openInteractionReceipts();t.after(()=>store.close());const check=()=>{},binding={id:'i',campaignId:'c',sceneId:'s',actorId:'pc',principal:'u',channelId:'ch',messageId:'m',promptRef:'p',tokenHash:'a'.repeat(64)};store.claim(binding,{check});assert.throws(()=>store.claim({...binding,principal:'other'},{check}),/identity conflict/);assert.throws(()=>store.complete('i',{id:'fake',hash:'b'.repeat(64)},{check}));store.acknowledge('i','deferred',{check});assert.throws(()=>store.complete('i',{id:'fake',hash:'bad',statePatch:{}},{check}));store.hold('i','decision',{check});store.claimReply('i',{check});assert.throws(()=>store.claimReply('i',{check}));store.finishReply('i','uncertain',{check});assert.throws(()=>store.finishReply('i','delivered',{check}));
});
