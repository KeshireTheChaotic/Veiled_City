/** GM-only read-only explanations from recorded sources; unknown rationale stays unknown, not AI-invented. */
export function explainWhy(db,guildId,{event_key="",mutation_id="",kind="",key="",route=null}={}){
  const record=kind&&key?db.getCityRecord(guildId,kind,key):null;
  const edge=route?db.cityEdges(guildId,"route").find(row=>row.from_key===route.from&&row.to_key===route.to):null;
  if((kind||key)&&!record||route&&!edge) throw new Error("Requested recorded entity not found in this campaign.");
  const sourceKey=event_key||record?.source_event||edge?.source_event;
  const event=sourceKey?db.getWorldEvent(guildId,sourceKey):null;
  const mutation=mutation_id?db.getMutation(guildId,mutation_id):event?.source_kind==="mutation"?db.getMutation(guildId,event.source_id):null;
  if(!event&&!mutation) throw new Error("Recorded event or mutation not found in this campaign.");
  const records=[...new Map([...(record?[record]:[]),...(event?db.cityRecordsBySource(guildId,event.event_key):[])].map(row=>[`${row.kind}:${row.record_key}`,row])).values()];
  const visited=new Set(event?[event.event_key]:[]),queue=[...visited],edges=[];
  const all=db.worldLinks(guildId);
  while(queue.length&&visited.size<12){
    const key=queue.shift();
    for(const link of all.filter(row=>row.from_event===key||row.to_event===key).slice(0,8)){
      const other=link.from_event===key?link.to_event:link.from_event;
      if(!visited.has(other)&&visited.size<12){visited.add(other);queue.push(other);}
      if(!edges.some(e=>e.from_event===link.from_event&&e.to_event===link.to_event&&e.relation===link.relation))
        edges.push({...link,authority:link.asserted_by?"actor interpretation, not proven cause":"recorded source link, not independent verification"});
    }
  }
  const sources=[...visited].map(key=>db.getWorldEvent(guildId,key)).filter(Boolean).map(row=>({key:row.event_key,status:row.status,truth_status:row.truth_status,
    source_kind:row.source_kind,source_id:row.source_id,minute:row.minute}));
  const ledger=[...new Map([...(mutation?[mutation]:[]),...records.flatMap(row=>db.mutationsForEntity(guildId,row.record_key,4))].map(row=>[row.id,row])).values()].slice(0,12);
  return {visibility:"gm",entity:record?{kind:record.kind,key:record.record_key,status:record.status,
    reason:record.data.error||record.data.blocked_reason||record.data.reason||"No specific reason recorded; inspect ledger evidence.",
    reviewed_by:record.data.reviewed_by||record.data.approved_by||null,revision:record.data.revision||null,
    steps:record.kind==="strategy"?record.data.steps.map(step=>({key:step.key,status:step.status,action_id:step.action_id||null})):null,
    spent:record.kind==="strategy"?record.data.spent:null}:null,
    route:edge?{from:edge.from_key,to:edge.to_key,duration_minutes:edge.duration_minutes,source_event:edge.source_event,
      authority:"Established route descriptor; permission, availability and actual arrival remain separate checks."}:null,
    trigger:event?{key:event.event_key,title:event.title,source_kind:event.source_kind,source_id:event.source_id}:null,
    sources,causal_links:edges.slice(0,20),ledger:ledger.map(row=>({id:row.id,type:row.mutation_type,source_layer:row.source_layer,actor:row.actor_id,
      confidence:row.confidence,rationale:row.rationale,changes:{before_keys:Object.keys(JSON.parse(row.before_json||"{}")),after_keys:Object.keys(JSON.parse(row.after_json||"{}"))}})),
    validations:records.slice(0,8).map(row=>({kind:row.kind,key:row.record_key,status:row.status,source_event:row.source_event,
      approved_by:row.data.approved_by||null,accepted_by:row.data.accepted_by||null,action_id:row.data.action_id||null,
      resource_costs:row.data.terms?.costs||row.data.result?.resource_cost||null,
      limitation:"Recorded validation/approval metadata only; absent details are not proof."})),
    rules_sources:["ENGINE/AI_GM_CONSTITUTION.md","ENGINE/DAGGERHEART_MULTIPLAYER_CORE.md","docs/RULES_GROUNDING.md"],
    not_established:"Subjective interpretations and predictions do not establish canon, PC consent, unrolled results or universal legal authority.",
    recovery:"Inspect /vc-admin ledger, snapshots and restore-preview. Human GM chooses any rollback; this explanation changes nothing."};
}
