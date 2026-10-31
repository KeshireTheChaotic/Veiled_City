import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GatewayIntentBits,Partials} from 'discord.js';
import {createDiscordClient} from '../../src/frameworks/discord/public.js';
import {createDiscordClient as ownedFactory} from '../../src/frameworks/discord/client-factory.js';
const withConstructor=(Client,intents=GatewayIntentBits,partials=Partials)=>new Function('Client','GatewayIntentBits','Partials','return ('+createDiscordClient.toString()+');')(Client,intents,partials);
test('public capability is original zero-argument factory with fresh original SDK options and no login',()=>{
  assert.equal(createDiscordClient,ownedFactory);assert.equal(createDiscordClient.length,0);let constructors=0,logins=0;class FakeClient{constructor(options){constructors++;this.options=options;}login(){logins++;throw new Error('must not log in');}}
  const create=withConstructor(FakeClient),first=create(),second=create();assert.ok(first instanceof FakeClient);assert.notEqual(first,second);assert.equal(constructors,2);assert.equal(logins,0);assert.deepEqual(first.options,{intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent,GatewayIntentBits.DirectMessages,GatewayIntentBits.GuildVoiceStates],partials:[Partials.Channel]});assert.notEqual(first.options,second.options);assert.notEqual(first.options.intents,second.options.intents);
});
test('original intent/partial lookup order precedes exact constructor call without new option translation',()=>{
  const events=[],intents={},partials={};let value=0;for(const key of ['Guilds','GuildMessages','MessageContent','DirectMessages','GuildVoiceStates'])Object.defineProperty(intents,key,{get(){events.push(key);return ++value;}});Object.defineProperty(partials,'Channel',{get(){events.push('Channel');return 6;}});class FakeClient{constructor(options){events.push('constructor');assert.deepEqual(options,{intents:[1,2,3,4,5],partials:[6]});}}
  withConstructor(FakeClient,intents,partials)();assert.deepEqual(events,['Guilds','GuildMessages','MessageContent','DirectMessages','GuildVoiceStates','Channel','constructor']);
});
test('original constructor failure identity propagates without catch/retry or lifecycle calls',()=>{
  const error=new Error('construction'),events=[];class FailingClient{constructor(){events.push('constructor');throw error;}login(){events.push('login');}destroy(){events.push('destroy');}}
  assert.throws(()=>withConstructor(FailingClient)(),e=>e===error);assert.deepEqual(events,['constructor']);
});
test('entrypoint keeps explicit login and all qualified event/turn registrations at original composition points',()=>{
  const s=readFileSync(new URL('../../src/index.js',import.meta.url),'utf8');assert.ok(s.includes("import {createDiscordClient} from './frameworks/discord/public.js'"));assert.ok(s.includes('const client=createDiscordClient();'));assert.ok(!s.includes('new Client('));assert.ok(!s.includes('from "discord.js"'));assert.ok(s.includes('registerInteractionHandler({client,db,gm,voice,handleCommand,safeStateError,interactionResponseExpired});'));assert.ok(s.includes('registerClientReadyHandler('));assert.ok(s.includes('registerShutdownHandlers('));assert.ok(s.includes('await client.login(config.discordToken);'));
});
