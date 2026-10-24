/** Source-bound civic networks and NPC service outcomes; no player mechanics or automatic knowledge. */
import {createHash} from 'node:crypto';
import {cityKey,cityInteger,cityObject,cityAudit} from './city-calendar.js';
import {requireCitySource,requireCityRecord,requireWorldLocation as location} from './city-source.js';
export function queueCivicChange(db,guildId,input,actorId){
  const digest=createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0,20),key=`change:${input.kind}:${input.key}:${digest}`;
  const existing=db.getCityRecord(guildId,"change",key);if(existing) return existing;
  const after=db.saveCityRecord(guildId,{kind:"change",key,status:"pending",source_event:input.source_event,data:{intent:input,reviews:[]}});
  cityAudit(db,guildId,"civic_pending",key,null,after,actorId);return after;
}
export function connectCity(db,guildId,input,actorId,reviewed=false){
  requireCitySource(db,guildId,input.source_event);cityKey(input.from);cityKey(input.to);
  if(input.from===input.to) throw new Error("Self-dependency is not allowed.");
  if(input.kind==="infrastructure"){
    requireCityRecord(db,guildId,"infrastructure",input.from);requireCityRecord(db,guildId,"infrastructure",input.to);
    const edges=db.cityEdges(guildId,"infrastructure"),visited=new Set(),queue=[input.to];
    if(edges.length>=1000) throw new Error("Dependency graph budget exceeded.");
    while(queue.length){const key=queue.pop();if(key===input.from) throw new Error("Infrastructure dependency cycle requires manual resolution.");
      if(visited.has(key)) continue;visited.add(key);queue.push(...edges.filter(edge=>edge.from_key===key).map(edge=>edge.to_key));}
    const from=db.getCityRecord(guildId,"infrastructure",input.from),to=db.getCityRecord(guildId,"infrastructure",input.to);
    if(!reviewed&&(to.data.effective_condition-from.data.effective_condition>40||infrastructureComponent(db,guildId,input.to).size>10))
      return db.transaction(()=>queueCivicChange(db,guildId,{...input,kind:"connect",edge_kind:input.kind,key:`${input.from}:${input.to}`},actorId));
  }else if(input.kind==="route"){
    location(db,guildId,input.from);location(db,guildId,input.to);cityInteger(input.duration,1,10080);
  }else if(input.kind==="channel"){
    // Group/actor endpoints are validated when transmitting; adding an edge grants no knowledge.
    for(const endpoint of [input.from,input.to]){
      const [type,...rest]=endpoint.split(":"),key=rest.join(":");
      if(type==="npc"){if(!db.getNpcProfile(guildId,key)) throw new Error("Channel NPC not found.");}
      else if(["institution","community"].includes(type)) requireCityRecord(db,guildId,type,key);
      else if(type!=="audience") throw new Error("Invalid channel endpoint.");
    }
  }else throw new Error("Unknown civic edge kind.");
  return db.transaction(()=>{
    const edge=db.saveCityEdge(guildId,input);cityAudit(db,guildId,"city_edge",input.from,null,edge,actorId);
    if(input.kind==="infrastructure"){infrastructureComponent(db,guildId,input.from);recalculateInfrastructure(db,guildId,input.source_event);}
    return edge;
  });
}
function infrastructureComponent(db,guildId,key){
  const edges=db.cityEdges(guildId,"infrastructure"),seen=new Set(),queue=[key];
  while(queue.length){const current=queue.pop();if(seen.has(current)) continue;seen.add(current);
    if(seen.size>20) throw new Error("Connected infrastructure exceeds the 20-node deterministic budget; split/review the network.");
    queue.push(...edges.filter(edge=>edge.from_key===current).map(edge=>edge.to_key));}
  return seen;
}
export function recalculateInfrastructure(db,guildId,sourceEvent){
  const nodes=db.listCityRecords(guildId,{kind:"infrastructure",includeGM:true,limit:100}),edges=db.cityEdges(guildId,"infrastructure");
  if(nodes.length>=100) throw new Error("Infrastructure index budget exceeded.");
  const lookup=new Map(nodes.map(row=>[row.record_key,row]));
  const memo=new Map(),visiting=new Set();
  const effective=key=>{
    if(memo.has(key)) return memo.get(key);
    if(visiting.has(key)) throw new Error("Cyclic service dependency.");visiting.add(key);
    const row=lookup.get(key);if(!row) throw new Error("Dependency endpoint is missing.");
    const parents=edges.filter(edge=>edge.to_key===key).map(edge=>effective(edge.from_key));
    const upstream=parents.length?(row.data.redundancy==="any"?Math.max(...parents):Math.min(...parents)):100;
    const value=Math.min(row.data.native_condition,upstream);memo.set(key,value);visiting.delete(key);return value;
  };
  for(const row of nodes) effective(row.record_key);
  for(const row of nodes){
    const value=memo.get(row.record_key);if(value===row.data.effective_condition) continue;
    const next=db.saveCityRecord(guildId,{...row,key:row.record_key,source_event:sourceEvent,data:{...row.data,effective_condition:value}});
    cityAudit(db,guildId,"infrastructure_propagation",row.record_key,row,next,"civic_resolver");
    for(const key of row.data.locations){
      const old=db.getSimulationEntity(guildId,"location",key)?.state||{};
      const next={...old,civic_services:{...old.civic_services,[row.record_key]:{service:row.data.service,condition:value,source_event:sourceEvent}}};
      db.setSimulationEntity(guildId,"location",key,next);cityAudit(db,guildId,"location_service",key,old,next,"civic_resolver");
    }
  }
  return nodes.length;
}
export function changeCityService(db,guildId,input,actorId,reviewed=false){
  cityObject(input);requireCitySource(db,guildId,input.source_event);
  const before=requireCityRecord(db,guildId,"infrastructure",input.key),value=cityInteger(input.condition,0,100);
  const affected=infrastructureComponent(db,guildId,input.key);
  const major=input.major===true||before.data.native_condition-value>40||affected.size>10;
  return db.transaction(()=>{
    if(major&&!reviewed) return queueCivicChange(db,guildId,{kind:"service",...input},actorId);
    const after=db.saveCityRecord(guildId,{...before,key:before.record_key,source_event:input.source_event,data:{...before.data,native_condition:value}});
    cityAudit(db,guildId,"service_condition",input.key,before,after,actorId);recalculateInfrastructure(db,guildId,input.source_event);
    return db.getCityRecord(guildId,"infrastructure",input.key);
  });
}
export function applyNpcServiceOutcome(db,guildId,action,mutation){
  if(!["repair","sabotage"].includes(action.type)) return;
  const source=`mutation:${mutation.id}`;
  for(const row of db.listCityRecords(guildId,{kind:"infrastructure",includeGM:true,limit:100}).filter(row=>row.data.locations.includes(action.location_key)).slice(0,3)){
    if(infrastructureComponent(db,guildId,row.record_key).size>10) continue;
    const condition=Math.max(0,Math.min(100,row.data.native_condition+(action.type==="repair"?10:-10)));
    changeCityService(db,guildId,{key:row.record_key,source_event:source,condition},"npc_service_consequence");
  }
}
