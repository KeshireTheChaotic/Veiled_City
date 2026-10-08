/** Phased continuity over existing adjudicated downtime results; consent and fictional time never grant new PC mechanics or spend resources. */
import { cityObject, cityKey, cityInteger, cityAudit } from "./city-calendar.js";
import { requireCitySource } from "./city-core.js";
import { PermissionError, UserInputError, StateConflictError } from "./errors.js";
import { principalAllows, applicationPrincipal } from "./application-authority.js";
import { stateRevision } from "./ai-intents.js";
import { actorSource } from "./simulation-motivation.js";
export const projectPhaseRevision=row=>stateRevision({key:row.record_key,index:row.data.index,phase:row.data.phases[row.data.index]?.key,
  duration:row.data.phases[row.data.index]?.duration_minutes,prerequisites:row.data.phases[row.data.index]?.prerequisites});
const submissionRevision=row=>stateRevision({id:row.id,character:row.character_id,owner:row.discord_user_id,title:row.title,
  objective:row.objective,type:row.project_type,max_progress:row.max_progress});
function collaborators(db,guild,entries){
  if(!Array.isArray(entries)||entries.length>8) throw new UserInputError("Bounded NPC collaborator commitments required.");
  for(const entry of entries){
    actorSource(db,guild,{actor_type:"npc",actor_key:entry.npc_key,information_key:entry.information_key,source_event:entry.source_event},{requireResources:false});
    const commitment=db.getCityRecord(guild,"commitment",entry.commitment_key),minute=db.getSimulationClock(guild).minute;
    if(commitment?.status!=="active"||commitment.source_event!==entry.source_event||!commitment.data.participants.includes(`npc:${entry.npc_key}`)
      ||minute>=commitment.data.end) throw new StateConflictError("Active sourced NPC collaboration commitment required.");
  }
}
function owner(db,guild,user,character){
  const row=db.getCharacter(character);
  if(!row||row.guild_id!==guild||row.owner_user_id!==user||!["active","reserve","guest"].includes(row.status)) throw new PermissionError("Eligible owned character required.");
  return row;
}
function sources(db,guild,keys,members,user){
  for(const key of keys){
    const source=requireCitySource(db,guild,key);
    if(!["public","party"].includes(source.visibility)&&!(members.length===1
      &&(source.visibility==="character"&&source.subject_key===members[0]||source.visibility==="player"&&source.subject_key===user)))
      throw new PermissionError("Project sources must be known to all collaborators; GM-only sources cannot be submitted by players.");
  }
}
export function manageLongProject(db,guild,user,input,{gm=false,principal=null}={}){
  cityObject(input);if(db.getCityCalendar(guild).flags.long_projects!==true) throw new StateConflictError("Long projects are opt-in.");
  gm=gm===true||principalAllows(principal,guild,`project.${input.op}`);
  const key=cityKey(input.key),before=db.getCityRecord(guild,"long_project",key),op=input.op||"create";
  if(op==="accept-proposal"){
    const draft=db.getCityRecord(guild,"project_draft",key);
    if(draft?.status!=="pending"||draft.subject_key!==input.character_id||stateRevision(draft)!==input.expected_revision)
      throw new StateConflictError("Current owned project proposal required.");
    owner(db,guild,user,input.character_id);
    return db.transaction(()=>{
      const result=manageLongProject(db,guild,user,{...draft.data,key,op:"create",strict_consent:true});
      db.saveCityRecord(guild,{...draft,key,status:"accepted",data:{...draft.data,accepted_by:user}});return result;
    });
  }
  if(op==="create"){
    if(before){if(!before.data.participants.some(id=>db.getCharacter(id)?.owner_user_id===user)&&!gm) throw new PermissionError("Project unavailable.");return before;}
    owner(db,guild,user,input.character_id);
    const members=input.participants||[input.character_id];
    if(!Array.isArray(members)||!members.includes(input.character_id)||members.length>8||new Set(members).size!==members.length
      ||members.some(id=>db.getCharacter(id)?.guild_id!==guild)) throw new UserInputError("One to eight established collaborators required.");
    if(input.costs?.length) throw new UserInputError("No automatic project spending; use existing authorized downtime adjudication.");
    if(!Array.isArray(input.phases)||!input.phases.length||input.phases.length>8) throw new UserInputError("One to eight project phases required.");
    const seen=new Set();
    const phases=input.phases.map(phase=>{
      cityKey(phase.key);cityKey(phase.title);cityInteger(phase.duration_minutes,0,525600);
      if(seen.has(phase.key)||!Array.isArray(phase.requires)||phase.requires.some(dep=>!seen.has(dep))
        ||!Array.isArray(phase.prerequisites)||phase.prerequisites.length>8) throw new UserInputError("Ordered phase dependencies and source prerequisites required.");
      seen.add(phase.key);sources(db,guild,phase.prerequisites,members,user);
      return {key:phase.key,title:phase.title,duration_minutes:phase.duration_minutes,requires:phase.requires,prerequisites:phase.prerequisites,
        status:"pending",consents:{},result_ids:[]};
    });sources(db,guild,[input.source_event],members,user);collaborators(db,guild,input.npc_collaborators||[]);
    return db.transaction(()=>{
      const after=db.saveCityRecord(guild,{kind:"long_project",key,status:"awaiting_consent",source_event:input.source_event,
        data:{title:cityKey(input.title),participants:members,npc_collaborators:input.npc_collaborators||[],strict_consent:input.strict_consent===true,
          created_by:user,phases,index:0,history:[],authority:"continuity_only_existing_downtime_adjudication"}});
      cityAudit(db,guild,"long_project_created",key,null,after,user);return after;
    });
  }
  if(!before||!gm&&!before.data.participants.some(id=>db.getCharacter(id)?.owner_user_id===user)) throw new PermissionError("Project unavailable.");
  if(op==="status") return before;
  if(["completed","abandoned"].includes(before.status)) return before;
  const data=structuredClone(before.data),phase=data.phases[data.index];
  if(gm&&["advance","resume"].includes(op)){
    try{
      for(const source of [before.source_event,...phase.prerequisites]) requireCitySource(db,guild,source);
      collaborators(db,guild,data.npc_collaborators||[]);
      const session=db.getActiveSession(guild);
      for(const id of data.participants){
        const c=db.getCharacter(id);if(!c||!["active","reserve","guest"].includes(c.status)) throw new StateConflictError("Collaborator unavailable.");
        if(session&&!db.roster(session.id).some(row=>row.character_id===id&&["present","late","guest"].includes(row.presence))) throw new StateConflictError("Collaborator absent.");
      }
    }
    catch(error){return db.transaction(()=>{
      if(phase.started_minute!==undefined){phase.elapsed_minutes=(phase.elapsed_minutes||0)+db.getSimulationClock(guild).minute-phase.started_minute;delete phase.started_minute;}
      const after=db.saveCityRecord(guild,{...before,key,status:"paused",data:{...data,blocked_reason:error.message}});
      cityAudit(db,guild,"long_project_source_lost",key,before,after,user);return after;
    });}
  }
  return db.transaction(()=>{
    let status=before.status;
    if(op==="consent"){
      owner(db,guild,user,input.character_id);
      if(data.strict_consent&&input.phase_revision!==projectPhaseRevision(before)) throw new StateConflictError("Current phase revision required for consent.");
      if(!data.participants.includes(input.character_id)||!["accept","decline"].includes(input.decision)) throw new PermissionError("Explicit collaborator choice required.");
      if(!["awaiting_consent","active"].includes(status)) throw new StateConflictError("Resume project before consenting.");
      const project=input.decision==="accept"?db.getDowntimeProject(guild,input.project_id):null;
      if(input.decision==="accept"&&(!project||project.character_id!==input.character_id||project.discord_user_id!==user
        ||project.status!=="active"&&phase.consents[input.character_id]?.project_id!==project.id))
        throw new StateConflictError("Consent must bind your own submitted active downtime project for this phase.");
      phase.consents[input.character_id]={decision:input.decision,by:user,project_id:project?.id||null,minute:db.getSimulationClock(guild).minute,
        phase_revision:projectPhaseRevision(before),submission_revision:project?submissionRevision(project):null};
      if(input.decision==="decline") status="paused";
      else if(data.participants.every(id=>phase.consents[id]?.decision==="accept")){
        if(phase.started_minute===undefined) phase.started_minute=db.getSimulationClock(guild).minute;
        status="active";
      }
    }else{
      if(!gm) throw new PermissionError("GM adjudication required for phase transitions.");
      if(!["advance","pause","resume","abandon"].includes(op)) throw new UserInputError("Unknown long project operation.");
      if(op==="pause"||op==="abandon") status=op==="pause"?"paused":"abandoned";
      else{
        requireCitySource(db,guild,before.source_event);
        for(const source of phase.prerequisites) requireCitySource(db,guild,source);
        if(phase.requires.some(dep=>data.phases.find(item=>item.key===dep)?.status!=="completed")) throw new StateConflictError("Phase dependency not completed.");
        if(op==="resume") status="awaiting_consent";
        else{
          if(status!=="active"||!data.participants.every(id=>phase.consents[id]?.decision==="accept")) throw new StateConflictError("Every collaborator must explicitly consent to this phase.");
          if((phase.elapsed_minutes||0)+db.getSimulationClock(guild).minute-phase.started_minute<phase.duration_minutes) throw new StateConflictError("Explicit fictional project duration has not elapsed.");
          if(!Array.isArray(input.result_ids)||input.result_ids.length!==data.participants.length||new Set(input.result_ids).size!==input.result_ids.length)
            throw new UserInputError("One distinct adjudicated downtime result per collaborator required.");
          const results=input.result_ids.map(id=>db.getDowntimeProject(guild,id));
          if(results.some(row=>!row||!data.participants.includes(row.character_id)||row.discord_user_id!==db.getCharacter(row.character_id)?.owner_user_id
            ||phase.consents[row.character_id]?.project_id!==row.id
            ||phase.consents[row.character_id]?.by!==row.discord_user_id
            ||phase.consents[row.character_id]?.phase_revision!==projectPhaseRevision(before)
            ||phase.consents[row.character_id]?.submission_revision!==submissionRevision(row)
            ||row.status!=="completed"||!row.result||db.getDowntimeCycle(row.cycle_id)?.status!=="resolved"||db.downtimeResultClaimed(guild,row.id))
            ||new Set(results.map(row=>row.character_id)).size!==data.participants.length)
            throw new StateConflictError("Established, resolved, completed, unused owner-authorized downtime results required; failures retain partial evidence.");
          phase.status="completed";phase.result_ids=input.result_ids;phase.completed_minute=db.getSimulationClock(guild).minute;
          data.history.push({phase:phase.key,source_event:before.source_event,results:input.result_ids,minute:phase.completed_minute,adjudicated_by:user});
          data.index++;status=data.index===data.phases.length?"completed":"awaiting_consent";
        }
      }
    }
    if(status==="paused"&&phase.started_minute!==undefined){
      phase.elapsed_minutes=(phase.elapsed_minutes||0)+db.getSimulationClock(guild).minute-phase.started_minute;
      delete phase.started_minute;
    }
    const after=db.saveCityRecord(guild,{...before,key,status,data});cityAudit(db,guild,`long_project_${op}`,key,before,after,user);return after;
  });
}
export function reconcileLongProject(db,guild,row){
  if(row.status!=="active") return row;
  try{
    for(const source of [row.source_event,...row.data.phases[row.data.index].prerequisites]) requireCitySource(db,guild,source);
    collaborators(db,guild,row.data.npc_collaborators||[]);
    for(const id of row.data.participants){
      if(!["active","reserve","guest"].includes(db.getCharacter(id)?.status)) throw new Error("Collaborator unavailable.");
      const session=db.getActiveSession(guild);
      if(session&&!db.roster(session.id).some(item=>item.character_id===id&&["present","late","guest"].includes(item.presence))) throw new Error("Collaborator absent.");
    }
    return row;
  }catch{
    return manageLongProject(db,guild,"continuity_guard",{key:row.record_key,op:"pause"},
      {principal:applicationPrincipal(guild,"project.pause","continuity_guard")});
  }
}
