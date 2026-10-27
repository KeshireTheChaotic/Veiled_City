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
import {assemblyHookSources} from '../../src/assembly-context.js';

initializeSessionWorldEvents();

function interaction({guild,user,sub,character='Rin',replyDone=()=>{}}){
 const replies=[],options={getSubcommand:()=>sub,getSubcommandGroup:()=> 'session',
   getString:name=>name==='assembly'?'auto':name==='title'?'A city in rain':name==='character'?character:null,
   getUser:()=>null,getInteger:()=>null};
 return {commandName:'vc-session',guildId:guild.id,id:`${sub}-${user.id}`,user:{id:user.id,username:user.id},guild,
  member:{displayName:user.id,roles:{cache:{has:()=>false}}},memberPermissions:{has:()=>true},options,
  isChatInputCommand:()=>true,isButton:()=>false,
  reply:async payload=>{replies.push(typeof payload==='string'?payload:payload.content);replyDone();return{};},
  followUp:async payload=>{replies.push(typeof payload==='string'?payload:payload.content);return{};},
  deferReply:async()=>({}),editReply:async payload=>{replies.push(typeof payload==='string'?payload:payload.content);return{};},
  replies};
}

test('start with no attendees and present during a blocked planner regenerates only before commitment',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'rf04-command-start-present-c10-')),
   file=join(directory,'session.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url)),db=new VeiledDB(file,schema);
 db.ensureCampaign('command-open');db.configureCampaign('command-open',{playChannelId:'shared'});
 db.setCityCalendar('command-open',{flags:{narrative_authority:true,playable_narration:true,narrative_camera:true,scene_continuity:true}});
 db.upsertPlayer('command-open','rin','Rin');const rin=db.createCharacter('command-open','rin','Rin');
 const sent={shared:[],private:[]},channels=new Map(),channel=id=>{
   if(!channels.has(id))channels.set(id,{id,isTextBased:()=>true,send:async payload=>{
     const text=String(typeof payload==='string'?payload:payload.content);sent.shared.push({id,text});return{id:`ack-${sent.shared.length}`,channelId:id};
   }});return channels.get(id);
 };
 const guild={id:'command-open',channels:{fetch:async id=>channel(id)},members:{fetch:async user=>({id:user,send:async payload=>{
   const text=String(typeof payload==='string'?payload:payload.content);sent.private.push({user,text});return{id:`dm-${sent.private.length}`,channelId:`dm-${user}`};
 }})}};
 const gm=new GMService({db,content:{root:null,search:()=>[]},config:{gmTurnDeadlineMs:5000},ai:{}});
 let plannerCalls=0,releaseFirst,enteredFirst;
 const firstPlanner=new Promise(resolve=>{releaseFirst=resolve;}),plannerEntered=new Promise(resolve=>{enteredFirst=resolve;});
 gm.planAssembly=async()=>{
   plannerCalls++;if(plannerCalls===1){enteredFirst();await firstPlanner;return{public_opening:'',character_entries:[],public_parts:[],bonds:[],gm_notes:'Initial zero-attendee snapshot.'};}
   const roster=db.roster(db.getActiveSession('command-open').id).filter(r=>r.character_id&&['present','late','guest'].includes(r.presence));
   const entries=roster.map(r=>({discord_user_id:r.discord_user_id,character_name:r.name,private_hook:'Planner prose stays private.',
     hook_source_refs:assemblyHookSources(db,'command-open',r.character_id).map(x=>x.id),private_parts:[]}));
   return{public_opening:'',character_entries:entries,public_parts:[],bonds:[],gm_notes:'A camera opening with independent owner thread.'};
 };
 const packets=[];gm.generateNarrative=async(_guild,packet)=>{
   packets.push(structuredClone(packet));const privateScope=packet.audience.mode==='private';
   return{fiction_delta:[],narrative_units:[{id:privateScope?'private-entry':'public-camera',kind:'scene',
     text:privateScope?'A copper lantern glows beside a rain-darkened window.':'A bell rings once somewhere beyond the rain-lit arcade.',
     subject_key:privateScope?rin.id:'',location_key:'',visibility:privateScope?'character':'party',epistemic:'observation',
     source_refs:[],receipt_kind:'',receipt_ref:''}]};
 };
 t.after(()=>{db.close();rmSync(directory,{recursive:true,force:true});});
 assert.equal(db.getActiveSession('command-open'),undefined);assert.equal(db.listPlayers('command-open').length,1);
 const originalCharacterData=JSON.stringify(rin.data);
 let presentReply;const presentReplied=new Promise(resolve=>{presentReply=resolve;});
 const start=interaction({guild,user:{id:'gm'},sub:'start'}),startPromise=handleCommand(start,{db,gm});
 await plannerEntered;
 const present=interaction({guild,user:{id:'rin'},sub:'present',replyDone:presentReply}),presentPromise=handleCommand(present,{db,gm});
 await presentReplied;
 const session=db.getActiveSession('command-open');assert.ok(session);assert.equal(db.activeAssignment(session.id,'rin').character_id,rin.id);
 assert.equal(db.roster(session.id).find(r=>r.discord_user_id==='rin').presence,'present');
 assert.equal(plannerCalls,1);assert.equal(sent.shared.length+sent.private.length,0);
 releaseFirst();await Promise.all([startPromise,presentPromise]);
 const job=db.getCityRecord('command-open','session_opening_job',session.id);
 assert.equal(plannerCalls,2,'the stale uncommitted snapshot is regenerated once from the checked-in roster');
 assert.equal(job.status,'completed',JSON.stringify(job.data.slots));
 assert.equal(packets.filter(p=>p.audience.mode==='private').length,1);assert.equal(packets.some(p=>p.audience.mode==='private'&&p.audience.subject_key===rin.id),true);
 assert.equal(sent.private.length,1);assert.equal(sent.private[0].user,'rin');assert.match(sent.private[0].text,/copper lantern glows/);
 assert.equal(sent.shared.length,1);assert.match(sent.shared[0].text,/bell rings once/);
 assert.doesNotMatch(sent.shared[0].text,/copper lantern|Planner prose|Initial zero-attendee/);
 assert.equal(db.getCharacter(rin.id).data.location,undefined);assert.equal(db.hasCharacterPlacementHistory('command-open',rin.id),false);
 assert.equal(db.listCityRecords('command-open',{kind:'accepted_player_action',includeGM:true}).length,0);
 assert.equal(JSON.stringify(db.getCharacter(rin.id).data),originalCharacterData,'check-in and opening do not change PC resources or narrative state');
 const turns=db.assemblyDeliveryRecords('command-open',session.id).flatMap(r=>db.listTurnPublications('command-open',r.data.turn_id));
 assert.equal(turns.length,2);assert.ok(turns.every(r=>r.status==='delivered'&&r.discord_message_id));
});
