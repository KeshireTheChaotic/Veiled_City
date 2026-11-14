import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {ChannelType,PermissionsBitField,PermissionFlagsBits as P} from 'discord.js';
import {createDiscordIntake} from '../../../src/v2/discord-intake.js';
import {createDiscordMessageReader} from '../../../src/v2/discord-message-reader.js';
import {createNativeRoot} from '../../../src/v2/native-root.js';
import {openSourceRegistry} from '../../../src/v2/source-registry.js';
import {createSourceAuthority} from '../../../src/v2/source-authority.js';
import {createCanonicalActorReaders} from '../../../src/v2/canonical-actor-readers.js';
export async function nativeCostFixture(t,{sendFailure=false,readbackTamper=false,provider=null,hope=3,characterName=null,extraCharacters=[]}={}){
  const directory=mkdtempSync(join(tmpdir(),'vk2-root-cost-')),client=new EventEmitter(),errors=[],sent=[],replies=[],members=new Map(['bot','u'].map(id=>[id,{id,permissions:new PermissionsBitField([]),roles:{cache:new Map()}}]));
  const character={id:'pc',guild_id:'c',owner_user_id:'u',status:'active',data:{level:2,resources:{hp:{current:0,max:6},armor:{current:3,max:3},stress:{current:0,max:6},hope,hope_max:6},gm_private:'cost-hook-canary'}};
  if(characterName!==null)character.name=characterName;
  const sourceMessage={id:'attempt',guildId:'c',channelId:'private',author:{id:'u',bot:false},content:'I use the ability.',webhookId:null,system:false};
  const channel={id:'private',guildId:'c',type:ChannelType.GuildText,permissionsFor:()=>new PermissionsBitField([P.ViewChannel,P.SendMessages]),messages:{fetch:async({message})=>{if(message==='attempt')return sourceMessage;const value=sent.find(m=>m.id===message);if(!value)throw new Error('Unknown message');return readbackTamper?{...value,content:'It costs 1 Hope.'}:value;}},send:async body=>{const message={...structuredClone(body),id:'notice-'+(sent.length+1),guildId:'c',channelId:'private',author:{id:'bot',bot:true},webhookId:null,system:false};sent.push(message);if(sendFailure)throw new Error('Response lost after send');return message;}};
  const guild={id:'c',memberCount:2,members:{list:async()=>members},roles:{fetch:async()=>new Map([['gm',{}]])},channels:{fetch:async()=>channel}};client.user={id:'bot'};client.guilds={fetch:async()=>guild};
  const repository={getCharacter:id=>structuredClone(extraCharacters.find(c=>c.id===id)??character),listCharacters:()=>[character,...extraCharacters]},rootOptions={client,directory,characterRepository:repository,campaignRepository:{getCampaign:()=>({guild_id:'c',gm_role_id:'gm'})},rng:()=>1,provider,onError:(error,context)=>errors.push({message:error.message,...context})};let root=createNativeRoot(rootOptions);
  const registry=openSourceRegistry(join(directory,'sources.sqlite'));t.after(()=>{root.close();registry.close();assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep));rmSync(directory,{recursive:true,force:true});});
  const records=[{kind:'session',data:{id:'sess',campaignId:'c',status:'active'}},{kind:'scene',data:{id:'s',campaignId:'c',sessionId:'sess',status:'active',participants:[{userId:'u',actorId:'pc',presence:'present'}]}},{kind:'actor',data:{id:'pc',campaignId:'c',sceneId:'s',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'}},{kind:'channel',data:{id:'private',campaignId:'c',sceneId:'s',kind:'private',ownerUserId:'u',permissionsVerified:true,recipientIds:['u'],writerIds:['u']}},{kind:'message',data:{id:'attempt',campaignId:'c',channelId:'private',userId:'u',deleted:false,text:sourceMessage.content}}];
  root.sceneStore.commitSnapshot({campaignId:'c',principal:'gm',sourceRef:'setup',records:records.map(r=>({...r,expectedRevision:null}))},{check:()=>{}});
  root.actionStore.initializeHope({campaignId:'c',actorId:'pc',ownerUserId:'u',hope,cap:6},{check:()=>{}});root.actionStore.initializePcDefenses({campaignId:'c',actorId:'pc',ownerUserId:'u',controlRevision:'1',hp:{current:0,max:6},armorSlots:{current:3,max:3}},{check:()=>{}});root.actionStore.initializePcLife({campaignId:'c',actorId:'pc',ownerUserId:'u',controlRevision:'1',sourceRef:'profile',sourceRevision:'1',level:2,stress:{current:0,max:6}},{check:()=>{}});
  await createDiscordIntake({messageReader:createDiscordMessageReader({client}),sceneStore:root.sceneStore}).ingest({guildId:'c',channelId:'private',sceneId:'s',messageId:'attempt',userId:'u',actorId:'pc',mode:'private',ownerUserId:'u'});
  const canonical=createCanonicalActorReaders({sceneStore:root.sceneStore,actionStore:root.actionStore,characterRepository:repository}),authority=createSourceAuthority({...canonical.readers,sourceRegistry:registry}),source=authority.authenticate({campaignId:'c',messageId:'attempt',userId:'u',actorId:'pc'}),identity={id:'cost',campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',sourceRef:source.id,sourceRevision:source.revision,kind:'hope_cost'};
  root.actionStore.create(identity,{check:()=>{}});root.actionStore.registerHopeTerms({...identity,revision:'terms-1',controlRevision:'1',cost:{resource:'hope',slot:'base',amount:2}},{check:()=>{}});
  function event(id,decision='accept',over={}){const message=sent[0],token=message.components[0].components[decision==='accept'?0:1].custom_id;return {id,client,guildId:'c',channelId:'private',message,user:{id:'u',bot:false},customId:token,isButton:()=>true,deferReply:async body=>{replies.push({id,defer:body});},editReply:async body=>{replies.push({id,...body});},...over};}
  return {client,get root(){return root;},restart(){root.close();root=createNativeRoot(rootOptions);return root;},source,sent,replies,errors,event,members,guild,channel,directory};
}
