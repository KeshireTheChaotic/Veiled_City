/** Civic interdependencies: sourced claims, bounded service propagation, subjective social layers and source-linked history. */
import { cityObject, cityKey, cityInteger, cityAudit, indexWorldEvent } from "./city-calendar.js";
import { requireCitySource, requireCityRecord, cityStrings, INSTITUTION_ACTIONS } from "./city-core.js";
import { activeCityProxy } from "./city-constraints.js";
import {worldNpcEvidence} from "./frameworks/world/public.js";
const {actorSource}=worldNpcEvidence;
import { validateServiceAccess } from "./supply-dependencies.js";

export const CIVIC_KINDS=["property","infrastructure","service_access","routine","community","identity","reputation","weather","personnel","history"];

function knownBy(db,guildId,type,key,information){
  if(type==="npc"){
    const known=db.getNpcKnowledge(guildId,key,information);
    if(!known||known.belief_state==="unknown") throw new Error("Source NPC does not know this information.");
    return {content:known.content,confidence:known.confidence,belief_state:known.belief_state,origin:`npc:${key}`,distortion:0};
  }
  if(type==="institution"){
    const row=requireCityRecord(db,guildId,"report",information);
    if(row.actor_key!==key) throw new Error("Institution has not received that report.");
    return {...row.data,origin:row.data.origin||`npc:${row.data.from_key}`,distortion:row.data.distortion||0};
  }
  if(["community","audience"].includes(type)){
    const row=requireCityRecord(db,guildId,"message",information);
    if(row.actor_key!==`${type}:${key}`) throw new Error("Group has not received that information.");
    return row.data;
  }
  throw new Error("Unsupported knowledge holder.");
}
function validateCivic(db,guildId,kind,data,key){
  cityObject(data);
  const allowed={
    property:["location","claim_type","claimant","terms","validity","domain","established_terms"],
    infrastructure:["name","service","native_condition","effective_condition","operator","locations","repair_requirements","redundancy"],
    service_access:["consumer_type","consumer_key","service_key","actions","threshold","access"],
    routine:["npc","residence","occupation","intervals","projects"],
    community:["name","capacity","members","priorities","shared_history","district"],
    identity:["alias","subject_key","subject_type","observer_type","observer","information_key"],
    reputation:["observer","observer_type","identity","dimensions"],
    weather:["district","start","end","description","supernatural_disaster","environment_key"],
    personnel:["institution","npc","role","capacity","actions","dissent_actions","status"],
    history:["title","summary","preserves_contradictions","source_events","authority"]
  };
  if(Object.keys(data).some(field=>field!=="major"&&!allowed[kind]?.includes(field))) throw new Error("Unsupported typed civic field; no player mechanics are accepted.");
  if(kind==="service_access"){
    validateServiceAccess(db,guildId,data);
  }else if(kind==="property"){
    location(db,guildId,data.location);
    if(!["deed","lease","lien","possession","access","threshold","territorial"].includes(data.claim_type)) throw new Error("Invalid property claim type.");
    cityKey(data.claimant);cityKey(data.terms);
    if(!["claimed","valid","disputed","expired"].includes(data.validity)) throw new Error("Claim validity must be explicit.");
    if(!["mundane","metaphysical"].includes(data.domain)) throw new Error("Mundane and metaphysical claims must remain distinct.");
    if(["threshold","territorial"].includes(data.claim_type)&&data.domain!=="metaphysical") throw new Error("Threshold/territorial claims are metaphysical, not mundane title.");
    if(data.domain==="metaphysical"&&data.established_terms!==true) throw new Error("Meaningful supernatural terms must already be established.");
  }else if(kind==="infrastructure"){
    cityKey(data.name);cityKey(data.service);cityInteger(data.native_condition,0,100);
    if(!["all","any"].includes(data.redundancy||"all")) throw new Error("Invalid service redundancy.");
    requireCityRecord(db,guildId,"institution",data.operator);
    for(const key of cityStrings(data.locations)) location(db,guildId,key);
    cityStrings(data.repair_requirements||[]);
  }else if(kind==="routine"){
    if(!db.getNpcProfile(guildId,data.npc)) throw new Error("Routine NPC not found.");
    location(db,guildId,data.residence);cityKey(data.occupation);
    if(!Array.isArray(data.intervals)||data.intervals.length>20) throw new Error("Bounded routine intervals required.");
    for(const slot of data.intervals){cityInteger(slot.start);cityInteger(slot.end);if(slot.end<=slot.start) throw new Error("Invalid routine interval.");location(db,guildId,slot.location);}
    cityStrings(data.projects||[]);
  }else if(kind==="community"){
    cityKey(data.name);cityInteger(data.capacity,0,100);cityStrings(data.members);cityStrings(data.priorities||[]);cityStrings(data.shared_history||[]);
    for(const npc of data.members) if(!db.getNpcProfile(guildId,npc)) throw new Error("Community membership needs an established NPC.");
    if(data.district) requireCityRecord(db,guildId,"district",data.district);
  }else if(kind==="identity"){
    cityKey(data.alias);cityKey(data.subject_key);
    if(data.subject_type==="npc"&&!db.getNpcProfile(guildId,data.subject_key)) throw new Error("Identity NPC not found.");
    else if(data.subject_type==="character"&&db.getCharacter(data.subject_key)?.guild_id!==guildId) throw new Error("Identity PC not found.");
    else if(!["npc","character"].includes(data.subject_type)) throw new Error("Invalid identity subject.");
    knownBy(db,guildId,data.observer_type,data.observer,data.information_key);
  }else if(kind==="reputation"){
    cityKey(data.observer);cityKey(data.identity);
    if(!["npc","institution","community","audience"].includes(data.observer_type)) throw new Error("Invalid reputation observer.");
    cityObject(data.dimensions);
    for(const [dimension,score] of Object.entries(data.dimensions)){
      if(!["trust","fear","respect","suspicion"].includes(dimension)) throw new Error("Use existing directional relationship dimensions.");
      cityInteger(score,-5,5);
    }
  }else if(kind==="weather"){
    requireCityRecord(db,guildId,"district",data.district);cityInteger(data.start);cityInteger(data.end);
    if(data.end<=data.start) throw new Error("Weather needs an explicit fictional interval.");
    cityKey(data.description);
    if(data.pc_damage!==undefined||data.modifier!==undefined) throw new Error("Weather cannot invent PC damage or modifiers.");
  }else if(kind==="personnel"){
    const institution=requireCityRecord(db,guildId,"institution",data.institution);
    if(!db.getNpcProfile(guildId,data.npc)) throw new Error("Personnel NPC not found.");
    cityKey(data.role);cityInteger(data.capacity,0,100);cityStrings(data.actions);cityStrings(data.dissent_actions||[]);
    if(data.actions.some(type=>!INSTITUTION_ACTIONS.includes(type)||!institution.data.procedures.includes(type))) throw new Error("Delegation exceeds established institutional procedures.");
  }else if(kind==="history"){
    cityKey(data.title);
    if(typeof data.summary!=="string"||data.summary.length>5000||data.preserves_contradictions!==true) throw new Error("Source-linked bounded summary must preserve contradictions.");
    if(!cityStrings(data.source_events).length) throw new Error("History must cite original events.");
    for(const event of data.source_events) if(!db.getWorldEvent(guildId,event)) throw new Error("Historical source event not found.");
  }else throw new Error("Unsupported civic kind.");
}
function needsReview(kind,data,before){
  return data.major===true||(kind==="weather"&&data.supernatural_disaster===true)
    ||(kind==="personnel"&&(data.status==="removed"||data.actions.some(type=>["issue_policy","seek_warrant","relocate_staff"].includes(type))
      ||(before&&data.role!==before.data.role)));
}
function writeCivic(db,guildId,input,actorId,reviewed=false){
  const kind=input.kind,key=cityKey(input.key),before=db.getCityRecord(guildId,kind,key);
  requireCitySource(db,guildId,input.source_event);
  const data={...before?.data,...cityObject(input.data)};validateCivic(db,guildId,kind,data,key);
  if(kind==="infrastructure"&&before&&data.native_condition!==before.data.native_condition)
    throw new Error("Use the service consequence operation for established infrastructure changes.");
  if(needsReview(kind,data,before)&&!reviewed) return queueCivicChange(db,guildId,{...input,data},actorId);
  const after=db.saveCityRecord(guildId,{kind,key,source_event:input.source_event,location_key:data.location||"",district_key:data.district||"",
    actor_key:kind==="service_access"?`${data.consumer_type}:${data.consumer_key}`:data.npc||data.observer||data.operator||key,status:data.status==="removed"?"removed":"active",
    data:{...data,...(kind==="infrastructure"?{effective_condition:before?.data.effective_condition??data.native_condition}:{}),...(kind==="history"?{authority:"summary_only"}:{})}});
  if(kind==="reputation") for(const [dimension,score] of Object.entries(data.dimensions)){
    db.upsertRelationship(guildId,{fromType:"entity",fromKey:`${data.observer_type}:${data.observer}`,fromLabel:data.observer,
      toType:"entity",toKey:`identity:${data.identity}`,toLabel:data.identity,relationshipType:dimension,score,visibility:"gm",note:"External observer belief; not PC feelings.",source:"city_reputation"});
  }
  cityAudit(db,guildId,`civic_${kind}`,key,before,after,actorId);
  if(kind==="infrastructure") recalculateInfrastructure(db,guildId,input.source_event);
  return db.getCityRecord(guildId,kind,key);
}
export function updateCityCivic(db,guildId,input,actorId){
  cityObject(input);return db.transaction(()=>writeCivic(db,guildId,input,actorId));
}





