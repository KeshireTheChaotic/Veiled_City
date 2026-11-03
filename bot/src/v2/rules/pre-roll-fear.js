/** Fixed native pre-roll standard-attack eligibility, not execution permission.
 * Input records must come from validated native readers, never model booleans.
 */
export function preRollFearTerms({campaignId,sceneId,owner,request,npc,decision,fear,reservedFear}){
  if(!Number.isSafeInteger(fear)||fear<0||fear>12||!Number.isSafeInteger(reservedFear)||reservedFear<0||reservedFear>fear||fear-reservedFear<1)throw new Error('Existing unreserved campaign Fear required');
  if(owner?.kind!=='pc'||owner.campaignId!==campaignId||owner.sceneId!==sceneId||owner.status!=='active'||typeof owner.ownerUserId!=='string'||!owner.ownerUserId
    ||owner.controllerUserId!==owner.ownerUserId||owner.controlRole!=='owner'||typeof owner.controlRevision!=='string'||!owner.controlRevision
    ||request?.campaignId!==campaignId||request.sceneId!==sceneId||request.actorId!==owner.id||request.ownerUserId!==owner.ownerUserId||request.controlRevision!==owner.controlRevision
    ||request.status!=='awaiting_player_roll'||request.rollRef!==null||typeof request.id!=='string'||!request.id
    ||npc?.kind!=='npc'||npc.status!=='active'||npc.campaignId!==campaignId||npc.sceneId!==sceneId||npc.controllerUserId!==null||npc.proxyAuthorized===true
    ||decision?.status!=='gm_action_ready'||decision.issuer!=='native_gm_decision'||decision.campaignId!==campaignId||decision.sceneId!==sceneId||decision.requestRef!==request.id
    ||decision.npcId!==npc.id||decision.targetActorId!==owner.id||decision.operation!=='commit_adversary_attack'||decision.feature!=='standard_attack'
    ||decision.advantage!==false||decision.disadvantage!==false||decision.experienceRef!==null||decision.printedFearCost!==0||typeof decision.id!=='string'||!decision.id)throw new Error('Exact native standard attack against pending owner request required');
  return Object.freeze({campaignId,sceneId,requestRef:request.id,ownerUserId:owner.ownerUserId,actorId:owner.id,controlRevision:owner.controlRevision,npcId:npc.id,decisionRef:decision.id,
    baseCost:1,printedFearCost:0,availableFear:fear-reservedFear,status:'awaiting_announcement',executionAuthority:false});
}
