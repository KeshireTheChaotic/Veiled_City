import {createSourceAuthority} from './source-authority.js';
import {isDeepStrictEqual} from 'node:util';
const withoutRevision=row=>{if(!row)return null;const {revision,...data}=row;return data;};
/** Native ingress only. Transport supplies request IDs; no model capability can
 * call this adapter. Scene/session/control must already be provisioned natively.
 */
export function createDiscordIntake({messageReader,sceneStore}){
  if(typeof messageReader?.read!=='function'||typeof sceneStore?.commitSnapshot!=='function')throw new TypeError('Native message reader and scene store required');
  async function ingest(request,{signal}={}){
    const first=await messageReader.read(request,{signal});
    const event={campaignId:request.guildId,messageId:request.messageId,userId:request.userId,actorId:request.actorId};
    const readers={...sceneStore.readers,readMessage:(c,id)=>c===event.campaignId&&id===event.messageId?first.messageRecord:null,
      readChannel:(c,id)=>c===event.campaignId&&id===first.audience.channelRecord.id?first.audience.channelRecord:null};
    // Candidate revisions are native evidence identities, never supplied model revisions.
    readers.readMessage=(c,id)=>c===event.campaignId&&id===event.messageId?{...first.messageRecord,revision:first.fingerprint}:null;
    readers.readChannel=(c,id)=>c===event.campaignId&&id===first.audience.channelRecord.id?{...first.audience.channelRecord,revision:first.audience.fingerprint}:null;
    createSourceAuthority(readers).authenticate(event);
    const records=[];
    for(const [kind,data,read] of [['channel',first.audience.channelRecord,sceneStore.readers.readChannel],['message',first.messageRecord,sceneStore.readers.readMessage]]){
      const current=read(event.campaignId,data.id);
      if(!isDeepStrictEqual(withoutRevision(current),data))records.push({kind,data,expectedRevision:current?Number(current.revision):null});
    }
    const second=await messageReader.read(request,{signal});signal?.throwIfAborted();
    if(second.fingerprint!==first.fingerprint)throw new Error('Discord evidence changed during intake');
    const check=()=>{signal?.throwIfAborted();createSourceAuthority(readers).authenticate(event);};
    check();
    if(records.length)sceneStore.commitSnapshot({campaignId:event.campaignId,principal:event.userId,sourceRef:`discord-intake:${first.fingerprint}`,records},{check});
    return Object.freeze(event);
  }
  return Object.freeze({ingest});
}
