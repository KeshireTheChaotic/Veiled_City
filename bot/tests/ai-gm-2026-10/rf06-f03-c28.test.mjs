import test from 'node:test';
import assert from 'node:assert/strict';
import {postGmLog} from '../../src/frameworks/publication/public.js';
import {postGmLog as historical} from '../../src/publishing.js';
import {initializePublicationDiscord} from '../../src/application/composition/publication-discord.js';
import {splitDiscordText} from '../../src/frameworks/discord/public.js';
initializePublicationDiscord();
const VIEW=1024n,SEND=2048n,permissions=(...bits)=>({has:flag=>bits.includes(flag)});
function fixture(){
  const everyone={id:'everyone'},gm={id:'gm',name:'GM'},ordinary={id:'ordinary',name:'Player'},bot={id:'bot'},calls=[],grants=new Map([['gm',permissions(VIEW)],['bot',permissions(VIEW,SEND)]]),campaign={gm_log_channel_id:'gm-log',gm_role_id:'gm'};
  const channel={id:'gm-log',isTextBased:()=>true,permissionsFor:subject=>grants.get(subject.id)||permissions(),permissionOverwrites:{cache:new Map()},send:async content=>{calls.push(['send',content]);return {id:String(calls.length)};}};
  const guild={id:'guild',roles:{everyone,cache:new Map([[everyone.id,everyone],[gm.id,gm],[ordinary.id,ordinary]])},members:{me:bot,cache:new Map([[bot.id,bot]])},channels:{fetch:async id=>{calls.push(['fetch',id]);return channel;}}},db={getCampaign(guildId){assert.equal(this,db);assert.equal(guildId,'guild');calls.push(['campaign']);return campaign;}};
  return {db,guild,channel,campaign,calls,grants};
}
test('root compatibility and Publication public expose the same original function with exact private text',async()=>{
  assert.equal(historical,postGmLog);const f=fixture();assert.equal(await postGmLog({...f,sessionId:'session-123456',title:'Audit log',details:'Synthetic detail'}),true);assert.deepEqual(f.calls,[['campaign'],['fetch','gm-log'],['send','**Audit log** · session session-\nSynthetic detail']]);
});
test('original default title/session/detail fallback preserves false and string conversion',async()=>{
  let f=fixture();await postGmLog({...f,details:false});assert.equal(f.calls.at(-1)[1],'**GM Log**\n');f=fixture();await postGmLog({...f,details:{toString:()=> 'rendered'}});assert.equal(f.calls.at(-1)[1],'**GM Log**\nrendered');
});
test('missing campaign/channel, failed lookup and non-text channel preserve false without sending',async()=>{
  let f=fixture();f.db.getCampaign=()=>undefined;assert.equal(await postGmLog(f),false);assert.deepEqual(f.calls,[]);f=fixture();f.campaign.gm_log_channel_id=null;assert.equal(await postGmLog(f),false);assert.deepEqual(f.calls,[['campaign']]);f=fixture();f.guild.channels.fetch=async()=>{throw new Error('lookup unavailable');};assert.equal(await postGmLog(f),false);f=fixture();f.channel.isTextBased=()=>false;assert.equal(await postGmLog(f),false);assert.ok(!f.calls.some(c=>c[0]==='send'));
});
test('actual GM privacy checks reject ordinary visibility and missing bot send access before any send',async t=>{
  const original=console.error,errors=[];console.error=(...args)=>errors.push(args);t.after(()=>console.error=original);
  for(const [id,access]of [['everyone',permissions(VIEW)],['ordinary',permissions(VIEW)],['bot',permissions(VIEW)]]){const f=fixture();f.grants.set(id,access);assert.equal(await postGmLog({...f,details:'GM secret'}),false);assert.ok(!f.calls.some(c=>c[0]==='send'));}assert.equal(errors.length,3);assert.ok(errors.every(e=>e[0]==='Unsafe GM log channel configuration'&&e[1] instanceof Error));
});
test('original splitter sends each exact part in order and awaits completion before the next send',async()=>{
  const f=fixture(),details='Synthetic GM detail. '.repeat(300),expected=splitDiscordText('**GM Log**\n'+details),sent=[];let active=false;f.channel.send=async part=>{assert.equal(active,false);active=true;sent.push(part);await Promise.resolve();active=false;};assert.equal(await postGmLog({...f,details}),true);assert.ok(sent.length>1);assert.deepEqual(sent,expected);
});
test('partial uncertain send failure propagates original error without replacement, retry or later parts',async()=>{
  const f=fixture(),error=new Error('synthetic uncertain transport'),sent=[];f.channel.send=async part=>{sent.push(part);if(sent.length===2)throw error;};await assert.rejects(postGmLog({...f,details:'Synthetic '.repeat(800)}),e=>e===error);assert.equal(sent.length,2);
});
test('original campaign reader error propagates before channel lookup or send',async()=>{
  const f=fixture(),error=new Error('read failed');f.db.getCampaign=()=>{throw error;};await assert.rejects(postGmLog(f),e=>e===error);assert.deepEqual(f.calls,[]);
});
