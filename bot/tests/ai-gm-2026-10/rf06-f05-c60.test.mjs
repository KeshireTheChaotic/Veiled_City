import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {readFileSync} from 'node:fs';
import {registerClientReadyHandler} from '../../src/bootstrap/ready.js';
function fixture({guilds=['a','b'],voiceEnabled=false}={}){const events=[],client=new EventEmitter();client.guilds={cache:new Map(guilds.map(id=>[id,{id}]))};client.user={tag:'Synthetic#0001'};const db={markAllInterruptedPublicationsUncertain(){assert.equal(this,db);events.push(['uncertain']);}},gm={},log={error(...args){events.push(['error',...args]);}},config={voiceEnabled,voiceName:'voice',voiceModel:'model'},content={chunks:[{},{}]},deps={client,db,gm,log,config,content,resumeAutonomousPvpFear(database,id,options){assert.equal(database,db);events.push(['fear',id,options]);},runSessionOpening(args){assert.equal(args.db,db);assert.equal(args.gm,gm);events.push(['opening',args.guild.id]);return Promise.resolve();},consoleOutput:{log(text){events.push(['log',text]);}}};return {events,client,db,deps};}
test('registration is inert until actual once event and preserves original per-guild recovery/output order',()=>{
  const f=fixture();registerClientReadyHandler(f.deps);assert.deepEqual(f.events,[]);assert.equal(f.client.listenerCount('clientReady'),1);f.client.emit('clientReady');f.client.emit('clientReady');assert.deepEqual(f.events,[['uncertain'],['fear','a',{limit:12}],['opening','a'],['fear','b',{limit:12}],['opening','b'],['log','Veilkeeper v3.5.5 logged in as Synthetic#0001'],['log','Voice narration: disabled.'],['log','Indexed 2 Veiled City content chunks.']]);assert.equal(f.client.listenerCount('clientReady'),0);
});
test('original interrupted-publication failure aborts before native recovery or logged-in messages',()=>{
  const f=fixture(),error=new Error('storage');f.deps.db.markAllInterruptedPublicationsUncertain=()=>{throw error;};registerClientReadyHandler(f.deps);assert.throws(()=>f.client.emit('clientReady'),e=>e===error);assert.deepEqual(f.events,[]);
});
test('original per-guild Fear error logs same identity and continues opening and later guilds',()=>{
  const f=fixture(),error=new Error('review');f.deps.resumeAutonomousPvpFear=(db,id)=>{f.events.push(['fear',id]);if(id==='a')throw error;};registerClientReadyHandler(f.deps);f.client.emit('clientReady');assert.deepEqual(f.events.slice(0,6),[['uncertain'],['fear','a'],['error','Autonomous immediate Fear recovery requires review',error],['opening','a'],['fear','b'],['opening','b']]);
});
test('original rejected opening logs review without retry or suppressing normal ready output',async()=>{
  const f=fixture({guilds:['a'],voiceEnabled:true});f.deps.runSessionOpening=()=>Promise.reject(new Error('opening review'));registerClientReadyHandler(f.deps);f.client.emit('clientReady');assert.ok(f.events.some(e=>e[0]==='log'&&e[1]==='Voice narration: enabled (voice/model).'));await Promise.resolve();assert.deepEqual(f.events.at(-1),['error','Native session opening requires source review.']);assert.equal(f.events.filter(e=>e[0]==='uncertain').length,1);
});
test('original opening is not awaited and synchronous callback error still propagates',async()=>{
  const f=fixture({guilds:['a']});let release;f.deps.runSessionOpening=()=>new Promise(resolve=>{release=resolve;});registerClientReadyHandler(f.deps);f.client.emit('clientReady');assert.deepEqual(f.events.at(-1),['log','Indexed 2 Veiled City content chunks.']);release();await Promise.resolve();const second=fixture(),error=new Error('sync opening');second.deps.runSessionOpening=()=>{throw error;};registerClientReadyHandler(second.deps);assert.throws(()=>second.client.emit('clientReady'),e=>e===error);assert.deepEqual(second.events,[['uncertain'],['fear','a',{limit:12}]]);
});
test('entrypoint retains private turn handlers, shutdown and original login after ready registration',()=>{
  const s=readFileSync(new URL('../../src/index.js',import.meta.url),'utf8');assert.ok(s.includes("import {registerClientReadyHandler} from './bootstrap/ready.js'"));assert.ok(s.includes('registerClientReadyHandler({client,db,gm,log,config,content,resumeAutonomousPvpFear,runSessionOpening});'));assert.ok(!s.includes('client.once("clientReady"'));assert.ok(s.includes('client.on("interactionCreate"'));assert.ok(s.includes('client.on("messageCreate"'));assert.ok(s.includes('registerShutdownHandlers({voice,db,client});'));assert.ok(s.includes('await client.login(config.discordToken);'));
});
