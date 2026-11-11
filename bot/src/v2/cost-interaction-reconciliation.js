import {createHash} from 'node:crypto';
import {inspectHopeReceipt} from './native-hope-receipt.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Repairs transport metadata only from an existing native consent/outcome. No ingress, spending or send. */
export function createCostInteractionReconciliation({interactionReceipts,decisionStore,promptStore,actionStore,sourceRegistry}){
  if(typeof actionStore?.readConsentsForAction!=='function'||typeof sourceRegistry?.get!=='function'||typeof interactionReceipts?.reconcile!=='function')throw new TypeError('Native cost receipt authorities required');
  function inspect(ref){
    const row=interactionReceipts.read(ref),b=row?.binding,envelope=decisionStore.get(ref),d=envelope?.record,p=b?.promptRef&&promptStore.read(b.promptRef);
    if(!b||!d||!p||row.bindingHash!==hash(b)||b.id!==ref||d.interactionId!==ref||b.tokenHash!==hash(envelope.customId)||p.id!==d.promptRef||p.id!==b.promptRef||p.publication?.status!=='delivered'||p.publication.response?.messageId!==p.messageId||b.principal!==p.ownerUserId||d.principal!==b.principal||b.campaignId!==p.campaignId||d.campaignId!==b.campaignId||b.sceneId!==p.sceneId||d.sceneId!==b.sceneId||b.actorId!==p.actorId||d.actorId!==b.actorId||b.channelId!==p.channelId||d.channelId!==b.channelId||b.messageId!==p.messageId||d.messageId!==b.messageId||d.actionRef!==p.actionRef||d.termsRevision!==p.termsRevision||d.amount!==p.amount||d.costSlot!==p.costSlot||!['accept','reject'].includes(d.decision)||envelope.customId!==(d.decision==='accept'?p.acceptToken:p.rejectToken))throw new Error('Exact saved owner cost decision and delivery required');
    const terms=actionStore.readActionTerms(b.campaignId,p.actionRef);
    if(terms?.id!==p.actionRef||terms.campaignId!==b.campaignId||terms.sceneId!==b.sceneId||terms.actorId!==b.actorId||terms.ownerUserId!==b.principal||terms.revision!==p.termsRevision||terms.sourceRef!==p.sourceRef||terms.sourceRevision!==p.sourceRevision||terms.cost?.resource!=='hope'||terms.cost.amount!==p.amount||terms.cost.slot!==p.costSlot)throw new Error('Exact registered historical cost required');
    const scope={campaignId:b.campaignId,sceneId:b.sceneId,actorId:b.actorId,ownerUserId:b.principal},candidates=actionStore.readConsentsForAction(b.campaignId,p.actionRef);if(candidates.length!==1)throw new Error('One canonical native cost consent required');
    const consent=candidates[0],action=actionStore.read(b.campaignId,p.actionRef);
    if(!consent||typeof consent.choiceSourceRef!=='string'||typeof consent.choiceSourceRevision!=='string'||consent.actionRef!==p.actionRef||consent.campaignId!==b.campaignId||consent.sceneId!==b.sceneId||consent.actorId!==b.actorId||consent.ownerUserId!==b.principal||consent.actionRevision!==terms.revision||consent.sourceRef!==terms.sourceRef||consent.sourceRevision!==terms.sourceRevision||consent.amount!==p.amount||consent.costSlot!==p.costSlot||consent.status!==(d.decision==='accept'?'accepted':'rejected'))throw new Error('Existing exact native cost consent required; no choice is replayed');
    for(const [sourceRef,expectedMessage] of [[consent.sourceRef,null],[consent.choiceSourceRef,ref]]){
      const issued=sourceRegistry.get(sourceRef),event=issued?.event,control=issued?.control;
      if(!event||event.campaignId!==b.campaignId||event.actorId!==b.actorId||event.userId!==b.principal||expectedMessage!==null&&event.messageId!==expectedMessage||control?.actorId!==b.actorId||control.kind!=='pc'||control.role!=='owner'||typeof issued.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(issued.fingerprint))throw new Error('Sealed native owner source identity required');
    }
    // These are already committed native facts, not new action authority. Current text/attendance
    // cannot undo an expense. The caller separately authenticates the original recipient account for this historical read.

    let outcome;
    if(consent.status==='accepted')outcome=inspectHopeReceipt({actionStore,...scope,actionRef:p.actionRef});
    else{
      if(action?.kind!=='hope_cost'||action.status!=='cancelled'||action.effectsCommitted!==false||action.campaignId!==b.campaignId||action.sceneId!==b.sceneId||action.actorId!==b.actorId||action.ownerUserId!==b.principal||action.sourceRef!==consent.sourceRef||action.sourceRevision!==consent.sourceRevision||actionStore.readOutcome(b.campaignId,p.actionRef))throw new Error('Canonical declined native cost required');
      outcome={status:'cancelled',effects_committed:false};
    }
    return {kind:'native_cost_interaction_receipt',bindingHash:row.bindingHash,...scope,sourceRef:consent.choiceSourceRef,sourceRevision:consent.choiceSourceRevision,receipt:{id:consent.id,hash:hash([consent,outcome])}};
  }
  function reconcile(ref,{check}={}){
    if(typeof check!=='function')throw new Error('Native owner reconciliation caller authorization required');
    let expected;const current=()=>{check();const proof=inspect(ref),fingerprint=hash(proof);if(expected&&expected!==fingerprint)throw new Error('Native cost reconciliation changed');expected=fingerprint;return proof;};current();
    return interactionReceipts.reconcile(ref,{check:()=>{current();},readEvidence:current});
  }
  return Object.freeze({reconcile});
}
