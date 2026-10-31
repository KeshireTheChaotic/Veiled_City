import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {readFileSync} from 'node:fs';
import {registerInteractionHandler} from '../../src/application/workflows/public.js';
function fixture(){const events=[],client=new EventEmitter(),db={getActiveSession(id){assert.equal(this,db);events.push(['session',id]);return {id:'session'};}},gm={},voice={},interaction={guild:{id:'guild'},guildId:'guild',commandName:'vc',deferred:false,replied:false,isRepliable(){events.push(['repliable']);return true;},async reply(payload){events.push(['reply',payload]);},async editReply(payload){events.push(['edit',payload]);}},deps={client,db,gm,voice,async handleCommand(i,services){assert.equal(i,interaction);assert.deepEqual(services,{db,gm,voice});events.push(['command']);},async safeStateError(args){events.push(['state-error',args]);},interactionResponseExpired(i,error){assert.equal(i,interaction);events.push(['expired',error]);return false;},consoleOutput:{error(error){events.push(['console',error]);}}};return {events,client,db,gm,voice,interaction,deps,handler(){registerInteractionHandler(deps);return client.listeners('interactionCreate')[0];}};}
test('original event registration and awaited command dependencies retain successful undefined result',async()=>{
  const f=fixture(),handler=f.handler();assert.equal(f.client.listenerCount('interactionCreate'),1);assert.deepEqual(f.events,[]);assert.equal(await handler(f.interaction),undefined);assert.equal(await handler(f.interaction),undefined);assert.deepEqual(f.events,[['command'],['command']]);
});
test('original command error logs then records same guild/session/context before private reply',async()=>{
  const f=fixture(),error=new Error('command');f.deps.handleCommand=async()=>{throw error;};await f.handler()(f.interaction);assert.deepEqual(f.events,[['console',error],['session','guild'],['state-error',{guild:f.interaction.guild,error,context:'interaction:vc',sessionId:'session'}],['expired',error],['repliable'],['reply',{content:'An internal error occurred.',ephemeral:true}]]);
});
test('original expired response records state error then short-circuits repliability and sending',async()=>{
  const f=fixture(),error=new Error('expired');f.deps.handleCommand=async()=>{throw error;};f.deps.interactionResponseExpired=()=>{f.events.push(['expired']);return true;};await f.handler()(f.interaction);assert.equal(f.events.at(-1)[0],'expired');assert.ok(!f.events.some(e=>['reply','edit','repliable'].includes(e[0])));
});
test('original deferred/replied edit path and response rejection swallowing retained without retry',async()=>{
  for(const flag of ['deferred','replied']){const f=fixture(),error=new Error('command');f.interaction[flag]=true;f.deps.handleCommand=async()=>{throw error;};let calls=0;f.interaction.editReply=async payload=>{calls++;assert.equal(payload,'An internal error occurred.');throw new Error('delivery');};await f.handler()(f.interaction);assert.equal(calls,1);assert.ok(!f.events.some(e=>e[0]==='reply'));}
});
test('original missing guild skips state lookup and uses same unknown-command/null-session fallbacks',async()=>{
  const f=fixture(),error=new Error('command');f.interaction.guild=null;f.deps.handleCommand=async()=>{throw error;};await f.handler()(f.interaction);assert.ok(!f.events.some(e=>['session','state-error'].includes(e[0])));const second=fixture();second.interaction.commandName='';second.db.getActiveSession=()=>null;second.deps.handleCommand=async()=>{throw error;};await second.handler()(second.interaction);const recorded=second.events.find(e=>e[0]==='state-error')[1];assert.equal(recorded.context,'interaction:unknown');assert.equal(recorded.sessionId,null);
});
test('original state-error failure propagates and nonrepliable interactions remain unsent',async()=>{
  const f=fixture(),command=new Error('command'),state=new Error('state');f.deps.handleCommand=async()=>{throw command;};f.deps.safeStateError=async()=>{throw state;};await assert.rejects(f.handler()(f.interaction),e=>e===state);assert.ok(!f.events.some(e=>['expired','reply','edit'].includes(e[0])));const second=fixture();second.deps.handleCommand=async()=>{throw command;};second.interaction.isRepliable=()=>false;await second.handler()(second.interaction);assert.ok(!second.events.some(e=>['reply','edit'].includes(e[0])));
});
test('entrypoint retains ready/message/shutdown/login and delegates original interaction registration',()=>{
  const s=readFileSync(new URL('../../src/index.js',import.meta.url),'utf8');assert.ok(s.includes("import {registerInteractionHandler} from './application/workflows/public.js'"));assert.ok(s.includes('registerInteractionHandler({client,db,gm,voice,handleCommand,safeStateError,interactionResponseExpired});'));assert.ok(!s.includes('client.on("interactionCreate"'));assert.ok(s.includes('registerClientReadyHandler('));assert.ok(s.includes('client.on("messageCreate"'));assert.ok(s.includes('registerShutdownHandlers('));assert.ok(s.includes('await client.login(config.discordToken);'));
});
