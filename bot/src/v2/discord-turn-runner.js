import {createRehearsal} from './rehearsal.js';
import {createSourceAuthority} from './source-authority.js';
import {createHash} from 'node:crypto';
import {createContextAuthority} from './context-authority.js';
import {createProseMaterialReview} from './prose-material-review.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const failureNotice="I couldn't finish that narration. Any confirmed dice or resource results still stand.";
/** Every turn owns its audience application. Durable publication grants are
 * native-only, refreshed and independent of Human-GM narrative approval.
 */
export function createDiscordTurnRunner({intake,provider,applicationOptions,createApplication=createRehearsal,createAuthority=createSourceAuthority,turnStore=null,refreshContext=null,onSource=null,readGmRoleId=()=>null}){
  if(typeof intake?.ingest!=='function'||typeof provider?.generate!=='function'||typeof createApplication!=='function')throw new TypeError('Native intake, provider and application required');
  if(refreshContext!==null&&typeof refreshContext!=='function')throw new TypeError('Native context refresh required');
  if(onSource!==null&&typeof onSource!=='function')throw new TypeError('Native source observer required');
  const pending=new Map(),publicationGrants=new WeakMap();
  const manifestRefs=p=>(p.contextDependencies??[]).flatMap(m=>m.records.map(r=>r.ref));
  const inputRefs=input=>[...new Set([...(input.context.records??[]).map(r=>r.ref),...(input.history??[]).flatMap(h=>(h.toolResults??[]).filter(t=>t.result?.source_ref===input.context.source_ref).flatMap(t=>(t.result.records??[]).map(r=>r.ref)))])];
  async function refreshPending(entry,signal){await intake.ingest(entry.request,{signal});entry.validate();if(refreshContext){const publication=entry.app.inspectPublication(entry.id);await refreshContext(entry.source,manifestRefs(publication),{signal});entry.validate();}}
  async function respond(request,{signal}={}){
    const nativeRequest=structuredClone(request),event=await intake.ingest(nativeRequest,{signal});
    const authority=createAuthority(applicationOptions?.readers),source=authority.authenticate(event);
    const validate=()=>{if(!authority.revalidate(source))throw new Error('Native turn source authority revoked');};
    const claim=turnStore?.claim({campaignId:source.campaign,sourceRef:source.id,sourceRevision:source.revision});
    if(claim&&claim.status!=='claimed'){if(turnStore.inspectNative(source.campaign,source.id)?.status==='draft_saved')return resumePublication(source.campaign,source.id,{signal});return Object.freeze(claim);}
    if(onSource){await onSource(source,{signal});signal?.throwIfAborted();validate();}
    const refresh=()=>intake.ingest(nativeRequest,{signal});
    const app=createApplication({...applicationOptions,provider:{async generate(input){
      const refs=refreshContext?inputRefs(input):[];await refresh();validate();await refreshContext?.(source,refs,{signal});validate();const result=await provider.generate(input);await refresh();validate();await refreshContext?.(source,refs,{signal});validate();return result;
    }}});
    const result=await app.respond(event,{signal});
    await refresh();const publication=app.inspectPublication(result.publication.id);
    if(claim)turnStore.saveDraft(claim,{...publication,delivery:{channelId:nativeRequest.channelId,messageId:nativeRequest.messageId,mode:nativeRequest.mode}},{check:()=>{validate();app.inspectPublication(result.publication.id);}});
    pending.set(result.publication.id,{app,id:result.publication.id,source,request:nativeRequest,claim,validate,reviewSequence:0});return result;
  }
  async function inspectPublication(id,{signal}={}){
    const entry=pending.get(id);if(!entry)throw new Error('Publication not available');
    await refreshPending(entry,signal);return entry.app.inspectPublication(id);
  }
  async function reviewPublication(id,{signal}={}){
    const entry=pending.get(id);if(!entry)throw new Error('Publication not available');
    await refreshPending(entry,signal);signal?.throwIfAborted();entry.validate();
    const review=entry.app.reviewPublication(id);
    if(entry.claim){
      const saved=turnStore.saveReview(entry.claim,review,{expectedSequence:entry.reviewSequence,check:()=>{
        entry.validate();if(JSON.stringify(entry.app.reviewPublication(id))!==JSON.stringify(review))throw new Error('Native publication review changed');
      }});entry.reviewSequence=saved.sequence;
    }
    return review;
  }
  async function repairPublication(id,segmentId,replacement,{signal}={}){
    const entry=pending.get(id);if(!entry)throw new Error('Publication not available');
    await refreshPending(entry,signal);signal?.throwIfAborted();entry.validate();
    const before=entry.app.reviewPublication(id);let saved;
    const result=entry.app.repairPublication(id,segmentId,replacement,{commit:(after,{check})=>{
      const current=()=>{signal?.throwIfAborted();entry.validate();check();if(JSON.stringify(entry.app.reviewPublication(id))!==JSON.stringify(before))throw new Error('Local repair base changed');};
      if(entry.claim)saved=turnStore.saveReview(entry.claim,after,{repairFrom:before,expectedSequence:entry.reviewSequence,check:current});else current();
    }});
    if(saved)entry.reviewSequence=saved.sequence;
    return result;
  }
  /** Replay only a confirmed never-sent draft. No inference, human approval,
   * invented empty lineage or retry of publishing/uncertain/delivered rows.
   */
  async function resumePublication(campaignId,sourceRef,{signal}={}){
    const row=turnStore?.inspectNative(campaignId,sourceRef),draft=row?.data?.draft;
    if(row?.status!=='draft_saved'||!draft||hash(draft)!==row.data.fingerprint||!Array.isArray(draft.contextDependencies)||!draft.contextDependencies.length||draft.contextDependencies.length>17||!Array.isArray(draft.receiptDependencies))throw new Error('Complete native never-sent publication lineage required');
    const authority=createAuthority(applicationOptions.readers),event=authority.eventForReference(sourceRef),channel=applicationOptions.readers.readChannel(campaignId,draft.delivery.channelId);
    if(event.campaignId!==campaignId||!channel||channel.sceneId!==draft.audience.scene||draft.audience.campaign!==campaignId||draft.audience.source_ref!==sourceRef)throw new Error('Saved narrative source scope changed');
    const request={guildId:campaignId,channelId:channel.id,messageId:event.messageId,userId:event.userId,actorId:event.actorId,sceneId:channel.sceneId,mode:channel.kind,ownerUserId:channel.ownerUserId??null,gmRoleId:readGmRoleId(campaignId),participantIds:channel.kind==='party'?channel.recipientIds:[]};
    await intake.ingest(request,{signal});const source=authority.inspectReference(sourceRef,row.revision),context=createContextAuthority({sourceAuthority:authority,records:applicationOptions.records??applicationOptions.knowledge?.store,readActor:applicationOptions.readers.readActor});
    const validate=()=>{if(!authority.revalidate(source)||source.revision!==draft.audience.revision||JSON.stringify(source.recipients)!==JSON.stringify(draft.audience.recipients))throw new Error('Saved narrative source authority revoked');for(const manifest of draft.contextDependencies)context.verifyDependencies(source,manifest);if(draft.receiptDependencies.length){if(typeof applicationOptions.actionAuthority?.verifyDependencies!=='function')throw new Error('Saved native receipt verifier unavailable');applicationOptions.actionAuthority.verifyDependencies(source,draft.receiptDependencies);}};
    validate();const material=applicationOptions.proseReview??createProseMaterialReview(),savedReview=row.data.review?.value,text=savedReview?.segments?.map(s=>s.text).join('\n\n')??draft.text;
    const app={inspectPublication(){validate();return structuredClone(draft);},reviewPublication(){validate();const segments=material.review(text,draft.audience,{receiptDependencies:draft.receiptDependencies});validate();return {id:draft.id,status:'requires_semantic_review',sent:false,knowledgeAcknowledged:false,candidateText:segments.filter(s=>s.status==='screened').map(s=>s.text).join('\n\n'),segments,heldCount:segments.filter(s=>s.status==='withheld').length,retiredCount:savedReview?.retiredCount??0};}};
    const claim={status:'claimed',campaignId,sourceRef,sourceRevision:row.revision,token:row.token};pending.set(draft.id,{app,id:draft.id,source,request,claim,validate,reviewSequence:row.data.review?.sequence??0});return Object.freeze({status:'resumed_never_sent',publication:{id:draft.id,sent:false},metrics:{modelCalls:0,traceId:draft.traceId}});
  }
  function inspectSend(grant){
    const state=grant&&publicationGrants.get(grant);if(!state)throw new Error('Issued autonomous publication grant required');const {entry,reviewHash,payload}=state;entry.validate();
    const review=entry.app.reviewPublication(entry.id),row=turnStore?.inspectNative(payload.campaignId,payload.sourceRef);
    if((payload.kind==='system_notice'?payload.text!==failureNotice:review.heldCount!==0)||hash(review)!==reviewHash||!row||!['draft_saved','publishing','published'].includes(row.status)||row.data?.fingerprint!==payload.draftFingerprint||row.status!=='draft_saved'&&(row.data.authorization?.authority!=='native_ai_gm'||row.data.authorization.kind!==payload.kind||row.data.authorization.traceId!==payload.traceId||row.data.authorization.sourceRef!==payload.sourceRef||row.data.authorization.sourceRevision!==payload.sourceRevision||row.data.authorization.reviewHash!==reviewHash||row.data.authorization.textHash!==hash(payload.text)||hash(row.data.authorization.parts)!==hash(state.parts)))throw new Error('Autonomous publication authority changed');
    return structuredClone(payload);
  }
  async function preparePublication(id,{signal}={}){
    if(!turnStore)throw new Error('Durable autonomous publication store required');let review=await reviewPublication(id,{signal}),repairCalls=0;const entry=pending.get(id);
    while(review.heldCount&&repairCalls<2&&typeof entry.app.proposeRepairPublication==='function'){
      const segment=review.segments.find(s=>s.status==='withheld');repairCalls++;try{const replacement=await entry.app.proposeRepairPublication(id,segment.id,{signal});await repairPublication(id,segment.id,replacement,{signal});review=await reviewPublication(id,{signal});}catch{signal?.throwIfAborted();break;}
    }
    const kind=review.heldCount||!review.candidateText.trim()?'system_notice':'narrative';
    const draft=entry.app.inspectPublication(id),row=turnStore.inspectNative(entry.source.campaign,entry.source.id);
    if(row?.status!=='draft_saved'||!entry.claim||draft.audience.source_ref!==entry.source.id)throw new Error('Fresh saved native publication required');
    const payload={kind,repairCalls,campaignId:entry.source.campaign,sceneId:entry.source.scene,sourceRef:entry.source.id,sourceRevision:entry.source.revision,traceId:draft.traceId,text:kind==='system_notice'?failureNotice:review.candidateText,audience:draft.audience,delivery:draft.delivery??row.data.draft.delivery,draftFingerprint:row.data.fingerprint,reviewHash:hash(review)},grant=Object.freeze(Object.create(null));publicationGrants.set(grant,{entry,reviewHash:hash(review),payload});inspectSend(grant);return {status:'ready',grant};
  }
  async function refreshPublication(grant,{signal}={}){const state=grant&&publicationGrants.get(grant);if(!state)throw new Error('Issued autonomous publication grant required');await refreshPending(state.entry,signal);return inspectSend(grant);}
  function beginPublication(grant,parts){const p=inspectSend(grant);if(!Array.isArray(parts)||parts.join('')!==p.text)throw new Error('Exact native publication text required');publicationGrants.get(grant).parts=structuredClone(parts);return turnStore.beginPublication(p.campaignId,p.sourceRef,{expectedFingerprint:p.draftFingerprint,authorization:{authority:'native_ai_gm',kind:p.kind,sourceRef:p.sourceRef,sourceRevision:p.sourceRevision,traceId:p.traceId,reviewHash:p.reviewHash,textHash:hash(p.text),parts},check:()=>inspectSend(grant)});}
  function recordPublicationPart(grant,index,messageId){const p=inspectSend(grant);return turnStore.recordPublicationPart(p.campaignId,p.sourceRef,{index,messageId},{check:()=>inspectSend(grant)});}
  function finishPublication(grant){const p=inspectSend(grant);return turnStore.finishPublication(p.campaignId,p.sourceRef,{check:()=>inspectSend(grant)});}
  function uncertainPublication(grant,reason,observedParts=[]){const state=grant&&publicationGrants.get(grant);if(!state)throw new Error('Issued autonomous publication grant required');return turnStore.markPublicationUncertain(state.payload.campaignId,state.payload.sourceRef,reason,observedParts);}
  return Object.freeze({respond,resumePublication,inspectPublication,reviewPublication,repairPublication,preparePublication,refreshPublication,inspectSend,beginPublication,recordPublicationPart,finishPublication,uncertainPublication});
}
