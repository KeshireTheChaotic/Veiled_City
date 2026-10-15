/** Deterministic task routing, never PC intent acceptance or native effect authority. */
import {explicitSilence,semanticResponseObligation} from './gameplay-intake.js';
const briefs=new WeakMap();
const taskFor=op=>({describe_scene:'scene',current_situation:'scene',conversation:'conversation',combat:'combat',continuation:'continuation'}[op]);
export function coordinateNarrative(db,guild,result,{scope,sourceRef,movement=false,director=false,engagement=null}={}){
  const flags=db.getCityCalendar(guild).flags;
  if(!flags.narrative_authority||!flags.playable_narration||!['party','private'].includes(scope?.mode))return;
  const source=db.getWorldEvent(guild,sourceRef),text=source?.details.text||'',parts=result.gm_world_parts||[];
  if(result.respond===false||result.act===false)return;
  if(!director&&(!source||!db.ownerAuthoredSource(guild,sourceRef,scope.actorUserId)||explicitSilence(text)||/^\s*\/vc[-\s]/i.test(text))){
    result.gm_world_parts=parts.filter(p=>p.version!==8);return;
  }
  const intents=(result.player_intents||[]).filter(i=>i.framing==='immediate'&&typeof i.source_span==='string'&&i.source_span.length&&text.includes(i.source_span));
  const tasks=new Set(parts.filter(p=>p.version===8).map(p=>taskFor(p.operation)).filter(Boolean));
  const speakers=parts.filter(p=>p.version===3).map(p=>p.entity_key);
  if(speakers.length||intents.some(i=>['speak','interact'].includes(i.type)&&i.target_key&&db.getNpcProfile(guild,i.target_key)))tasks.add('conversation');
  if(intents.some(i=>i.type==='search'||i.operation==='investigate'))tasks.add('investigation');
  if(movement)tasks.add('arrival');
  if(intents.some(i=>i.type==='roll')&&db.getCurrentEncounter(db.getActiveSession(guild)?.id)?.status==='active')tasks.add('combat');
  if(director)tasks.add('continuation');
  const obligation=semanticResponseObligation(text,intents,{authenticated:true,engagement:engagement||{respond:result.respond===true,engagement_kind:'uncertain'}});
  if(!tasks.size&&obligation.needed)tasks.add('scene');
  if(!tasks.size)return;
  const operation=tasks.has('conversation')?'conversation':tasks.has('combat')?'combat':tasks.has('continuation')?'continuation':'describe_scene';
  const refs=[...new Set(parts.filter(p=>[3,7,8].includes(p.version)).flatMap(p=>p.source_refs||[]))];
  if(refs.length>12)return; // retain invalid original request for native rejection, never silently drop evidence
  // Four provider proposals plus ONE application-owned creative request. Output capacity is not an effect budget.
  result.gm_world_parts=[...parts.filter(p=>![3,6,7,8].includes(p.version)).slice(0,4),{version:8,kind:'narrative_request',operation,source_refs:refs}];
  briefs.set(result,{tasks:[...tasks],speakers:[...new Set([...speakers,...intents.filter(i=>['speak','interact'].includes(i.type)).map(i=>i.target_key)])]});
}
export function creativeBrief(ctx,result,input){
  const selected=briefs.get(result)||{tasks:[taskFor(input.operation)||'scene'],speakers:[]};
  return {version:1,tasks:selected.tasks,priority:selected.tasks.includes('conversation')?'answer_or_react_as_npc':'ground_the_situation',
    speakers:ctx.packet.npcs.filter(n=>!n.human_controlled&&selected.speakers.includes(n.key)).map(n=>n.key),
    viewpoint:ctx.binding.viewpoint,source_refs:[ctx.sourceRef,...input.source_refs],
    response_obligation:'Address every requested task coherently in ONE response; preserve uncertainty and leave player decisions open.',
    constraints:['No new native outcomes.','No PC or proxy agency.','No hidden or cross-audience knowledge.']};
}
export function narrativeModel(config,packet,lane='combined'){
  const lightweight=lane==='observation'&&!packet.protected_scene;
  return (lightweight&&config.narrativeFastModel)||config.narrativeModel
    ||(lane==='combined'?(config.routineGmModel||config.gmModel):lane==='downtime'?(config.downtimeModel||config.gmModel):config.gmModel);
}
