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
export function establishCommitment(...args){return commitments().establishCommitment(...args);}
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

import {createWorldCommitments} from './frameworks/world/public.js';
let worldCommitments;
function commitments(){return worldCommitments??=createWorldCommitments({hasOwnerConsent:(...args)=>hasOwnerConsent(...args),activeCityProxy:(...args)=>activeCityProxy(...args)});}
