/** Validation of the World Director's structured review; never applies native effects. */
import {POST_TURN_REVIEW_CATEGORIES} from './director-cadence.js';

const CATEGORY_OUTPUTS={
  facts_clues:r=>(r.events||[]).some(e=>["fact","clue"].includes(e.type)),
  resources:r=>(r.events||[]).some(e=>e.type==="resource_delta"),
  clocks:r=>(r.events||[]).some(e=>e.type==="clock_delta"),
  threads:r=>(r.events||[]).some(e=>e.type==="thread"),
  references:r=>(r.events||[]).some(e=>["npc_update","location_update"].includes(e.type)),
  relationships:r=>(r.relationships||[]).length>0,
  handouts:r=>(r.handouts||[]).length>0,
  canon:r=>(r.events||[]).some(e=>e.type==="canon"),
  veil_exposure:r=>(r.events||[]).some(e=>e.type==="veil_exposure_delta"),
  npc_cognition:r=>(r.npc_memories||[]).length>0||(r.npc_knowledge||[]).length>0||(r.npc_goals||[]).length>0
};
function reviewFailure(message,diagnostic={}){
  throw Object.assign(new Error(message),{code:"POST_TURN_REVIEW",diagnostic});
}

/** Validate review shape, then derive change flags from the structured mutation bundle. */
export function validatePostTurnStateReview(result){
  const review=result?.state_review;
  if(!review||typeof review!=="object")reviewFailure("GM turn is missing the mandatory post-turn state review.",{reason:"missing_review"});
  for(const category of POST_TURN_REVIEW_CATEGORIES){
    const item=review[category];
    if(!item||!["changed","no_change"].includes(item.decision)||!String(item.reason||"").trim()){
      reviewFailure(`Post-turn state review is incomplete for ${category}.`,{reason:"incomplete",category});
    }
    if(item.confidence!==undefined&&(!Number.isFinite(Number(item.confidence))||Number(item.confidence)<0||Number(item.confidence)>100))
      reviewFailure(`Post-turn state review confidence is invalid for ${category}.`,{reason:"confidence",category});
  }
  const scene=review.scene;
  if(!scene||!["continue","transition"].includes(scene.decision)||!String(scene.reason||"").trim()){
    reviewFailure("Post-turn state review is incomplete for scene continuity.",{reason:"scene_incomplete",category:"scene"});
  }
  if(scene.decision==="transition"&&!String(scene.label||"").trim())
    reviewFailure("Scene transition review requires a new scene label.",{reason:"scene_label",category:"scene"});
  const corrections=[];
  const normalized={...review};
  for(const category of POST_TURN_REVIEW_CATEGORIES){
    const expected=CATEGORY_OUTPUTS[category](result)?"changed":"no_change";
    const item=review[category];
    if(item.decision!==expected)corrections.push({category,from:item.decision,to:expected});
    normalized[category]={...item,decision:expected};
  }
  result.state_review=normalized;
  result.state_review_normalization={version:1,normalized:corrections.length>0,corrections,
    authority:"Derived structured-output review only; never mutation or consequence authority."};
  return {ok:true,review:normalized,normalized:corrections.length>0,corrections};
}
