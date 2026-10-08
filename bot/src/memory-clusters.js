/** Reversible actor-relative evidence clusters. Excerpts retain source uncertainty; originals, mysteries and canon are never rewritten. */
import { cityObject, cityKey, cityAudit } from "./city-calendar.js";
import { requireCitySource } from "./city-core.js";
import { StateConflictError, UserInputError } from "./errors.js";
function evidence(db,guild,type,actor,ref){
  if(ref.kind==="npc_memory"&&type==="npc"){
    const row=db.getNpcMemory(ref.key);
    const source=row?.source_ref?db.getWorldEvent(guild,row.source_ref):null;
    if(row?.guild_id===guild&&row.npc_key===actor&&["active","challenged"].includes(row.status)&&(!source||source.status==="active"))
      return {kind:ref.kind,key:row.id,content:row.content,confidence:row.confidence,status:row.status,source_ref:row.source_ref};
  }
  if(ref.kind==="memory"&&type==="faction"){
    const row=db.getSimulationRecord(guild,ref.key);
    if(row?.kind==="memory"&&row.entity_key===`faction:${actor}`&&row.status==="active") return {kind:ref.kind,key:row.id,...row.data};
  }
  if(ref.kind==="report"&&type==="institution"){
    const row=db.getCityRecord(guild,"report",ref.key);
    if(row?.actor_key===actor&&row.status==="active") return {kind:ref.kind,key:row.record_key,...row.data,source_ref:row.source_event};
  }
  if(ref.kind==="event"&&type==="campaign"&&actor===guild){
    const row=db.getWorldEvent(guild,ref.key);
    if(row?.status==="active") return {kind:ref.kind,key:row.event_key,content:row.title,confidence:row.truth_status==="established"?100:50,status:row.truth_status,source_ref:row.source_id};
  }
  throw new StateConflictError("Cluster evidence unavailable to this actor/campaign; no cross-actor consolidation.");
}
export function manageMemoryCluster(db,guild,input,actorId){
  cityObject(input);if(db.getCityCalendar(guild).flags.memory_consolidation!==true) throw new StateConflictError("Memory consolidation is opt-in.");
  const key=cityKey(input.key),before=db.getCityRecord(guild,"memory_cluster",key),op=input.op||"consolidate";
  if(op==="revert"){
    if(!before) throw new StateConflictError("Cluster not found.");if(before.status==="reverted") return before;
    return db.transaction(()=>{const after=db.saveCityRecord(guild,{...before,key,status:"reverted"});cityAudit(db,guild,"memory_reverted",key,before,after,actorId);return after;});
  }
  if(!["consolidate","revise"].includes(op)||op==="revise"&&!before) throw new UserInputError("Use consolidate, revise or revert.");
  if(before&&op==="consolidate") return before;
  const type=input.actor_type,actor=cityKey(input.actor_key);
  if(!["npc","faction","institution","campaign"].includes(type)||before&&(before.data.actor_type!==type||before.data.actor_key!==actor))
    throw new UserInputError("Established unchanged cluster actor required.");
  requireCitySource(db,guild,input.source_event);
  if(!Array.isArray(input.sources)||!input.sources.length||input.sources.length>20) throw new UserInputError("One to twenty evidence pointers required.");
  const refs=input.sources.map(ref=>({kind:cityKey(ref.kind),key:cityKey(ref.key)}));
  if(new Set(refs.map(ref=>JSON.stringify(ref))).size!==refs.length) throw new UserInputError("Duplicate cluster evidence.");
  const rows=refs.map(ref=>evidence(db,guild,type,actor,ref));
  if(typeof input.topic!=="string"||!input.topic.trim()||input.topic.length>160) throw new UserInputError("Bounded cluster topic required.");
  return db.transaction(()=>{
    const after=db.saveCityRecord(guild,{kind:"memory_cluster",key,actor_key:`${type}:${actor}`,source_event:input.source_event,
      data:{actor_type:type,actor_key:actor,topic:input.topic,sources:refs,revision:(before?.data.revision||0)+1,
        excerpts:rows.map(row=>({kind:row.kind,key:row.key,content:String(row.content||"").slice(0,180),confidence:row.confidence??50,status:row.status||row.belief_state||"claimed"})),
        uncertainty:"Independent source claims; disagreements are retained, not reconciled into certainty.",authority:"memory_not_canon",
        history:[...(before?.data.history||[]),...(before?[{revision:before.data.revision,sources:before.data.sources,excerpts:before.data.excerpts,source_event:before.source_event}]:[])].slice(-20)}});
    cityAudit(db,guild,"memory_consolidated",key,before,after,actorId);return after;
  });
}
export function clusterContext(db,guild,type,actor,query=""){
  if(db.getCityCalendar(guild).flags.memory_consolidation!==true) return [];
  const terms=[...new Set(String(query).toLowerCase().match(/[a-z0-9]{3,}/g)||[])].slice(0,8);
  return db.listCityRecords(guild,{kind:"memory_cluster",actor:`${type}:${actor}`,status:"active",includeGM:true,limit:32})
    .filter(row=>!terms.length||terms.some(term=>JSON.stringify(row.data).toLowerCase().includes(term))).slice(0,4).flatMap(row=>{
    try{
      requireCitySource(db,guild,row.source_event);
      const sources=row.data.sources.map(ref=>evidence(db,guild,type,actor,ref));
      return [{key:row.record_key,topic:row.data.topic,source_event:row.source_event,revision:row.data.revision,
        claims:sources.map(item=>({kind:item.kind,key:item.key,source_ref:item.source_ref,confidence:item.confidence??50,status:item.status||item.belief_state||"claimed",
          content:String(item.content||"").slice(0,180)})),uncertainty:row.data.uncertainty,authority:"memory_not_canon"}];
    }catch{return [];}
  });
}
export function memoryMaintenanceCandidate(db,guild){
  if(db.getCityCalendar(guild).flags.memory_consolidation!==true) return null;
  const source=db.listWorldEvents(guild,{includeGM:true,limit:8}).find(row=>row.status==="active");if(!source) return null;
  const clusterCursor=db.getCityRecord(guild,"memory_cursor","clusters"),afterCluster=clusterCursor?.data.after||0;
  let clusters=db.memoryMaintenanceClusters(guild,afterCluster);
  if(!clusters.length&&afterCluster) clusters=db.memoryMaintenanceClusters(guild,0);
  for(const row of clusters){
    db.saveCityRecord(guild,{kind:"memory_cursor",key:"clusters",source_event:source.event_key,data:{after:row.sequence}});
    const {sequence,...original}=row;
    try{
      requireCitySource(db,guild,row.source_event);
      const current=row.data.sources.map(ref=>evidence(db,guild,row.data.actor_type,row.data.actor_key,ref));
      if(current.every((item,i)=>String(item.content||"").slice(0,180)===row.data.excerpts[i]?.content
        &&(item.confidence??50)===row.data.excerpts[i]?.confidence&&(item.status||item.belief_state||"claimed")===row.data.excerpts[i]?.status)) continue;
      return {target_key:row.record_key,expected:original,payload:{...row.data,op:"revise",source_event:source.event_key}};
    }catch{return {target_key:row.record_key,expected:original,payload:{...row.data,op:"revert",source_event:source.event_key}};}
  }
  const cursor=db.getCityRecord(guild,"memory_cursor","actors"),after=cursor?.data.after||"";
  const actors=db.memoryCandidateActors(guild,after);if(!actors.length&&after){
    db.saveCityRecord(guild,{kind:"memory_cursor",key:"actors",source_event:source.event_key,data:{after:""}});return null;
  }
  for(const actor of actors){
    db.saveCityRecord(guild,{kind:"memory_cursor",key:"actors",source_event:source.event_key,data:{after:actor.actor}});
    const [type,...parts]=actor.actor.split(":"),key=parts.join(":"),cluster=`auto-memory:${type}:${key}`;
    if(db.getCityRecord(guild,"memory_cluster",cluster)) continue;
    const refs=type==="npc"?db.lowPriorityNpcMemories(guild,key).map(row=>({kind:"npc_memory",key:row.id}))
      :type==="faction"?db.listSimulationRecords(guild,{kind:"memory",entityKey:actor.actor,status:"active",limit:8}).map(row=>({kind:"memory",key:row.id}))
      :db.listCityRecords(guild,{kind:"report",actor:key,status:"active",includeGM:true,limit:8}).map(row=>({kind:"report",key:row.record_key}));
    if(refs.length<2) continue;
    return {target_key:cluster,expected:null,payload:{op:"consolidate",source_event:source.event_key,actor_type:type,actor_key:key,topic:"Recorded source index",sources:refs}};
  }
  return null;
}
