/** Pure Daggerheart roll and movement rules for already validated native conditions. */
const LANES='adversary:traffic-saint:all-lanes-stop';

export function incomingConditionOdds(offer,proposal={}){
  const adv=Number(proposal.advantage===true)+Number(!!offer.native_conditions?.length),dis=Number(proposal.disadvantage===true);
  return {advantage:adv>dis,disadvantage:dis>adv};
}

export function movementConditionIssue(conditions,{range=null,rangeBands}={}){
  for(const condition of conditions){
    if(condition.data.feature===LANES&&(!rangeBands.includes(range)||rangeBands.indexOf(range)>rangeBands.indexOf('Very Close')))
      return 'NATIVE_MOVEMENT_LIMIT_VERY_CLOSE';
  }
  return null;
}
