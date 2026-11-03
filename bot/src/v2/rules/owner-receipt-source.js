/** Internal receipt ancestry, not caller disclosure authorization or PC control.
 * Older adapters may use their live inspector; they do not gain a death bypass.
 */
export function inspectOwnerReceiptSource(authority,source,scope,{privateAudience=false}={}){
  let metadata;
  if(typeof authority?.inspectReceiptSource==='function')metadata=authority.inspectReceiptSource(source.sourceRef,source.sourceRevision,scope);
  else{
    if(typeof authority?.inspectReference!=='function')throw new Error('Native owner receipt source inspector required');
    const proof=authority.inspectReference(source.sourceRef,source.sourceRevision);
    if(proof.campaign!==scope.campaignId||proof.scene!==scope.sceneId||proof.principal!==scope.ownerUserId||!proof.actors.includes(scope.actorId))throw new Error('Current owner receipt source required');
    metadata={purpose:'owner_receipt_read',sourceRef:source.sourceRef,sourceRevision:source.sourceRevision,...scope,recipientIds:proof.recipients};
  }
  if(metadata?.purpose!=='owner_receipt_read'||metadata.sourceRef!==source.sourceRef||metadata.sourceRevision!==source.sourceRevision||Object.keys(scope).some(k=>metadata[k]!==scope[k])||!Array.isArray(metadata.recipientIds)||!metadata.recipientIds.includes(scope.ownerUserId)||metadata.recipientIds.some(v=>typeof v!=='string'||!v)||new Set(metadata.recipientIds).size!==metadata.recipientIds.length||privateAudience&&metadata.recipientIds.length!==1)throw new Error('Exact entitled owner receipt source required');
  return metadata;
}
