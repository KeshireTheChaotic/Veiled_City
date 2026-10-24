/** Civic domain validation and institutional knowledge firewall. All descriptors are non-player simulation, never mechanical modifiers. */
import { cityObject, cityKey, cityInteger, cityAudit, indexWorldEvent, scheduleCityEvent } from "./city-calendar.js";
import { assertInstitutionDelegation, activeCityProxy, assertWorldActorControl } from "./city-constraints.js";
import { EXPANSION_FEATURES } from "./expansion-contracts.js";
import { assertServiceAccess } from "./supply-dependencies.js";
import { hasOwnerConsent } from "./owner-consent.js";
import {nativeWorldOperationAllows,nativeWorldStrategyStepAllowed} from './native-world-operations.js';






export function updateCityCore(...args){return core().updateCityCore(...args);}
export function assignDistrictLocation(...args){return core().assignDistrictLocation(...args);}
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
export function addWorldLink(...args){return core().addWorldLink(...args);}

export function inspectInstitutionAction(...args){return core().inspectInstitutionAction(...args);}
export function submitInstitutionAction(...args){return core().submitInstitutionAction(...args);}
export function reviewInstitutionAction(...args){return core().reviewInstitutionAction(...args);}
export const CITY_FEATURE_FLAGS=Object.freeze(["institutions","opportunities","economy","minor_npcs","adaptive_context","conversations","pacing","negotiations","voice_direction","authoring",
    "autonomous_pvp_fear",
    "pvp_private_ui",
    "gm_discretion",
    "scoped_disclosure_recovery","scene_descriptions","post_projection_answers","playable_narration",
    "narrative_authority","narrative_memory","narrative_camera","narrative_encounters","narrative_salience","narrative_completeness",
    ...Object.keys(EXPANSION_FEATURES)]);
