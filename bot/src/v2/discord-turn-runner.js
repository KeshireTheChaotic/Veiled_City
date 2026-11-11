import {createRehearsal} from './rehearsal.js';
import {createSourceAuthority} from './source-authority.js';
/** Native no-send orchestration. Every turn owns its audience application;
 * only async refreshed inspection is exposed for its publication.
 */
export function createDiscordTurnRunner({intake,provider,applicationOptions,createApplication=createRehearsal,createAuthority=createSourceAuthority,turnStore=null}){
  if(typeof intake?.ingest!=='function'||typeof provider?.generate!=='function'||typeof createApplication!=='function')throw new TypeError('Native intake, provider and application required');
  const pending=new Map();
  async function respond(request,{signal}={}){
    const nativeRequest=structuredClone(request),event=await intake.ingest(nativeRequest,{signal});
    const authority=createAuthority(applicationOptions?.readers),source=authority.authenticate(event);
    const validate=()=>{if(!authority.revalidate(source))throw new Error('Native turn source revoked');};
    const claim=turnStore?.claim({campaignId:source.campaign,sourceRef:source.id,sourceRevision:source.revision});
    if(claim&&claim.status!=='claimed')return Object.freeze(claim);
    const refresh=()=>intake.ingest(nativeRequest,{signal});
    const app=createApplication({...applicationOptions,provider:{async generate(input){
      await refresh();validate();const result=await provider.generate(input);await refresh();validate();return result;
    }}});
    const result=await app.respond(event,{signal});
    await refresh();const publication=app.inspectPublication(result.publication.id);
    if(claim)turnStore.saveDraft(claim,{...publication,delivery:{channelId:nativeRequest.channelId,messageId:nativeRequest.messageId,mode:nativeRequest.mode}},{check:()=>{validate();app.inspectPublication(result.publication.id);}});
    pending.set(result.publication.id,{app,request:nativeRequest,claim,validate,reviewSequence:0});return result;
  }
  async function inspectPublication(id,{signal}={}){
    const entry=pending.get(id);if(!entry)throw new Error('Publication not available');
    await intake.ingest(entry.request,{signal});return entry.app.inspectPublication(id);
  }
  async function reviewPublication(id,{signal}={}){
    const entry=pending.get(id);if(!entry)throw new Error('Publication not available');
    await intake.ingest(entry.request,{signal});signal?.throwIfAborted();entry.validate();
    const review=entry.app.reviewPublication(id);
    if(entry.claim){
      const saved=turnStore.saveReview(entry.claim,review,{expectedSequence:entry.reviewSequence,check:()=>{
        entry.validate();if(JSON.stringify(entry.app.reviewPublication(id))!==JSON.stringify(review))throw new Error('Native publication review changed');
      }});entry.reviewSequence=saved.sequence;
    }
    return review;
  }
  return Object.freeze({respond,inspectPublication,reviewPublication});
}
