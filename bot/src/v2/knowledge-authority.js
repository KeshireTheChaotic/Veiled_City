import {knowledgeHash} from './knowledge-store.js';

const id=v=>typeof v==='string'&&v.length>0&&v.length<=256;
const list=v=>Array.isArray(v)&&v.length<=64&&v.every(id)&&new Set(v).size===v.length;
const blocked=code=>({status:'blocked',code});
const types={testimony:'native_testimony',belief:'native_belief',observation:'native_observation',identity:'native_identity',fact:'native_fact',canon:'human_canon_review'};
const boundary=row=>JSON.stringify([row.kind,row.scope,row.sceneId,row.visibility,row.recipientIds,row.knownBy,row.disclosure]);

/** Native acceptance and model proposals are separate APIs. Only propose is model-callable. */
export function createKnowledgeAuthority({store,sourceAuthority,readEvidence,readCanonRequest=()=>null}){
  if(!store||typeof sourceAuthority?.revalidate!=='function'||typeof readEvidence!=='function'||typeof readCanonRequest!=='function')throw new TypeError('Knowledge store and native source/evidence readers required');
  function propose(source,input){
    if(!sourceAuthority.revalidate(source))return blocked('source_authority_changed');
    if(!input||Object.keys(input).some(k=>!['source_ref','kind','claim','subject_ref','evidence_refs'].includes(k))
      ||input.source_ref!==source.id||!['testimony','observation','identity','memory','fact','canon_proposal'].includes(input.kind)
      ||typeof input.claim!=='string'||!input.claim.trim()||input.claim.length>8000
      ||input.subject_ref!==undefined&&!id(input.subject_ref)||input.evidence_refs!==undefined&&!list(input.evidence_refs))return blocked('invalid_knowledge_proposal');
    if(input.kind==='canon_proposal'){
      const request=readCanonRequest(source.id);
      if(!request||request.sourceRef!==source.id||request.principal!==source.principal||request.sourceRevision!==source.revision
        ||request.private!==true||request.ownerConfirmed!==true||request.claim!==input.claim||request.subjectRef!==(input.subject_ref??null)
        ||source.recipients.length!==1||source.recipients[0]!==source.principal)return blocked('explicit_private_owner_request_required');
    }
    const proposal={campaignId:source.campaign,sourceRef:source.id,sourceRevision:source.revision,principal:source.principal,
      kind:input.kind,claim:input.claim,subjectRef:input.subject_ref??null,evidenceRefs:[...(input.evidence_refs??[])],
      status:'proposed',authorship:'model_proposal',visibility:'gm',effectsCommitted:false};
    proposal.id=`knowledge-proposal:${knowledgeHash(JSON.stringify(proposal))}`;
    if(!sourceAuthority.revalidate(source))return blocked('source_authority_changed');
    const saved=store.propose(proposal);
    return {status:'proposed',proposal_ref:saved.id,effects_committed:false};
  }
  function establish(campaign,evidenceRef,expectedRevision=null){
    if(!id(campaign)||!id(evidenceRef)||expectedRevision!==null&&(typeof expectedRevision!=='string'||!/^[1-9][0-9]*$/.test(expectedRevision)))throw new Error('Native evidence reference and revision required');
    const event=structuredClone(readEvidence(campaign,evidenceRef)),r=event?.record;
    if(!event||event.id!==evidenceRef||event.campaignId!==campaign||event.status!=='committed'||!id(event.revision)
      ||!r||!id(r.id)||!types[r.kind]||event.authority!==types[r.kind]
      ||typeof r.body!=='string'||!r.body.trim()||r.body.length>16000||!['active','retracted'].includes(r.status)
      ||!['campaign','scene'].includes(r.scope)||r.scope==='scene'&&!id(r.sceneId)
      ||!['gm','public','recipients'].includes(r.visibility)||!list(r.recipientIds)||!list(r.knownBy)||!list(r.sourceRefs)
      ||r.sourceRefs.includes(r.id)||!['private','pending','public','observed','acknowledged'].includes(r.disclosure))throw new Error('Verified native knowledge evidence required');
    if(r.kind==='identity'&&event.independentGmOrigin!==true)throw new Error('Independent world identity origin required');
    if(r.kind==='canon'&&(event.humanGmAuthorized!==true||!id(event.reviewRef)))throw new Error('Separate human canon review required');
    if(r.visibility==='gm'&&(r.recipientIds.length||r.disclosure!=='private')
      ||r.visibility==='public'&&r.disclosure!=='public'
      ||r.visibility==='recipients'&&(!r.recipientIds.length||!['pending','observed','acknowledged'].includes(r.disclosure)))throw new Error('Knowledge disclosure scope mismatch');
    if(r.disclosure==='acknowledged'&&(event.delivery?.status!=='delivered'||!id(event.delivery.messageId)
      ||!list(event.delivery.recipientIds)||JSON.stringify([...(event.delivery.recipientIds??[])].sort())!==JSON.stringify([...r.recipientIds].sort())))throw new Error('Exact delivered recipient evidence required');
    const meta={kind:r.kind,status:r.status,scope:r.scope,sceneId:r.scope==='scene'?r.sceneId:null,visibility:r.visibility,
      recipientIds:[...r.recipientIds].sort(),knownBy:[...r.knownBy].sort(),sourceRefs:[...r.sourceRefs].sort(),disclosure:r.disclosure,
      nativeEvidenceRevision:event.revision,reviewRef:event.reviewRef??null};
    const prior=store.metadata(campaign,r.id);
    if(!store.evidence(campaign,evidenceRef)){
      if(prior&&boundary(prior)!==boundary(meta))throw new Error('Correction cannot change epistemic or disclosure authority');
      if(prior?.status==='retracted'&&r.status!=='retracted')throw new Error('Retracted history requires a distinct supported claim');
      if(!prior&&r.status==='retracted')throw new Error('Cannot retract a missing record');
    }
    // Re-read native evidence immediately before the atomic storage transition.
    if(JSON.stringify(readEvidence(campaign,evidenceRef))!==JSON.stringify(event))throw new Error('Native evidence changed');
    return store.append({campaignId:campaign,id:r.id,expectedRevision,evidenceRef,metadata:meta,body:r.body});
  }
  return Object.freeze({propose,establish});
}
