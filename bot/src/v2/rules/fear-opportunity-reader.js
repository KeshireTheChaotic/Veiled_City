/** Native bridge: derive pending/unrolled state from durable records, not model
 * request fields. GM decision inspection remains an explicit native authority.
 */
export function createFearOpportunityReader({sourceAuthority,rollStore,readActor,inspectGmDecision}){
  if(typeof sourceAuthority?.inspectReference!=='function'||typeof rollStore?.readResultForRequest!=='function'||typeof readActor!=='function'||typeof inspectGmDecision!=='function')throw new TypeError('Native Fear opportunity dependencies required');
  function read(campaignId,requestRef){
    const request=rollStore.readRequest(campaignId,requestRef);if(!request||request.id!==requestRef||request.campaignId!==campaignId)throw new Error('Current durable owner roll request required');
    const proof=sourceAuthority.inspectReference(request.sourceRef,request.sourceRevision);
    if(proof.campaign!==campaignId||proof.scene!==request.sceneId||proof.principal!==request.ownerUserId||!proof.actors.includes(request.actorId))throw new Error('Current owner roll source required');
    const decision=inspectGmDecision(campaignId,requestRef);if(!decision||decision.requestRef!==requestRef)throw new Error('Inspected native GM attack decision required');
    return {campaignId,sceneId:request.sceneId,owner:readActor(campaignId,request.actorId),request:{...request,rollRef:rollStore.readResultForRequest(campaignId,requestRef)?.id??null},npc:readActor(campaignId,decision.npcId),decision};
  }
  return Object.freeze({read});
}
