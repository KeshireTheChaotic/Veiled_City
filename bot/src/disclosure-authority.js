/** Pure disclosure predicate classification; reason codes never carry fact text or recipient identity. */
export function factVisibleTo(row,scope){
  return ['public','party'].includes(row.visibility)||scope.mode==='private'&&(
    row.visibility==='player'&&row.subject_user_id===scope.actorUserId
    ||row.visibility==='character'&&row.subject_character_id===scope.actorCharacterId);
}
export function disclosureFailureReason(fact,proposed,audiences){
  if(!fact)return 'fact_missing';
  if(fact.archived)return 'fact_archived';
  if(proposed!==fact.content)return 'content_mismatch';
  if(!audiences.every(scope=>factVisibleTo(fact,scope)))return 'audience_denied';
  return null;
}
