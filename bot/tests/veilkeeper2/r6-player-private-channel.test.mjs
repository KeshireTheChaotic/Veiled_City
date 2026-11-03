import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {openInteractionReceipts} from '../../src/v2/interaction-receipts.js';
import {createDiscordPlayerChannel} from '../../src/v2/discord-player-channel.js';
function fixture(t,{owner='u'}={}){
  const store=openSceneStore(),receipts=openInteractionReceipts(),client=new EventEmitter(),errors=[],replies=[],state={drift:false,calls:0};
  store.commitSnapshot({campaignId:'c',principal:'gm',sourceRef:'fx',records:[{kind:'session',data:{id:'sess',campaignId:'c',status:'active'}},{kind:'scene',data:{id:'s',campaignId:'c',sessionId:'sess',status:'active',participants:[]}},{kind:'actor',data:{id:'pc',campaignId:'c',sceneId:'s',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'}}].map(r=>({...r,expectedRevision:null}))},{check:()=>{}});
  const service=createDiscordPlayerChannel({client,sceneStore:store,interactionReceipts:receipts,readOwnerSession:(c,u)=>u===owner?{campaignId:'c',ownerUserId:'u',actorId:'pc',sceneId:'s',sessionId:'sess',gmRoleId:'gm'}:null,audienceReader:{read:async s=>{state.calls++;assert.equal(s.mode,'private');assert.equal(s.ownerUserId,'u');assert.equal(s.gmRoleId,'gm');return {channelRecord:{id:s.channelId,campaignId:s.guildId,sceneId:s.sceneId,kind:'private',permissionsVerified:true,recipientIds:['u'],writerIds:['u'],ownerUserId:'u'},fingerprint:state.drift?`fp${state.calls}`:'fp'};}},onError:e=>errors.push(e.message)});
  t.after(()=>{service.close();receipts.close();store.close();});
  const event=(o={})=>{const e={id:'i1',client,guildId:'c',channelId:'123456',user:{id:'u',bot:false},commandName:'vc-player',deferred:false,replied:false,isChatInputCommand:()=>true,options:{getSubcommand:()=> 'private-channel',getSubcommandGroup:()=>null},async deferReply(x){e.deferred=true;replies.push(['defer',x.flags]);},async editReply(x){replies.push(['reply',x.content]);},...o};client.emit('interactionCreate',e);return e;};
  return {store,receipts,service,event,replies,errors,state};
}
test('the owner registers their own channel with /vc-player private-channel, privately and once',async t=>{
  const f=fixture(t),e=f.event(),r=await f.service.handle(e);assert.equal(r.status,'committed',f.errors.join('|'));
  const ch=f.store.readers.readChannel('c','123456');assert.equal(ch.kind,'private');assert.equal(ch.sceneId,'s');assert.equal(ch.ownerUserId,'u');assert.deepEqual([...ch.recipientIds],['u']);assert.equal(f.state.calls,2);
  assert.match(f.replies.at(-1)[1],/now your private GM channel/);assert.equal(f.receipts.read('i1').reply,'delivered');assert.equal((await f.service.handle(e)).status,'already_claimed');assert.equal(f.state.calls,2);
  const again=f.event({id:'i2'});assert.equal((await f.service.handle(again)).status,'committed');assert.equal(f.store.history('c','channel','123456').length,2);
});
test('a changing audience or a channel bound elsewhere is held for review and nothing is written',async t=>{
  const f=fixture(t);f.state.drift=true;assert.equal((await f.service.handle(f.event())).status,'native_review_required');assert.equal(f.store.readers.readChannel('c','123456'),null);assert.match(f.replies.at(-1)[1],/needs native review/);assert.equal(f.receipts.read('i1').processing,'held');
  f.state.drift=false;f.store.commitSnapshot({campaignId:'c',principal:'gm',sourceRef:'other',records:[{kind:'channel',expectedRevision:null,data:{id:'999999',campaignId:'c',sceneId:'elsewhere',kind:'private',permissionsVerified:true,recipientIds:['u'],writerIds:['u'],ownerUserId:'u'}}]},{check:()=>{}});
  assert.equal((await f.service.handle(f.event({id:'i3',channelId:'999999'}))).status,'native_review_required');assert.equal(f.store.readers.readChannel('c','999999').sceneId,'elsewhere');
});
test('a user without a registered character, a bot, or an unobserved event cannot register a channel',async t=>{
  const f=fixture(t,{owner:'someone-else'});await assert.rejects(f.service.handle(f.event()),/Current owned character/);assert.equal(f.store.readers.readChannel('c','123456'),null);
  const g=fixture(t);const unobserved={id:'x',client:{},guildId:'c',channelId:'1',user:{id:'u',bot:false},commandName:'vc-player',isChatInputCommand:()=>true,options:{getSubcommand:()=> 'private-channel',getSubcommandGroup:()=>null}};await assert.rejects(g.service.handle(unobserved));
  assert.equal(g.service.claimsRoute(g.event({options:{getSubcommand:()=> 'accessibility',getSubcommandGroup:()=>null}})),false);assert.equal(g.service.claimsRoute(g.event({commandName:'vc-roll'})),false);
});
