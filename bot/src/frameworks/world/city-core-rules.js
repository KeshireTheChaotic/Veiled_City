/** World civic records and institutional request execution; actor control/delegation/service/source peers are explicit. */
import {cityObject,cityKey,cityInteger,cityAudit,indexWorldEvent} from './city-calendar.js';
import {requireCitySource,cityStrings,requireCityRecord} from './city-source.js';
export const INSTITUTION_ACTIONS=["document_request","file_case","interview_request","inspect_request","issue_policy",
  "allocate_resources","negotiate_request","publish_finding","relocate_staff","seek_warrant"];
export function createCityCoreRules({capabilities}){
const {assertInstitutionDelegation,assertWorldActorControl,assertServiceAccess,nativeWorldOperationAllows,nativeWorldStrategyStepAllowed}=capabilities||{};
if([assertInstitutionDelegation,assertWorldActorControl,assertServiceAccess,nativeWorldOperationAllows,nativeWorldStrategyStepAllowed].some(fn=>typeof fn!=='function'))throw new TypeError('World institutional source capabilities required');
function updateCityCore(db,guildId,input,actorId="human_gm"){
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
function assignDistrictLocation(db,guildId,input,actorId){
  requireCityRecord(db,guildId,"district",input.district);requireCitySource(db,guildId,input.source_event);
  if(!db.getSimulationEntity(guildId,"location",input.location)) throw new Error("Established simulation location is required.");
  return db.transaction(()=>{
    db.setDistrictLocation(guildId,input.location,input.district,input.source_event);
    const after=db.districtLocations(guildId,input.district);
    cityAudit(db,guildId,"district_membership",input.location,null,after,actorId);return after;
  });
}
function addWorldLink(db,guildId,input,actorId){
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
function inspectInstitutionAction(db,guildId,key){
  const row=requireCityRecord(db,guildId,"action",key),institution=validateInstitutionAction(db,guildId,row.data);
  return {action_id:key,status:row.status,capacity:institution.data.capacity,review_required:row.data.major===true&&!row.data.approved_by,
    authority:"diagnostic_only_no_capacity_spending"};
}
function submitInstitutionAction(db,guildId,input,actorId="human_gm"){
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
function reviewInstitutionAction(db,guildId,input,actorId){
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
function executeInstitutionAction(db,guildId,key,{cycleKey='native',nativeAuthority=null,nativePayload=null}={}){
  return db.transaction(()=>{
    const row=db.getCityRecord(guildId,'action',key);
    if(!row)throw new Error('Established institutional action required.');
    if(row.status==='completed')return row;
    const native=!!nativeAuthority&&nativeWorldOperationAllows(db,guildId,nativeAuthority,'institution','act',{...nativePayload,key});
    const plan=row.data.strategy_key&&db.getCityRecord(guildId,'strategy',row.data.strategy_key),
      planned=!!plan&&nativeWorldStrategyStepAllowed(db,guildId,plan,row.data);
    if(nativeAuthority&&!native||db.isDirectorPaused(guildId)
      ||!db.getCityCalendar(guildId).flags.institutions&&!native&&!planned)throw new Error('Current native institutional execution authority required.');
    if(!['proposed','pending'].includes(row.status)||row.data.major&&!row.data.approved_by&&!native)
      throw new Error('Institutional action needs its actual native approval or existing human review.');
    const institute=validateInstitutionAction(db,guildId,row.data);
    const next=db.saveCityRecord(guildId,{...institute,key:institute.record_key,data:{...institute.data,capacity:institute.data.capacity-1,
      ...(row.data.policy?{public_policy:row.data.policy}:{}),...(row.data.new_jurisdictions?{jurisdictions:row.data.new_jurisdictions}:{})}});
    if(row.data.personnel_key){
      const personnel=db.getCityRecord(guildId,'personnel',row.data.personnel_key),assigned=db.saveCityRecord(guildId,{...personnel,
        key:personnel.record_key,data:{...personnel.data,capacity:personnel.data.capacity-1}});
      cityAudit(db,guildId,'personnel_capacity',personnel.record_key,personnel,assigned,'institution_director');
    }
    const ledger=cityAudit(db,guildId,'institution_action',row.record_key,institute,next,'institution_director');
    indexWorldEvent(db,guildId,{key:`institution:${row.record_key}`,kind:row.data.type,title:`${institute.data.name}: ${row.data.type}`,
      source_kind:'mutation',source_id:ledger.id,details:{request_only:true,institution:institute.record_key,reports:row.data.report_keys||[]}},'institution_director');
    return db.saveCityRecord(guildId,{...row,key:row.record_key,status:'completed',data:{...row.data,cycle_key:cycleKey,
      ...(native?{native_review:'source_validated_institutional_request'}:{})}});
  });
}
function runInstitutionDirector(db,guildId,cycleKey){
  if(db.isDirectorPaused(guildId)) return [];
  const receiptKey=`institution-cycle:${cycleKey}`;
  if(db.getCityRecord(guildId,"cycle",receiptKey)) return [];
  return db.transaction(()=>{
    const results=[];
    for(const row of db.listCityRecords(guildId,{kind:"action",status:"proposed",includeGM:true,limit:2})){
      if(!db.getCityCalendar(guildId).flags.institutions){
        const plan=row.data.strategy_key&&db.getCityRecord(guildId,'strategy',row.data.strategy_key);
        if(!plan||!nativeWorldStrategyStepAllowed(db,guildId,plan,row.data))continue;
      }
      try{
        results.push(executeInstitutionAction(db,guildId,row.record_key,{cycleKey}));
      }catch(error){
        db.saveCityRecord(guildId,{...row,key:row.record_key,status:"blocked",data:{...row.data,error:error.message}});
        cityAudit(db,guildId,"institution_blocked",row.record_key,row,{error:error.message},"institution_director");
      }
    }
    const source=results[0]?.source_event;
    if(source) db.saveCityRecord(guildId,{kind:"cycle",key:receiptKey,source_event:source,status:"completed",data:{actions:results.map(row=>row.record_key)}});
    return results;
  });
}
function fields(data,allowed){
  if(Object.keys(data).some(key=>!allowed.includes(key))) throw new Error("Unsupported civic state field.");
}
function validateInstitutionAction(db,guildId,input){
  assertWorldActorControl(db,guildId,'institution',input.institution);
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
  assertServiceAccess(db,guildId,{actor_type:"institution",actor_key:input.institution,type:input.type,location_key:input.target_type==="location"?input.target_key:""});
  return institution;
}
return Object.freeze({updateCityCore,assignDistrictLocation,addWorldLink,inspectInstitutionAction,submitInstitutionAction,reviewInstitutionAction,executeInstitutionAction,runInstitutionDirector});
}
