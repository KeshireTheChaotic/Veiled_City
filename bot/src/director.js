/** Autonomous world-director cadence and blocked-action reporting helpers. Real-world elapsed time never advances campaign state. */
export const POST_TURN_REVIEW_CATEGORIES=[
  "facts_clues","resources","clocks","threads","references","relationships","handouts","canon","veil_exposure","npc_cognition"
];

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

/** Validate that narrated state changes and structured mutations agree. */
export function validatePostTurnStateReview(result){
  const review=result?.state_review;
  if(!review||typeof review!=="object") throw new Error("GM turn is missing the mandatory post-turn state review.");
  for(const category of POST_TURN_REVIEW_CATEGORIES){
    const item=review[category];
    if(!item||!["changed","no_change"].includes(item.decision)||!String(item.reason||"").trim()){
      throw new Error(`Post-turn state review is incomplete for ${category}.`);
    }
    if(item.confidence!==undefined && (!Number.isFinite(Number(item.confidence))||Number(item.confidence)<0||Number(item.confidence)>100)) throw new Error(`Post-turn state review confidence is invalid for ${category}.`);
    if(item.decision==="changed" && Number(item.confidence??100)<55) throw new Error(`Post-turn review marked ${category} changed at confidence ${item.confidence}%; ambiguous changes below 55% must remain no_change for human GM review.`);
    const hasOutput=CATEGORY_OUTPUTS[category](result);
    if(hasOutput&&item.decision!=="changed") throw new Error(`Post-turn review says ${category}=no_change but emitted a corresponding state mutation.`);
    if(!hasOutput&&item.decision!=="no_change") throw new Error(`Post-turn review says ${category}=changed but emitted no corresponding state mutation.`);
  }
  const scene=review.scene;
  if(!scene||!["continue","transition"].includes(scene.decision)||!String(scene.reason||"").trim()){
    throw new Error("Post-turn state review is incomplete for scene continuity.");
  }
  if(scene.decision==="transition"&&!String(scene.label||"").trim()) throw new Error("Scene transition review requires a new scene label.");
  return true;
}

export function eligibleRoundUsers(db,sessionId){
  const activePresence=new Set(["present","guest","late"]);
  const users=new Set(
    db.roster(sessionId)
      .filter(r=>activePresence.has(r.presence)&&r.character_id)
      .map(r=>String(r.discord_user_id))
  );
  const roster=db.roster(sessionId);
  const activeUsers=new Set(roster.filter(r=>activePresence.has(r.presence)).map(r=>String(r.discord_user_id)));
  for(const p of db.listNpcProxies(sessionId,{statuses:["active"]})||[]) if(activeUsers.has(String(p.discord_user_id))) users.add(String(p.discord_user_id));
  return [...users];
}

/** Queue the next durable world-director pass after a resolved party turn. */
export function queueDirectorAfterPartyTurn(db,session,userId,stateReview){
  if(!session?.id) return null;
  const existing=db.getPendingDirectorPass(session.id);
  const scene=stateReview?.scene;
  if(scene?.decision==="transition"){
    const replacement={layer:"scene",scene_label:String(scene.label||"").trim(),reason:String(scene.reason||"Scene transition").trim(),source_user_id:String(userId||""),queued_at:new Date().toISOString()};
    if(existing?.layer==="round"){ db.setDirectorState(session.id,{pending_pass:replacement}); return replacement; }
    if(existing) return existing;
    return db.queueDirectorPass(session.id,replacement);
  }
  if(existing) return existing;
  const state=db.recordDirectorActor(session.id,userId);
  const eligible=eligibleRoundUsers(db,session.id);
  if(!eligible.length) return null;
  const acted=new Set(state.acted_user_ids||[]);
  if(eligible.every(id=>acted.has(id))){
    return db.queueDirectorPass(session.id,{
      layer:"round",
      round_number:Number(state.round_number||1),
      reason:"Every currently present player-controlled role has completed at least one GM-resolved table action in this director cadence.",
      source_user_id:String(userId||"")
    });
  }
  return null;
}

