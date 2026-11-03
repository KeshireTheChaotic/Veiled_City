import {createSourceAuthority} from './source-authority.js';
const data=row=>{const {revision,...rest}=row;return rest;};
const stable=row=>JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>[key,Array.isArray(value)?[...value].sort():value])));
/** Native component evidence becomes an explicitly labelled source, not invented
 * PC dialogue. Audience drift requires native channel reconciliation first.
 */
export function createComponentChoiceSources({decisionReader,sceneStore,sourceAuthority,audienceReader}){
  if(typeof decisionReader?.readNative!=='function'||typeof sceneStore?.commitSnapshot!=='function'||typeof sourceAuthority?.eventForReference!=='function'||typeof audienceReader?.read!=='function')throw new TypeError('Native component source dependencies required');
  async function ingest(interactionId,{signal}={}){
    const decision=decisionReader.readNative(interactionId);if(!decision)throw new Error('Observed native decision required');const fingerprint=JSON.stringify(decision);
    const channel=sceneStore.readers.readChannel(decision.campaignId,decision.channelId);if(!channel||channel.sceneId!==decision.sceneId)throw new Error('Current component scene channel required');
    const audience=await audienceReader.read({guildId:decision.campaignId,channelId:decision.channelId,sceneId:decision.sceneId,mode:channel.kind,ownerUserId:channel.ownerUserId??null},{signal});
    if(stable(data(channel))!==stable(audience.channelRecord))throw new Error('Component audience requires reconciliation');
    if(decision.audienceFingerprint!==undefined&&decision.audienceFingerprint!==audience.fingerprint)throw new Error('Observed component audience changed');
    const labels={death_review:'death risk review',death_choice:'death move choice'},purpose=decision.purpose;
    if(purpose!==undefined&&!Object.hasOwn(labels,purpose))throw new Error('Supported native owner decision purpose required');
    const event={campaignId:decision.campaignId,messageId:interactionId,userId:decision.principal,actorId:decision.actorId},message={id:interactionId,campaignId:decision.campaignId,userId:decision.principal,channelId:decision.channelId,deleted:false,text:`Native owner ${purpose===undefined?'cost':labels[purpose]} decision: ${decision.decision}`,origin:'discord_component'};
    const old=sceneStore.readers.readMessage(event.campaignId,interactionId);
    if(old&&stable(data(old))!==stable(message))throw new Error('Component source identity conflict');
    const candidate=createSourceAuthority({...sceneStore.readers,readMessage:(c,id)=>c===event.campaignId&&id===interactionId?{...message,revision:old?.revision??'1'}:null});
    const check=()=>{signal?.throwIfAborted();if(JSON.stringify(decisionReader.readNative(interactionId))!==fingerprint)throw new Error('Component decision changed');candidate.authenticate(event);};check();
    if(!old)sceneStore.commitSnapshot({campaignId:event.campaignId,principal:event.userId,sourceRef:`component-source:${interactionId}`,records:[{kind:'message',data:message,expectedRevision:null}]},{check});
    return sourceAuthority.authenticate(event);
  }
  function readDecision(sourceRef){const event=sourceAuthority.eventForReference(sourceRef),proof=sourceAuthority.authenticate(event),decision=decisionReader.readNative(event.messageId);
    if(!decision||decision.campaignId!==proof.campaign||decision.sceneId!==proof.scene||decision.principal!==proof.principal||!proof.actors.includes(decision.actorId))throw new Error('Current component source decision required');
    return {...decision,sourceRef:proof.id,sourceRevision:proof.revision};
  }
  return Object.freeze({ingest,readDecision});
}
