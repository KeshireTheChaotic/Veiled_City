/** Original blocked native effect reporting; no state or disclosure grant. */
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
