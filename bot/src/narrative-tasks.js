/** Native source/target task sidecar. Coverage is never consent, canon or effect authority. */
import {sceneFictionHash as hash,narrativeSourceVisible} from './scene-fiction-context.js';
import {currentAcceptedIntent} from './typed-intents.js';
import {conversationPrincipal} from './conversation-principal.js';
import {renderObservation} from './character-observation.js';

export function narrativeTasks(db,guild,result,scope,sourceRef,{requireAccepted=true}={}){
  const source=db.getWorldEvent(guild,sourceRef),text=source?.details.text??source?.details.raw_text;
  if(!source||source.status!=='active'||typeof text!=='string'||!scope?.actorCharacterId
    ||!db.ownerAuthoredSource(guild,sourceRef,scope.actorUserId)||!narrativeSourceVisible(db,guild,sourceRef,scope))return [];
  const principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId);
  if(principal.kind!=='owner')return [];
  const cursors=new Map(),tasks=[];
  for(const i of result.player_intents||[]){
    if(i.framing!=='immediate'||!i.source_span)continue;
    const start=text.indexOf(i.source_span,cursors.get(i.source_span)||0),end=start+i.source_span.length;
    if(start<0)continue;cursors.set(i.source_span,end);
    const accepted=currentAcceptedIntent(db,guild,{sourceEvent:sourceRef,actor:scope.actorCharacterId,type:i.type,
      sourceSpan:i.source_span,targetKey:i.target_key||null,scope});
    if(requireAccepted&&!accepted)continue;
    const kind=['speak','interact'].includes(i.type)&&db.getNpcProfile(guild,i.target_key)?'npc_response'
      :i.type==='observe'?'observation':i.type==='move'?'arrival':i.type==='search'?'investigation'
      :['describe_scene','current_situation'].includes(i.operation)?'scene':null;
    if(!kind)continue;
    const binding={source:sourceRef,source_hash:hash(source.details),actor:scope.actorCharacterId,principal:principal.revision,
      session:source.session_id,scene:source.scene,scope:{...scope},start,end,target:i.target_key||null,operation:i.operation,type:i.type};
    tasks.push({id:`narrative-task:${hash(binding)}`,kind,binding,accepted_intent:accepted?.record_key||null});
  }
  return tasks;
}
export function taskDispositions(db,guild,result,parts,scope,sourceRef){
  const tasks=narrativeTasks(db,guild,result,scope,sourceRef),units=parts.filter(p=>p.data.kind==='gm_narrative_unit')
    .map(p=>({part:p.record_key,row:db.getCityRecord(guild,'narrative_unit',p.data.ref)}))
    .filter(p=>p.row?.data.binding.source===sourceRef&&hash(p.row.data.binding.scope)===hash(scope));
  const answers=tasks.map(t=>{
    const same=tasks.filter(other=>other.kind===t.kind&&other.binding.target===t.binding.target),unique=same.length===1;
    const matched=units.filter(({row})=>{
      const u=row.data.unit;
      if(t.kind==='npc_response')return unique&&u.kind==='npc_speech'&&u.subject_key===t.binding.target;
      if(t.kind==='observation')return unique&&t.binding.operation==='appearance'&&u.kind==='scene'
        &&(db.getNpcProfile(guild,t.binding.target)?u.subject_key===t.binding.target
          :db.getSimulationEntity(guild,'location',t.binding.target)&&(u.location_key||row.data.binding.location)===t.binding.target);
      if(t.kind==='scene')return unique&&['scene','lead','established_observation'].includes(u.kind);
      if(t.kind==='arrival')return unique&&['scene','lead'].includes(u.kind)&&(u.location_key||row.data.binding.location)===t.binding.target
        &&parts.some(p=>p.data.kind==='verified_action'&&db.getWorldEvent(guild,p.data.ref)?.location_key===t.binding.target);
      if(t.kind==='investigation')return unique&&['lead','established_observation','native_outcome_render'].includes(u.kind)
        &&(!t.binding.target||u.subject_key===t.binding.target);
      return false;
    });
    const observation=parts.find(p=>p.data.kind==='observation_answer'&&p.data.query.source_ref===sourceRef
      &&p.data.query.source_span===sourceRefText(db,guild,t)&&p.data.query.target===t.binding.target&&p.data.query.operation===t.binding.operation);
    const state=observation&&renderObservation(db,guild,observation.data.query,scope).state;
    return {...t,disposition:matched.length||['known','partial','remembered'].includes(state)?'answered':observation?'legitimately_unavailable':unique?'not_attempted':'needs_clarification',
      output_parts:matched.map(m=>m.part).concat(observation?[observation.record_key]:[])};
  });
  if(tasks.length)db.saveCityRecord(guild,{kind:'narrative_task_coverage',key:`narrative-tasks:${hash([sourceRef,scope])}`,source_event:sourceRef,
    visibility:'gm',status:answers.every(t=>['answered','legitimately_unavailable'].includes(t.disposition))?'covered':'incomplete',
    data:{version:1,source:sourceRef,scope,tasks:answers,authority:'coverage_only_not_effect_authority'}});
  return answers;
}
function sourceRefText(db,guild,t){const s=db.getWorldEvent(guild,t.binding.source);return (s.details.text??s.details.raw_text).slice(t.binding.start,t.binding.end);}
