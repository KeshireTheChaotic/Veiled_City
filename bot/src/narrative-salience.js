import {nativeSalienceAvailable,names,mentions,narrativeContextEligible,narrativeImportanceSource} from './frameworks/narrative/public.js';
export {nativeSalienceAvailable,narrativeContextEligible};
/** Retrieval only: deterministic source-bound interest, fictional-time decay and reversible prompt retirement. */
import {createHash} from 'node:crypto';
import {narrativeSourceVisible,sceneFictionHash as proofHash} from './frameworks/narrative/public.js';
import {narrativeSessionPrincipal} from './frameworks/narrative/public.js';
function conversationPrincipal(...args){return narrativeSessionPrincipal.conversationPrincipal(...args);}
import {narrativeSessionScene} from './frameworks/narrative/public.js';
const {currentScene}=narrativeSessionScene;
import {narrativeWorldConstraints} from './frameworks/narrative/public.js';
const {activeCityProxy}=narrativeWorldConstraints;
import {narrativeKnowledgeReaders} from './frameworks/narrative/public.js';
const listNarrativeRecords=(...args)=>narrativeKnowledgeReaders.listNarrativeRecords(...args),NARRATIVE_RECORD_LIMIT=()=>narrativeKnowledgeReaders.narrativeRecordLimit();
import {narrativeQueryRelevance,narrativeIdentityRelevance} from './narrative-relevance.js';
import {narrativeWorldIdentityOrigin} from './frameworks/narrative/public.js';
function worldIdentityOrigin(...args){return narrativeWorldIdentityOrigin.worldIdentityOrigin(...args);}
import {consentAction,historicalActionSource} from './action-consent.js';
import {characterSourceRanges} from './source-communication.js';
import {narrativeWorldIdentityPersistence} from './frameworks/narrative/public.js';
function maintainIdentityPersistence(...args){return narrativeWorldIdentityPersistence.maintainIdentityPersistence(...args);}
import {narrativeWorldBridge} from './frameworks/narrative/public.js';
function canonicalNarrativeCause(...args){return narrativeWorldBridge.canonicalNarrativeCause(...args);}
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0,40);
const visible=(r,s)=>['party','public'].includes(r.visibility)||s.mode==='private'&&r.visibility==='character'&&r.subject_key===s.actorCharacterId;
const records=listNarrativeRecords;
const audience=s=>s.mode==='private'?['character',s.actorCharacterId]:['party',null];
const profileKey=(entity,visibility,subject)=>`salience:${hash([entity,visibility,subject])}`;
/** Fictional-time retrieval weight, never a truth or promotion grant. */
export function decayedNarrativeWeight(weight,createdTick,currentTick){
  if(!Number.isFinite(weight)||weight<0||!Number.isSafeInteger(createdTick)||!Number.isSafeInteger(currentTick)
    ||createdTick<0||currentTick<createdTick)return 0;
  return Math.max(0,weight-Math.floor((currentTick-createdTick)/6));
}
/** Legacy opt-in remains readable. Qualified native fiction does not need a second routine salience toggle. */



