/** Native exact source selection. Never guesses from the number of pending requests, and never rolls. */
export function createTypedRequestSelection({consentAction,pendingRollRequests,isPvpIntent,hash,fail}){
/** Shared exact selection rule; no sole-pending heuristic or generated request authority. */
function exactTypedRollSelection(db,guild,declaration,scope,operation,{targetKey=declaration.data.target_key}={}){
  const {row}=consentAction(db,guild,declaration.record_key);
  if(hash(row)!==hash(declaration)||row.data.actor!==scope.actorCharacterId||row.data.owner_user_id!==scope.actorUserId
    ||(scope.mode==='private'?row.visibility!=='character'||row.subject_key!==scope.actorCharacterId:row.visibility!=='party')
    ||isPvpIntent(db,guild,row))throw fail('mechanical_input_owner_or_scope');
  return pendingRollRequests(db,guild,scope.actorUserId).filter(q=>q.subject_key===scope.actorCharacterId
    &&q.status===(operation==='damage'?'awaiting_damage':'pending')
    &&(q.data.input?.accepted_intent===row.record_key||targetKey===q.record_key&&row.data.target_key===q.record_key
      &&row.data.source_span.split(/\s|[.,;!?()[\]{}"'`]/).includes(q.record_key)));
}
/** Exact source token identifies a native PvP request; it never supplies the attack outcome or another owner's choice. */
function exactTypedPvpSelection(db,guild,declaration,scope,operation){
  const {row}=consentAction(db,guild,declaration.record_key),key=row.data.target_key;
  if(hash(row)!==hash(declaration)||row.data.actor!==scope.actorCharacterId||row.data.owner_user_id!==scope.actorUserId
    ||(scope.mode==='private'?row.visibility!=='character'||row.subject_key!==scope.actorCharacterId:row.visibility!=='party')
    ||row.data.type!=='roll'||row.data.framing!=='immediate'||row.data.operation!==operation
    ||!row.data.source_span.split(/\s|[.,;!?()[\]{}"'`]/).includes(key))return null;
  const q=key?db.getCityRecord(guild,'pvp_attack_request',key):null,o=q?.data?.offer;
  return o?.actor===scope.actorCharacterId&&o.snapshot.actor_owner===scope.actorUserId
    &&(operation==='roll'?q.status==='ready'||!!q.data.roll:q.status==='awaiting_damage'||!!q.data.damage)?q:null;
}

  return Object.freeze({exactTypedRollSelection,exactTypedPvpSelection});
}
