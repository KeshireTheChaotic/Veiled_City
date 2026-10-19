/** In-process Director provenance. JSON/model fields cannot mint this Symbol binding. */
import {createHash} from 'node:crypto';
import {currentScene} from './scene-continuity.js';
import {indexWorldEvent} from './city-calendar.js';
import {narrativeSourceVisible,sceneFictionHash as hash,sceneFictionFailure} from './scene-fiction-context.js';
import {worldNarrativeBridgePacket,worldDirectorBridgeBeats,nativeFearClockConsequenceSnapshot} from './world-narrative-bridge.js';
const sourceBinding=Symbol('native-director-narrative-source');
export const nativeDirectorNarrativeSource=result=>result?.[sourceBinding]?.ref||null;
export const nativeDirectorNarrativeContent=result=>result?.[sourceBinding]?.content||null;
/** Transfer only a server-minted in-process Director scope, never a JSON reference from the provider. */
export function inheritDirectorNarrativeSource(result,nativeShell){
  if(!nativeShell?.[sourceBinding])throw sceneFictionFailure('native_director_origin_required');
  result[sourceBinding]=nativeShell[sourceBinding];return result;
}
function dramaticBrief(db,guild,result,scope,trigger){
  const scene=currentScene(db,guild),refs=[trigger.source_event,trigger.event_key,...(Array.isArray(trigger.event_refs)?trigger.event_refs:[]),
    ...db.listWorldEvents(guild,{includeGM:true,limit:100}).map(e=>e.event_key)],events=[];
  for(const ref of [...new Set(refs.filter(r=>typeof r==='string'))]){
    const event=db.getWorldEvent(guild,ref);
    if(!event||event.status!=='active'||event.session_id!==scene.session_id||event.scene!==scene.key
      ||!narrativeSourceVisible(db,guild,ref,scope)||!['observation','arrival','native_narrative_unit','native_narrative_entity'].includes(event.kind))continue;
    if(event.kind==='observation'&&event.truth_status!=='observed')continue;
    if(['native_narrative_unit','native_narrative_entity'].includes(event.kind)&&event.source_id!=='native:narrative-authority')continue;
    events.push({ref,kind:event.kind,location:event.location_key||'',state:'established',revision:hash(event),
      ...(event.kind==='observation'&&typeof event.details.description==='string'?{observation:event.details.description.slice(0,500)}:{})});
    if(events.length===8)break;
  }
  // Counts/categories describe unfinished work, never proposed prose or fabricated outcomes.
  const pending=result.act?[{kind:'director_plan',state:'proposed_requires_native_validation'}]:[];
  return {version:1,dramatic_purpose:events.length?'respond_to_visible_development':'offer_a_local_npc_or_scene_opportunity',events,pending,
    native_clock_consequences:nativeFearClockConsequenceSnapshot(db,guild,scope),
    narrative_opportunity:'Use one coherent scene/response/attempt beat; leave a concrete opening without choosing a PC action.',
    unresolved_outcomes:'Proposals are not outcomes. Only native_results can render mechanical consequences.'};
}
export function directorBriefForAudience(db,guild,source,scope){
  const stored=source&&db.getWorldEvent(guild,source.event_key);
  if(!stored||stored.status!=='active'||stored.kind!=='native_director_narrative_scope'||stored.source_id!=='native:director'
    ||hash(stored)!==hash(source)||hash(stored.details.scope)!==hash(scope))throw sceneFictionFailure('native_director_source');
  const brief=source.details.dramatic_brief;if(!brief)return null; // old sources retain old generic contract
  for(const proof of brief.events){
    const event=db.getWorldEvent(guild,proof.ref);
    if(!event||event.status!=='active'||hash(event)!==proof.revision||!narrativeSourceVisible(db,guild,proof.ref,scope))
      throw sceneFictionFailure('stale_director_evidence');
  }
  if(source.details.version===2){
    const bridge=worldDirectorBridgeBeats(db,guild,source,scope);if(!bridge)throw sceneFictionFailure('native_director_bridge_source');
    return {...brief,world_bridge:bridge};
  }
  return brief;
}
export function bindDirectorNarrativeSource(db,guild,result,scope,layer,trigger,content,bridgePacket=null){
  const currentBridge=worldNarrativeBridgePacket(db,guild,scope),bridge=bridgePacket??currentBridge;
  if(hash(bridge)!==hash(currentBridge))throw sceneFictionFailure('native_director_bridge_context_mismatch');
  const scene=currentScene(db,guild),details={version:2,scope,layer,scene:scene.key,session:scene.session_id,
    trigger_hash:createHash('sha256').update(JSON.stringify(trigger)).digest('hex'),clock:db.getSimulationClock(guild),
    dramatic_brief:dramaticBrief(db,guild,result,scope,trigger),world_bridge:{version:1,signals:structuredClone(bridge.signals)}};
  const key=`director-fiction:${createHash('sha256').update(JSON.stringify(details)).digest('hex')}`;
  const event=indexWorldEvent(db,guild,{key,kind:'native_director_narrative_scope',title:'Native Director fiction scope, not PC intent or consequence',
    source_id:'native:director',visibility:scope.mode==='private'?'character':'party',subject_key:scope.actorCharacterId||null,
    scene:scene.key,session_id:scene.session_id,details},'native:director');
  result[sourceBinding]={ref:event.event_key,content};return event.event_key;
}
