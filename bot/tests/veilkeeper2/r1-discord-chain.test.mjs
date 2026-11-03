import test from 'node:test';
import assert from 'node:assert/strict';
import {ChannelType,PermissionsBitField,PermissionFlagsBits as P} from 'discord.js';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {createDiscordMessageReader} from '../../src/v2/discord-message-reader.js';
import {createDiscordIntake} from '../../src/v2/discord-intake.js';
import {createDiscordTurnRunner} from '../../src/v2/discord-turn-runner.js';
import {openTurnStore} from '../../src/v2/turn-store.js';
function fixture(t,{durable=false}={}){
  const store=openSceneStore();t.after(()=>store.close());
  store.commitSnapshot({campaignId:'g',principal:'admin',sourceRef:'setup',records:[
    {kind:'session',data:{id:'session',campaignId:'g',status:'active'}},
    {kind:'scene',data:{id:'s',campaignId:'g',sessionId:'session',status:'active',participants:[{userId:'u',actorId:'pc',presence:'present'}]}},
    {kind:'actor',data:{id:'pc',campaignId:'g',sceneId:'s',status:'active',kind:'pc',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'}}
  ].map(r=>({...r,expectedRevision:null}))},{check:()=>{}});
  const state={providerCalls:0,reads:0,outsider:false,onRead:()=>{},onGenerate:()=>{}};
  const members=new Map(['bot','u','outsider'].map(id=>[id,{id,permissions:new PermissionsBitField([]),roles:{cache:new Map()}}]));
  const message={id:'m',guildId:'g',channelId:'ch',author:{id:'u',bot:false},system:false,webhookId:null,content:'Interesting.'};
  const channel={id:'ch',guildId:'g',type:ChannelType.GuildText,messages:{fetch:async()=>message},permissionsFor:m=>new PermissionsBitField(m.id==='outsider'&&!state.outsider?[]:[P.ViewChannel,P.SendMessages])};
  const guild={id:'g',memberCount:3,channels:{fetch:async()=>channel},members:{fetch:async()=>members},roles:{fetch:async()=>new Map()}};
  const native=createDiscordMessageReader({client:{user:{id:'bot'},guilds:{fetch:async()=>guild}}});
  const intake=createDiscordIntake({sceneStore:store,messageReader:{read:async(...args)=>{state.onRead(++state.reads);return native.read(...args);}}});
  const turnStore=durable?openTurnStore():null;if(turnStore)t.after(()=>turnStore.close());
  const makeRunner=()=>createDiscordTurnRunner({intake,turnStore,applicationOptions:{readers:store.readers,records:{metadata:()=>null,readText:()=>null}},provider:{generate:async()=>{state.providerCalls++;state.onGenerate();return {text:'The clerk waits.'};}}});
  return {store,state,message,runner:makeRunner(),makeRunner,turnStore,request:{guildId:'g',channelId:'ch',messageId:'m',userId:'u',actorId:'pc',sceneId:'s',mode:'private',ownerUserId:'u'}};
}
test('complete native chain preserves ordinary one-call speech and keeps publication unsent',async t=>{
  const f=fixture(t),result=await f.runner.respond(f.request),publication=await f.runner.inspectPublication(result.publication.id);
  assert.equal(f.state.providerCalls,1);assert.equal(publication.text,'The clerk waits.');assert.equal(publication.sent,false);assert.equal(publication.knowledgeAcknowledged,false);
  assert.equal(f.store.readers.readMessage('g','m').text,'Interesting.');
});
test('unsafe audience appearing before provider dispatch prevents any inference',async t=>{
  const f=fixture(t);f.state.onRead=n=>{if(n===3)f.state.outsider=true;};await assert.rejects(f.runner.respond(f.request),/generation_failed/);assert.equal(f.state.providerCalls,0);
});
test('audience changed while inference is pending prevents releasing the draft',async t=>{
  const f=fixture(t);f.state.onGenerate=()=>{f.state.outsider=true;};await assert.rejects(f.runner.respond(f.request),/generation_failed/);assert.equal(f.state.providerCalls,1);
});
test('edited messages after generation invalidate asynchronous publication inspection',async t=>{
  const f=fixture(t),result=await f.runner.respond(f.request);f.message.content='Edited source';f.message.editedTimestamp=123;
  await assert.rejects(f.runner.inspectPublication(result.publication.id),/authority/);assert.equal(f.store.readers.readMessage('g','m').text,'Edited source');
});
test('durable claims prevent duplicate inference across runner instances and keep saved prose withheld',async t=>{
  const f=fixture(t,{durable:true});await f.runner.respond(f.request);
  const repeat=await f.makeRunner().respond(f.request);assert.equal(repeat.status,'awaiting_revalidation');assert.equal(f.state.providerCalls,1);
  assert.equal(Object.hasOwn(repeat,'text'),false);assert.equal(Object.hasOwn(repeat,'publication'),false);
});
test('failed inference retains an uncertain durable claim and cannot be silently retried',async t=>{
  const f=fixture(t,{durable:true});f.state.onGenerate=()=>{throw new Error('provider failed');};await assert.rejects(f.runner.respond(f.request),/generation_failed/);
  const retry=await f.makeRunner().respond(f.request);assert.equal(retry.status,'requires_reconciliation');assert.equal(f.state.providerCalls,1);
});
