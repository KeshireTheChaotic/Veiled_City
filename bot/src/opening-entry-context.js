/** Owner-entitled entry thread projection. Attendance is not arrival, private GM knowledge, action or outcome. */
import {inspectOpeningEntryOpportunity} from './session-opening-attendance.js';
import {assemblyHookSources} from './assembly-context.js';
import {currentScene} from './scene-continuity.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {indexWorldEvent} from './city-calendar.js';
const display=text=>JSON.stringify(text).replaceAll('@','@\u200b');
function fail(){throw Object.assign(new Error('Current owner-private sourced entry opportunity required.'),{code:'SESSION_OPENING_ATTENDANCE',expected:true});}
export function openingEntryProjection(db,guild,key,scope,{orientationVersion=1}={}){
  const opportunity=inspectOpeningEntryOpportunity(db,guild,key),d=opportunity.data,pc=db.getCharacter(d.character),scene=currentScene(db,guild);
  if(!['active','reserve','guest'].includes(pc.status)||db.getSession(d.session)?.assembly_mode==='manual'
    ||scope?.mode!=='private'||scope.actorUserId!==d.user||scope.actorCharacterId!==d.character
    ||!db.roster(d.session).some(r=>r.character_id===pc.id&&r.discord_user_id===d.user&&['present','late','guest'].includes(r.presence)))fail();
  const sources=assemblyHookSources(db,guild,pc.id).slice(0,2),event=db.getWorldEvent(guild,opportunity.source_event),
    material={session:d.session,user:d.user,character:d.character,scene:scene.key,location:pc.data.location||null,sources},
    state={version:1,opportunity:key,source:hash(event),principal:d.principal,name:pc.name,status:pc.status,material};
  const intro=`**Veilkeeper — private entry opportunity for ${display(pc.name)}**\n`
    +`Saved position: ${display(pc.data.location||'not recorded')}; check-in is not a new arrival or resolved travel.\n`,
    thread=sources.length?sources.map(s=>`Your own character material offers this thread (${s.field}), not a newly established outcome:\n> ${s.text.replaceAll('@','@\u200b').replaceAll('\n','\n> ')}`).join('\n')
      :'No entitled personal opening source is recorded. This orientation is not a delivered character hook.',
    text=orientationVersion===2?intro+'This is check-in orientation; an authored private scene has not been certified. Your initial position may remain unconfirmed. You may describe what you want to explore or ask about the surroundings.':
      intro+thread+'\nWould you like to pursue a thread, ask about the current surroundings, or take another approach? No movement, cooperation, disclosure or response has been chosen for you.';
  return {text,state,revision:hash(state),material_revision:hash(material),source:opportunity.source_event,hook_verified:sources.length>0,
    source_refs:sources.map(s=>s.id),sources};
}

/** Native attendance source, never a forged player declaration or permission to choose arrival. */
export function openingEntryNarrativeCandidate(db,guild,key,scope){
  const view=openingEntryProjection(db,guild,key,scope),source=indexWorldEvent(db,guild,{key:`opening-entry-scope:v2:${view.revision}`,
    kind:'native_opening_entry_scope',title:'Audience-first owner-private entry authoring scope',source_id:'native:opening-director',
    visibility:'character',subject_key:scope.actorCharacterId,session_id:view.state.material.session,scene:view.state.material.scene,
    details:{version:2,opportunity:key,revision:view.revision,scope}},'native:opening-director');
  return {view,source,candidate:{narration:'',player_summary:'',private_messages:[],narrative_claims:[],
    gm_world_parts:[{version:8,kind:'narrative_request',operation:'describe_scene',source_refs:[]}]}};
}
