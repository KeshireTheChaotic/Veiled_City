/** Semantic event index and fictional calendar. Deadlines never choose PC actions or apply player mechanics. */
export const cityObject=value=>{
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new Error("Expected a JSON object.");
  if(JSON.stringify(value).length>32000) throw new Error("City payload exceeds 32000 characters.");
  return value;
};
export const cityKey=value=>{
  if(typeof value!=="string"||!value.trim()||value.length>160) throw new Error("A stable nonempty key (max 160 characters) is required.");
  return value.trim();
};
export const cityInteger=(value,min=0,max=Number.MAX_SAFE_INTEGER)=>{
  if(!Number.isSafeInteger(value)||value<min||value>max) throw new Error(`Expected an integer in ${min}..${max}.`);
  return value;
};
export function cityVisibility(db,guildId,visibility="gm",subject=null){
  if(!["public","party","player","character","gm"].includes(visibility)) throw new Error("Invalid visibility.");
  if(visibility==="character"&&db.getCharacter(subject)?.guild_id!==guildId) throw new Error("Character subject is not in this campaign.");
  if(visibility==="player"&&!db.getPlayer(guildId,subject)) throw new Error("Player subject is not in this campaign.");
  return {visibility,subject_key:["player","character"].includes(visibility)?subject:null};
}
export function cityAudit(db,guildId,type,key,before,after,actorId="human_gm"){
  return db.recordMutation(guildId,{actorType:actorId==="human_gm"?"human_gm":"system",actorId,
    sourceLayer:"city",mutationType:type,entityKey:key,visibility:"gm",before,after,
    rationale:"Typed fictional civic state; no PC mechanics or automatic canon."});
}
function iso(value){
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00(?:\.000)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    ||!Number.isFinite(Date.parse(value))) throw new Error("Use a minute-aligned ISO datetime with an explicit timezone offset.");
  const year=Number(value.slice(0,4)),month=Number(value.slice(5,7)),day=Number(value.slice(8,10));
  const days=[31,(year%4===0&&(year%100!==0||year%400===0))?29:28,31,30,31,30,31,31,30,31,30,31];
  if(month<1||month>12||day<1||day>days[month-1]||Number(value.slice(11,13))>23||Number(value.slice(14,16))>59)
    throw new Error("Invalid fictional calendar date/time.");
  return new Date(value).toISOString();
}
export function calendarStatus(db,guildId){
  const config=db.getCityCalendar(guildId), clock=db.getSimulationClock(guildId);
  const date=config.epoch?new Date(Date.parse(config.epoch)+clock.minute*60000):null;
  return {...config,...clock,mode:date?"epoch":"relative",relative_day:Math.floor(clock.minute/1440)+1,
    time_of_day:`${String(Math.floor(clock.minute%1440/60)).padStart(2,"0")}:${String(clock.minute%60).padStart(2,"0")}`,
    datetime:date?date.toISOString():null,display:date?new Intl.DateTimeFormat("en-GB",{
      timeZone:config.timezone,dateStyle:"full",timeStyle:"short"}).format(date):null};
}
export function configureCalendar(db,guildId,input,actorId){
  cityObject(input);
  if(Object.keys(input).some(key=>!["epoch","timezone"].includes(key))) throw new Error("Unsupported calendar field.");
  const before=db.getCityCalendar(guildId), timezone=input.timezone||before.timezone;
  new Intl.DateTimeFormat("en",{timeZone:timezone});
  const epoch=input.epoch===undefined?before.epoch:iso(input.epoch);
  if(before.epoch&&epoch!==before.epoch) throw new Error("The established epoch cannot be silently changed; restore a snapshot to undo it.");
  if(epoch&&!Number.isFinite(Date.parse(epoch)+db.getSimulationClock(guildId).minute*60000)) throw new Error("Calendar overflow.");
  return db.transaction(()=>{
    const after=db.setCityCalendar(guildId,{...before,epoch,timezone});
    cityAudit(db,guildId,"calendar",guildId,before,after,actorId);
    return calendarStatus(db,guildId);
  });
}
function sourceBoundary(db,guildId,kind,id){
  if(kind==="gm") return null;
  if(kind==="mutation") return db.getMutation(guildId,id);
  if(kind==="event") return db.getWorldEvent(guildId,id);
  if(kind==="residue"){
    const row=db.getSimulationRecord(guildId,id);
    return row?.kind==="residue"?{...row,visibility:"gm"}:null;
  }
  throw new Error("Unsupported world event source kind.");
}
export function indexWorldEvent(db,guildId,input,actorId="human_gm"){
  cityObject(input);
  const key=cityKey(input.key), prior=db.getWorldEvent(guildId,key);
  if(prior){
    if(!input.status||input.status===prior.status) return prior;
    if(!["retracted","superseded"].includes(input.status)) throw new Error("Events may only be retracted or superseded.");
    if(input.status==="superseded"&&!db.getWorldEvent(guildId,input.superseded_by)) throw new Error("Superseding event must exist in this campaign.");
    return db.transaction(()=>{
      const after=db.saveWorldEvent(guildId,{...prior,key,status:input.status,details:{...prior.details,superseded_by:input.superseded_by||null}});
      cityAudit(db,guildId,"world_event_reconcile",key,prior,after,actorId);return after;
    });
  }
  const source_kind=input.source_kind||"gm", source_id=cityKey(input.source_id);
  const boundary=cityVisibility(db,guildId,input.visibility||"gm",input.subject_key);
  const source=sourceBoundary(db,guildId,source_kind,source_id);
  if(source_kind!=="gm"&&!source) throw new Error("Source does not exist in this campaign.");
  if(source&&!['public','party'].includes(source.visibility)){
    if(boundary.visibility!=="gm"&&(boundary.visibility!==source.visibility||boundary.subject_key!==(source.subject_key||null)))
      throw new Error("Event visibility cannot disclose its private source.");
  }
  if(input.truth_status&&!['asserted','observed','established'].includes(input.truth_status)) throw new Error("Invalid truth status.");
  const clock=db.getSimulationClock(guildId);
  return db.transaction(()=>{
    const after=db.saveWorldEvent(guildId,{key,kind:cityKey(input.kind||"observation"),title:cityKey(input.title),status:"active",
      truth_status:input.truth_status||"asserted",...boundary,source_kind,source_id,tick:clock.tick,minute:clock.minute,
      location_key:input.location_key||"",session_id:input.session_id||source?.session_id||null,scene:input.scene||"",
      details:cityObject(input.details||{})});
    cityAudit(db,guildId,"world_event_index",key,null,after,actorId);return after;
  });
}
export function scheduleCityEvent(db,guildId,input,actorId="human_gm"){
  cityObject(input);
  const key=cityKey(input.key), prior=db.getCitySchedule(guildId,key), op=input.op||"schedule";
  if(op==="schedule"&&prior) return prior;
  if(!["schedule","cancel","reschedule"].includes(op)) throw new Error("Invalid schedule operation.");
  if(op!=="schedule"&&(!prior||prior.status!=="scheduled")) throw new Error("Only scheduled events can be cancelled/rescheduled.");
  if(op==="cancel") return db.transaction(()=>{
    const after=db.saveCitySchedule(guildId,{...prior,key,status:"cancelled"});
    cityAudit(db,guildId,"schedule_cancel",key,prior,after,actorId);return after;
  });
  const data={...prior?.data,...input};
  if(op==="reschedule"&&input.due_minute===undefined&&input.due_at===undefined) throw new Error("Reschedule requires a new due time.");
  const calendar=db.getCityCalendar(guildId);
  let due=input.due_minute??prior?.due_minute;
  if(input.due_at!==undefined){
    if(!calendar.epoch) throw new Error("Configure an epoch before using an absolute date.");
    due=(Date.parse(iso(input.due_at))-Date.parse(calendar.epoch))/60000;
  }
  cityInteger(due); cityKey(data.title);
  if(data.end_minute!==undefined&&cityInteger(data.end_minute)<due) throw new Error("Event end precedes its start.");
  const boundary=cityVisibility(db,guildId,data.visibility||"gm",data.subject_key);
  if(data.hook&&!["party","public"].includes(boundary.visibility)) throw new Error("A shared deadline hook requires explicitly shared event visibility.");
  for(const field of ["invitees","requirements"]) if(data[field]!==undefined&&(!Array.isArray(data[field])||data[field].length>30)) throw new Error("Invalid event list.");
  if(data.major!==undefined&&typeof data.major!=="boolean") throw new Error("major must be a boolean.");
  return db.transaction(()=>{
    const after=db.saveCitySchedule(guildId,{key,due_minute:due,due_tick:cityInteger(input.due_tick??prior?.due_tick??0),
      status:"scheduled",review_status:data.major?"pending":"approved",data:{...data,...boundary}});
    cityAudit(db,guildId,"schedule",key,prior,after,actorId);return after;
  });
}
export function reviewCityEvent(db,guildId,input,actorId="human_gm"){
  const prior=db.getCitySchedule(guildId,cityKey(input.key));
  if(!prior||prior.status!=="scheduled") throw new Error("Scheduled event not found.");
  if(!["approve","modify","defer","reject"].includes(input.decision)) throw new Error("Invalid review decision.");
  return db.transaction(()=>{
    let row=prior;
    if(input.decision==="modify") row=scheduleCityEvent(db,guildId,{due_minute:prior.due_minute,...cityObject(input.patch),key:prior.schedule_key,op:"reschedule"},actorId);
    const after=db.saveCitySchedule(guildId,{...row,key:prior.schedule_key,
      status:input.decision==="reject"?"cancelled":"scheduled",review_status:input.decision==="defer"?"deferred":input.decision==="reject"?"rejected":"approved",
      data:{...row.data,reviews:[...(row.data.reviews||[]),{decision:input.decision,actor:actorId,tick:db.getSimulationClock(guildId).tick}]}});
    cityAudit(db,guildId,"schedule_review",prior.schedule_key,prior,after,actorId);return after;
  });
}
export function processCityDue(db,guildId){
  const calendar=db.getCityCalendar(guildId);
  if(calendar.epoch&&!Number.isFinite(new Date(Date.parse(calendar.epoch)+db.getSimulationClock(guildId).minute*60000).getTime()))
    throw new Error("Fictional calendar exceeds supported date range.");
  const due=db.dueCitySchedules(guildId,20);
  for(const row of due){
    const ledger=cityAudit(db,guildId,"scheduled_deadline",row.schedule_key,row,{status:"fired"},"fictional_calendar");
    const event=indexWorldEvent(db,guildId,{key:`schedule:${row.schedule_key}`,kind:"deadline",title:row.data.title,
      source_kind:"mutation",source_id:ledger.id,visibility:"gm",location_key:row.data.location_key||"",
      details:{schedule_key:row.schedule_key,deadline_only:true,attendance_not_assumed:true}},"fictional_calendar");
    if(row.data.hook){
      db.putSimulationRecord(guildId,{id:`city-hook:${guildId}:${row.schedule_key}`,kind:"hook",status:"ready",
        data:{content:String(row.data.hook),target_user_id:"",world_event:event.event_key,source:"gm_scheduled_notice"}});
    }
    db.saveCitySchedule(guildId,{...row,key:row.schedule_key,status:"fired"});
  }
  return due.length;
}
