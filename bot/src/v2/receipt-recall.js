import {createHash} from 'node:crypto';
import {statementReference} from './statement-lineage.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
/** A verified native expense is independent gameplay engagement, not proof of its declaration's claims. */
export function createReceiptRecall({sourceAuthority,statementLineage,knowledgeStore,recallStore,inspectReceipt}){
 if(typeof sourceAuthority?.revalidate!=='function'||typeof statementLineage?.capture!=='function'||typeof knowledgeStore?.append!=='function'||typeof recallStore?.readCause!=='function'||typeof inspectReceipt!=='function')throw new TypeError('Native receipt and recall authorities required');
 function record(source,receipt){
  const current=()=>{if(!sourceAuthority.revalidate(source)||receipt?.operation!=='hope_cost'||receipt.effects_committed!==true||receipt.source_ref!==source.id||receipt.source_revision!==source.revision||JSON.stringify(inspectReceipt(source,receipt.receipt_ref))!==JSON.stringify(receipt))throw new Error('Exact committed native engagement receipt required');};current();
  const statement=statementLineage.capture(source),ref=statementReference(source);knowledgeStore.append({campaignId:source.campaign,id:ref,expectedRevision:null,evidenceRef:ref,...statement});current();
  const id=`recall:receipt:${hash([source.campaign,receipt.receipt_ref,receipt.receipt_hash])}`,prior=recallStore.readCause(source.campaign,id),tick=recallStore.readClock(source.campaign);
  if(prior&&(!Number.isSafeInteger(prior.tick)||prior.tick<0||prior.tick>tick))throw new Error('Native recall causal time requires reconciliation');
  return recallStore.recordCause({id,campaignId:source.campaign,authority:'native_recall',status:'committed',independentlyAuthenticated:true,kind:'interaction',tick:prior?.tick??tick,sourceRefs:[ref],targetRefs:[ref]},{check:current});
 }
 return Object.freeze({record});
}