export function reviewCivicChange(db,guildId,input,actorId){
  const before=db.getCityRecord(guildId,"change",input.key);
  if(!before||!["pending","deferred"].includes(before.status)) throw new Error("Pending civic change not found.");
  if(!["approve","modify","defer","reject"].includes(input.decision)) throw new Error("Invalid civic review decision.");
  return db.transaction(()=>{
    const intent={...before.data.intent,...(input.decision==="modify"?cityObject(input.patch):{})};
    if(["approve","modify"].includes(input.decision)){
      if(intent.kind==="service") changeCityService(db,guildId,intent,actorId,true);
      else if(intent.kind==="connect") connectCity(db,guildId,{...intent,kind:intent.edge_kind},actorId,true);
      else writeCivic(db,guildId,intent,actorId,true);
    }
    const after=db.saveCityRecord(guildId,{...before,key:before.record_key,status:input.decision==="defer"?"deferred":input.decision==="reject"?"rejected":"completed",
      data:{intent,reviews:[...before.data.reviews,{decision:input.decision,actor:actorId}]}});
    cityAudit(db,guildId,"civic_review",input.key,before,after,actorId);return after;
  });
}
export function transmitCityBelief(db,guildId,input,actorId){
  if(input?.op==="attempt") return attemptCityInfluence(db,guildId,input,actorId);
  cityObject(input);requireCitySource(db,guildId,input.source_event);const key=cityKey(input.key);
  const prior=db.getCityRecord(guildId,"transmission",key);if(prior) return prior;
  const from=`${input.from_type}:${input.from_key}`,to=`${input.to_type}:${input.to_key}`;
  if(input.authorized!==true||!db.cityEdges(guildId,"channel").some(edge=>edge.from_key===from&&edge.to_key===to)) throw new Error("Authorized established communication channel required.");
  const proxy=input.from_type==="npc"?activeCityProxy(db,guildId,input.from_key):null;
  if(proxy&&input.proxy_consent_by!==proxy.discord_user_id) throw new Error("Human proxy consent is required to send this report.");
  const known=knownBy(db,guildId,input.from_type,input.from_key,input.information_key);
  const community=input.from_type==="community"?requireCityRecord(db,guildId,"community",input.from_key):null;
  if(community&&community.data.capacity<1) throw new Error("Community has no remaining communication capacity.");
  const delta=cityInteger(input.distortion??0,0,20),confidence=Math.max(0,Math.min(known.confidence,100)-delta);
  const data={...known,confidence,distortion:(known.distortion||0)+delta,from,to,mechanism:cityKey(input.mechanism),subjective:true,
    belief_state:known.belief_state==="known"?"suspected":known.belief_state,source_record:input.information_key};
  if(input.to_type==="institution") requireCityRecord(db,guildId,"institution",input.to_key);
  else if(input.to_type==="community") requireCityRecord(db,guildId,"community",input.to_key);
  else if(input.to_type==="npc"){if(!db.getNpcProfile(guildId,input.to_key)) throw new Error("Recipient NPC not found.");}
  else if(input.to_type!=="audience") throw new Error("Unsupported report recipient.");
  return db.transaction(()=>{
    if(community){
      const next=db.saveCityRecord(guildId,{...community,key:community.record_key,data:{...community.data,capacity:community.data.capacity-1}});
      cityAudit(db,guildId,"community_capacity",community.record_key,community,next,actorId);
    }
    if(input.to_type==="npc") db.upsertNpcKnowledge(guildId,{npcKey:input.to_key,knowledgeKey:`city:${key}`,content:data.content,
      beliefState:"rumor",confidence,sourceType:"told_by_npc",sourceRef:key,isSecret:true});
    else db.saveCityRecord(guildId,{kind:input.to_type==="institution"?"report":"message",key,actor_key:input.to_type==="institution"?input.to_key:to,
      source_event:input.source_event,data});
    const after=db.saveCityRecord(guildId,{kind:"transmission",key,actor_key:from,source_event:input.source_event,data});
    cityAudit(db,guildId,"belief_transmission",key,null,after,actorId);return after;
  });
}
/** Influence extends real transmissions after an already resolved native action; no second resource charge or truth promotion. */
export function attemptCityInfluence(db,guild,input,actor){
  cityObject(input);
  if(db.getCityCalendar(guild).flags.audience_influence!==true) throw new Error("Audience influence is opt-in.");
  if(Object.keys(input).some(key=>!["op","key","source_event","from_key","to_type","to_key","information_key","mechanism","action_id","response","interpretation","prior_key","dissent"].includes(key)))
    throw new Error("Closed influence attempt required; no caller authority, PC penalties or canon fields.");
  const key=cityKey(input.key),prior=db.getCityRecord(guild,"transmission",key);if(prior) return prior;
  const owned=actorSource(db,guild,{actor_type:"npc",actor_key:input.from_key,information_key:input.information_key,source_event:input.source_event},{requireResources:false});
  const action=db.getSimulationRecord(guild,input.action_id),target=`${input.to_type}:${input.to_key}`;
  if(!action||action.kind!=="action"||!["completed","failed"].includes(action.status)||action.data.actor_type!=="npc"||action.data.actor_key!==input.from_key
    ||action.data.target_type!==input.to_type
    ||!["contact","negotiate","spread_rumor","suppress_rumor"].includes(action.data.type)||![input.to_key,target].includes(action.data.target_key)
    ||action.data.information_key!==input.information_key||action.data.result?.resource_cost?.influence!==1)
    throw new Error("Matching legitimately resolved native influence/contact action and its actual resource cost required.");
  if(action.data.result.information_source?.source_ref!==owned.evidence.source_ref||action.data.result.information_source?.content!==owned.evidence.content)
    throw new Error("Native action evidence changed or predates source capture; resolve a fresh legitimate opportunity.");
  if(!["institution","community","audience"].includes(input.to_type)||!db.cityEdges(guild,"channel").some(edge=>edge.from_key===`npc:${input.from_key}`&&edge.to_key===target))
    throw new Error("Established audience/institution access channel required.");
  const recipient=input.to_type!=="audience"?requireCityRecord(db,guild,input.to_type,input.to_key):null;
  if(input.to_type==="audience"&&(!["party","public"].includes(owned.event.visibility)||owned.evidence.is_secret))
    throw new Error("Public-facing influence cannot disclose hidden source evidence.");
  if(!["accept","refuse","correct"].includes(input.response)||typeof input.interpretation!=="string"||!input.interpretation.trim()||input.interpretation.length>600)
    throw new Error("Human-reviewed bounded audience response required.");
  const dissent=cityStrings(input.dissent||[],8);
  for(const officer of dissent) if(input.to_type!=="institution"||requireCityRecord(db,guild,"personnel",officer).data.institution!==input.to_key)
    throw new Error("Dissent must belong to actual personnel of this institution.");
  if(input.response==="correct"){
    const old=db.getCityRecord(guild,input.to_type==="institution"?"report":"message",input.prior_key);
    if(!old||old.actor_key!==(input.to_type==="institution"?input.to_key:target)) throw new Error("Correction requires this audience's own prior report, not another audience's hidden knowledge.");
  }
  if(db.getCityRecord(guild,"influence_action",action.id)) throw new Error("This native influence action has already been used.");
  cityKey(input.mechanism);
  return db.transaction(()=>{
    const capacityRefusal=recipient&&recipient.data.capacity<1;
    const response=action.data.result.success?(capacityRefusal?"refuse":input.response):"failed";
    const transmitted=["accept","correct"].includes(response)?transmitCityBelief(db,guild,{key,source_event:input.source_event,from_type:"npc",from_key:input.from_key,
      to_type:input.to_type,to_key:input.to_key,information_key:input.information_key,mechanism:input.mechanism,authorized:true,distortion:0},actor):null;
    const data={...(transmitted?.data||{}),action_id:action.id,from:`npc:${input.from_key}`,to:target,mechanism:input.mechanism,
      response,interpretation:input.interpretation,dissent,prior_key:input.prior_key||null,subjective:true,truth_status:"unverified",
      outcome_reason:capacityRefusal?"Recipient has no established capacity":action.data.result.success?"Explicit human-reviewed audience response":"Native attempt did not succeed",
      credibility:owned.evidence.confidence,resources:"Already charged by native action; no additional spend.",authority:"Audience response is not canon, guilt or a PC modifier."};
    const after=db.saveCityRecord(guild,{kind:"transmission",key,status:response==="refuse"?"refused":response==="failed"?"failed":"active",
      source_event:input.source_event,actor_key:`npc:${input.from_key}`,data});
    if(transmitted){const receiver=db.getCityRecord(guild,input.to_type==="institution"?"report":"message",key);
      db.saveCityRecord(guild,{...receiver,key,data:{...receiver.data,interpretation:input.interpretation,dissent,prior_key:input.prior_key||null}});}
    db.saveCityRecord(guild,{kind:"influence_action",key:action.id,source_event:input.source_event,data:{transmission:key}});
    cityAudit(db,guild,"influence_response",key,null,after,actor);return after;
  });
}
export {historyContext} from './frameworks/world/public.js';
/** Successful NPC repairs/sabotage affect only explicitly linked small service networks; major changes remain GM-reviewed. */


import {requireWorldLocation as location,queueCivicChange,connectCity,recalculateInfrastructure,changeCityService,applyNpcServiceOutcome} from './frameworks/world/public.js';
export {connectCity,changeCityService,applyNpcServiceOutcome} from './frameworks/world/public.js';
