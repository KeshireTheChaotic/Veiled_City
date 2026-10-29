/** Read-only native preparation/deadline projections. Arbitrary hook prose never supplies outcome authority. */
import {createHash} from 'node:crypto';
import {publicationSessionScene} from './frameworks/publication/public.js';
const {currentScene}=publicationSessionScene;
import {publicationWorldConstraints} from './frameworks/publication/public.js';
const {activeCityProxy}=publicationWorldConstraints;
import {hasPcReference} from './fresh-npc-authoring.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function fail(){throw Object.assign(new Error('Native hook needs its exact current NPC outcome and audience.'),{code:'NARRATIVE_PVP'});}
function deadlineProjection(db,guild,hook,scope){
  const d=hook.data,source=typeof d.world_event==='string'&&db.getWorldEvent(guild,d.world_event);
  const schedule=source?.details.schedule_key&&db.getCitySchedule(guild,source.details.schedule_key);
  const mutation=source&&db.getMutation(guild,source.source_id),before=mutation&&JSON.parse(mutation.before_json);
  if(!source||source.status!=='active'||source.kind!=='deadline'||source.source_kind!=='mutation'
    ||source.details.deadline_only!==true||source.details.attendance_not_assumed!==true||!schedule
    ||schedule.status!=='fired'||schedule.review_status!=='approved'||!['party','public'].includes(schedule.data.visibility)
    ||scope.mode==='private'||d.target_user_id||hook.id!==`city-hook:${guild}:${schedule.schedule_key}`
    ||source.event_key!==`schedule:${schedule.schedule_key}`||d.content!==String(schedule.data.hook)
    ||db.getSimulationClock(guild).minute<schedule.due_minute||mutation?.source_layer!=='city'
    ||mutation.mutation_type!=='scheduled_deadline'||mutation.actor_id!=='fictional_calendar'
    ||mutation.entity_key!==schedule.schedule_key||before?.schedule_key!==schedule.schedule_key
    ||before.due_minute!==schedule.due_minute||hash(before.data)!==hash(schedule.data)
    ||JSON.parse(mutation.after_json).status!=='fired')fail();
  return {source,revision:hash([hook.id,d,source,schedule,mutation]),
    text:`Native scheduled deadline reached: minute ${schedule.due_minute}; reference ${hash(source.event_key).slice(0,16)}. Attendance and agreement are not established.`};
}
export function nativeHookProjection(db,guild,id,scope){
  const hook=db.getSimulationRecord(guild,id),scene=currentScene(db,guild),d=hook?.data;
  if(hook?.kind!=='hook'||!['ready','delivered'].includes(hook.status))fail();
  if(d.source==='gm_scheduled_notice')return deadlineProjection(db,guild,hook,scope);
  const action=typeof d.action_id==='string'?db.getSimulationRecord(guild,d.action_id):null,a=action?.data,
    mutations=a?db.mutationsForEntity(guild,action.id,20).filter(row=>row.source_layer==='npc_director'
      &&row.mutation_type==='npc_action:prepare'):[],mutation=mutations.length===1?mutations[0]:null;
  const actor=a&&db.getSimulationEntity(guild,'npc',a.actor_key),goal=a&&db.getNpcGoal(guild,a.actor_key,a.goal_key);
  const profile=a&&db.getNpcProfile(guild,a.actor_key),label=String(profile?.display_name||'').toLowerCase();
  if(hook?.kind!=='hook'||!['ready','delivered'].includes(hook.status)||action?.kind!=='action'||action.status!=='completed'
    ||a.actor_type!=='npc'||a.type!=='prepare'||a.target_type||a.target_key||!a.result?.success||!actor||!goal
    ||db.getCharacter(a.actor_key)||hasPcReference(db,guild,a.actor_key)
    ||!mutation||mutation.mutation_type!=='npc_action:prepare'||hash(JSON.parse(mutation.after_json))!==hash(action)
    ||d.source_context?.session!==scene.session_id||d.source_context.scene!==scene.key
    ||actor.state.hidden||actor.state.removed||['dead','removed'].includes(actor.state.status)
    ||activeCityProxy(db,guild,a.actor_key)||!['public','party'].includes(actor.state.visibility||'party')
    ||!db.roster(scene.session_id).some(r=>['present','late','guest'].includes(r.presence)
      &&db.getCharacter(r.character_id)?.data.location===actor.state.location_key)
    ||scope.mode==='private'||d.target_user_id)fail();
  const objective=String(goal.objective||'');
  // A single NPC-owned goal phrase, not arbitrary narrator prose or a completed effect on a PC.
  if(!/^[A-Za-z][A-Za-z0-9 '-]{0,159}$/u.test(objective)||hasPcReference(db,guild,objective)
    ||!/^[A-Za-z][A-Za-z0-9 '-]{0,159}$/u.test(label)||hasPcReference(db,guild,label)
    ||/\b(?:you|your|they|their|he|his|she|her)\b/iu.test(`${objective} ${label}`))fail();
  const text=`The ${label} prepares to ${objective[0].toLowerCase()+objective.slice(1)}.`;
  if(d.content!==text||a.public_hook!==text)fail();
  const source=db.getWorldEvent(guild,`mutation:${mutation.id}`);
  if(source?.status!=='active'||source.source_kind!=='mutation'||source.source_id!==mutation.id)fail();
  return {text,source,revision:hash([hook.id,d,action,mutation,actor,goal,profile])};
}
