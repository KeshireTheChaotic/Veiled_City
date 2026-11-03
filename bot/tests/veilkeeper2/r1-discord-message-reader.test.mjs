import test from 'node:test';
import assert from 'node:assert/strict';
import {ChannelType,PermissionsBitField,PermissionFlagsBits as P} from 'discord.js';
import {createDiscordMessageReader} from '../../src/v2/discord-message-reader.js';
function fixture(){
  const members=new Map(['bot','u'].map(id=>[id,{id,permissions:new PermissionsBitField([]),roles:{cache:new Map()}}]));
  const message={id:'m',guildId:'g',channelId:'ch',author:{id:'u',bot:false},webhookId:null,system:false,content:'Interesting.',editedTimestamp:null};
  const channel={id:'ch',guildId:'g',type:ChannelType.GuildText,permissionsFor:()=>new PermissionsBitField([P.ViewChannel,P.SendMessages]),messages:{fetch:async options=>{assert.deepEqual(options,{message:'m',force:true});return message;}}};
  const guild={id:'g',memberCount:2,channels:{fetch:async()=>channel},members:{fetch:async()=>members},roles:{fetch:async()=>new Map()}};
  const reader=createDiscordMessageReader({client:{user:{id:'bot'},guilds:{fetch:async()=>guild}}});
  return {reader,message,channel,args:{guildId:'g',channelId:'ch',messageId:'m',userId:'u',sceneId:'s'}};
}
test('fetched native authorship supplies the source body and audience-bound fingerprint',async()=>{
  const f=fixture(),first=await f.reader.read(f.args);assert.equal(first.messageRecord.text,'Interesting.');assert.deepEqual(first.audience.channelRecord.recipientIds,['u']);
  f.message.content='Edited.';f.message.editedTimestamp=123;assert.notEqual((await f.reader.read(f.args)).fingerprint,first.fingerprint);
});
test('spoofed author, webhook, bot, system and wrong channel messages are refused',async()=>{
  for(const mutate of [f=>f.message.author.id='other',f=>f.message.webhookId='hook',f=>f.message.author.bot=true,f=>f.message.system=true,f=>f.message.channelId='other']){
    const f=fixture();mutate(f);await assert.rejects(f.reader.read(f.args),/Authenticated authored/);
  }
});
test('current write permission and fetch success are required; cancellation skips intake',async()=>{
  const f=fixture();f.channel.permissionsFor=member=>new PermissionsBitField(member.id==='bot'?[P.ViewChannel,P.SendMessages]:[P.ViewChannel]);await assert.rejects(f.reader.read(f.args),/channel authority/);
  f.channel.messages.fetch=async()=>{throw new Error('deleted or unavailable');};await assert.rejects(f.reader.read(f.args),/unavailable/);
  const abort=new AbortController();abort.abort();await assert.rejects(f.reader.read(f.args,{signal:abort.signal}));
});
