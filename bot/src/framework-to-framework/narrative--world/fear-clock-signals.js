import {hash,narrativeSourceVisible,currentScene,conversationPrincipal,validateFearEffect,audience} from './source-context.js';

const FEAR_EFFECT_RECORD_SCAN_LIMIT=500;
const FEAR_EFFECT_VALIDATION_LIMIT=32;
function fearClockAudience(db,guild,row,scope){
  if(scope.mode==='party')return row.visibility==='party'&&row.subject_key==null;
  const pc=db.getCharacter(scope.actorCharacterId);
  return !!scope.actorUserId&&pc?.guild_id===guild&&pc.owner_user_id===scope.actorUserId
    &&row.visibility==='character'&&row.subject_key===scope.actorCharacterId;
}
/** Exact committed clock-effect proof. Labels, prose and GM visibility are not outcome authority. */
export function nativeFearClockEffect(db,guild,key,scope,scene){
  const row=db.getCityRecord(guild,'pvp_fear_effect_receipt',key),d=row?.data;
  if(!row||row.status!=='resolved'||!d||!['clock_advance','clock_create_and_advance'].includes(d.move_kind)
    ||d.session!==scene.session_id||d.scene!==scene.key||!fearClockAudience(db,guild,row,scope))return null;
  try{validateFearEffect(db,guild,row.record_key);}
  catch(error){if(error.code==='NARRATIVE_PVP')return null;throw error;}
  const context=db.getCityRecord(guild,'pvp_fear_context',d.context),source=db.getWorldEvent(guild,d.source_event);
  if(!context||context.status!=='active'||context.record_key!==d.context||context.source_event!==d.source_event
    ||context.data.move_kind!==d.move_kind||context.data.target_key!==d.target||context.data.scene!==scene.key
    ||context.data.session!==scene.session_id||context.location_key!==source?.location_key||source?.status!=='active'
    ||source.kind!=='pvp_fear_context_established'||source.session_id!==scene.session_id||source.scene!==scene.key
    ||source.location_key!==context.location_key||source.visibility!==row.visibility||source.subject_key!==row.subject_key
    ||!narrativeSourceVisible(db,guild,source.event_key,scope))return null;
  let principalRevision=null;
  if(scope.mode==='private'){
    let principal;
    try{principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId);}
    catch(error){if(['Active session required.','Select an authenticated current controlled role.','Controller attendance required.','Active campaign character required.'].includes(error.message))return null;throw error;}
    if(principal.kind!=='owner'||context.subject_key!==scope.actorCharacterId||context.data.subject_key!==scope.actorCharacterId)return null;
    principalRevision=principal.revision;
  }else if(context.visibility!=='party'||context.subject_key!==null||context.data.visibility!=='party'||context.data.subject_key!==null)return null;
  const trigger=db.getCityRecord(guild,'pvp_fear_trigger',d.trigger);
  if(!trigger||trigger.status!=='resolved'||trigger.data.effect!==row.record_key||trigger.data.session!==scene.session_id
    ||trigger.data.scene!==scene.key)return null;
  return {row,source,context,trigger,causation:source.event_key,principalRevision};
}
/** Snapshot direct keys for bounded current-scene Fear clock receipts. */
export function nativeFearClockConsequenceSnapshot(db,guild,scope){
  const scene=currentScene(db,guild),receipts=[];let overflow=false,scanned=0,validated=0,offset=0;
  for(;offset<FEAR_EFFECT_RECORD_SCAN_LIMIT;offset+=100){
    const page=db.listCityRecords(guild,{kind:'pvp_fear_effect_receipt',query:scene.key,includeGM:scope.mode==='private',limit:100,offset});
    for(const candidate of page){
      if(candidate.status!=='resolved'||candidate.data?.scene!==scene.key||candidate.data?.session!==scene.session_id
        ||!['clock_advance','clock_create_and_advance'].includes(candidate.data?.move_kind)
        ||!fearClockAudience(db,guild,candidate,scope))continue;
      scanned++;
      if(validated>=FEAR_EFFECT_VALIDATION_LIMIT){overflow=true;break;}
      validated++;
      const proof=nativeFearClockEffect(db,guild,candidate.record_key,scope,scene);if(!proof)continue;
      receipts.push({kind:'pvp_fear_effect_receipt',key:proof.row.record_key,revision:hash(proof.row),
        source_event:proof.source.event_key,source_revision:hash(proof.source),causation_ref:proof.causation,
        audience:audience(scope),session:scene.session_id,scene:scene.key,
        ...(proof.principalRevision?{principal_revision:proof.principalRevision}:{})});
    }
    if(overflow)break;
    if(page.length<100)break;
    if(offset+page.length>=FEAR_EFFECT_RECORD_SCAN_LIMIT)overflow=true;
  }
  return {version:1,receipts:receipts.slice(0,4),omitted:Math.max(0,receipts.length-4),overflow,scanned,validated};
}
