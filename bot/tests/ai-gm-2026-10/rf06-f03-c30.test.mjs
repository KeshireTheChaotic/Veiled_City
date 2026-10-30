import test from 'node:test';
import assert from 'node:assert/strict';
import {postPrivateRelay} from '../../src/frameworks/publication/public.js';
import {postPrivateRelay as historical} from '../../src/publishing.js';
import {initializePublicationDiscord} from '../../src/application/composition/publication-discord.js';
import {splitDiscordText} from '../../src/frameworks/discord/public.js';
initializePublicationDiscord();
const VIEW=1024n,SEND=2048n,permissions=(...bits)=>({has:flag=>bits.includes(flag)});
function fixture(){const everyone={id:'everyone'},bot={id:'bot'},events=[],audits=[],campaign={state_errors_channel_id:'errors'},grants=new Map([['bot',permissions(VIEW,SEND)]]),channel={isTextBased:()=>true,permissionsFor:subject=>grants.get(subject.id)||permissions(),permissionOverwrites:{cache:new Map()},send:async content=>events.push(['send',content])},guild={id:'guild',roles:{everyone,cache:new Map([['everyone',everyone]])},members:{me:bot,cache:new Map([['bot',bot]])},channels:{fetch:async id=>{events.push(['fetch',id]);return channel;}}},db={audit(...args){audits.push(args);events.push(['audit']);},getCampaign(id){assert.equal(this,db);assert.equal(id,'guild');events.push(['campaign']);return campaign;}};return {db,guild,channel,campaign,events,audits,grants,userId:'owner',content:'Sanitized synthetic package',beforeSend:()=>events.push(['check'])};}
test('root/public identity and exact original successful private relay header, package and audit correlate',async()=>{
  assert.equal(historical,postPrivateRelay);const f=fixture(),result=await postPrivateRelay({...f,sessionId:'session'});assert.deepEqual(result,{ok:true,ref:result.ref,via:'state_errors'});assert.match(result.ref,/^[a-f0-9]{8}$/);assert.deepEqual(f.events.map(e=>e[0]),['audit','campaign','fetch','check','send','check','send']);assert.equal(f.events[4][1],`**⚠️ Private delivery relay required · ${result.ref}**\nTarget player: <@owner>\nContext: private-delivery\n\n**ADMIN GM: relay the following sanitized player-facing package exactly as needed:**`);assert.equal(f.events[6][1],f.content);assert.deepEqual(f.audits[0],['guild','session','system','veilkeeper','private_delivery_relay',{ref:result.ref,context:'private-delivery',userId:'owner',title:'Private delivery relay required'}]);
});
test('unavailable lookup and actual unsafe GM permissions return original reasons without callbacks or send',async()=>{
  let f=fixture();f.campaign.state_errors_channel_id=null;let result=await postPrivateRelay(f);assert.equal(result.ok,false);assert.equal(result.via,'unavailable');assert.ok(!f.events.some(e=>['check','send'].includes(e[0])));f=fixture();f.guild.channels.fetch=async()=>{throw Error('unavailable');};assert.equal((await postPrivateRelay(f)).via,'unavailable');f=fixture();f.grants.set('everyone',permissions(VIEW));result=await postPrivateRelay(f);assert.equal(result.via,'unsafe_channel');assert.equal(result.ok,false);assert.ok(!f.events.some(e=>['check','send'].includes(e[0])));
});
test('original best-effort audit failure still permits guarded relay and preserves default nullable session',async()=>{
  const f=fixture();f.db.audit=()=>{throw Error('audit failed');};const result=await postPrivateRelay(f);assert.equal(result.ok,true);assert.equal(f.events.filter(e=>e[0]==='send').length,2);
});
test('original header/context bounds and splitter run callback before every ordered awaited send',async()=>{
  const f=fixture(),title='t'.repeat(2100),context='c'.repeat(400),content='Synthetic relay package. '.repeat(300),sent=[];let active=false;f.channel.send=async part=>{assert.equal(active,false);active=true;assert.equal(f.events.at(-1)[0],'check');f.events.push(['send',part]);sent.push(part);await Promise.resolve();active=false;};const result=await postPrivateRelay({...f,title,context,content});const head=`**⚠️ ${title} · ${result.ref}**\nTarget player: <@owner>\nContext: ${context.slice(0,250)}\n\n**ADMIN GM: relay the following sanitized player-facing package exactly as needed:**`;assert.deepEqual(sent,[head.slice(0,1990),...splitDiscordText(content)]);assert.equal(f.events.filter(e=>e[0]==='check').length,sent.length);
});
test('first pre-send callback failure propagates exact error without send',async()=>{
  const f=fixture(),error=new Error('source revoked');f.beforeSend=()=>{throw error;};await assert.rejects(postPrivateRelay(f),e=>e===error);assert.ok(!f.events.some(e=>e[0]==='send'));
});
test('later callback revocation after header stops remaining body without replacement or retry',async()=>{
  const f=fixture(),error=new Error('later revocation');let checks=0;f.beforeSend=()=>{if(++checks===2)throw error;};await assert.rejects(postPrivateRelay(f),e=>e===error);assert.equal(checks,2);assert.equal(f.events.filter(e=>e[0]==='send').length,1);
});
test('partial uncertain transport and campaign read failure preserve original errors and no alternate delivery',async()=>{
  let f=fixture(),error=new Error('uncertain send'),sends=0;f.channel.send=async()=>{if(++sends===2)throw error;};await assert.rejects(postPrivateRelay({...f,content:'x '.repeat(4000)}),e=>e===error);assert.equal(sends,2);f=fixture();error=new Error('campaign read failed');f.db.getCampaign=()=>{throw error;};await assert.rejects(postPrivateRelay(f),e=>e===error);assert.equal(f.audits.length,1);assert.ok(!f.events.some(e=>['fetch','check','send'].includes(e[0])));
});
