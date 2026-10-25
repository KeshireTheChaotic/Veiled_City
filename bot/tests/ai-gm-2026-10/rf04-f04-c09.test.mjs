import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {GMService} from '../../src/gm.js';
import {initializeSessionWorldEvents} from '../../src/application/composition/public.js';
import {assemblyHookSources} from '../../src/assembly-context.js';
import {scheduleSessionOpening} from '../../src/session-opening.js';
import {runSessionOpening} from '../../src/session-opening-runner.js';

initializeSessionWorldEvents();
function answer(packet,characters,leakCharacter=null){
 const privateMode=packet.audience.mode==='private',character=packet.audience.subject_key,
  user=Object.entries(characters).find(([,pc])=>pc.id===character)?.[0];
 const text=privateMode?user===leakCharacter?'LEAKED Ada-only detail: the brass key has a blue scratch.':
   user==='ada'?'A copper lantern leaves a warm ring on the sill.':'A folded map bears an unusual tide mark.'
   :'Across the arcade, a lantern swings beside the silent clock. No one is yet standing together.';
 const visibility=privateMode&&user!==leakCharacter?'character':'party';
 return{fiction_delta:[],narrative_units:[{id:privateMode?`entry-${character}`:'shared-camera',kind:'scene',text,
  subject_key:visibility==='character'?character:'',location_key:'',visibility,epistemic:'observation',source_refs:[],receipt_kind:'',receipt_ref:''}]};
}
function party(t,{leakCharacter=null}={}){
 const directory=mkdtempSync(join(tmpdir(),'rf04-private-cohort-c09-')),file=join(directory,'cohort.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));
 const db=new VeiledDB(file,schema);db.ensureCampaign('cohort');db.configureCampaign('cohort',{playChannelId:'shared-channel'});
 db.setCityCalendar('cohort',{flags:{narrative_authority:true,playable_narration:true,narrative_camera:true,scene_continuity:true}});
 const privateHooks={ada:'Ada-only: follow the copper lantern maker.',noor:'Noor-only: keep the tide chart folded.'};
 for(const [user,name]of[['ada','Ada'],['noor','Noor']])db.upsertPlayer('cohort',user,name);
 const characters={ada:db.createCharacter('cohort','ada','Ada'),noor:db.createCharacter('cohort','noor','Noor')};
 db.updateCharacterData(characters.ada.id,d=>{d.entry_hooks=[privateHooks.ada];});db.updateCharacterData(characters.noor.id,d=>{d.entry_hooks=[privateHooks.noor];});
 db.upsertCharacterNarrative('cohort',characters.ada.id,'gm_private','# Ada GM secret\n\nADA-GM-ONLY-SECRET');
 db.upsertCharacterGmHook('cohort',characters.ada.id,{key:'gm-secret',title:'Hidden planner seed',premise:'ADA-GM-HOOK-SECRET'}, {source:'fixture'});
 const session=db.startSession('cohort','An opening with separate owner threads');
 for(const user of ['ada','noor']){db.assignCharacter(session.id,user,characters[user].id);db.setPresence(session.id,user,'present');}
 const shared=[],privateSends=[],channels=new Map();
 const channel=(id)=>{if(!channels.has(id))channels.set(id,{id,isTextBased:()=>true,send:async content=>{const body=String(typeof content==='string'?content:content.content);
  if(id==='shared-channel')shared.push(body);else privateSends.push({user:id,body});return{id:`ack-${id}-${shared.length+privateSends.length}`,channelId:id==='shared-channel'?id:null};}});return channels.get(id);};
 const guild={id:'cohort',channels:{fetch:async id=>channel(id)},members:{fetch:async user=>({id:user,send:async content=>{const body=String(typeof content==='string'?content:content.content);privateSends.push({user,body});return{id:`dm-${user}-${privateSends.length}`,channelId:`dm-channel-${user}`};}})}};
 const gm=new GMService({db,content:{root:null,search:()=>[]},config:{gmTurnDeadlineMs:5000},ai:{}}),packets=[];let plannerCalls=0,writerCalls=0;
 gm.planAssembly=async()=>{plannerCalls++;const entries=db.roster(session.id).filter(r=>r.character_id&&['present','late','guest'].includes(r.presence)).map(r=>{
  const source=assemblyHookSources(db,'cohort',r.character_id)[0];return{discord_user_id:r.discord_user_id,character_name:r.name,
   private_hook:`Planner-only proposal for ${r.name}.`,hook_source_refs:[source.id],private_parts:[]};});
  return{public_opening:'',character_entries:entries,public_parts:[],bonds:[],gm_notes:'GM-private opening plan.'};};
 gm.generateNarrative=async(_guild,packet)=>{writerCalls++;packets.push(structuredClone(packet));return answer(packet,characters,leakCharacter);};
 const openingJob=scheduleSessionOpening(db,{id:'cohort-start',user:{id:'gm'},guildId:'cohort'},session,()=>true);
 t.after(()=>{db.close();rmSync(directory,{recursive:true,force:true});});
 return{db,session,guild,gm,characters,privateHooks,packets,shared,privateSends,openingJob,get plannerCalls(){return plannerCalls;},get writerCalls(){return writerCalls;}};
}

test('two owners receive distinct native-accepted private scenes while shared publication omits both threads',async t=>{
 const f=party(t);await runSessionOpening({db:f.db,guild:f.guild,gm:f.gm});
 const job=f.db.getCityRecord('cohort','session_opening_job',f.session.id);assert.equal(job.status,'completed',JSON.stringify(job.data.slots));assert.equal(f.plannerCalls,1);assert.equal(f.writerCalls,3);
 const privatePackets=f.packets.filter(p=>p.audience.mode==='private');assert.equal(privatePackets.length,2);
 for(const [user,secret]of Object.entries(f.privateHooks)){
  const pc=f.characters[user],packet=privatePackets.find(p=>p.audience.subject_key===pc.id),dm=f.privateSends.find(m=>m.user===user);
  assert.ok(packet);assert.ok(JSON.stringify(packet).includes(secret));assert.ok(dm);assert.equal(packet.viewpoint.pc_witness,false);
  assert.equal(packet.audience.unit_visibility,'character');assert.match(dm.body,user==='ada'?/copper lantern leaves a warm ring/:/folded map bears an unusual tide mark/);
  assert.equal(dm.body.includes(user==='ada'?f.privateHooks.noor:f.privateHooks.ada),false);
 }
 assert.equal(f.privateSends.length,2);assert.equal(f.shared.length,1);assert.match(f.shared[0],/Across the arcade/);
 for(const secret of [...Object.values(f.privateHooks),'ADA-GM-ONLY-SECRET','ADA-GM-HOOK-SECRET','Planner-only proposal'])assert.equal(f.shared.join('\n').includes(secret),false);
 for(const p of privatePackets){const other=p.audience.subject_key===f.characters.ada.id?f.privateHooks.noor:f.privateHooks.ada;assert.equal(JSON.stringify(p).includes(other),false);}
 const jobs=f.db.assemblyDeliveryRecords('cohort',f.session.id),receipts=jobs.flatMap(row=>f.db.listTurnPublications('cohort',row.data.turn_id));
 assert.equal(receipts.length,3);assert.ok(receipts.every(row=>row.status==='delivered'&&row.discord_message_id));
 const saved=JSON.stringify(receipts),count=f.shared.length+f.privateSends.length;await runSessionOpening({db:f.db,guild:f.guild,gm:f.gm});
 const after=jobs.flatMap(row=>f.db.listTurnPublications('cohort',row.data.turn_id));assert.equal(JSON.stringify(after),saved);assert.equal(f.shared.length+f.privateSends.length,count);
 assert.equal(f.db.hasCharacterPlacementHistory('cohort',f.characters.ada.id),false);assert.equal(f.db.hasCharacterPlacementHistory('cohort',f.characters.noor.id),false);
});

test('party-labeled private response is held and cannot cross into shared or another owner publication',async t=>{
 const f=party(t,{leakCharacter:'ada'});await runSessionOpening({db:f.db,guild:f.guild,gm:f.gm});
 const job=f.db.getCityRecord('cohort','session_opening_job',f.session.id),ada=f.privateSends.find(m=>m.user==='ada'),noor=f.privateSends.find(m=>m.user==='noor');
 assert.equal(job.status,'needs_narrative_review',JSON.stringify(job.data.slots));assert.ok(ada);assert.ok(noor);assert.equal(f.shared.length,1);
 assert.equal(job.data.slots.find(s=>s.character===f.characters.ada.id).narrative_status,'FALLBACK_DELIVERED');
 assert.equal(job.data.slots.find(s=>s.character===f.characters.noor.id).narrative_status,'VERIFIED_SCENE_DELIVERED');
 assert.match(ada.body,/private assembly orientation/);assert.doesNotMatch(ada.body,/LEAKED Ada-only detail|blue scratch|Noor-only/);
 assert.doesNotMatch(noor.body,/LEAKED Ada-only detail|blue scratch|Ada-only/);
 assert.doesNotMatch(f.shared.join('\n'),/LEAKED Ada-only detail|blue scratch|Ada-only|Noor-only/);
 assert.equal(f.db.listCityRecords('cohort',{kind:'narrative_unit',includeGM:true}).some(row=>row.data.unit?.text?.includes('LEAKED Ada-only detail')),false);
});
