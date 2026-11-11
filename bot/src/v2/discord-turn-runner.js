import {createRehearsal} from './rehearsal.js';
import {createSourceAuthority} from './source-authority.js';
/** Native no-send orchestration. Every turn owns its audience application;
 * only async refreshed inspection is exposed for its publication.
 */
export function createDiscordTurnRunner({intake,provider,applicationOptions,createApplication=createRehearsal,createAuthority=createSourceAuthority,turnStore=null,refreshContext=null,onSource=null}){
  if(typeof intake?.ingest!=='function'||typeof provider?.generate!=='function'||typeof createApplication!=='function')throw new TypeError('Native intake, provider and application required');
  if(refreshContext!==null&&typeof refreshContext!=='function')throw new TypeError('Native context refresh required');
  if(onSource!==null&&typeof onSource!=='function')throw new TypeError('Native source observer required');
  const pending=new Map();
  const manifestRefs=p=>(p.contextDependencies??[]).flatMap(m=>m.records.map(r=>r.ref));
  const inputRefs=input=>[...new Set([...(input.context.records??[]).map(r=>r.ref),...(input.history??[]).flatMap(h=>(h.toolResults??[]).filter(t=>t.result?.source_ref===input.context.source_ref).flatMap(t=>(t.result.records??[]).map(r=>r.ref)))])];
  async function refreshPending(entry,signal){await intake.ingest(entry.request,{signal});entry.validate();if(refreshContext){const publication=entry.app.inspectPublication(entry.id);await refreshContext(entry.source,manifestRefs(publication),{signal});entry.validate();}}
  async function respond(request,{signal}={}){
    const nativeRequest=structuredClone(request),event=await intake.ingest(nativeRequest,{signal});
    const authority=createAuthority(applicationOptions?.readers),source=authority.authenticate(event);
    const validate=()=>{if(!authority.revalidate(source))throw new Error('Native turn source authority revoked');};
    const claim=turnStore?.claim({campaignId:source.campaign,sourceRef:source.id,sourceRevision:source.revision});
    if(claim&&claim.status!=='claimed')return Object.freeze(claim);
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
  return Object.freeze({respond,inspectPublication,reviewPublication,repairPublication});
}
