import {EventEmitter} from 'node:events';import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve,sep} from 'node:path';
import assert from 'node:assert/strict';
import {createNativeRoot} from '../../../src/v2/native-root.js';
import {openLegacyReadOnlyRepository} from '../../../src/v2/legacy-readonly-repository.js';
export function characterExportFixture(t){
 const directory=mkdtempSync(join(tmpdir(),'vk2-character-export-')),db=new DatabaseSync(join(directory,'legacy.sqlite'));
 db.exec(`PRAGMA journal_mode=WAL;
 CREATE TABLE campaigns(guild_id TEXT PRIMARY KEY,gm_role_id TEXT);
 CREATE TABLE characters(id TEXT PRIMARY KEY,guild_id TEXT,owner_user_id TEXT,name TEXT,status TEXT,character_json TEXT);
 CREATE TABLE facts(id TEXT PRIMARY KEY,guild_id TEXT,category TEXT,fact_key TEXT,content TEXT,visibility TEXT,subject_user_id TEXT,subject_character_id TEXT,session_id TEXT,source TEXT,created_at TEXT,archived INTEGER);
 CREATE TABLE relationships(id TEXT PRIMARY KEY,guild_id TEXT,from_type TEXT,from_key TEXT,from_label TEXT,to_type TEXT,to_key TEXT,to_label TEXT,relationship_type TEXT,score INTEGER,visibility TEXT,note TEXT,source TEXT,source_character_id TEXT,updated_at TEXT);
 INSERT INTO campaigns VALUES('c','gm-role');`);
 const data={level:2,resources:{hp:{current:0,max:6},armor:{current:0,max:3},stress:{current:0,max:6},hope:6,hope_max:6},gm_private:'GM-SHEET-CANARY',gm_hooks:[{premise:'GM-HOOK-CANARY'}],nested:{secrets:{visibility:'gm',text:'GM-NESTED-CANARY'},public:'visible'}};
 const character=(id,owner='u',name='Mira',guild='c')=>db.prepare('INSERT INTO characters VALUES(?,?,?,?,?,?)').run(id,guild,owner,name,'active',JSON.stringify(data));character('pc');character('other','v','Other');
 const fact=(id,visibility='public',subjectUser=null,subjectCharacter=null,guild='c',archived=0)=>db.prepare('INSERT INTO facts VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id,guild,'fact',id,id,visibility,subjectUser,subjectCharacter,'legacy-session','gm','2026-11-13T00:00:00Z',archived);
 fact('public');fact('party','party');fact('own-player','player','u');fact('own-character','character',null,'pc');fact('other-character','character',null,'other');fact('other-player','player','v');fact('GM-FACT-CANARY','gm');fact('foreign','public',null,null,'other');fact('archived','public',null,null,'c',1);
 const relationship=(id,visibility='party',note=id,actor='pc')=>db.prepare('INSERT INTO relationships VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,'c','character',actor,'Mira','npc','clerk','Clerk','contact',1,visibility,note,'gm',actor,'2026-11-13T00:00:00Z');
 relationship('public-link');relationship('own-character-link','character');relationship('GM-RELATIONSHIP-CANARY','gm');relationship('own-player-link','player','player:u entitled');relationship('prefix-account-link','player','player:u2 secret');relationship('unrelated','party','unrelated','other');
 relationship('other-character-private','character','OTHER-PC-RELATIONSHIP-CANARY');db.exec("UPDATE relationships SET source_character_id='other' WHERE id='other-character-private'");
 const repository=openLegacyReadOnlyRepository(join(directory,'legacy.sqlite')),client=new EventEmitter(),replies=[],errors=[],fallback=[];let membershipReads=0,memberHook=null,inferenceCalls=0,root;
 const guild={id:'c',members:{fetch:async()=>{membershipReads++;await memberHook?.(membershipReads);return {id:'u',user:{id:'u',bot:false},guild:{id:'c'}};}}};
 client.user={id:'bot'};client.guilds={fetch:async()=>guild};
 const options={client,directory,characterRepository:repository,campaignRepository:repository,rng:()=>1,provider:{generate:async()=>{inferenceCalls++;throw new Error('Export must not invoke inference');}},allowedGuildIds:new Set(['c']),handleOtherCommand:async e=>{fallback.push(e.id);return false;},onError:(e,c)=>errors.push({message:e.message,...c})};
 root=createNativeRoot(options);
 root.sceneStore.commitSnapshot({campaignId:'c',principal:'gm',sourceRef:'setup',records:[{kind:'session',data:{id:'s',campaignId:'c',status:'active'}},{kind:'scene',data:{id:'scene',campaignId:'c',sessionId:'s',status:'active',participants:[{userId:'u',actorId:'pc',presence:'present'}]}},{kind:'actor',data:{id:'pc',campaignId:'c',sceneId:'scene',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'}}].map(r=>({...r,expectedRevision:null}))},{check(){}});
 root.actionStore.initializeHope({campaignId:'c',actorId:'pc',ownerUserId:'u',hope:3,cap:6},{check(){}});root.actionStore.initializePcDefenses({campaignId:'c',actorId:'pc',ownerUserId:'u',controlRevision:'1',hp:{current:2,max:6},armorSlots:{current:1,max:3}},{check(){}});root.actionStore.initializePcLife({campaignId:'c',actorId:'pc',ownerUserId:'u',controlRevision:'1',sourceRef:'review',sourceRevision:'1',level:2,stress:{current:1,max:6}},{check(){}});
 t.after(()=>{root.close();repository.close();db.close();assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep));rmSync(directory,{recursive:true,force:true});});
 function event(id,{query='pc',format='json',sub='export',failReply=false,privateDefer=true,...over}={}){
  const e={id,client,guildId:'c',channelId:'public-channel',user:{id:'u',bot:false},commandName:'vc-character',options:{getSubcommand:()=>sub,getSubcommandGroup:()=>null,getString:k=>k==='character'?query:k==='format'?format:null},isChatInputCommand:()=>true,deferred:false,replied:false,ephemeral:null,
   deferReply:async body=>{e.deferred=true;e.ephemeral=privateDefer;replies.push({id,defer:body});},editReply:async body=>{replies.push({id,...body});if(failReply)throw new Error('Upload response lost');},reply:async body=>{replies.push({id,...body});},...over};return e;
 }
 return {db,repository,client,guild,replies,errors,fallback,character,fact,relationship,directory,event,get root(){return root;},restart(){root.close();root=createNativeRoot(options);},async dispatch(e){client.emit('interactionCreate',e);await root.drain();},get membershipReads(){return membershipReads;},get inferenceCalls(){return inferenceCalls;},memberHook(fn){memberHook=fn;}};
}
