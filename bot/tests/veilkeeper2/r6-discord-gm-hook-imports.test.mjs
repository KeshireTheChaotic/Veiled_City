import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {ChannelType,PermissionsBitField,PermissionFlagsBits as P} from 'discord.js';
import {createDiscordGmAuthority} from '../../src/v2/discord-gm-authority.js';
import {createDiscordGmHookImports} from '../../src/v2/discord-gm-hook-imports.js';
import {openPrivateHookStore} from '../../src/v2/private-hook-store.js';
import {openInteractionReceipts} from '../../src/v2/interaction-receipts.js';

function fixture(t,{markdown=true}={}){
 const client=new EventEmitter(),store=openPrivateHookStore(),receipts=openInteractionReceipts(),member={id:'22222',guild:{id:'11111'},user:{id:'22222',bot:false},roles:{cache:new Map([['role',{}]])},permissions:new PermissionsBitField(0n)};
 const channel={id:'33333',guildId:'11111',type:ChannelType.GuildText,permissionsFor:()=>new PermissionsBitField(P.ViewChannel|P.SendMessages)};
 const characters=[{id:'pc',guild_id:'11111',owner_user_id:'owner',name:'Mira',status:'active',data:{}},{id:'friend',guild_id:'11111',owner_user_id:'friend-owner',name:'Friend',status:'active',data:{}}];
 const repository={findExportCharacter(c,q){const matches=characters.filter(x=>x.guild_id===c&&(x.id===q||x.name===q));return matches.length===1?structuredClone(matches[0]):null;}};
 let reads=0,fetches=0,readHook=()=>{},fetchHook=()=>{},lostReply=false,afterCommit=()=>{};const replies=[],errors=[];
 const guild={id:'11111',members:{fetch:async()=>{readHook(++reads);return member;}},roles:{fetch:async()=>new Map([['role',{}]])},channels:{fetch:async()=>channel}};client.guilds={fetch:async()=>guild};
 const authority=createDiscordGmAuthority({client,readPolicy:()=>({campaignId:'11111',revision:'1',gmRoleId:'role',gmUserIds:[],allowAdministrators:false})});
 const packet={character_name:'Mira',hooks:[{key:'debt',premise:'Unverified private seed',targets:[{type:'character',key:'friend'},{type:'npc',key:'invented'}]}],canon_suggestions:[{key:'origin',value:'Private suggestion',visibility:'public'}]},body=Buffer.from(JSON.stringify(packet)),md=Buffer.from('\uFEFF# Private\r\nUnverified memory.\r\n');
 const file={id:'44444',name:'GM_HOOKS_Mira.json',size:body.length,url:'https://cdn.discordapp.com/attachments/33333/44444/GM_HOOKS_Mira.json'},narrative=markdown?{id:'44445',name:'Mira.md',size:md.length,url:'https://cdn.discordapp.com/attachments/33333/44445/Mira.md'}:null;
 const options={client,repository,readCharacter:(c,id)=>{const row=characters.find(x=>x.id===id&&x.guild_id===c);return row?structuredClone(row):null;},hookStore:{...store,commitImport(...args){const r=store.commitImport(...args);afterCommit();return r;}},gmAuthority:authority,interactionReceipts:receipts,fetchImpl:async url=>{fetchHook(++fetches);return new Response(url.includes('/44445/')?md:body);},onError:(e,c)=>errors.push({message:e.message,...c})};let controller=createDiscordGmHookImports(options);
 function event(id='55555',{observed=true,privateDefer=true,...extra}={}){const e={id,client,guildId:'11111',channelId:'33333',user:{id:'22222',bot:false},createdTimestamp:Date.now(),commandName:'vc-character',isChatInputCommand:()=>true,options:{getSubcommand:()=> 'import-gm-hooks',getString:()=>null,getAttachment:k=>k==='file'?file:narrative},deferred:false,replied:false,ephemeral:null,deferReply:async value=>{replies.push({defer:value});e.deferred=true;e.ephemeral=privateDefer;},editReply:async value=>{replies.push(value);if(lostReply)throw new Error('Lost private response');},...extra};if(observed)client.emit('interactionCreate',e);return e;}
 t.after(()=>{controller.close();authority.close();receipts.close();store.close();});
 return {client,store,receipts,member,characters,replies,errors,event,get controller(){return controller;},get fetches(){return fetches;},restart(){controller.close();controller=createDiscordGmHookImports(options);},readHook(fn){readHook=fn;},fetchHook(fn){fetchHook=fn;},afterCommit(fn){afterCommit=fn;},loseReply(){lostReply=true;}};
}

