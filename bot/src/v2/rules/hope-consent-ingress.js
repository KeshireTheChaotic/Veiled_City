import {createHash} from 'node:crypto';
/** Native explicit decision ingress. readDecision must derive a verified owner
 * command/component decision, never infer consent from conversational silence.
 */
export function createHopeConsentIngress({sourceAuthority,readActor,readDecision,actionStore}){
  if(typeof sourceAuthority?.revalidate!=='function'||typeof readActor!=='function'||typeof readDecision!=='function'||typeof actionStore?.recordHopeConsent!=='function')throw new TypeError('Native consent ingress dependencies required');
  function record(source,actionRef){
    const terms=actionStore.readActionTerms(source.campaign,actionRef),decision=structuredClone(readDecision(source.id));
    const actor=readActor(source.campaign,terms?.actorId),snapshot=JSON.stringify([terms,decision,actor]);
    function check(){
      if(!sourceAuthority.revalidate(source)||!terms||terms.id!==actionRef||terms.campaignId!==source.campaign||terms.sceneId!==source.scene||terms.ownerUserId!==source.principal||!source.actors.includes(terms.actorId)
        ||actor?.kind!=='pc'||actor.status!=='active'||actor.ownerUserId!==source.principal||actor.controllerUserId!==source.principal||actor.controlRole!=='owner'
        ||actor.id!==terms.actorId||actor.campaignId!==source.campaign||actor.sceneId!==source.scene||actor.controlRevision!==terms.controlRevision
        ||!decision||decision.sourceRef!==source.id||decision.sourceRevision!==source.revision||decision.principal!==source.principal||decision.campaignId!==source.campaign||decision.sceneId!==source.scene
        ||decision.actionRef!==actionRef||decision.termsRevision!==terms.revision||decision.actorId!==terms.actorId||decision.amount!==terms.cost.amount||decision.costSlot!==terms.cost.slot||!['accept','reject'].includes(decision.decision))throw new Error('Exact current owner cost decision required');
      if(JSON.stringify([actionStore.readActionTerms(source.campaign,actionRef),readDecision(source.id),readActor(source.campaign,terms.actorId)])!==snapshot)throw new Error('Owner cost decision changed');
    }
    check();const id=`cost-consent:${createHash('sha256').update(JSON.stringify([source.campaign,source.id,source.revision,actionRef])).digest('hex')}`;
    return actionStore.recordHopeConsent({id,campaignId:source.campaign,sceneId:source.scene,actorId:terms.actorId,ownerUserId:source.principal,
      sourceRef:terms.sourceRef,sourceRevision:terms.sourceRevision,choiceSourceRef:source.id,choiceSourceRevision:source.revision,
      actionRef,actionRevision:terms.revision,amount:terms.cost.amount,costSlot:terms.cost.slot,revision:'1',status:decision.decision==='accept'?'accepted':'rejected'},{check});
  }
  return Object.freeze({record});
}
