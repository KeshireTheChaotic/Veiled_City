/** Phased continuity over existing adjudicated downtime results; consent and fictional time never grant new PC mechanics or spend resources. */
import { cityObject, cityKey, cityInteger, cityAudit } from "./city-calendar.js";
import { requireCitySource } from "./city-core.js";
import { PermissionError, UserInputError, StateConflictError } from "./errors.js";
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
export function manageLongProject(db,guild,user,input,{gm=false}={}){
  cityObject(input);if(db.getCityCalendar(guild).flags.long_projects!==true) throw new StateConflictError("Long projects are opt-in.");
  const key=cityKey(input.key),before=db.getCityRecord(guild,"long_project",key),op=input.op||"create";
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
    });sources(db,guild,[input.source_event],members,user);
    return db.transaction(()=>{
      const after=db.saveCityRecord(guild,{kind:"long_project",key,status:"awaiting_consent",source_event:input.source_event,
        data:{title:cityKey(input.title),participants:members,created_by:user,phases,index:0,history:[],authority:"continuity_only_existing_downtime_adjudication"}});
      cityAudit(db,guild,"long_project_created",key,null,after,user);return after;
    });
  }
  if(!before||!gm&&!before.data.participants.some(id=>db.getCharacter(id)?.owner_user_id===user)) throw new PermissionError("Project unavailable.");
  if(op==="status") return before;
  if(["completed","abandoned"].includes(before.status)) return before;
  const data=structuredClone(before.data),phase=data.phases[data.index];
  if(gm&&["advance","resume"].includes(op)){
    try{for(const source of [before.source_event,...phase.prerequisites]) requireCitySource(db,guild,source);}
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
      if(!data.participants.includes(input.character_id)||!["accept","decline"].includes(input.decision)) throw new PermissionError("Explicit collaborator choice required.");
      if(!["awaiting_consent","active"].includes(status)) throw new StateConflictError("Resume project before consenting.");
      const project=input.decision==="accept"?db.getDowntimeProject(guild,input.project_id):null;
      if(input.decision==="accept"&&(!project||project.character_id!==input.character_id||project.discord_user_id!==user
        ||project.status!=="active"&&phase.consents[input.character_id]?.project_id!==project.id))
        throw new StateConflictError("Consent must bind your own submitted active downtime project for this phase.");
      phase.consents[input.character_id]={decision:input.decision,by:user,project_id:project?.id||null,minute:db.getSimulationClock(guild).minute};
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
