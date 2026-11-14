import {createKnowledgeAuthority} from './knowledge-authority.js';
import {knowledgeHash} from './knowledge-store.js';
/** Only a current, independently accepted protected-canon entry can be projected.
 * Classification public/party is not a delivery receipt: this truth stays GM-only.
 */
export function createCanonKnowledgeEvidence({hookStore,knowledgeStore,sourceAuthority}){
 function readEvidence(campaignId,ref){
  const current=hookStore?.readPlanningRecord(campaignId,ref);if(current?.kind!=='canon'||current.value.authority!=='human_reviewed_canon')return null;
  const source=current.value.provenance?.review_source,review=source&&hookStore.canonReview(campaignId,source),entry=review?.entry;
  if(review?.status!=='accepted'||entry?.id!==ref||entry.revision!==current.revision||entry.value!==current.value.value||review.request.campaignId!==campaignId||review.request.sourceRef!==source)return null;
  return {id:ref,campaignId,status:'committed',revision:String(entry.revision),authority:'human_canon_review',humanGmAuthorized:true,reviewRef:review.id,record:{id:'protected-canon:'+knowledgeHash(JSON.stringify([campaignId,entry.canon_key])),kind:'canon',body:entry.value,status:'active',scope:'campaign',visibility:'gm',recipientIds:[],knownBy:[],sourceRefs:[],disclosure:'private'}};
 }
 const authority=createKnowledgeAuthority({store:knowledgeStore,sourceAuthority,readEvidence});
 function project(receipt){
  if(receipt.status!=='accepted'||!receipt.entry)return null;
  const evidence=readEvidence(receipt.request.campaignId,receipt.entry.id);if(!evidence)throw new Error('Current independent canon evidence required');
  const current=knowledgeStore.metadata(evidence.campaignId,evidence.record.id),replay=knowledgeStore.evidence(evidence.campaignId,evidence.id);
  return authority.establish(evidence.campaignId,evidence.id,replay?replay.previousRevision:current?.revision??null);
 }

 return Object.freeze({readEvidence,project});
}
