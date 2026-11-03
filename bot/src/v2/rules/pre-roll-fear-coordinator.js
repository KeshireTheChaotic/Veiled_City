/** Native ordering across opt-in stores. A failed reservation deliberately leaves
 * a durable roll hold for reconciliation. No spending, attack or general unlock.
 */
export function createPreRollFearCoordinator({rollStore,fearStore,opportunityReader,sourceAuthority}){
  if(typeof rollStore?.holdForFear!=='function'||typeof rollStore?.releaseCancelledFear!=='function'||typeof fearStore?.reserve!=='function'||typeof opportunityReader?.read!=='function')throw new TypeError('Native pre-roll coordination dependencies required');
  function reserve(c,q,{check}){
    if(typeof check!=='function')throw new Error('Native Fear authority required');
    const initial=opportunityReader.read(c,q),fingerprint=JSON.stringify(initial);
    const current=()=>{check();if(JSON.stringify(opportunityReader.read(c,q))!==fingerprint)throw new Error('Fear opportunity changed during coordination');};
    const hold=rollStore.holdForFear(c,q,initial.decision.id,{check:current});
    if(hold.status!=='held')throw new Error('Fear hold already closed');
    return fearStore.reserve(c,q,{readOpportunity:opportunityReader.read,check:()=>{current();const h=rollStore.readFearHold(c,q);if(h?.status!=='held'||h.decisionRef!==hold.decisionRef)throw new Error('Current native Fear hold required');}});
  }
  function cancel(c,q,{check,readPublication}){
    const cancellation=fearStore.cancel(c,q,{check,readPublication});
    rollStore.releaseCancelledFear(c,q,{check,readCancellation:fearStore.read});return cancellation;
  }
  function recoverUnreserved(c,q,{check,readReview,readPublication}){
    const cancellation=fearStore.recoverUnreserved(c,q,{check,readReview,readPublication,readHold:rollStore.readFearHold});
    rollStore.releaseCancelledFear(c,q,{check,readCancellation:fearStore.read});return cancellation;
  }
  function heldAuthority(c,q,check){
    if(typeof check!=='function')throw new Error('Native Fear authority required');
    return ()=>{check();const row=fearStore.read(c,q),hold=rollStore.readFearHold(c,q);
      if(hold?.status!=='held'||hold.campaignId!==c||hold.requestRef!==q||row?.terms.campaignId!==c||row.terms.requestRef!==q||hold.decisionRef!==row.terms.decisionRef)throw new Error('Matching active native Fear hold required');
    };
  }
  function claimAnnouncement(c,q,{check}){return fearStore.claimAnnouncement(c,q,{check:heldAuthority(c,q,check),readOpportunity:opportunityReader.read});}
  function acknowledgeAnnouncement(c,q,{check,readNotice}){return fearStore.acknowledge(c,q,{check:heldAuthority(c,q,check),readOpportunity:opportunityReader.read,readNotice});}
  function markAnnouncementUncertain(c,q,attemptId,{check}){return fearStore.markAnnouncementUncertain(c,q,attemptId,{check:heldAuthority(c,q,check)});}
  function recordAnnouncementResponse(c,q,attemptId,{check,readResponse}){return fearStore.recordAnnouncementResponse(c,q,attemptId,{check:heldAuthority(c,q,check),readResponse});}
  function candidateReader(readCandidate){
    if(typeof readCandidate!=='function')throw new Error('Native attack legality reader required');
    return (campaign,request)=>{
      const candidate=readCandidate(campaign,request),opportunity=opportunityReader.read(campaign,request);
      if(candidate?.sourceRef!==opportunity.request.sourceRef||candidate.sourceRevision!==opportunity.request.sourceRevision)throw new Error('Incoming candidate must retain original interrupted source');
      return candidate;
    };
  }
  function prepareIncoming(c,q,{check,readCandidate}){
    return fearStore.prepareIncoming(c,q,{check:heldAuthority(c,q,check),readCandidate:candidateReader(readCandidate)});
  }
  function ownerDefense(c,q,operation,{check,readCandidate,readEvidence}){
    if(typeof sourceAuthority?.inspectReference!=='function'||typeof readEvidence!=='function')throw new Error('Native owner source and defense evidence readers required');
    const inspected=(campaign,request)=>{
      const evidence=readEvidence(campaign,request),terms=fearStore.read(campaign,request)?.incoming?.terms;
      if(!terms||typeof evidence?.sourceRef!=='string'||typeof evidence.sourceRevision!=='string')throw new Error('Owned incoming defense source required');
      const proof=sourceAuthority.inspectReference(evidence.sourceRef,evidence.sourceRevision);
      if(proof.campaign!==campaign||proof.scene!==terms.sceneId||proof.principal!==terms.ownerUserId||!proof.actors.includes(terms.actorId)||!Array.isArray(proof.recipients)||proof.recipients.length!==1||proof.recipients[0]!==terms.ownerUserId)throw new Error('Current private affected-owner defense source required');
      return evidence;
    };
    return fearStore[operation](c,q,{check:heldAuthority(c,q,check),readCandidate:candidateReader(readCandidate),readEvidence:inspected});
  }
  return Object.freeze({reserve,cancel,recoverUnreserved,claimAnnouncement,acknowledgeAnnouncement,markAnnouncementUncertain,recordAnnouncementResponse,prepareIncoming,
    reviewIncoming:(c,q,options)=>ownerDefense(c,q,'reviewIncoming',options),recordIncomingDefense:(c,q,options)=>ownerDefense(c,q,'recordIncomingDefense',options)});
}
