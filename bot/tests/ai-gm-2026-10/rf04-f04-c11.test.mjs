import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {GMService} from '../../src/gm.js';
import {handleCommand} from '../../src/commands.js';
import {initializeSessionWorldEvents} from '../../src/application/composition/public.js';

initializeSessionWorldEvents();

function command({guild,user,sub}){
 const replies=[],options={getSubcommand:()=>sub,getSubcommandGroup:()=> 'session',getString:name=>
   name==='assembly'?'auto':name==='title'?'Night market':name==='character'?'Rin':null,
   getUser:()=>null,getInteger:()=>null};
 return{commandName:'vc-session',guildId:guild.id,id:`late-${sub}-${user.id}`,user:{id:user.id,username:user.id},guild,
  member:{displayName:user.id,roles:{cache:{has:()=>false}}},memberPermissions:{has:()=>true},options,
  isChatInputCommand:()=>true,isButton:()=>false,
  reply:async payload=>{replies.push(typeof payload==='string'?payload:payload.content);return{};},
  followUp:async payload=>{replies.push(typeof payload==='string'?payload:payload.content);return{};},
  deferReply:async()=>({}),editReply:async payload=>{replies.push(typeof payload==='string'?payload:payload.content);return{};},replies};
}

test('post-opening check-in adds only one private owner entry and keeps the public receipt fixed',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'rf04-late-owner-c11-')),file=join(dir,'late.sqlite'),
  schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url)),db=new VeiledDB(file,schema);
 db.ensureCampaign('late-owner');db.configureCampaign('late-owner',{playChannelId:'public'});
 db.setCityCalendar('late-owner',{flags:{narrative_authority:true,playable_narration:true,narrative_camera:true,scene_continuity:true}});
 db.upsertPlayer('late-owner','rin','Rin');const rin=db.createCharacter('late-owner','rin','Rin');
 db.updateCharacterData(rin.id,d=>{d.entry_hooks=['Find the seller who rings a glass bell at dusk.'];});
 const shared=[],privateMessages=[],channels=new Map(),channel=id=>{
  if(!channels.has(id))channels.set(id,{id,isTextBased:()=>true,send:async payload=>{
   const content=String(typeof payload==='string'?payload:payload.content);shared.push({id,content});return{id:`public-${shared.length}`,channelId:id};
  }});return channels.get(id);
 };
 const guild={id:'late-owner',channels:{fetch:async id=>channel(id)},members:{fetch:async user=>({id:user,send:async payload=>{
  const content=String(typeof payload==='string'?payload:payload.content);privateMessages.push({user,content});return{id:`private-${privateMessages.length}`,channelId:`dm-${user}`};
 }})}};
 const gm=new GMService({db,content:{root:null,search:()=>[]},config:{gmTurnDeadlineMs:5000},ai:{}});let plannerCalls=0;const packets=[];
 gm.planAssembly=async()=>{plannerCalls++;return{public_opening:'',character_entries:[],public_parts:[],bonds:[],gm_notes:'No attendees were present at session start.'};};
 gm.generateNarrative=async(_guild,packet)=>{packets.push(structuredClone(packet));const privateScope=packet.audience.mode==='private';
  return{fiction_delta:[],narrative_units:[{id:privateScope?'late-owner-entry':'empty-room-camera',kind:'scene',
   text:privateScope?'A glass bell rings softly behind the spice stalls.':'Lanterns glow over an open market square as evening rain begins.',
   subject_key:privateScope?rin.id:'',location_key:'',visibility:privateScope?'character':'party',epistemic:'observation',
   source_refs:[],receipt_kind:'',receipt_ref:''}]};};
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
 const start=command({guild,user:{id:'gm'},sub:'start'});await handleCommand(start,{db,gm});
 const session=db.getActiveSession('late-owner'),job=db.getCityRecord('late-owner','session_opening_job',session.id);
 assert.equal(job.status,'completed',JSON.stringify(job.data.slots));assert.equal(plannerCalls,1);assert.equal(shared.length,1);assert.equal(privateMessages.length,0);
 const originalShared=JSON.stringify(shared),originalReceipts=db.assemblyDeliveryRecords('late-owner',session.id)
  .flatMap(row=>db.listTurnPublications('late-owner',row.data.turn_id));assert.equal(originalReceipts.length,1);
 const savedReceipt=JSON.stringify(originalReceipts);assert.equal(db.getCharacter(rin.id).data.location,undefined);
 const present=command({guild,user:{id:'rin'},sub:'present'});await handleCommand(present,{db,gm});
 const afterShared=db.assemblyDeliveryRecords('late-owner',session.id)
  .flatMap(row=>db.listTurnPublications('late-owner',row.data.turn_id));
 assert.equal(plannerCalls,1,'late check-in does not reopen or regenerate the initial assembly');
 assert.equal(packets.length,2);assert.equal(packets[0].audience.mode,'party');assert.equal(packets[1].audience.mode,'private');
 assert.equal(packets[1].audience.subject_key,rin.id);assert.ok(JSON.stringify(packets[1]).includes('Find the seller who rings a glass bell at dusk.'));
 assert.equal(privateMessages.length,1);assert.equal(privateMessages[0].user,'rin');assert.match(privateMessages[0].content,/glass bell rings softly/);
 assert.equal(JSON.stringify(shared),originalShared,'public camera publication is unchanged after late check-in');
 assert.equal(JSON.stringify(afterShared),savedReceipt,'the original acknowledged outbox receipt remains byte-for-byte unchanged');
 assert.equal(db.getCharacter(rin.id).data.location,undefined);assert.equal(db.hasCharacterPlacementHistory('late-owner',rin.id),false);
 assert.equal(db.listCityRecords('late-owner',{kind:'accepted_player_action',includeGM:true}).length,0);
 const entries=db.listCityRecords('late-owner',{kind:'opening_entry_delivery',includeGM:true,limit:20});assert.equal(entries.length,1);
 const entryReceipts=db.listTurnPublications('late-owner',entries[0].data.turn_id);assert.equal(entryReceipts.length,1);
 assert.equal(entryReceipts[0].status,'delivered');assert.ok(entryReceipts[0].discord_message_id);
});
