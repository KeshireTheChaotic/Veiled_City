import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handleVoiceCommand} from '../../src/frameworks/discord/voice-commands.js';
import {handleVoiceCommand as publicHandler} from '../../src/frameworks/discord/public.js';
const status={enabled:true,channelId:'channel',mode:'auto',model:'synthetic-model',voice:'synthetic-voice',speed:1,paused:false,queued:0,hasLast:false,ffmpeg:true};
function fixture({gm=true,strings={},speed=null}={}){
  const events=[],channel={id:'channel',name:'Table'},guild={id:'guild'};
  const interaction={guildId:'guild',guild,user:{id:'owner'},member:{voice:{channel,channelId:'channel'}},options:{getString:(name,required)=>{events.push(['string',name,required]);return strings[name]??null;},getNumber:name=>{events.push(['number',name]);return speed;}},reply:async payload=>events.push(['reply',payload]),deferReply:async payload=>events.push(['defer',payload]),editReply:async payload=>events.push(['edit',payload])};
  const voice={status:g=>{events.push(['status',g]);return status;},join:async(...args)=>{events.push(['join',...args]);return status;},repeat:(...args)=>{events.push(['repeat',...args]);return {segments:2};},leave:g=>events.push(['leave',g]),pause:g=>events.push(['pause',g]),resume:g=>events.push(['resume',g]),setMode:(...args)=>events.push(['setMode',...args]),setVoice:(...args)=>events.push(['setVoice',...args]),setSpeed:(...args)=>events.push(['setSpeed',...args]),setInstructions:(...args)=>events.push(['setInstructions',...args]),narrate:async(...args)=>{events.push(['narrate',...args]);return {ok:true,segments:1};}};
  return {events,channel,guild,interaction,voice,isGm:()=>{events.push(['gm']);return gm;}};
}

test('single public handler and original missing-subsystem error before any permission callback',async()=>{
  assert.equal(publicHandler,handleVoiceCommand);let calls=0;
  await assert.rejects(handleVoiceCommand({}, {sub:'status',voice:null,isGm:()=>calls++}),{message:'Voice subsystem is unavailable in this runtime.'});assert.equal(calls,0);
});
test('status and cached repeat retain non-GM availability, exact arguments and private response',async()=>{
  let f=fixture({gm:false});assert.equal(await handleVoiceCommand(f.interaction,{...f,sub:'status'}),true);assert.ok(!f.events.some(e=>e[0]==='gm'));assert.equal(f.events.at(-1)[1].ephemeral,true);assert.match(f.events.at(-1)[1].content,/Connection: <#channel> • Mode: \*\*auto\*\*/);
  f=fixture({gm:false});await handleVoiceCommand(f.interaction,{...f,sub:'repeat'});assert.deepEqual(f.events[0],['repeat','guild',{requesterUserId:'owner',requesterChannelId:'channel'}]);assert.match(f.events.at(-1)[1].content,/2 audio segments.*no new speech-generation request/);assert.ok(!f.events.some(e=>e[0]==='gm'));
});
test('join requires current voice channel then defers before current permission and original async join',async()=>{
  let f=fixture();f.interaction.member.voice.channel=null;await assert.rejects(handleVoiceCommand(f.interaction,{...f,sub:'join'}),/Join the voice channel/);assert.deepEqual(f.events,[]);
  f=fixture({gm:false});await handleVoiceCommand(f.interaction,{...f,sub:'join'});assert.deepEqual(f.events.map(e=>e[0]),['defer','gm','join','edit']);assert.equal(f.events[2][1],f.guild);assert.equal(f.events[2][2],f.channel);assert.deepEqual(f.events[2][3],{allowMove:false});assert.match(f.events[3][1],/Discord text remains the authoritative campaign record/);
});
test('GM-only controls reject without voice work and authorized controls call once before reply',async()=>{
  for(const sub of ['leave','pause','resume','configure','narrate']){const f=fixture({gm:false});await assert.rejects(handleVoiceCommand(f.interaction,{...f,sub}),/GM\/admin permission required/);assert.deepEqual(f.events,[['gm']]);}
  for(const sub of ['leave','pause','resume']){const f=fixture();assert.equal(await handleVoiceCommand(f.interaction,{...f,sub}),true);assert.deepEqual(f.events.map(e=>e[0]),['gm',sub,'reply']);assert.equal(f.events.at(-1)[1].ephemeral,true);}
});
test('configure preserves nullable/empty setting semantics and option/set/status/reply order',async()=>{
  const f=fixture({strings:{mode:'',voice:'new-voice',instructions:''},speed:0});await handleVoiceCommand(f.interaction,{...f,sub:'configure'});
  assert.ok(!f.events.some(e=>e[0]==='setMode'));assert.deepEqual(f.events.filter(e=>e[0].startsWith('set')),[['setVoice','guild','new-voice'],['setSpeed','guild',0],['setInstructions','guild','']]);assert.equal(f.events.filter(e=>e[0]==='gm').length,1);assert.match(f.events.at(-1)[1].content,/runtime overrides reset when Veilkeeper restarts/);
});
test('one-off narration uses original force/party/NPC arguments and failure messages without real speech request',async()=>{
  let f=fixture({strings:{text:'Synthetic narration',npc:'clerk'}});await handleVoiceCommand(f.interaction,{...f,sub:'narrate'});assert.deepEqual(f.events.find(e=>e[0]==='narrate'),['narrate',f.guild,'Synthetic narration',{force:true,visibility:'party',npcKey:'clerk'}]);assert.match(f.events.at(-1)[1],/1 segment\)/);
  f=fixture({strings:{text:'Synthetic narration'}});f.voice.narrate=async()=>({ok:false,reason:'queue_full'});await assert.rejects(handleVoiceCommand(f.interaction,{...f,sub:'narrate'}),{message:'Voice narration queue is full. Wait for current narration to finish.'});assert.ok(!f.events.some(e=>e[0]==='edit'));
});
test('unknown subcommand falls through and caller awaits handler inside original receipt-capture try/finally',async()=>{
  const f=fixture();assert.equal(await handleVoiceCommand(f.interaction,{...f,sub:'unknown'}),false);assert.deepEqual(f.events,[['gm']]);
  const root=readFileSync(new URL('../../src/commands.js',import.meta.url),'utf8'),at=root.indexOf('const handled=await handleVoiceCommand(');assert.ok(at>root.indexOf('const restoreReceiptCapture='));assert.ok(at<root.lastIndexOf('restoreReceiptCapture();'));assert.match(root.slice(at,at+160),/if\(handled\)return true/);
});
