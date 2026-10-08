/** Civic domain validation and institutional knowledge firewall. All descriptors are non-player simulation, never mechanical modifiers. */
import { cityObject, cityKey, cityInteger, cityAudit, indexWorldEvent, scheduleCityEvent } from "./city-calendar.js";
import { assertInstitutionDelegation, activeCityProxy } from "./city-constraints.js";

export const INSTITUTION_ACTIONS=["document_request","file_case","interview_request","inspect_request","issue_policy",
  "allocate_resources","negotiate_request","publish_finding","relocate_staff","seek_warrant"];
export const requireCitySource=(db,guildId,key)=>{
  const event=db.getWorldEvent(guildId,cityKey(key));
  if(!event||event.status!=="active") throw new Error("An active source event in this campaign is required.");
  return event;
};
export const cityStrings=(value,max=30)=>{
  if(!Array.isArray(value)||value.length>max||value.some(item=>typeof item!=="string"||item.length>500)) throw new Error("Invalid bounded string list.");
  return value;
};
export function requireCityRecord(db,guildId,kind,key){
  const row=db.getCityRecord(guildId,kind,cityKey(key));
  if(!row||row.status!=="active") throw new Error(`Active ${kind} not found in this campaign.`);
  return row;
}
function fields(data,allowed){
  if(Object.keys(data).some(key=>!allowed.includes(key))) throw new Error("Unsupported civic state field.");
}
export function updateCityCore(db,guildId,input,actorId="human_gm"){
  cityObject(input);const kind=input.kind,key=cityKey(input.key),source=requireCitySource(db,guildId,input.source_event);
  const before=db.getCityRecord(guildId,kind,key),data={...before?.data,...cityObject(input.data)};
  if(kind==="institution"){
    fields(data,["name","mandate","public_policy","private_objectives","jurisdictions","procedures","capacity","departments","personnel","queue","known_targets"]);
    cityKey(data.name);cityKey(data.mandate);cityInteger(data.capacity,0,100);
    cityStrings(data.jurisdictions);cityStrings(data.procedures);cityStrings(data.private_objectives||[]);
    cityStrings(data.personnel||[]);
    cityStrings(data.known_targets||[]);
    if(data.procedures.some(type=>!INSTITUTION_ACTIONS.includes(type))) throw new Error("Unsupported institution procedure.");
    for(const jurisdiction of data.jurisdictions){
      if(!db.getCityRecord(guildId,"district",jurisdiction)&&!db.getSimulationEntity(guildId,"location",jurisdiction))
        throw new Error("Institution jurisdiction must be an established district/location.");
    }
    if(before&&JSON.stringify(before.data.jurisdictions)!==JSON.stringify(data.jurisdictions))
      throw new Error("Jurisdiction restructuring needs a separately reviewed institution action.");
  }else if(kind==="district"){
    fields(data,["name","indices","connections","faction_presence","containment"]);cityKey(data.name);
    cityObject(data.indices||{});
    const allowed=["safety","resilience","attention","veil_pressure","infrastructure","institutional_reach"];
    for(const [name,value] of Object.entries(data.indices||{})){
      if(!allowed.includes(name)) throw new Error("Unknown district descriptor.");cityInteger(value,0,100);
      if(before&&Math.abs(value-(before.data.indices?.[name]??value))>20) throw new Error("Major district changes require reviewed consequences, not direct score jumps.");
    }
    for(const connection of cityStrings(data.connections||[])) requireCityRecord(db,guildId,"district",connection);
    cityStrings(data.faction_presence||[]);
  }else if(kind==="belief"){
    fields(data,["audience","allegation","interpretation","evidence_events","credibility","reach","counter_narratives","unverified"]);
    cityKey(data.audience);cityKey(data.allegation);cityKey(data.interpretation);
    cityInteger(data.credibility,0,100);cityInteger(data.reach,0,100);
    for(const event of cityStrings(data.evidence_events||[])) requireCitySource(db,guildId,event);
    cityStrings(data.counter_narratives||[]);
  }else if(kind==="case"){
    fields(data,["institution","jurisdiction","title","leads","evidence_reports","custody","hypotheses","heat","escalation_criteria","status"]);
    const institution=requireCityRecord(db,guildId,"institution",data.institution);
    if(!institution.data.jurisdictions.includes(data.jurisdiction)) throw new Error("Case is outside institutional jurisdiction.");
    cityKey(data.title);cityInteger(data.heat,0,100);cityStrings(data.leads||[]);cityStrings(data.hypotheses||[]);
    for(const report of cityStrings(data.evidence_reports||[])){
      const known=requireCityRecord(db,guildId,"report",report);
      if(known.actor_key!==data.institution) throw new Error("Case evidence is not known to this institution.");
    }
  }else throw new Error("Unsupported core civic record kind.");
  return db.transaction(()=>{
    const after=db.saveCityRecord(guildId,{kind,key,source_event:source.event_key,data,actor_key:data.institution||data.audience||key,
      district_key:kind==="district"?key:data.jurisdiction||"",status:"active"});
    cityAudit(db,guildId,`city_${kind}`,key,before,after,actorId);return after;
  });
}
export function assignDistrictLocation(db,guildId,input,actorId){
  requireCityRecord(db,guildId,"district",input.district);requireCitySource(db,guildId,input.source_event);
  if(!db.getSimulationEntity(guildId,"location",input.location)) throw new Error("Established simulation location is required.");
  return db.transaction(()=>{
    db.setDistrictLocation(guildId,input.location,input.district,input.source_event);
    const after=db.districtLocations(guildId,input.district);
    cityAudit(db,guildId,"district_membership",input.location,null,after,actorId);return after;
  });
}
export function fileInstitutionReport(db,guildId,input,actorId){
  cityObject(input);requireCityRecord(db,guildId,"institution",input.institution);requireCitySource(db,guildId,input.source_event);
  const key=cityKey(input.key),prior=db.getCityRecord(guildId,"report",key);if(prior) return prior;
  if(input.from_type!=="npc") throw new Error("Institution report requires an explicit NPC source; employee knowledge is not shared automatically.");
  const proxy=activeCityProxy(db,guildId,input.from_key);
  if(proxy&&input.proxy_consent_by!==proxy.discord_user_id) throw new Error("Human NPC proxy consent is required for this report.");
  const known=db.getNpcKnowledge(guildId,input.from_key,input.information_key);
  if(!known||known.belief_state==="unknown") throw new Error("Reporter does not know the cited information.");
  if(input.authorized!==true) throw new Error("An authorized report/record transfer must be established explicitly.");
  return db.transaction(()=>{
    const after=db.saveCityRecord(guildId,{kind:"report",key,actor_key:input.institution,source_event:input.source_event,
      data:{from_type:"npc",from_key:input.from_key,information_key:input.information_key,content:known.content,
        belief_state:known.belief_state,confidence:known.confidence,mechanism:cityKey(input.mechanism||"filed_report"),subjective:true}});
    cityAudit(db,guildId,"institution_report",key,null,after,actorId);return after;
  });
}
export function addWorldLink(db,guildId,input,actorId){
  requireCitySource(db,guildId,input.from);requireCitySource(db,guildId,input.to);
  if(!["caused_by","enabled_by","reported_by","investigates","contradicts","resolved_by","scheduled_from"].includes(input.relation)) throw new Error("Unknown event relation.");
  const causal=["caused_by","enabled_by","scheduled_from"].includes(input.relation);
  if(causal&&!input.asserted_by){
    const visited=new Set(),queue=[input.to],links=db.worldLinks(guildId);
    if(links.length>=1000) throw new Error("Causal graph budget exceeded; partition/review before adding links.");
    while(queue.length){
      const key=queue.pop();if(key===input.from) throw new Error("Strict causal links cannot form a cycle.");
      if(visited.has(key)) continue;visited.add(key);
      queue.push(...links.filter(link=>!link.asserted_by&&["caused_by","enabled_by","scheduled_from"].includes(link.relation)&&link.from_event===key).map(link=>link.to_event));
    }
  }
  if(input.asserted_by&&!db.getCityRecord(guildId,"institution",input.asserted_by)&&!db.getNpcProfile(guildId,input.asserted_by)) throw new Error("Assertion must be attributed to an established actor.");
  return db.transaction(()=>{
    const after=db.saveWorldLink(guildId,input);cityAudit(db,guildId,"causal_link",input.from,null,after,actorId);return after;
  });
}
function validateInstitutionAction(db,guildId,input){
  const institution=requireCityRecord(db,guildId,"institution",input.institution);
  assertInstitutionDelegation(db,guildId,institution,input);
  requireCitySource(db,guildId,input.source_event);
  if(!INSTITUTION_ACTIONS.includes(input.type)||!institution.data.procedures.includes(input.type)) throw new Error("No established institutional procedure authorizes this action.");
  if(!institution.data.jurisdictions.includes(input.jurisdiction)) throw new Error("Institution lacks jurisdiction.");
  if(input.target_type&&!["institution","location","district"].includes(input.target_type)) throw new Error("Civic actions cannot control or resolve harm against a PC/NPC.");
  if(input.target_key){
    if(input.target_type==="location"&&!db.getSimulationEntity(guildId,"location",input.target_key)) throw new Error("Action target location not found.");
    if(["institution","district"].includes(input.target_type)) requireCityRecord(db,guildId,input.target_type,input.target_key);
    const local=institution.data.jurisdictions.includes(input.target_key)||institution.data.jurisdictions.some(key=>
      db.districtLocations(guildId,key).some(row=>row.location_key===input.target_key));
    if(!local&&!(institution.data.known_targets||[]).includes(`${input.target_type}:${input.target_key}`))
      throw new Error("Institution does not have established knowledge of this target.");
  }
  for(const key of cityStrings(input.report_keys||[])){
    if(requireCityRecord(db,guildId,"report",key).actor_key!==input.institution) throw new Error("Institution lacks cited knowledge.");
  }
  if(["publish_finding","seek_warrant","file_case"].includes(input.type)&&!input.report_keys?.length) throw new Error("This procedure needs an established report.");
  if(institution.data.capacity<1) throw new Error("No remaining institutional capacity.");
  if(input.new_jurisdictions!==undefined){
    if(input.type!=="issue_policy") throw new Error("Jurisdiction changes require a reviewed policy action.");
    for(const key of cityStrings(input.new_jurisdictions)){
      if(!db.getCityRecord(guildId,"district",key)&&!db.getSimulationEntity(guildId,"location",key)) throw new Error("New jurisdiction is not established.");
    }
  }
  if(input.policy!==undefined){if(input.type!=="issue_policy") throw new Error("Policy change requires a policy action.");cityKey(input.policy);}
  return institution;
}
export function submitInstitutionAction(db,guildId,input,actorId="human_gm"){
  cityObject(input);const key=cityKey(input.key),prior=db.getCityRecord(guildId,"action",key);if(prior) return prior;
  validateInstitutionAction(db,guildId,input);
  if(input.confidence!==undefined&&cityInteger(input.confidence,0,100)<55) throw new Error("Low-confidence institutional intent requires clarification.");
  const major=["seek_warrant","issue_policy","relocate_staff"].includes(input.type)||input.major===true;
  return db.transaction(()=>{
    const after=db.saveCityRecord(guildId,{kind:"action",key,source_event:input.source_event,actor_key:input.institution,
      district_key:input.jurisdiction,status:major?"pending":"proposed",data:{...input,major}});
    cityAudit(db,guildId,"institution_intent",key,null,after,actorId);return after;
  });
}
export function reviewInstitutionAction(db,guildId,input,actorId){
  const before=db.getCityRecord(guildId,"action",input.key);
  if(!before||!["pending","deferred","proposed"].includes(before.status)) throw new Error("Reviewable institutional action not found.");
  if(!["approve","modify","defer","reject"].includes(input.decision)) throw new Error("Invalid institutional review decision.");
  const data={...before.data,...(input.decision==="modify"?cityObject(input.patch):{}),key:before.record_key};
  if(["approve","modify"].includes(input.decision)) validateInstitutionAction(db,guildId,data);
  return db.transaction(()=>{
    const after=db.saveCityRecord(guildId,{...before,key:before.record_key,source_event:data.source_event,actor_key:data.institution,district_key:data.jurisdiction,
      status:input.decision==="reject"?"rejected":input.decision==="defer"?"deferred":"proposed",
      data:{...data,approved_by:["approve","modify"].includes(input.decision)?actorId:null,reviews:[...(before.data.reviews||[]),{decision:input.decision,actor:actorId}]}});
    cityAudit(db,guildId,"institution_review",input.key,before,after,actorId);return after;
  });
}
export function configureCityFlags(db,guildId,input,actorId){
  cityObject(input);
  const allowed=["institutions","opportunities","economy","minor_npcs","adaptive_context","conversations","pacing","negotiations","voice_direction","authoring",
    "emergent_goals","consequences","scene_continuity"];
  if(Object.keys(input).some(key=>!allowed.includes(key)||typeof input[key]!=="boolean")) throw new Error("Unknown city feature flag.");
  return db.transaction(()=>{
    const before=db.getCityCalendar(guildId),after=db.setCityCalendar(guildId,{...before,flags:{...before.flags,...input}});
    cityAudit(db,guildId,"city_flags",guildId,before,after,actorId);return after;
  });
}
/** Deterministic bounded Institution Director: validated queued intent, no new per-actor LLM calls. */
export function runInstitutionDirector(db,guildId,cycleKey){
  if(!db.getCityCalendar(guildId).flags.institutions||db.isDirectorPaused(guildId)) return [];
  const receiptKey=`institution-cycle:${cycleKey}`;
  if(db.getCityRecord(guildId,"cycle",receiptKey)) return [];
  return db.transaction(()=>{
    const results=[];
    for(const row of db.listCityRecords(guildId,{kind:"action",status:"proposed",includeGM:true,limit:2})){
      try{
        results.push(db.transaction(()=>{
          const institute=validateInstitutionAction(db,guildId,row.data);
          if(row.data.major&&!row.data.approved_by) throw new Error("Major institutional action still requires review.");
          const next=db.saveCityRecord(guildId,{...institute,key:institute.record_key,data:{...institute.data,capacity:institute.data.capacity-1,
            ...(row.data.policy?{public_policy:row.data.policy}:{}),...(row.data.new_jurisdictions?{jurisdictions:row.data.new_jurisdictions}:{})}});
          if(row.data.personnel_key){
            const personnel=db.getCityRecord(guildId,"personnel",row.data.personnel_key);
            const assigned=db.saveCityRecord(guildId,{...personnel,key:personnel.record_key,data:{...personnel.data,capacity:personnel.data.capacity-1}});
            cityAudit(db,guildId,"personnel_capacity",personnel.record_key,personnel,assigned,"institution_director");
          }
          const ledger=cityAudit(db,guildId,"institution_action",row.record_key,institute,next,"institution_director");
          indexWorldEvent(db,guildId,{key:`institution:${row.record_key}`,kind:row.data.type,title:`${institute.data.name}: ${row.data.type}`,
            source_kind:"mutation",source_id:ledger.id,details:{request_only:true,institution:institute.record_key,reports:row.data.report_keys||[]}},"institution_director");
          return db.saveCityRecord(guildId,{...row,key:row.record_key,status:"completed",data:{...row.data,cycle_key:cycleKey}});
        }));
      }catch(error){
        db.saveCityRecord(guildId,{...row,key:row.record_key,status:"blocked",data:{...row.data,error:error.message}});
        cityAudit(db,guildId,"institution_blocked",row.record_key,row,{error:error.message},"institution_director");
      }
    }
    const source=results[0]?.source_event;
    // Even an empty opportunity gets a durable receipt when an established source is available.
    const fallback=source||db.listWorldEvents(guildId,{includeGM:true,limit:1})[0]?.event_key;
    if(fallback) db.saveCityRecord(guildId,{kind:"cycle",key:receiptKey,source_event:fallback,status:"completed",data:{actions:results.map(row=>row.record_key)}});
    return results;
  });
}
export function establishCommitment(db,guildId,input,actorId){
  cityObject(input);const key=cityKey(input.key),existing=db.getCityRecord(guildId,"commitment",key);
  if(existing&&input.op==="cancel") return db.transaction(()=>{
    const obligation=db.getSimulationRecord(guildId,existing.data.obligation_id);
    if(obligation) db.putSimulationRecord(guildId,{...obligation,kind:"obligation",entityKey:obligation.entity_key,status:"forgiven",data:obligation.data});
    const schedule=db.getCitySchedule(guildId,`commitment:${key}`);
    if(schedule?.status==="scheduled") scheduleCityEvent(db,guildId,{key:schedule.schedule_key,op:"cancel"},actorId);
    const after=db.saveCityRecord(guildId,{...existing,key,status:"cancelled",data:{...existing.data,cancelled_by:actorId}});
    cityAudit(db,guildId,"commitment_cancel",key,existing,after,actorId);return after;
  });
  if(existing) return existing;
  requireCitySource(db,guildId,input.source_event);
  if(!["appointment","promise","social","supernatural"].includes(input.type)) throw new Error("Explicit commitment type required.");
  cityKey(input.terms);cityStrings(input.participants);cityInteger(input.start);cityInteger(input.end);
  if(input.end<=input.start) throw new Error("Commitment must have positive duration.");
  for(const actor of input.participants){
    if(actor.startsWith("character:")){
      const character=db.getCharacter(actor.slice(10));
      if(character?.guild_id!==guildId||!character.owner_user_id||!input.accepted_by?.includes(character.owner_user_id))
        throw new Error("PC commitment needs its owner's explicit acceptance; no inferred consent.");
    }else if(actor.startsWith("npc:")&&!db.getNpcProfile(guildId,actor.slice(4))) throw new Error("NPC participant not found.");
    else if(!actor.startsWith("npc:")&&!actor.startsWith("character:")) throw new Error("Unsupported commitment actor.");
    if(db.overlappingCommitment(guildId,actor,input.start,input.end))
      throw new Error("Conflicting commitment requires explicit cancellation or delegation first.");
  }
  return db.transaction(()=>{
    const obligation=db.putSimulationRecord(guildId,{kind:"obligation",entityKey:input.participants[0],data:{content:input.terms,
      debtor:input.participants[0],creditor:input.participants[1]||"entity:appointment",commitment_type:input.type,accepted_by:input.accepted_by||[]}});
    scheduleCityEvent(db,guildId,{key:`commitment:${key}`,title:input.terms.slice(0,160),due_minute:input.start,invitees:input.participants});
    const after=db.saveCityRecord(guildId,{kind:"commitment",key,source_event:input.source_event,location_key:input.location_key||"",
      data:{...input,obligation_id:obligation.id}});
    cityAudit(db,guildId,"commitment",key,null,after,actorId);return after;
  });
}
export function cityContext(db,guildId,query){
  if(!String(query||"").trim()) return {records:[]};
  const terms=String(query).toLowerCase().match(/[a-z0-9-]{4,}/g)||[];
  const found=new Map();
  for(const term of terms.slice(0,6)) for(const row of db.listCityRecords(guildId,{query:term,includeGM:true,limit:4})) found.set(`${row.kind}:${row.record_key}`,row);
  const records=[];let budget=0;
  for(const row of found.values()){
    const temporal=row.kind==="weather"?{...row,temporal_state:db.getSimulationClock(guildId).minute<row.data.start?"forecast"
      :db.getSimulationClock(guildId).minute<row.data.end?"active":"past"}:row;
    const size=JSON.stringify(temporal).length;if(records.length>=8||budget+size>10000) break;records.push(temporal);budget+=size;
  }
  return {records,authority:"GM_PRIVATE_REFERENCE_NOT_ACTOR_KNOWLEDGE",chars:budget};
}
export function proposeCityOpportunity(db,guildId,query,actorId){
  if(!db.getCityCalendar(guildId).flags.opportunities) return {enabled:false};
  const relevant=cityContext(db,guildId,query).records.filter(row=>row.status==="active"&&row.kind!=="cycle");
  if(relevant.length<2) return {enabled:true,proposals:[]};
  const sources=[...new Set(relevant.map(row=>row.source_event))].sort();
  const key=`opportunity:${sources.join(":").slice(0,130)}`;
  const prior=db.getCityRecord(guildId,"opportunity",key);if(prior) return prior;
  return db.transaction(()=>{
    const after=db.saveCityRecord(guildId,{kind:"opportunity",key,source_event:sources[0],status:"proposed",data:{sources,
      records:relevant.map(row=>({kind:row.kind,key:row.record_key})),options:["Investigate the conjunction","Negotiate with involved actors","Repair or mitigate the established condition"],
      authority:"proposal_only",does_not_define_culprit:true}});
    cityAudit(db,guildId,"city_opportunity",key,null,after,actorId);return after;
  });
}
