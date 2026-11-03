/** Native owner/action binding for a fixed Hope-cost rule. Preparation is pure;
 * spending is a separate native call and remains outside the AI capability set.
 */
export function createHopeCostAuthority({sourceAuthority,readActor,readAction,readConsent,hopeStore}){
  const id=value=>typeof value==='string'&&value.length>0&&value.length<=256;
  if(typeof sourceAuthority?.revalidate!=='function'||[readActor,readAction,readConsent].some(f=>typeof f!=='function')||typeof hopeStore?.spend!=='function')throw new TypeError('Native action-cost readers required');
  function evidence(source,actorId,parameters){
    if(!sourceAuthority.revalidate(source)||!parameters||Object.keys(parameters).sort().join(',')!=='action_ref,consent_ref')throw new Error('Native action and owner consent references required');
    const actor=readActor(source.campaign,actorId),action=readAction(source.campaign,parameters.action_ref),consent=readConsent(source.campaign,parameters.consent_ref);
    if(!source.actors.includes(actorId)||actor?.id!==actorId||actor.kind!=='pc'||actor.status!=='active'||actor.campaignId!==source.campaign||actor.sceneId!==source.scene
      ||actor.ownerUserId!==source.principal||actor.controllerUserId!==source.principal||actor.controlRole!=='owner'||!id(actor.controlRevision)
      ||!action||action.id!==parameters.action_ref||action.campaignId!==source.campaign||action.sceneId!==source.scene||action.actorId!==actorId||action.ownerUserId!==source.principal
      ||action.status!=='awaiting_cost'||!id(action.revision)||action.sourceRef!==source.id||action.sourceRevision!==source.revision||action.controlRevision!==actor.controlRevision
      ||action.cost?.resource!=='hope'||!Number.isSafeInteger(action.cost.amount)||action.cost.amount<1||typeof action.cost.slot!=='string'||!action.cost.slot
      ||!consent||consent.campaignId!==source.campaign||consent.sceneId!==source.scene||consent.id!==parameters.consent_ref||consent.status!=='accepted'||consent.ownerUserId!==source.principal||consent.sourceRef!==source.id||consent.sourceRevision!==source.revision
      ||consent.actionRef!==action.id||consent.actionRevision!==action.revision||consent.actorId!==actorId||consent.amount!==action.cost.amount||consent.costSlot!==action.cost.slot
      ||typeof consent.revision!=='string'||!consent.revision)throw new Error('Current owner-confirmed native action cost required');
    return {id:consent.id,campaignId:source.campaign,actorId,ownerUserId:source.principal,status:'accepted',operation:'spend_hope',ownerConfirmed:true,
      sourceRef:source.id,revision:consent.revision,actionRef:action.id,costSlot:action.cost.slot,amount:action.cost.amount};
  }
  const definition=Object.freeze({kind:'hope_cost.prepare',version:'1',validate({source,proposal}){try{evidence(source,proposal.actorRef,proposal.parameters);return true;}catch{return false;}},prepare:()=>({status:'pending'})});
  function commit(source,actorId,parameters,expectedRevision){
    const initial=evidence(source,actorId,parameters),snapshot=JSON.stringify(initial);
    return hopeStore.spend({campaignId:source.campaign,actorId,expectedRevision,evidenceRef:initial.id},{readEvidence:()=>evidence(source,actorId,parameters),check(){if(JSON.stringify(evidence(source,actorId,parameters))!==snapshot)throw new Error('Action cost authority changed');}});
  }
  return Object.freeze({definition,commit});
}