export function configureCityFlags(db,guildId,input,actorId){
  cityObject(input);
  if(Object.keys(input).some(key=>!CITY_FEATURE_FLAGS.includes(key)||typeof input[key]!=="boolean")) throw new Error("Unknown city feature flag.");
  return db.transaction(()=>{
    const before=db.getCityCalendar(guildId),flags={...before.flags,...input};
    const subordinate=['narrative_memory','narrative_camera','narrative_encounters','narrative_salience','narrative_completeness'];
    if(input.playable_narration===false)flags.narrative_authority=false;
    if(flags.narrative_authority===false)for(const key of subordinate)flags[key]=false;
    if(input.narrative_memory===false)flags.narrative_salience=false;
    if(flags.narrative_authority&&(!flags.playable_narration||!flags.scene_continuity)
      ||subordinate.some(key=>flags[key]&&!flags.narrative_authority)||flags.narrative_salience&&!flags.narrative_memory)
      throw new Error('Narrative flags require authority + playable narration + scene continuity; salience also requires narrative memory.');
    const after=db.setCityCalendar(guildId,{...before,flags});
    cityAudit(db,guildId,"city_flags",guildId,before,after,actorId);return after;
  });
}
/** Deterministic bounded Institution Director: validated queued intent, no new per-actor LLM calls. */
export function executeInstitutionAction(...args){return core().executeInstitutionAction(...args);}
export function runInstitutionDirector(...args){return core().runInstitutionDirector(...args);}
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
  if(input.op==="cancel"){
    const offer=db.getCityRecord(guildId,"commitment_offer",key);
    if(!offer) throw new Error("Commitment or invitation not found.");
    return db.transaction(()=>{const after=db.saveCityRecord(guildId,{...offer,key,status:"cancelled"});cityAudit(db,guildId,"commitment_offer_cancel",key,offer,after,actorId);return after;});
  }
  requireCitySource(db,guildId,input.source_event);
  if(!["appointment","promise","social","supernatural"].includes(input.type)) throw new Error("Explicit commitment type required.");
  cityKey(input.terms);cityStrings(input.participants);cityInteger(input.start);cityInteger(input.end);
  if(input.end<=input.start) throw new Error("Commitment must have positive duration.");
  let consentOffer=null;
  if(db.getCityCalendar(guildId).flags.natural_language===true&&input.participants.some(actor=>actor.startsWith("character:"))){
    if(Object.keys(input).some(field=>!["key","source_event","type","terms","participants","start","end","location_key","accepted_by","op"].includes(field)))
      throw new Error("Closed meeting terms required; no hidden effects or caller-owned consent.");
    for(const actor of input.participants){
      if(actor.startsWith("character:")?db.getCharacter(actor.slice(10))?.guild_id!==guildId:!actor.startsWith("npc:")||!db.getNpcProfile(guildId,actor.slice(4)))
        throw new Error("Actual established invitation participants required.");
      if(actor.startsWith("npc:")&&activeCityProxy(db,guildId,actor.slice(4))) throw new Error("Human-proxied NPC requires its own authored review; meeting remains uncommitted.");
    }
    const proposal=Object.fromEntries(["key","source_event","type","terms","participants","start","end","location_key"].filter(field=>input[field]!==undefined).map(field=>[field,input[field]]));
    consentOffer=db.getCityRecord(guildId,"commitment_offer",key);
    if(!consentOffer) return db.transaction(()=>{
      const after=db.saveCityRecord(guildId,{kind:"commitment_offer",key,status:"pending",source_event:input.source_event,
        data:{proposal,authority:"Nonbinding invitation; actual current owner receipts required, never arrival or spending."}});
      cityAudit(db,guildId,"commitment_offer",key,null,after,actorId);return after;
    });
    if(consentOffer.status!=="pending"||JSON.stringify(consentOffer.data.proposal)!==JSON.stringify(proposal)) throw new Error("Invitation closed or terms changed; propose fresh terms under a new key.");
    const verified=[];
    for(const actor of input.participants.filter(value=>value.startsWith("character:"))){
      const pc=db.getCharacter(actor.slice(10));if(!hasOwnerConsent(db,guildId,consentOffer,pc.id,pc.owner_user_id))
        throw new Error("Every current actual owner must authorize the exact invitation terms/revision; supplied accepted_by cannot bind PCs.");
      verified.push(pc.owner_user_id);
    }
    input={...input,accepted_by:verified};
  }
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
    if(consentOffer) db.saveCityRecord(guildId,{...consentOffer,key,status:"accepted",data:{...consentOffer.data,reviewed_by:actorId,commitment:key}});
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
    if(row.kind.startsWith("pvp_")||["character_visible_fact","character_perception_receipt","world_visible_fact","unsupported_action","gm_action_ruling","gm_action_review_receipt","owner_action_terminal"].includes(row.kind))continue;
    if(["action_continuation","action_continuation_signal","native_notice","roll_publication","roll_party_publication","publication_reconciliation","roll_share_preview","roll_menu_token","roll_option_registry","pvp_ui_token","pvp_ui_delivery"].includes(row.kind)
      ||row.kind==="compound_action"&&row.visibility==="character")continue;
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

import {createCityCoreRules,INSTITUTION_ACTIONS,requireCitySource,cityStrings,requireCityRecord} from './frameworks/world/public.js';
export {INSTITUTION_ACTIONS,requireCitySource,cityStrings,requireCityRecord} from './frameworks/world/public.js';
let worldCore;
function core(){return worldCore??=createCityCoreRules({capabilities:{assertInstitutionDelegation:(...args)=>assertInstitutionDelegation(...args),assertWorldActorControl:(...args)=>assertWorldActorControl(...args),assertServiceAccess:(...args)=>assertServiceAccess(...args),nativeWorldOperationAllows:(...args)=>nativeWorldOperationAllows(...args),nativeWorldStrategyStepAllowed:(...args)=>nativeWorldStrategyStepAllowed(...args)}});}
