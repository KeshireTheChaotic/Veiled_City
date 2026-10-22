import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {GMService} from '../../src/gm.js';
import {scheduleSessionOpening} from '../../src/session-opening.js';
import {prepareOpeningEntryOpportunity} from '../../src/session-opening-attendance.js';
import {assemblyHookSources} from '../../src/assembly-context.js';
export function barrier(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
export function fixture({active=true}={}){
  const dir=mkdtempSync(path.join(tmpdir(),'vc-p10-')),dbPath=path.join(dir,'session.sqlite'),
    schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url)),db=new VeiledDB(dbPath,schema),connections=[db],sends=[],packets=[];
  db.ensureCampaign('g');db.configureCampaign('g',{playChannelId:'table'});
  db.setCityCalendar('g',{flags:{scene_continuity:true,narrative_camera:true,narrative_authority:true,playable_narration:true}});
  db.setSimulationEntity('g','location','market',{name:'Night Market',visibility:'party'});
  const session=active?db.startSession('g','P10 opening','auto'):null;
  const send=target=>async content=>{const id=`ack-${sends.length+1}`;sends.push({target,content:typeof content==='string'?content:content.content,id});return {id,channelId:target};};
  const guild={id:'g',channels:{fetch:async id=>({id,isTextBased:()=>true,send:send(id)})},members:{fetch:async user=>({send:send(`dm-${user}`)})}};
  const gm=Object.create(GMService.prototype);gm.db=db;gm.config={gmTurnDeadlineMs:5000};gm.metrics={record(){}};
  let plans=0,writes=0;
  let planImpl=async()=>currentPlan(),writerImpl=async(_guild,packet)=>answer(packet);
  Object.defineProperty(gm,'planAssembly',{get:()=>async(...args)=>{plans++;return planImpl(...args);},set:fn=>{planImpl=fn;}});
  Object.defineProperty(gm,'generateNarrative',{get:()=>async(...args)=>{writes++;packets.push(args[1]);return writerImpl(...args);},set:fn=>{writerImpl=fn;}});
  function currentPlan(){return {public_opening:'Planner direction remains private.',character_entries:db.roster(db.getActiveSession('g').id).filter(r=>r.character_id&&['present','late','guest'].includes(r.presence)).map(r=>({discord_user_id:r.discord_user_id,character_name:r.name,private_hook:'Planner hook stays private.',hook_source_refs:assemblyHookSources(db,'g',r.character_id).slice(0,1).map(s=>s.id)}))};}
  function answer(packet){return {version:9,acts:[{id:'opening',task_id:packet.audience_v9.task_ids[0],kind:'scene_description',speaker_key:'',location_key:packet.place.key||'market',
    text:'Amber lamps shimmer over rain-dark stalls. A bell rings behind the shuttered tea counter; a handwritten sign offers shelter while the kettle warms.',source_refs:[]}],fiction_delta:[]};}
  function attend(user){db.upsertPlayer('g',user,user);const pc=db.createCharacter('g',user,`Character ${user}`,{entry_hooks:[`OWNER_${user}_THREAD`,{text:'SECRET_CANARY',visibility:'gm'}]});
    db.setPresence(session.id,user,'present','offscreen');db.assignCharacter(session.id,user,pc.id,{role:'primary',controlPolicy:'player_only'});
    const opportunity=prepareOpeningEntryOpportunity(db,'g',user,pc.id,`present-${user}`);return {pc,opportunity};}
  function start(){return scheduleSessionOpening(db,{id:'start-p10',guildId:'g',user:{id:'gm'}},session,()=>true);}
  return {db,guild,session,sends,packets,gm,currentPlan,answer,attend,start,calls:()=>({plans,writes}),
    connect(){const other=new VeiledDB(dbPath,schema);connections.push(other);return other;},
    paths:{dbPath,schema},
    close(){if(process.env.P10_EVIDENCE==='1')console.log('P10_MOCK_USAGE',JSON.stringify({planner_invocations:plans,writer_invocations:writes,paid_provider_calls:0,provider_tokens:0,provider_spend_usd:0}));for(const c of connections)try{c.db.close();}catch{}rmSync(dir,{recursive:true,force:true});}};
}
