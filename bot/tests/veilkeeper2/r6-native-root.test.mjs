import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {mkdtempSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {createNativeRoot} from '../../src/v2/native-root.js';
const character={id:'pc',guild_id:'c',owner_user_id:'u',name:'Mira',status:'active',data:{level:2,resources:{hp:{current:2,max:6},armor:{current:1,max:3},stress:{current:2,max:6},hope:3,hope_max:6}}};
function root(t,over={}){
  const directory=mkdtempSync(join(tmpdir(),'vk3-root-')),client=Object.assign(new EventEmitter(),{user:{id:'bot'},guilds:{fetch:async()=>{throw new Error('offline');}}});
  const r=createNativeRoot({client,directory,characterRepository:{getCharacter:id=>id==='pc'?character:null,listCharacters:()=>[character]},campaignRepository:{getCampaign:g=>({guild_id:g,gm_role_id:'gm-role'})},rng:()=>1,...over});
  t.after(()=>{r.close();assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep));rmSync(directory,{recursive:true,force:true});});
  return {r,client,directory};
}
test('native root opens its dedicated stores and takes exclusive ownership of interactions',t=>{
  const {r,client,directory}=root(t);assert.deepEqual(readdirSync(directory).filter(f=>f.endsWith('.sqlite')).sort(),['actions.sqlite','cost-prompts.sqlite','decisions.sqlite','interactions.sqlite','prompts.sqlite','scenes.sqlite','sources.sqlite']);assert.ok(client.listenerCount('interactionCreate')>0);assert.equal(client.listenerCount('messageCreate'),1);
  assert.throws(()=>createNativeRoot({client,directory,characterRepository:{getCharacter:()=>null,listCharacters:()=>[]},campaignRepository:{getCampaign:()=>null},rng:()=>1}),/unclaimed client/);r.close();assert.equal(client.listenerCount('interactionCreate'),0);assert.equal(client.listenerCount('messageCreate'),0);
});
test('owner route comes from the verified private channel of the registered PC, never a guess',t=>{
  const {r}=root(t);assert.throws(()=>r.readOwnerRoute('c','pc'),/Verified owner private channel/);
  const base=r.sceneStore.commitSnapshot({campaignId:'c',principal:'gm',sourceRef:'fx',records:[{kind:'session',expectedRevision:null,data:{id:'sess',campaignId:'c',status:'active'}},{kind:'scene',expectedRevision:null,data:{id:'s',campaignId:'c',sessionId:'sess',status:'active',participants:[]}},{kind:'actor',expectedRevision:null,data:{id:'pc',campaignId:'c',sceneId:'s',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'}}]},{check:()=>{}});assert.ok(base);
  assert.throws(()=>r.readOwnerRoute('c','pc'),/Verified owner private channel/);
  r.sceneStore.commitSnapshot({campaignId:'c',principal:'gm',sourceRef:'ch',records:[{kind:'channel',expectedRevision:null,data:{id:'private',campaignId:'c',sceneId:'s',kind:'private',permissionsVerified:false,recipientIds:['u'],writerIds:['u'],ownerUserId:'u'}}]},{check:()=>{}});assert.throws(()=>r.readOwnerRoute('c','pc'),/Verified owner private channel/);
  const {revision}=r.sceneStore.readers.readChannel('c','private');r.sceneStore.commitSnapshot({campaignId:'c',principal:'gm',sourceRef:'ch2',records:[{kind:'channel',expectedRevision:Number(revision),data:{id:'private',campaignId:'c',sceneId:'s',kind:'private',permissionsVerified:true,recipientIds:['u'],writerIds:['u'],ownerUserId:'u'}}]},{check:()=>{}});
  assert.deepEqual(r.readOwnerRoute('c','pc'),{guildId:'c',channelId:'private',sceneId:'s',ownerUserId:'u'});assert.throws(()=>r.readOwnerRoute('c','missing'),/Verified owner private channel/);
});
test('a provider adds a durable turn store and a withheld-draft runner without changing the other stores',t=>{
  const {r,directory}=root(t,{provider:{generate:async()=>({text:'x'})}});assert.ok(r.turns&&typeof r.turns.respond==='function');assert.ok(readdirSync(directory).includes('turns.sqlite'));assert.ok(readdirSync(directory).includes('knowledge.sqlite'));assert.equal(typeof r.knowledgeStore.metadata,'function');
});
test('without a provider no turn runner or turn store exists',t=>{
  const {r,directory}=root(t);assert.equal(r.turns,null);assert.equal(readdirSync(directory).includes('turns.sqlite'),false);assert.equal(readdirSync(directory).includes('knowledge.sqlite'),false);assert.equal(r.knowledgeStore,null);
});