export function describeBlockedAction(row){
  const raw=String(row?.error||row?.reason||"This state action is not permitted in the current scope.");
  if(row?.type==="simulation") return {
    player:"I did not change global world-simulation state from this private scene. Permitted private facts and NPC memories remain private.",
    gm:`Blocked private-scene simulation mutation: ${raw}`
  };
  if(row?.type==="canon"&&/private/i.test(raw)) return {
    player:row?.proposal_id
      ?`I did not write that statement directly into global canon because this is a private scene. It was recorded as canon proposal \`${String(row.proposal_id).slice(0,8)}\` for human GM review.`
      :"I did not write that discovery directly into global canon because this is a private scene. Any permitted private facts/clues remain private; a GM can promote them when they become shared campaign truth.",
    gm:`Blocked private-scene global canon write${row?.event?.key?` (${row.event.key})`:""}${row?.proposal_id?` and converted it to proposal ${String(row.proposal_id).slice(0,8)}`:""}: ${raw}`
  };
  if(row?.kind==="canon_proposal"||row?.proposalDraft) return {
    player:"I could not record the requested canon proposal because this private scene does not have an acting player character to associate with the proposal.",
    gm:`Blocked player canon proposal creation: ${raw}`
  };
  if(row?.type==="veil_exposure_delta"&&/private/i.test(raw)) return {
    player:"I did not change global Veil Exposure from this private scene. Private consequences can still be recorded, and a GM can promote a global consequence when appropriate.",
    gm:`Blocked private-scene global Veil Exposure mutation: ${raw}`
  };
  if(row?.type==="resource_delta") return {
    player:"I did not apply a resource change that falls outside the character/scope I am allowed to modify in this scene.",
    gm:`Blocked scoped resource mutation: ${raw}`
  };
  if(row?.kind==="relationship"||row?.draft) return {
    player:"I did not apply a relationship change that falls outside the character/scope I am allowed to modify in this scene.",
    gm:`Blocked scoped relationship mutation: ${raw}`
  };
  return {player:"I attempted a campaign-state action that is not permitted in this scene, so I did not apply it.",gm:`Blocked Veilkeeper state action: ${raw}`};
}

export function blockedMutationRows(mutation){
  return [
    ...(mutation?.events||[]).filter(x=>x?.blocked),
    ...(mutation?.relationships||[]).filter(x=>x?.blocked).map(x=>({...x,kind:"relationship"})),
    ...(mutation?.handouts||[]).filter(x=>x?.blocked).map(x=>({...x,kind:"handout"})),
    ...(mutation?.canonProposals||[]).filter(x=>x?.blocked).map(x=>({...x,kind:"canon_proposal",proposalDraft:x.draft})),
    ...(mutation?.simulation||[]).filter(x=>x?.blocked)
  ];
}

/** Return ambiguous review notes that were deliberately left uncommitted for human GM review. */
export function lowConfidenceReviewItems(result,threshold=55){
  const review=result?.state_review||{};
  return POST_TURN_REVIEW_CATEGORIES.flatMap(category=>{
    const item=review[category];
    return item&&item.decision==="no_change"&&Number(item.confidence??100)<threshold?[{category,confidence:Number(item.confidence),reason:String(item.reason||"")}]:[];
  });
}

/** Suppress speculative director mutations and surface them as GM-review notes. */
export function normalizeDirectorConfidence(result,threshold=55){
  const confidence=Number(result?.confidence??100);
  if(result?.act && Number.isFinite(confidence) && confidence<threshold){
    return {...result,act:false,public_narration:"",private_messages:[],events:[],handouts:[],relationships:[],npc_memories:[],npc_knowledge:[],npc_goals:[],simulation_updates:[],review_required:true,gm_notes:`${String(result.gm_notes||"").trim()}${result.gm_notes?"\n":""}LOW-CONFIDENCE REVIEW: Proposed world move (${confidence}%) was not committed; human GM review required.`};
  }
  return {...result,review_required:false};
}
