/** Fixed native adversary feature proposal shape; source and occurrence checks stay with the provider. */
export function featureChoiceProposalIssue(feature,proposal,entry){
  if(!['blood_rush_hold_position','feedback'].includes(feature?.native_handler)||proposal.proposal_version!==2
    ||proposal.disposition!=='native_feature_resolution'||proposal.stakes_kind!=='native_feature'||proposal.experience_ref
    ||proposal.advantage||proposal.disadvantage||entry.actor.type!=='npc'||entry.operation!=='reaction')
    return 'feature_choice_shape_or_handler';
  return null;
}
