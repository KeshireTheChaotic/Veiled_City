/** Retrieval only: deterministic source-bound interest, fictional-time decay and reversible prompt retirement. */
import {createHash} from 'node:crypto';
import {narrativeSourceVisible} from './scene-fiction-context.js';
import {conversationPrincipal} from './conversation-principal.js';
import {currentScene} from './scene-continuity.js';
import {activeCityProxy} from './city-constraints.js';
import {listNarrativeRecords,NARRATIVE_RECORD_LIMIT} from './narrative-records.js';
import {narrativeQueryRelevance,narrativeIdentityRelevance} from './narrative-relevance.js';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0,40);
const visible=(r,s)=>['party','public'].includes(r.visibility)||s.mode==='private'&&r.visibility==='character'&&r.subject_key===s.actorCharacterId;
const records=listNarrativeRecords;
const audience=s=>s.mode==='private'?['character',s.actorCharacterId]:['party',null];
const profileKey=(entity,visibility,subject)=>`salience:${hash([entity,visibility,subject])}`;
function names(db,guild,entity){
  const [kind,...rest]=entity.split(':'),key=rest.join(':'),sim=db.getSimulationEntity(guild,kind,key),npc=kind==='npc'&&db.getNpcProfile(guild,key);
  return [key,npc?.display_name,sim?.state.name,...(sim?.state.aliases||[])].filter(x=>typeof x==='string'&&x.length>=3);
}
const mentions=(text,values)=>values.some(name=>String(text).toLocaleLowerCase().includes(name.toLocaleLowerCase()));
function pinReasons(db,guild,entity){
  const [kind,...rest]=entity.split(':'),key=rest.join(':'),session=db.getActiveSession(guild),reasons=[];
  if(kind==='npc'&&activeCityProxy(db,guild,key))reasons.push('human_proxy');
  if(kind==='location'&&db.listGuildCharacters(guild).some(pc=>pc.data.location===key))reasons.push('pc_occupancy');
  if(kind==='location'&&db.listSimulationEntities(guild,'npc').some(n=>n.state.location_key===key&&!n.state.removed))reasons.push('npc_occupancy');
  if(session&&db.getCurrentEncounter(session.id)?.status==='active')reasons.push('active_encounter_conservative');
  const pending=['compound_action','roll_request','scene_action_window','commitment','evidence_receipt','arc','lead','debt','continuation','npc_proxy'];
  for(const type of pending){const rows=records(db,guild,type);
    if(rows.length>=NARRATIVE_RECORD_LIMIT||rows.some(r=>!['resolved','completed','rejected','withdrawn','expired','cancelled','superseded'].includes(r.status)
      &&!['resolved','completed','failed','cancelled'].includes(r.data.status)&&JSON.stringify(r.data).includes(JSON.stringify(key))))reasons.push(type);
  }
  if(records(db,guild,'narrative_interest').length>=NARRATIVE_RECORD_LIMIT)reasons.push('interest_scan_limit_conservative');
  if(db.listCanon(guild,{includeGM:true,limit:500}).some(r=>JSON.stringify(r).includes(key)))reasons.push('committed_canon');
  if(db.listSimulationEntities(guild,'location').some(r=>r.state.parent_location===key||r.state.parent_location_key===key))reasons.push('parent_location');
  return reasons;
}
function add(db,guild,{entity,source,scene,visibility,subject,reason,weight,dedup,owner=null}){
  const key=`narrative-interest:${hash([entity,visibility,subject,dedup])}`;
  if(db.getCityRecord(guild,'narrative_interest',key))return;
  const profile=profileKey(entity,visibility,subject),tick=db.getSimulationClock(guild).tick;
  db.saveCityRecord(guild,{kind:'narrative_interest',key,status:'active',visibility,subject_key:subject,source_event:source,
    data:{version:1,entity,profile,scene,reason,weight,tick,owner}});
  db.saveCityRecord(guild,{kind:'narrative_salience',key:profile,status:'active',visibility,subject_key:subject,source_event:source,
    data:{version:1,entity,last_interest_tick:tick,retired_tick:null,owner,authority:'Prompt selection only; no change to world entity, knowledge or receipts.'}});
}
function score(db,guild,row,scope){
  const tick=db.getSimulationClock(guild).tick;
  return records(db,guild,'narrative_interest').filter(e=>e.data.profile===row.record_key&&visible(e,scope)
    &&(e.visibility!=='character'||e.data.owner===scope.actorUserId)&&narrativeSourceVisible(db,guild,e.source_event,scope))
    .reduce((n,e)=>n+Math.max(0,e.data.weight-Math.floor(Math.max(0,tick-e.data.tick)/6)),0);
}
export function narrativeImportance(db,guild,entity,scope){
  const rows=records(db,guild,'narrative_salience').filter(r=>r.data.entity===entity&&visible(r,scope)
    &&(r.visibility!=='character'||r.data.owner===scope.actorUserId&&db.getCharacter(r.subject_key)?.owner_user_id===scope.actorUserId));
  if(!rows.length)return null;
  const pins=pinReasons(db,guild,entity),value=rows.reduce((n,r)=>n+score(db,guild,r,scope),0);
  return {score:value,status:pins.length||rows.some(r=>r.status==='active')?'active':'prompt_archived',pins,
    tier:pins.length||value>=20?'anchor':value>=10?'recurring':value>=4?'supporting':'incidental'};
}
export function noteNarrativeInterest(db,guild,scope,sourceRef,{intents=[]}={}){
  if(!db.getCityCalendar(guild).flags.narrative_salience)return;
  const source=db.getWorldEvent(guild,sourceRef),principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId),scene=currentScene(db,guild);
  if(source?.status!=='active'||source.kind!=='ai_gm_input'||source.details.author!==scope.actorUserId
    ||source.details.character_id!==scope.actorCharacterId||source.details.revision!==principal.revision||principal.kind!=='owner'
    ||source.scene!==scene.key||source.session_id!==scene.session_id||!db.ownerAuthoredSource(guild,sourceRef,scope.actorUserId)
    ||!narrativeSourceVisible(db,guild,sourceRef,scope))throw Object.assign(new Error('Current authenticated owner source required for interest.'),{code:'NARRATIVE_SALIENCE'});
  const [visibility,subject]=audience(scope);
  for(const entity of records(db,guild,'autonomous_entity').filter(r=>r.data.narrative_origin&&visible(r,scope)
    &&narrativeSourceVisible(db,guild,r.source_event,scope))){
    if(!mentions(source.details.text,names(db,guild,entity.record_key)))continue;
    const interaction=intents.some(i=>i.data?.target_key===entity.data.key&&['interact','search','speak'].includes(i.data.type));
    const prior=db.getCityRecord(guild,'narrative_salience',profileKey(entity.record_key,visibility,subject));
    const weight=prior?.status==='prompt_archived'?6:interaction?5:3;
    add(db,guild,{entity:entity.record_key,source:sourceRef,scene:scene.key,visibility,subject,reason:prior?.status==='prompt_archived'?'return':interaction?'interaction':'mention',
      weight,owner:scope.actorUserId,dedup:[sourceRef,scope.actorUserId]});
  }
  maintainNarrativeSalience(db,guild);
}
export function noteNarrativeReuse(db,guild,row){
  if(!db.getCityCalendar(guild).flags.narrative_salience)return;
  const u=row.data.unit,entity=u.subject_key?`npc:${u.subject_key}`:u.location_key?`location:${u.location_key}`:null;
  if(!entity||!db.getCityRecord(guild,'autonomous_entity',entity))return;
  add(db,guild,{entity,source:row.source_event,scene:row.data.binding.scene,visibility:row.visibility,subject:row.subject_key||null,
    owner:row.data.binding.scope?.actorUserId||null,reason:u.kind==='lead'?'lead':'gm_reuse',weight:u.kind==='lead'?7:1,dedup:[row.data.binding.scene,u.kind==='lead'?'lead':'gm']});
}
export function maintainNarrativeSalience(db,guild){
  if(!db.getCityCalendar(guild).flags.narrative_salience)return;
  const tick=db.getSimulationClock(guild).tick;
  for(const row of records(db,guild,'narrative_salience')){
    const scope={mode:row.visibility==='character'?'private':'party',actorCharacterId:row.subject_key,actorUserId:row.subject_key&&db.getCharacter(row.subject_key)?.owner_user_id};
    const pinned=pinReasons(db,guild,row.data.entity).length>0;
    if(row.status==='active'&&!pinned&&tick-row.data.last_interest_tick>=6&&score(db,guild,row,scope)<3)
      db.saveCityRecord(guild,{...row,key:row.record_key,status:'prompt_archived',data:{...row.data,retired_tick:tick}});
  }
}
export function rankNarrativeMemory(db,guild,scope,rows,{query='',location=null,maxChars=9000}={}){
  if(!db.getCityCalendar(guild).flags.narrative_salience){
    const selected=[];let used=0;
    for(const row of rows){const size=JSON.stringify(row).length;if(used+size>maxChars)continue;
      selected.push(row);used+=size;if(selected.length>=12)break;}
    return selected;
  }
  const ranked=rows.map(row=>{
    const unit=db.getCityRecord(guild,'narrative_unit',row.unit)?.data.unit;
    const entity=unit?.subject_key?`npc:${unit.subject_key}`:row.location?`location:${row.location}`:null;
    const importance=entity&&narrativeImportance(db,guild,entity,scope),exact=entity&&narrativeIdentityRelevance(db,guild,entity,scope,query)>0;
    return {row,score:narrativeQueryRelevance(row.text,query)+(exact?1000:0)+(row.location===location?500:0)+(importance?.pins.length?300:0)+(importance?.score||0),
      archived:importance?.status==='prompt_archived'&&!exact&&!importance.pins.length};
  }).filter(r=>!r.archived).sort((a,b)=>b.score-a.score||a.row.unit.localeCompare(b.row.unit));
  const selected=[];let used=0,novelty=0;
  for(const item of ranked){const size=JSON.stringify(item.row).length;if(!item.score&&novelty>=2||used+size>maxChars)continue;
    selected.push(item.row);used+=size;if(!item.score)novelty++;if(selected.length>=16)break;}
  return selected;
}
export function narrativeContextEligible(db,guild,entity,scope,{query='',location=null}={}){
  if(!db.getCityCalendar(guild).flags.narrative_salience)return true;
  const importance=narrativeImportance(db,guild,entity,scope);
  return importance?.status!=='prompt_archived'||importance.pins.length>0||mentions(query,names(db,guild,entity))||entity===`location:${location}`;
}
