import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {GMService} from '../../src/gm.js';
import {initializeSessionWorldEvents} from '../../src/application/composition/public.js';
import {scheduleSessionOpening} from '../../src/session-opening.js';
import {runSessionOpening} from '../../src/session-opening-runner.js';

initializeSessionWorldEvents();
const sceneAnswer=()=>({fiction_delta:[],narrative_units:[{id:'rain-lantern',kind:'scene',
 text:'Rain combs the empty arcade. A paper lantern turns slowly beneath a shuttered clock, though no hand is near it.',
 subject_key:'',location_key:'',visibility:'party',epistemic:'observation',source_refs:[],receipt_kind:'',receipt_ref:''}]});
function opening(t,{writerFails=false,writerUnavailable=false}={}){
 const directory=mkdtempSync(join(tmpdir(),'rf04-opening-runner-c08-')),file=join(directory,'open.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));
 const db=new VeiledDB(file,schema);db.ensureCampaign('open');db.configureCampaign('open',{playChannelId:'opening-channel'});
 db.setCityCalendar('open',{flags:{narrative_authority:true,playable_narration:true,narrative_camera:true,scene_continuity:true}});
 const session=db.startSession('open','A quiet beginning');
 const messages=[],channel={id:'opening-channel',isTextBased:()=>true,send:async content=>{messages.push(String(typeof content==='string'?content:content.content));return{id:`mock-message-${messages.length}`,channelId:'opening-channel'};}};
 const guild={id:'open',channels:{fetch:async id=>id==='opening-channel'?channel:null}};
 const gm=new GMService({db,content:{root:null,search:()=>[]},config:{gmTurnDeadlineMs:5000},ai:{}}),packets=[];
 let plannerCalls=0,writerCalls=0;
 gm.planAssembly=async()=>{plannerCalls++;return{public_opening:'',character_entries:[],public_parts:[],bonds:[],gm_notes:''};};
 gm.generateNarrative=async(_guild,packet)=>{writerCalls++;packets.push(structuredClone(packet));if(writerFails)throw Object.assign(new Error('mock provider unavailable'),{code:'MOCK_PROVIDER'});return sceneAnswer();};
 if(writerUnavailable)gm.authorAssemblyScene=undefined;
 const openingJob=scheduleSessionOpening(db,{id:'start-open',user:{id:'gm'},guildId:'open'},session,()=>true);
 t.after(()=>{db.close();rmSync(directory,{recursive:true,force:true});});
 return{db,session,guild,gm,packets,messages,openingJob,get plannerCalls(){return plannerCalls;},get writerCalls(){return writerCalls;}};
}

test('zero-attendee opening runs through actual native writer acceptance and mocked public publication exactly once',async t=>{
 const f=opening(t),first=await runSessionOpening({db:f.db,guild:f.guild,gm:f.gm}),job=f.db.getCityRecord('open','session_opening_job',f.session.id);
 assert.equal(job.status,'completed');assert.equal(job.data.attempts,1);assert.equal(f.db.roster(f.session.id).length,0);
 assert.equal(f.plannerCalls,1);assert.equal(f.writerCalls,1);assert.equal(f.packets[0].viewpoint.kind,'camera');assert.equal(f.packets[0].viewpoint.pc_witness,false);
 assert.equal(f.packets[0].audience.mode,'party');assert.equal(f.packets[0].audience.unit_visibility,'party');
 assert.match(f.messages.join('\n'),/Rain combs the empty arcade/);assert.equal(job.data.slots.length,1);assert.equal(job.data.slots[0].audience,'party');
 assert.equal(job.data.slots[0].narrative_status,'VERIFIED_SCENE_DELIVERED');
 const deliveries=f.db.assemblyDeliveryRecords('open',f.session.id),turnId=deliveries[0].data.turn_id,receipts=f.db.listTurnPublications('open',turnId),saved=JSON.stringify(receipts);
 assert.ok(receipts.length>0);assert.ok(receipts.every(row=>row.status==='delivered'&&row.discord_message_id));
 assert.equal(f.db.listCityRecords('open',{kind:'accepted_player_action',includeGM:true}).length,0);
 assert.equal(f.db.listCityRecords('open',{kind:'narrative_unit',includeGM:true}).length,1);
 await runSessionOpening({db:f.db,guild:f.guild,gm:f.gm});
 assert.equal(JSON.stringify(f.db.listTurnPublications('open',turnId)),saved);assert.equal(f.messages.length,1);assert.equal(f.writerCalls,1);assert.equal(f.plannerCalls,1);
 assert.equal(first.status,'completed');
});

test('writer capability absence delivers honest orientation and retains narrative review without claiming authored fiction',async t=>{
 const f=opening(t,{writerUnavailable:true});await runSessionOpening({db:f.db,guild:f.guild,gm:f.gm});
 const job=f.db.getCityRecord('open','session_opening_job',f.session.id),delivery=f.db.assemblyDeliveryRecords('open',f.session.id)[0],rows=f.db.listTurnPublications('open',delivery.data.turn_id);
 assert.equal(job.status,'needs_narrative_review');assert.equal(job.data.slots[0].status,'delivered');assert.equal(job.data.slots[0].narrative_status,'FALLBACK_DELIVERED');
 assert.equal(job.data.slots[0].narrative_verified,false);assert.match(f.messages.join('\n'),/You may compare the observations/);
 assert.doesNotMatch(f.messages.join('\n'),/Rain combs the empty arcade/);assert.ok(rows.length>0);assert.ok(rows.every(row=>row.status==='delivered'));
 const saved=JSON.stringify(rows);await runSessionOpening({db:f.db,guild:f.guild,gm:f.gm});
 assert.equal(JSON.stringify(f.db.listTurnPublications('open',delivery.data.turn_id)),saved);assert.equal(f.messages.length,1);assert.equal(f.writerCalls,0);
});

test('provider failure keeps a scoped review hold and sends no orientation or generated text',async t=>{
 const f=opening(t,{writerFails:true});await runSessionOpening({db:f.db,guild:f.guild,gm:f.gm});
 const job=f.db.getCityRecord('open','session_opening_job',f.session.id);
 assert.equal(job.status,'needs_review');assert.equal(f.db.assemblyDeliveryRecords('open',f.session.id).length,0);
 assert.equal(f.db.listCityRecords('open',{kind:'publication_outbox',includeGM:true}).length,0);assert.equal(f.messages.length,0);assert.equal(f.writerCalls,1);
 assert.doesNotMatch(JSON.stringify(job),/mock provider unavailable/);
});
