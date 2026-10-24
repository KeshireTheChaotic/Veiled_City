/** World Director scheduling only: no PC action, mechanical effect or wall-clock campaign advancement. */
export function createDirectorCadence({eligibleRoundUsers,now}){
if(typeof eligibleRoundUsers!=='function'||typeof now!=='function')throw new TypeError('Director attendance and timestamp capabilities required');
/** Queue the next durable world-director pass after a resolved party turn. */
function queueDirectorAfterPartyTurn(db,session,userId,stateReview){
  if(!session?.id) return null;
  const existing=db.getPendingDirectorPass(session.id);
  const scene=stateReview?.scene;
  if(scene?.decision==="transition"){
    const replacement={layer:"scene",scene_label:String(scene.label||"").trim(),reason:String(scene.reason||"Scene transition").trim(),source_user_id:String(userId||""),queued_at:now()};
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


return Object.freeze({queueDirectorAfterPartyTurn});
}
