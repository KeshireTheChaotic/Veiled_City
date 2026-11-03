import {createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
/** Native ordering across opt-in stores. A failed reservation deliberately leaves
 * a durable roll hold for reconciliation. No spending, attack or general unlock.
 */
export function createPreRollFearCoordinator({rollStore,fearStore,opportunityReader,sourceAuthority,readActor,readAdjudication}){
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
  function ownerEvidenceReader(readEvidence){
    if(typeof sourceAuthority?.inspectReference!=='function'||typeof readEvidence!=='function')throw new Error('Native owner source and defense evidence readers required');
    return (campaign,request)=>{
      const evidence=readEvidence(campaign,request),terms=fearStore.read(campaign,request)?.incoming?.terms;
      if(!terms||typeof evidence?.sourceRef!=='string'||typeof evidence.sourceRevision!=='string')throw new Error('Owned incoming defense source required');
      const proof=sourceAuthority.inspectReference(evidence.sourceRef,evidence.sourceRevision);
      if(proof.campaign!==campaign||proof.scene!==terms.sceneId||proof.principal!==terms.ownerUserId||!proof.actors.includes(terms.actorId)||!Array.isArray(proof.recipients)||proof.recipients.length!==1||proof.recipients[0]!==terms.ownerUserId)throw new Error('Current private affected-owner defense source required');
      return evidence;
    };
  }
  function ownerDefense(c,q,operation,{check,readCandidate,readEvidence}){
    return fearStore[operation](c,q,{check:heldAuthority(c,q,check),readCandidate:candidateReader(readCandidate),readEvidence:ownerEvidenceReader(readEvidence)});
  }
  function rollIncoming(c,q,{check,readCandidate,readReview,readChoice,rng}){
    const review=ownerEvidenceReader(readReview),choice=ownerEvidenceReader(readChoice);
    return fearStore.rollIncoming(c,q,{check:heldAuthority(c,q,check),readCandidate:candidateReader(readCandidate),readDefense:(campaign,request)=>({review:review(campaign,request),choice:choice(campaign,request)}),rng});
  }
  function completeIncoming(c,q,{check,readDamage,readDeathEligibility,readDeathOutcome}){return fearStore.completeIncoming(c,q,{check:heldAuthority(c,q,check),readDamage,readDeathEligibility,readDeathOutcome});}
  function inspectContinuation(c,q){
    if(typeof sourceAuthority?.inspectReference!=='function'||typeof readActor!=='function'||typeof readAdjudication!=='function')throw new Error('Native original-action eligibility readers required');
    const row=fearStore.read(c,q),request=rollStore.readRequest(c,q);
    if(row?.status!=='completed'||!row.completion||!request||!request.adjudicationRef)throw new Error('Completed interruption and pending native adjudication required');
    if(row.completion.originalActionBlocked===true)throw new Error('Resolved death outcome requires native recovery or a fresh owner declaration');
    const proof=sourceAuthority.inspectReference(request.sourceRef,request.sourceRevision),actor=readActor(c,request.actorId),a=readAdjudication(c,request.adjudicationRef),hp=actor?.data?.resources?.hp;
    if(proof.campaign!==c||proof.scene!==request.sceneId||proof.principal!==request.ownerUserId||!proof.actors.includes(request.actorId)||actor?.id!==request.actorId||actor.kind!=='pc'||actor.status!=='active'||actor.campaignId!==c||actor.sceneId!==request.sceneId||actor.ownerUserId!==request.ownerUserId||actor.controllerUserId!==request.ownerUserId||actor.controlRole!=='owner'||actor.controlRevision!==request.controlRevision||typeof actor.revision!=='string'||!actor.revision
      ||![hp?.current,hp?.max].every(Number.isSafeInteger)||hp.current<0||hp.max<1||hp.current>=hp.max
      ||a?.id!==request.adjudicationRef||a.campaignId!==c||a.sceneId!==request.sceneId||a.actorId!==actor.id||a.sourceRef!==request.sourceRef||a.sourceRevision!==request.sourceRevision||a.status!=='accepted'||a.actorRevision!==actor.revision||typeof a.revision!=='string'||!a.revision||typeof a.ruleFingerprint!=='string'||!/^[a-f0-9]{64}$/.test(a.ruleFingerprint)
      ||a.difficulty!==request.difficulty||a.stakes!==request.stakes||['modifier','experience','advantage','disadvantage'].some(k=>a[k]!==request[k]))throw new Error('Original owner action requires current native review');
    return {campaignId:c,sceneId:request.sceneId,requestRef:q,decisionRef:row.terms.decisionRef,actorId:actor.id,ownerUserId:actor.ownerUserId,controlRevision:actor.controlRevision,actorRevision:actor.revision,sourceRef:request.sourceRef,sourceRevision:request.sourceRevision,adjudicationRef:a.id,adjudicationRevision:a.revision,ruleFingerprint:a.ruleFingerprint,completionHash:hash(row.completion),status:'ready'};
  }
  function resumeOriginalRoll(c,q,{check}){return rollStore.releaseCompletedFear(c,q,{check,readCompletion:(campaign,request)=>{const row=fearStore.read(campaign,request);if(row?.status!=='completed')throw new Error('Completed native interruption required');return row.completion;},readContinuation:inspectContinuation});}
  return Object.freeze({reserve,cancel,recoverUnreserved,claimAnnouncement,acknowledgeAnnouncement,markAnnouncementUncertain,recordAnnouncementResponse,prepareIncoming,rollIncoming,completeIncoming,inspectContinuation,resumeOriginalRoll,
    reviewIncoming:(c,q,options)=>ownerDefense(c,q,'reviewIncoming',options),recordIncomingDefense:(c,q,options)=>ownerDefense(c,q,'recordIncomingDefense',options)});
}
