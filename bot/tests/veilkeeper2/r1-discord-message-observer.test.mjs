import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {createDiscordMessageObserver} from '../../src/v2/discord-message-observer.js';
function fixture(t,{route={campaignId:'c',ownerUserId:'u',actorId:'pc',sceneId:'s',sessionId:'session',gmRoleId:'gm'}}={}){
  const store=openSceneStore(),client=new EventEmitter(),calls=[],errors=[];
  store.commitSnapshot({campaignId:'c',principal:'admin',sourceRef:'setup',records:[{kind:'channel',data:{id:'ch',campaignId:'c',sceneId:'s',kind:'party',permissionsVerified:true,recipientIds:['u','v'],writerIds:['u','v']}},{kind:'channel',data:{id:'priv',campaignId:'c',sceneId:'s',kind:'private',permissionsVerified:true,recipientIds:['u'],writerIds:['u'],ownerUserId:'u'}}].map(r=>({...r,expectedRevision:null}))},{check:()=>{}});
  const observer=createDiscordMessageObserver({client,sceneStore:store,intake:{ingest:async(req,{signal})=>{assert.equal(signal.aborted,false);calls.push(req);if(req.messageId==='boom')throw new Error('intake failed');return req;}},readOwnerSession:(c,u)=>u==='u'?route:null,onError:e=>errors.push(e.message)});
  t.after(()=>{observer.close();store.close();});
  const msg=(o={})=>({id:'m1',guildId:'c',channelId:'ch',author:{id:'u',bot:false},webhookId:null,system:false,...o});
  return {client,calls,errors,observer,msg,emit:async m=>{client.emit('messageCreate',m);await observer.drain();}};
}
test('a registered owner message in a registered channel becomes a native intake request',async t=>{
  const f=fixture(t);await f.emit(f.msg());await f.emit(f.msg({id:'m2',channelId:'priv'}));
  assert.deepEqual(f.calls[0],{guildId:'c',channelId:'ch',messageId:'m1',userId:'u',actorId:'pc',sceneId:'s',mode:'party',ownerUserId:null,gmRoleId:'gm',participantIds:['u','v']});
  assert.deepEqual(f.calls[1],{guildId:'c',channelId:'priv',messageId:'m2',userId:'u',actorId:'pc',sceneId:'s',mode:'private',ownerUserId:'u',gmRoleId:'gm',participantIds:[]});
});
test('bots, webhooks, system, unknown channels, non-owners and other scenes are ignored without replies',async t=>{
  const f=fixture(t);for(const m of [f.msg({author:{id:'u',bot:true}}),f.msg({webhookId:'w'}),f.msg({system:true}),f.msg({channelId:'unknown'}),f.msg({author:{id:'stranger',bot:false}}),f.msg({guildId:'other'})])await f.emit(m);
  assert.deepEqual(f.calls,[]);assert.deepEqual(f.errors,[]);
  const g=fixture(t,{route:{campaignId:'c',ownerUserId:'u',actorId:'pc',sceneId:'elsewhere',sessionId:'session',gmRoleId:null}});await g.emit(g.msg());assert.deepEqual(g.calls,[]);
});
test('intake failures are reported, not thrown, and close detaches the observer',async t=>{
  const f=fixture(t);await f.emit(f.msg({id:'boom'}));assert.deepEqual(f.errors,['intake failed']);f.observer.close();assert.equal(f.client.listenerCount('messageCreate'),0);await f.emit(f.msg({id:'late'}));assert.equal(f.calls.length,1);
});
test('with a turn runner the observer produces a withheld draft through it and reports failures',async t=>{
  const store=openSceneStore(),client=new EventEmitter(),drafts=[],errors=[];t.after(()=>store.close());
  store.commitSnapshot({campaignId:'c',principal:'admin',sourceRef:'setup',records:[{kind:'channel',expectedRevision:null,data:{id:'ch',campaignId:'c',sceneId:'s',kind:'party',permissionsVerified:true,recipientIds:['u'],writerIds:['u']}}]},{check:()=>{}});
  const observer=createDiscordMessageObserver({client,sceneStore:store,intake:{ingest:async()=>assert.fail('intake alone must not run')},turns:{respond:async(req,{signal})=>{assert.equal(signal.aborted,false);if(req.messageId==='boom')throw new Error('provider budget exhausted');return {publication:{id:`draft-${req.messageId}`}};}},onDraft:(result,req)=>drafts.push([result.publication.id,req.actorId]),readOwnerSession:()=>({campaignId:'c',ownerUserId:'u',actorId:'pc',sceneId:'s',sessionId:'session',gmRoleId:null}),onError:e=>errors.push(e.message)});t.after(()=>observer.close());
  for(const id of ['m1','boom']){client.emit('messageCreate',{id,guildId:'c',channelId:'ch',author:{id:'u',bot:false},webhookId:null,system:false});await observer.drain();}
  assert.deepEqual(drafts,[['draft-m1','pc']]);assert.deepEqual(errors,['provider budget exhausted']);
});