function pinReasons(db,guild,entity){
  const [kind,...rest]=entity.split(':'),key=rest.join(':'),session=db.getActiveSession(guild),reasons=[];
  if(kind==='npc'&&activeCityProxy(db,guild,key))reasons.push('human_proxy');
  if(kind==='location'&&db.listGuildCharacters(guild).some(pc=>pc.data.location===key))reasons.push('pc_occupancy');
  if(kind==='location'&&db.listSimulationEntities(guild,'npc').some(n=>n.state.location_key===key&&!n.state.removed))reasons.push('npc_occupancy');
  if(session&&db.getCurrentEncounter(session.id)?.status==='active')reasons.push('active_encounter_conservative');
  const pending=['compound_action','roll_request','scene_action_window','commitment','evidence_receipt','arc','lead','debt','continuation','npc_proxy'];
  for(const type of pending){const rows=records(db,guild,type);
    if(rows.length>=NARRATIVE_RECORD_LIMIT()||rows.some(r=>!['resolved','completed','rejected','withdrawn','expired','cancelled','superseded'].includes(r.status)
      &&!['resolved','completed','failed','cancelled'].includes(r.data.status)&&JSON.stringify(r.data).includes(JSON.stringify(key))))reasons.push(type);
  }
  if(records(db,guild,'narrative_interest').length>=NARRATIVE_RECORD_LIMIT())reasons.push('interest_scan_limit_conservative');
  if(db.listCanon(guild,{includeGM:true,limit:500}).some(r=>JSON.stringify(r).includes(key)))reasons.push('committed_canon');
  if(db.listSimulationEntities(guild,'location').some(r=>r.state.parent_location===key||r.state.parent_location_key===key))reasons.push('parent_location');
  return reasons;
}
function add(db,guild,{entity,source,scene,visibility,subject,reason,weight,dedup,owner=null,nativeIntent=null}){
  const key=`narrative-interest:${hash([entity,visibility,subject,dedup])}`;
  if(db.getCityRecord(guild,'narrative_interest',key))return;
  const profile=profileKey(entity,visibility,subject),tick=db.getSimulationClock(guild).tick;
  db.saveCityRecord(guild,{kind:'narrative_interest',key,status:'active',visibility,subject_key:subject,source_event:source,
    data:{version:2,entity,profile,scene,reason,weight,tick,owner,native_intent:nativeIntent}});
  db.saveCityRecord(guild,{kind:'narrative_salience',key:profile,status:'active',visibility,subject_key:subject,source_event:source,
    data:{version:1,entity,last_interest_tick:tick,retired_tick:null,owner,authority:'Prompt selection only; no change to world entity, knowledge or receipts.'}});
}
function score(db,guild,row,scope){
  if(!worldIdentityOrigin(db,guild,db.getCityRecord(guild,'autonomous_entity',row.data.entity),scope))return 0;
  const tick=db.getSimulationClock(guild).tick;
  return records(db,guild,'narrative_interest').filter(e=>e.status==='active'&&e.data.profile===row.record_key&&visible(e,scope)
    &&(e.visibility!=='character'||e.data.owner===scope.actorUserId)&&narrativeSourceVisible(db,guild,e.source_event,scope))
    .reduce((n,e)=>n+decayedNarrativeWeight(e.data.weight,e.data.tick,tick),0);
}
export function narrativeImportance(db,guild,entity,scope){
  if(!worldIdentityOrigin(db,guild,db.getCityRecord(guild,'autonomous_entity',entity),scope))return null;
  const rows=records(db,guild,'narrative_salience').filter(r=>r.data.entity===entity&&visible(r,scope)
    &&(r.visibility!=='character'||r.data.owner===scope.actorUserId&&db.getCharacter(r.subject_key)?.owner_user_id===scope.actorUserId));
  if(!rows.length)return null;
  const pins=pinReasons(db,guild,entity),value=rows.reduce((n,r)=>n+score(db,guild,r,scope),0);
  return {score:value,status:pins.length||rows.some(r=>r.status==='active')?'active':'prompt_archived',pins,
    tier:pins.length||value>=20?'anchor':value>=10?'recurring':value>=4?'supporting':'incidental'};
}
/** New persistence cannot rely on historical heuristic weights or provider-supplied scores. */
export function canonicalInterestEvidence(db,guild,entity,scope){
  const identity=db.getCityRecord(guild,'autonomous_entity',entity),origin=worldIdentityOrigin(db,guild,identity,scope);
  if(origin?.version!==1)return [];
  const tick=db.getSimulationClock(guild).tick,found=[];
  for(const row of records(db,guild,'narrative_interest')){
    const d=row.data,source=db.getWorldEvent(guild,row.source_event);
    if(d.version!==2||d.entity!==entity||row.status!=='active'||!visible(row,scope)||!Number.isSafeInteger(d.tick)||d.tick>tick
      ||row.visibility==='character'&&(d.owner!==scope.actorUserId||db.getCharacter(row.subject_key)?.owner_user_id!==scope.actorUserId)
      ||!narrativeSourceVisible(db,guild,row.source_event,scope))continue;
    let weight=0,dedup,causation;
    if(source?.kind==='ai_gm_input'&&source.details.author===d.owner&&db.ownerAuthoredSource(guild,source.event_key,d.owner)){
      const ic=characterSourceRanges(source.details.text).map(r=>source.details.text.slice(r.start,r.end)).join('\n');
      if(!mentions(ic,names(db,guild,entity)))continue;
      weight=d.reason==='return'?6:3;dedup=[source.event_key,d.owner];causation=source.event_key;
      if(d.reason==='interaction'&&d.native_intent)try{
        const action=db.getCityRecord(guild,'typed_intent',d.native_intent),proof=historicalActionSource(db,guild,d.native_intent,{resolved:action?.status==='resolved'});
        if(proof.row.data.world_source_event===source.event_key&&proof.row.data.actor===source.details.character_id
          &&proof.row.data.target_key===identity.data.key&&['speak','interact','search'].includes(proof.row.data.type))weight=5;
      }catch(error){if(error.code!=='SCENE_ACTION_WINDOW')throw error;}
    }else if(source?.kind==='native_narrative_unit'&&source.source_id==='native:narrative-authority'){
      const unit=db.getCityRecord(guild,'narrative_unit',source.event_key.replace(/:source$/,'')),u=unit?.data.unit;
      if(unit?.status!=='accepted_established'||source.details.payload_hash!==proofHash(unit.data)
        ||(u.subject_key?`npc:${u.subject_key}`:u.location_key?`location:${u.location_key}`:null)!==entity)continue;
      const lead=u.kind==='lead';weight=lead?7:1;dedup=[unit.data.binding.scene,lead?'lead':'gm'];causation=canonicalNarrativeCause(db,guild,unit.data.binding.source,scope);
    }
    if(!dedup||row.record_key!==`narrative-interest:${hash([entity,row.visibility,row.subject_key||null,dedup])}`)continue;
    weight=decayedNarrativeWeight(weight,d.tick,tick);if(weight&&causation)found.push({source:row.source_event,weight,causation});
  }
  // Reprojection into another audience or a native writer echo is not a new causal event.
  const distinct=new Map();
  for(const item of found)if(!distinct.has(item.causation)||distinct.get(item.causation).weight<item.weight)distinct.set(item.causation,item);
  return [...distinct.values()].map(({source,weight})=>({source,weight}));
}
export function noteNarrativeInterest(db,guild,scope,sourceRef,{intents=[]}={}){
  if(!nativeSalienceAvailable(db,guild))return;
  const source=db.getWorldEvent(guild,sourceRef),principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId),scene=currentScene(db,guild);
  if(source?.status!=='active'||source.kind!=='ai_gm_input'||source.details.author!==scope.actorUserId
    ||source.details.character_id!==scope.actorCharacterId||source.details.revision!==principal.revision||principal.kind!=='owner'
    ||source.scene!==scene.key||source.session_id!==scene.session_id||!db.ownerAuthoredSource(guild,sourceRef,scope.actorUserId)
    ||!narrativeSourceVisible(db,guild,sourceRef,scope))throw Object.assign(new Error('Current authenticated owner source required for interest.'),{code:'NARRATIVE_SALIENCE'});
  const [visibility,subject]=audience(scope);
  const ic=characterSourceRanges(source.details.text).map(r=>source.details.text.slice(r.start,r.end)).join('\n');
  for(const entity of records(db,guild,'autonomous_entity').filter(r=>r.data.narrative_origin&&visible(r,scope)
    &&worldIdentityOrigin(db,guild,r,scope))){
    if(!mentions(ic,names(db,guild,entity.record_key)))continue;
    let nativeIntent=null;
    const interaction=intents.some(i=>{
      if(i.data?.target_key!==entity.data.key||!['interact','search','speak'].includes(i.data.type)
        ||i.data.actor!==scope.actorCharacterId||i.data.world_source_event!==sourceRef)return false;
      try{
        const accepted=i.status==='resolved'?historicalActionSource(db,guild,i.record_key,{resolved:true}):consentAction(db,guild,i.record_key);
        if(proofHash(accepted.row)!==proofHash(i))return false;
        nativeIntent=i.record_key;return true;
      }catch(error){if(error.code==='SCENE_ACTION_WINDOW')return false;throw error;}
    });
    const prior=db.getCityRecord(guild,'narrative_salience',profileKey(entity.record_key,visibility,subject));
    const weight=prior?.status==='prompt_archived'?6:interaction?5:3;
    add(db,guild,{entity:entity.record_key,source:sourceRef,scene:scene.key,visibility,subject,reason:prior?.status==='prompt_archived'?'return':interaction?'interaction':'mention',
      weight,owner:scope.actorUserId,dedup:[sourceRef,scope.actorUserId],nativeIntent});
    maintainIdentityPersistence(db,guild,entity.record_key,scope,sourceRef);
  }
  maintainNarrativeSalience(db,guild);
}
export function noteNarrativeReuse(db,guild,row){
  if(!nativeSalienceAvailable(db,guild))return;
  const saved=row?.record_key&&db.getCityRecord(guild,'narrative_unit',row.record_key),source=saved&&db.getWorldEvent(guild,saved.source_event),
    scope=saved?.data.binding?.scope,scene=currentScene(db,guild);
  if(saved?.status!=='accepted_established'||proofHash(saved)!==proofHash(row)||source?.kind!=='native_narrative_unit'
    ||source.source_id!=='native:narrative-authority'||source.details.payload_hash!==proofHash(saved.data)||!scope
    ||saved.data.binding.scene!==scene.key||saved.data.binding.session!==scene.session_id
    ||!narrativeSourceVisible(db,guild,saved.source_event,scope))return;
  const u=row.data.unit,entity=u.subject_key?`npc:${u.subject_key}`:u.location_key?`location:${u.location_key}`:null;
  if(!entity||!worldIdentityOrigin(db,guild,db.getCityRecord(guild,'autonomous_entity',entity),scope))return;
  add(db,guild,{entity,source:row.source_event,scene:row.data.binding.scene,visibility:row.visibility,subject:row.subject_key||null,
    owner:row.data.binding.scope?.actorUserId||null,reason:u.kind==='lead'?'lead':'gm_reuse',weight:u.kind==='lead'?7:1,dedup:[row.data.binding.scene,u.kind==='lead'?'lead':'gm']});
  maintainIdentityPersistence(db,guild,entity,scope,row.data.binding.source);
}
export function maintainNarrativeSalience(db,guild){
  if(!nativeSalienceAvailable(db,guild))return;
  const tick=db.getSimulationClock(guild).tick;
  for(const row of records(db,guild,'narrative_salience')){
    const scope={mode:row.visibility==='character'?'private':'party',actorCharacterId:row.subject_key,actorUserId:row.subject_key&&db.getCharacter(row.subject_key)?.owner_user_id};
    const pinned=pinReasons(db,guild,row.data.entity).length>0;
    if(row.status==='active'&&!pinned&&tick-row.data.last_interest_tick>=6&&score(db,guild,row,scope)<3)
      db.saveCityRecord(guild,{...row,key:row.record_key,status:'prompt_archived',data:{...row.data,retired_tick:tick}});
  }
}
export function rankNarrativeMemory(db,guild,scope,rows,{query='',location=null,maxChars=9000}={}){
  if(!nativeSalienceAvailable(db,guild)){
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


narrativeImportanceSource.provide(narrativeImportance);
import {narrativeSalienceSource} from './frameworks/narrative/public.js';
// Provide this module's original canonical interest evidence reader to the fixed Narrative slot; no other authority is granted.
narrativeSalienceSource.bind({canonicalInterestEvidence});
