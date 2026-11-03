/** Native coordination of preparation/evidence windows. Cross-store preparation
 * is replayable, not a gameplay-effect transaction; no action is resolved here.
 */
export function createRollActionLifecycle({sourceAuthority,preparation,rollStore,actionStore,ownerInspector}){
  if(typeof sourceAuthority?.revalidate!=='function'||typeof preparation?.commitRequest!=='function'||typeof rollStore?.readRequest!=='function'||typeof actionStore?.transition!=='function'||typeof ownerInspector?.inspect!=='function')throw new TypeError('Native roll lifecycle dependencies required');
  function check(source,request){
    if(!sourceAuthority.revalidate(source)||request.campaignId!==source.campaign||request.sceneId!==source.scene||request.ownerUserId!==source.principal||!source.actors.includes(request.actorId)
      ||request.sourceRef!==source.id||request.sourceRevision!==source.revision)throw new Error('Current native roll action source required');
  }
  function prepare(source,actorId,parameters){
    const request=preparation.commitRequest(source,actorId,parameters);check(source,request);
    actionStore.create({id:request.id,campaignId:source.campaign,actorId,ownerUserId:source.principal,sceneId:source.scene,sourceRef:source.id,sourceRevision:source.revision,kind:'ordinary_roll'},{check:()=>check(source,request)});
    actionStore.transition({campaignId:source.campaign,actionId:request.id,expectedRevision:1,sourceRef:`${request.id}:prepared`,to:'awaiting_notice'},{check:()=>check(source,request)});
    return request;
  }
  function noticeDelivered(source,requestRef){
    const request=rollStore.readRequest(source.campaign,requestRef);if(!request)throw new Error('Native roll request required');check(source,request);
    const notice=rollStore.readDelivery(source.campaign,request.noticeRef);
    if(!notice||notice.status!=='delivered'||notice.requestRef!==requestRef||notice.difficulty!==request.difficulty||notice.stakes!==request.stakes||!source.recipients.every(r=>notice.recipientIds.includes(r)))throw new Error('Acknowledged native stakes required');
    return actionStore.transition({campaignId:source.campaign,actionId:requestRef,expectedRevision:2,sourceRef:`${requestRef}:notice`,to:'awaiting_player_roll'},{check:()=>{check(source,request);if(JSON.stringify(rollStore.readDelivery(source.campaign,request.noticeRef))!==JSON.stringify(notice))throw new Error('Notice changed');}});
  }
  function ownerRolled(source,requestRef,rollRef){
    const request=rollStore.readRequest(source.campaign,requestRef);if(!request)throw new Error('Native roll request required');check(source,request);
    const result=ownerInspector.inspect(source,{requestRef,rollRef});
    const receipt=actionStore.transition({campaignId:source.campaign,actionId:requestRef,expectedRevision:3,sourceRef:`${requestRef}:roll:${rollRef}`,to:'ready_to_resolve'},{check:()=>{check(source,request);ownerInspector.inspect(source,{requestRef,rollRef});}});
    return {receipt,result,effectsCommitted:false};
  }
  return Object.freeze({prepare,noticeDelivered,ownerRolled});
}
