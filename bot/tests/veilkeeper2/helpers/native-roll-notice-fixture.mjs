import {EventEmitter} from 'node:events';
import {ChannelType,PermissionsBitField,PermissionFlagsBits as P} from 'discord.js';
import {nativeSpellcastFixture} from './native-spellcast-fixture.mjs';
import {createDiscordRollNotices,ownerRollNoticeContent} from '../../../src/v2/discord-roll-notices.js';

export function nativeRollNoticeFixture(t){
  const f=nativeSpellcastFixture(t);f.decision.modifierRefs=f.modifiers.previewMandatoryRefs(f.source,f.decision,f.locator);f.adjudications.save(f.source,f.decision,{check:f.check,spellcast:f.locator});const request=f.prepare().commitRequest(f.source,'pc',{adjudication_ref:'spellcast'});
  const sent=[],messages=new Map(),members=new Map(['bot','historical-owner'].map(id=>[id,{id,permissions:new PermissionsBitField([]),roles:{cache:new Map()}}])),original={id:'new-attempt',guildId:'g',channelId:'private',author:{id:'historical-owner',bot:false},content:f.source.text,webhookId:null,system:false};let onSend=null,readbackFail=false;
  const channel={id:'private',guildId:'g',type:ChannelType.GuildText,permissionsFor:()=>new PermissionsBitField([P.ViewChannel,P.SendMessages]),messages:{async fetch({message}){if(message==='new-attempt')return original;if(readbackFail)throw new Error('Readback temporarily unavailable');const row=messages.get(message);if(!row)throw new Error('Message missing');return row;}},async send(body){const result={...structuredClone(body),id:'notice-'+(sent.length+1),createdTimestamp:10000,guildId:'g',channelId:'private',author:{id:'bot',bot:true},webhookId:null,system:false};sent.push(result);messages.set(result.id,result);if(onSend)await onSend(result);return result;}};
  const guild={id:'g',get memberCount(){return members.size;},members:{list:async()=>members},roles:{fetch:async()=>new Map()},channels:{fetch:async()=>channel}},client=new EventEmitter();client.user={id:'bot'};client.guilds={fetch:async()=>guild};
  const publisher=()=>createDiscordRollNotices({client,sceneStore:f.scenes,sourceAuthority:f.authority,rollStore:f.rolls,preparation:f.prepare()});
  return {...f,client,guild,channel,request,sent,messages,members,original,publisher,onSend(fn){onSend=fn;},failReadback(value){readbackFail=value;},get rolls(){return f.rolls;},reopen(){f.reopenRolls();f.reopen();}};
}
