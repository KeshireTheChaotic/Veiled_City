import {createHash} from 'node:crypto';
import {inspectOwnerReceiptSource} from './rules/owner-receipt-source.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Native-only repair of transport bookkeeping from an existing canonical
 * death receipt. Never calls ingress, fate, allocation or a Discord sender.
 */
export function createDeathInteractionReconciliation({interactionReceipts,decisionStore,promptStore,actionStore,sourceAuthority,readActorSnapshot}){
  if(typeof interactionReceipts?.reconcile!=='function'||typeof decisionStore?.get!=='function'||typeof promptStore?.readPrompt!=='function'||typeof actionStore?.readIncomingDeathReview!=='function'||typeof readActorSnapshot!=='function')throw new TypeError('Canonical native death reconciliation readers required');
  function inspect(ref){
    const row=interactionReceipts.read(ref),envelope=decisionStore.get(ref),d=envelope?.record,p=envelope&&promptStore.readPrompt(envelope.customId),b=row?.binding;
    if(!row||!d||!p||d.interactionId!==ref||b.id!==ref||row.bindingHash!==hash(b)||b.tokenHash!==hash(envelope.customId)||b.promptRef!==p.id||d.promptRef!==p.id||d.principal!==b.principal||d.campaignId!==b.campaignId||d.sceneId!==b.sceneId||d.actorId!==b.actorId||d.channelId!==b.channelId||d.messageId!==b.messageId||d.purpose!==p.terms.purpose||d.requestRef!==p.terms.requestRef||d.termsHash!==p.termsHash||d.payloadHash!==p.payloadHash||d.decision!==p.decision||p.disabled||p.terms.ownerUserId!==b.principal||p.terms.actorId!==b.actorId||p.terms.campaignId!==b.campaignId||p.terms.sceneId!==b.sceneId||p.channelId!==b.channelId||p.messageId!==b.messageId||p.delivery?.status!=='delivered'||JSON.stringify(p.delivery.recipientIds)!==JSON.stringify([b.principal])||d.audienceFingerprint!==undefined&&p.delivery.audienceFingerprint!==undefined&&d.audienceFingerprint!==p.delivery.audienceFingerprint||(d.audienceGmRoleId??null)!==(p.delivery.gmRoleId??null)||typeof d.requestRef!=='string'||!d.requestRef.startsWith('incoming-death:'))throw new Error('Exact saved native death decision and delivery binding required');
    const attackRef=d.requestRef.slice('incoming-death:'.length);
    let receipt;
    if(d.purpose==='death_review')receipt=actionStore.readIncomingDeathReview(b.campaignId,attackRef);
    else if(d.purpose==='death_choice')receipt=actionStore.readIncomingDeathChoice(b.campaignId,attackRef);
    else if(d.purpose==='death_allocation')receipt=actionStore.readIncomingDeathOutcome(b.campaignId,attackRef);
    else throw new Error('Supported native death receipt required');
    const e=d.purpose==='death_allocation'?receipt?.allocation?.evidence:receipt?.evidence,actor=readActorSnapshot(b.campaignId,b.actorId);
    if(!receipt||typeof receipt.id!=='string'||e?.id!==ref||e.requestRef!==d.requestRef||e.campaignId!==b.campaignId||e.sceneId!==b.sceneId||e.actorId!==b.actorId||e.ownerUserId!==b.principal||e.sequence!==decisionStore.sequenceFor(ref)||actor?.actorId!==b.actorId||actor.ownerUserId!==b.principal||actor.controlRevision!==e.controlRevision||d.purpose==='death_review'&&(receipt.status!=='reviewed'||d.decision!=='reviewed')||d.purpose==='death_choice'&&(receipt.status!=='choice_saved'||e.move!==d.decision)||d.purpose==='death_allocation'&&(receipt.status!=='resolved'||receipt.allocation?.effectsCommitted!==true||!p.terms.allowedAllocations?.some(a=>a.decision===d.decision&&a.hp===e.hp&&a.stress===e.stress)))throw new Error('Existing canonical affected-owner death receipt required');
    inspectOwnerReceiptSource(sourceAuthority,e,{campaignId:b.campaignId,sceneId:b.sceneId,actorId:b.actorId,ownerUserId:b.principal},{privateAudience:true});
    return {kind:'native_death_interaction_receipt',bindingHash:row.bindingHash,campaignId:b.campaignId,sceneId:b.sceneId,actorId:b.actorId,ownerUserId:b.principal,sourceRef:e.sourceRef,sourceRevision:e.sourceRevision,receipt:{id:receipt.id,hash:hash(receipt)}};
  }
  function reconcile(ref,{check}={}){
    if(typeof check!=='function')throw new Error('Native caller authorization required for death reconciliation');
    let expected;const current=()=>{check();const proof=inspect(ref),fingerprint=hash(proof);if(expected&&expected!==fingerprint)throw new Error('Canonical death reconciliation changed');expected=fingerprint;return proof;};current();
    return interactionReceipts.reconcile(ref,{check:()=>{current();},readEvidence:()=>current()});
  }
  return Object.freeze({reconcile});
}
