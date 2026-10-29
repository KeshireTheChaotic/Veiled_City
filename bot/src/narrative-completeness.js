/** Post-projection response health. Native verified parts, not model self-certification; no effects or provider retries. */
import {jsonHash as hash} from './kernel/json-hash.js';
import {operationalMetrics} from './operational-metrics.js';
import {taskDispositions} from './narrative-tasks.js';
export function validateNarrativeCompleteness(db,guild,result,parts,requests=[],{sourceRef=null,scope=null}={}){
  const actual=parts.filter(p=>p.kind==='pvp_output_part'&&p.status==='verified'&&db.getCityRecord(guild,'pvp_output_part',p.record_key)?.data.content_hash===p.data.content_hash);
  const creativeRequested=requests.some(r=>r.version===8);
  const substantive=actual.filter(p=>!['neutral','scene_fiction_review'].includes(p.data.kind)
    &&!(creativeRequested&&p.data.kind==='scene_description'));
  const units=substantive.filter(p=>p.data.kind==='gm_narrative_unit').map(p=>db.getCityRecord(guild,'narrative_unit',p.data.ref)?.data)
    .filter(Boolean).map(d=>({...d.unit,effective_location:d.unit.location_key||d.binding.location}));
  const conversation=requests.some(r=>r.version===8&&r.operation==='conversation'),moving=(result.player_intents||[]).some(i=>(i.type==='move'||i.operation==='initial_position')&&i.framing==='immediate'),
    investigation=(result.player_intents||[]).some(i=>i.type==='search'||i.operation==='investigate'),
    combat=requests.some(r=>r.version===8&&r.operation==='combat'),director=db.getWorldEvent(guild,sourceRef)?.kind==='native_director_narrative_scope';
  let status=!result.respond||result.act===false?'not_applicable':substantive.length?'complete':'held_irrecoverable';
  if(status==='complete'&&creativeRequested&&!units.length)status='creative_narration_missing';
  if(status==='complete'&&conversation&&!units.some(u=>u.kind==='npc_speech')&&!substantive.some(p=>['gm_fresh_npc','gm_world_narrative','observation_answer'].includes(p.data.kind)))status='npc_response_missing';
  const arrivals=substantive.filter(p=>p.data.kind==='verified_action').map(p=>db.getWorldEvent(guild,p.data.ref)?.location_key).filter(Boolean);
  const destinationCovered=!moving||!arrivals.length||units.some(u=>['scene','lead'].includes(u.kind)&&arrivals.includes(u.effective_location))
    ||substantive.some(p=>['gm_scene_fiction','gm_fresh_scene','scene_description'].includes(p.data.kind));
  if(status!=='not_applicable'&&!destinationCovered)status='destination_fiction_missing';
  if(status==='complete'&&investigation&&!units.some(u=>['lead','established_observation','npc_speech','native_outcome_render'].includes(u.kind))
    &&!substantive.some(p=>['native_notice','observation_answer','native_outcome'].includes(p.data.kind)))status='investigation_response_missing';
  if(status==='complete'&&combat&&!units.some(u=>['scene','npc_speech','npc_action_attempt','native_outcome_render'].includes(u.kind)))status='combat_fiction_missing';
  if(status==='complete'&&director&&!units.length)status='director_continuation_missing';
  const tasks=scope&&sourceRef?taskDispositions(db,guild,result,actual,scope,sourceRef):[];
  if(status==='complete'&&tasks.some(t=>!['answered','legitimately_unavailable','awaiting_roll'].includes(t.disposition)))status='task_response_missing';
  const matches=r=>r.source_event===sourceRef&&(!scope||hash(r.data.scope)===hash(scope)),
    fates=sourceRef?db.listCityRecords(guild,{kind:'narrative_unit_fates',includeGM:true,limit:100}).filter(matches).flatMap(r=>r.data.fates):[],
    reviews=sourceRef?db.listCityRecords(guild,{kind:'narrative_unit_review',includeGM:true,limit:100}).filter(matches):[],
    held=fates.filter(f=>f.fate!=='published').length,diagnostics=[];
  if(held)diagnostics.push('unit_local_hold');
  if(held&&units.length)diagnostics.push('validated_siblings_salvaged');
  if(actual.length&&!substantive.length)diagnostics.push('administrative_fallback');
  if(status.endsWith('_missing')||status==='held_irrecoverable')diagnostics.push('player_facing_answer_missing');
  if(reviews.some(r=>['request_source','stale_director_evidence','stale_draft'].includes(r.data.reason)))diagnostics.push('source_retrieval_miss');
  if(reviews.some(r=>r.data.reason==='held_viewpoint'))diagnostics.push('camera_misframed');
  const past=db.listCityRecords(guild,{kind:'narrative_unit',includeGM:true,limit:100});
  if(units.some(u=>u.text.length<160&&past.some(p=>p.data.binding.source!==sourceRef&&p.data.unit.text===u.text)))
    diagnostics.push('repeated_short_scaffolding');
  return {version:2,status,tasks,scope:scope?.mode||'unknown',substantive_parts:substantive.length,held_parts:held||(!fates.length?reviews.length:0),diagnostics,
    coverage:{creative:!creativeRequested||units.length>0,destination:destinationCovered,conversation:!conversation||units.some(u=>u.kind==='npc_speech'),scene:units.some(u=>['scene','lead','established_observation'].includes(u.kind)),
      investigation:!investigation||status!=='investigation_response_missing',combat:!combat||status!=='combat_fiction_missing'},
    authority:'native_projection_health_not_effect_authority',quality:'Typed coverage; not a universal literary-quality or semantic proof.'};
}
export function recordNarrativeHealth(db,guild,result,key,sourceRef=null){
  try{
    const saved=db.transaction(()=>{
      if(!db.getCityCalendar(guild).flags.narrative_completeness||!result.narrative_completion||db.getCityRecord(guild,'narrative_health',key))return false;
      const source=sourceRef&&db.getWorldEvent(guild,sourceRef);
      if(!source||source.status!=='active')return false; // No invented source/event merely to record optional telemetry.
      db.saveCityRecord(guild,{kind:'narrative_health',key,status:result.narrative_completion.status,visibility:'gm',source_event:source.event_key,data:{...result.narrative_completion}});
      return true;
    });
    if(!saved)return;
  }catch(error){
    // Only this optional write is isolated. Native mutation/publication failures still abort their own transaction.
    if(error.code!=='ERR_SQLITE_ERROR')throw error;
    operationalMetrics.record('optional_quarantine',{guildId:guild,status:'failed',errorCode:'UNCLASSIFIED'});
    operationalMetrics.incident('runtime',{guildId:guild,reference:key,code:'UNCLASSIFIED'});return;
  }
  operationalMetrics.record(result.narrative_completion.status==='complete'?'narrative_completed':'narrative_missing',{guildId:guild});
  const stages={unit_local_hold:'narrative_unit_hold',validated_siblings_salvaged:'narrative_sibling_salvage',administrative_fallback:'narrative_administrative_fallback',
    player_facing_answer_missing:'narrative_answer_missing',source_retrieval_miss:'narrative_retrieval_miss',repeated_short_scaffolding:'narrative_generic_repeat',
    camera_misframed:'narrative_camera_misframed'};
  for(const reason of result.narrative_completion.diagnostics||[])if(stages[reason])operationalMetrics.record(stages[reason],{guildId:guild});
}
