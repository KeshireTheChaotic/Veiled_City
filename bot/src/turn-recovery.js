/** Field-level recovery keeps safe conversation while consequential invariants remain atomic. */
import { POST_TURN_REVIEW_CATEGORIES } from "./director.js";

const outputs={facts_clues:r=>(r.events||[]).some(e=>["fact","clue"].includes(e.type)),resources:r=>(r.events||[]).some(e=>e.type==="resource_delta"),
  clocks:r=>(r.events||[]).some(e=>e.type==="clock_delta"),threads:r=>(r.events||[]).some(e=>e.type==="thread"),
  references:r=>(r.events||[]).some(e=>["npc_update","location_update"].includes(e.type)),relationships:r=>(r.relationships||[]).length>0,
  handouts:r=>(r.handouts||[]).length>0,canon:r=>(r.events||[]).some(e=>e.type==="canon"),
  veil_exposure:r=>(r.events||[]).some(e=>e.type==="veil_exposure_delta"),
  npc_cognition:r=>(r.npc_memories||[]).length>0||(r.npc_knowledge||[]).length>0||(r.npc_goals||[]).length>0};

export function recoverOptionalTurnFields(result,error){
  if(!result||!["NARRATIVE_CONTEXT","AUTONOMOUS_WORLD","POST_TURN_REVIEW"].includes(error?.code))return null;
  const copy=structuredClone(result),quarantined=[];
  if(error.code==="NARRATIVE_CONTEXT"){copy.narrative_interpretation=null;quarantined.push("narrative_interpretation");}
  if(error.code==="AUTONOMOUS_WORLD"){
    // A world proposal is optional only when no committed material claim depends on it.
    if((copy.narrative_claims||[]).some(claim=>claim.certainty==="committed"))return null;
    for(const field of ["world_additions","scene_actions","world_conflicts"]){if(copy[field]?.length)quarantined.push(field);copy[field]=[];}
  }
  if(error.code==="POST_TURN_REVIEW"&&copy.state_review){
    for(const category of POST_TURN_REVIEW_CATEGORIES){
      const item=copy.state_review[category];if(!item)continue;
      const expected=outputs[category](copy)?"changed":"no_change";
      if(item.decision!==expected){copy.state_review[category]={...item,decision:expected,
        reason:`Native output reconciliation: ${expected}. ${String(item.reason||"").trim()}`.trim(),confidence:100};quarantined.push(`state_review.${category}`);}
    }
  }
  return quarantined.length?{result:copy,quarantined}:null;
}
