/** Read-only bounded scenario branches; GM-private possibilities, never rolled outcomes or authoritative facts. */
export function previewOutcomes(db,guildId,{query="",event_key=""}={}){
  const clock=db.getSimulationClock(guildId),events=event_key?[db.getWorldEvent(guildId,event_key)].filter(Boolean)
    :db.listWorldEvents(guildId,{includeGM:true,query,limit:8});
  if(event_key&&!events.length) throw new Error("Event not found in this campaign.");
  const sources=new Set(events.map(row=>row.event_key)),links=db.worldLinks(guildId).filter(link=>sources.has(link.from_event)||sources.has(link.to_event)).slice(0,12);
  const schedules=db.dueCitySchedules(guildId,8).map(row=>({key:row.schedule_key,status:row.status,due_minute:row.due_minute}));
  const records=db.listCityRecords(guildId,{query,includeGM:true,limit:20}).filter(row=>["weather","commitment","infrastructure"].includes(row.kind));
  const branches=records.slice(0,6).map(row=>({status:"possible",subject:`${row.kind}:${row.record_key}`,source_event:row.source_event,
    dependencies:row.kind==="infrastructure"?db.cityEdges(guildId,"infrastructure").filter(edge=>edge.from_key===row.record_key).map(edge=>edge.to_key).slice(0,10):[],
    if:row.kind==="infrastructure"?"If the established service degrades":row.kind==="weather"?"If this forecast occurs in its established interval":"If the accepted appointment is kept or explicitly cancelled",
    then:row.kind==="infrastructure"?"Connected service availability may change; no PC harm is inferred":"The scene may need descriptive continuity/reconciliation",
    mitigation:row.kind==="infrastructure"?"Repair or check established redundant providers":"Confirm availability/terms and consider another established route",
    uncertainty:"Subject to actual fictional events, actor knowledge, consent and GM/mechanical adjudication; not guaranteed."}));
  return {visibility:"gm",status:"hypothetical",minute:clock.minute,events:events.map(row=>({key:row.event_key,status:row.status,truth_status:row.truth_status})),
    links,schedules,branches,mechanics:"No dice, PC outcome, resource spend, Difficulty or canon change predicted or applied."};
}