test('observed current GM imports private hooks, held targets, pending canon and normalized narrative once',async t=>{
 const f=fixture(t),result=await f.controller.handle(f.event());assert.equal(result.status,'imported_private');assert.equal(f.fetches,2);
 assert.equal(f.store.listCharacterGmHooks('11111','pc').length,1);assert.equal(f.store.proposals('11111','pc')[0].status,'pending');assert.equal(f.store.currentCanon('11111','origin'),null);
 assert.equal(f.store.readNarrative('11111','pc').text,'# Private\nUnverified memory.\n');const edges=f.store.listRelationships('11111',{includeGM:true});assert.equal(edges.length,1);assert.equal(edges[0].to_key,'friend');assert.equal(edges[0].pc_choice_authority,false);
 const row=f.receipts.read('55555');assert.equal(row.processing,'committed');assert.equal(row.reply,'delivered');assert.equal(row.binding.actorId,'human-gm:22222');assert.equal(f.replies.some(x=>x.files),false);assert.equal(f.replies.some(x=>JSON.stringify(x).includes('Unverified memory')),false);
 f.restart();assert.equal((await f.controller.handle(f.event())).status,'already_claimed');assert.equal(f.fetches,2);assert.equal(f.store.narrativeHistory('11111','pc').length,1);
});

test('unobserved or unauthorized humans cannot download or write private material',async t=>{
 for(const mode of ['unobserved','not-gm','public-defer']){const f=fixture(t);if(mode==='not-gm')f.member.roles.cache.clear();const result=await f.controller.handle(f.event('55555',{observed:mode!=='unobserved',privateDefer:mode!=='public-defer'}));assert.equal(result.status,'native_review_required');assert.equal(f.fetches,0);assert.equal(f.store.readNarrative('11111','pc'),null);assert.deepEqual(f.store.listCharacterGmHooks('11111','pc'),[]);}
});

test('fresh role revocation during attachment download aborts all private writes',async t=>{
 const f=fixture(t);f.readHook(n=>{if(n===2)f.member.roles.cache.clear();});assert.equal((await f.controller.handle(f.event())).status,'native_review_required');assert.equal(f.fetches,1);assert.equal(f.receipts.read('55555').hold,'source');assert.equal(f.store.readNarrative('11111','pc'),null);assert.deepEqual(f.store.proposals('11111','pc'),[]);
});

test('ambiguous character selection and changed command declaration do not import',async t=>{
 for(const mode of ['ambiguous','changed']){const f=fixture(t),e=f.event();if(mode==='ambiguous')f.characters.push({...f.characters[0],id:'duplicate'});else f.fetchHook(()=>{e.options.getString=()=> 'Friend';});assert.equal((await f.controller.handle(e)).status,'native_review_required');assert.deepEqual(f.store.listCharacterGmHooks('11111','pc'),[]);assert.equal(f.store.readNarrative('11111','pc'),null);}
});

test('lost reply never reimports after controller restart and does not publish private bodies',async t=>{
 const f=fixture(t);f.loseReply();assert.equal((await f.controller.handle(f.event())).status,'imported_private');assert.equal(f.receipts.read('55555').reply,'uncertain');f.restart();assert.equal((await f.controller.handle(f.event())).status,'already_claimed');assert.equal(f.fetches,2);assert.equal(f.store.history('11111','pc','debt').length,1);
});

test('failure after private commit retains import evidence and holds receipt without retry',async t=>{
 const f=fixture(t);f.afterCommit(()=>{throw new Error('Receipt boundary interrupted');});assert.equal((await f.controller.handle(f.event())).status,'native_review_required');assert.equal(f.receipts.read('55555').hold,'effects');assert.equal(f.store.narrativeHistory('11111','pc').length,1);f.restart();await f.controller.handle(f.event());assert.equal(f.fetches,2);assert.equal(f.store.narrativeHistory('11111','pc').length,1);
});

test('optional narrative can be omitted, and closed command cannot start a download',async t=>{
 const f=fixture(t,{markdown:false});assert.equal((await f.controller.handle(f.event())).status,'imported_private');assert.equal(f.fetches,1);assert.equal(f.store.readNarrative('11111','pc'),null);f.controller.close();await assert.rejects(f.controller.handle(f.event('55556')));assert.equal(f.fetches,1);
});
