export const POST_TURN_REVIEW_CATEGORIES=[
  "facts_clues","resources","clocks","threads","references","relationships","handouts","canon","veil_exposure"
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
  veil_exposure:r=>(r.events||[]).some(e=>e.type==="veil_exposure_delta")
};

export function validatePostTurnStateReview(result){
  const review=result?.state_review;
  if(!review||typeof review!=="object") throw new Error("GM turn is missing the mandatory post-turn state review.");
  for(const category of POST_TURN_REVIEW_CATEGORIES){
    const item=review[category];
    if(!item||!["changed","no_change"].includes(item.decision)||!String(item.reason||"").trim()){
      throw new Error(`Post-turn state review is incomplete for ${category}.`);
    }
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
  if(row?.type==="canon"&&/private/i.test(raw)) return {
    player:"I did not write that discovery directly into global canon because this is a private scene. Any permitted private facts/clues remain private; a GM can promote them when they become shared campaign truth.",
    gm:`Blocked private-scene global canon write${row?.event?.key?` (${row.event.key})`:""}: ${raw}`
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
    ...(mutation?.handouts||[]).filter(x=>x?.blocked).map(x=>({...x,kind:"handout"}))
  ];
}
