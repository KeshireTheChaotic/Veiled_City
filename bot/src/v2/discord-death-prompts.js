import {createHash} from 'node:crypto';
import {createDiscordAudienceReader} from './discord-audience-reader.js';
import {deathPromptPayload} from './death-prompts.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Opt-in native publication. A claimed or uncertain send is never retried.
 * Reconciliation only fetches an already saved native response message.
 */
export function createDiscordDeathPrompts({client,promptStore,readTerms,readRoute}){
  const audiences=createDiscordAudienceReader({client});
  if(typeof promptStore?.claim!=='function'||typeof promptStore?.acknowledge!=='function'||typeof readTerms!=='function'||typeof readRoute!=='function')throw new TypeError('Native death publication dependencies required');
  function context(ref,check,signal){
    if(typeof check!=='function')throw new Error('Native death publication authority required');check();signal?.throwIfAborted();
    const row=promptStore.read(ref),route=structuredClone(readRoute(ref));
    if(!row||!['awaiting_delivery','delivering','uncertain','active'].includes(row.status)||route?.guildId!==row.terms.campaignId||route.channelId!==row.channelId||route.sceneId!==row.terms.sceneId||route.ownerUserId!==row.terms.ownerUserId)throw new Error('Exact current native owner death route required');
    const current=()=>{check();signal?.throwIfAborted();const latest=promptStore.read(ref);if(!latest||!['awaiting_delivery','delivering','uncertain','active'].includes(latest.status)||latest.termsHash!==row.termsHash||latest.payloadHash!==row.payloadHash||hash(deathPromptPayload(latest.payload))!==row.payloadHash||hash(readTerms(row.terms.campaignId,row.terms.requestRef,row.terms.purpose))!==row.termsHash||JSON.stringify(readRoute(ref))!==JSON.stringify(route))throw new Error('Death publication terms, route or authority changed');};current();
    return {row,route,current,request:{guildId:route.guildId,channelId:route.channelId,sceneId:route.sceneId,ownerUserId:route.ownerUserId,gmRoleId:route.gmRoleId??null,mode:'private'}};
  }
  async function channelFor(route){const guild=await client.guilds.fetch({guild:route.guildId,force:true}),channel=await guild.channels.fetch(route.channelId,{force:true});if(guild.id!==route.guildId||channel?.guildId!==route.guildId||channel.id!==route.channelId||typeof channel.messages?.fetch!=='function')throw new Error('Native death publication channel required');return channel;}
  async function readback(ref,ctx,channel,response,signal){
    const {row,route,current,request}=ctx,message=await channel.messages.fetch({message:response.messageId,force:true}),after=await audiences.read(request,{signal});current();
    if(after.fingerprint!==response.audienceFingerprint||message?.id!==response.messageId||message.guildId!==route.guildId||message.channelId!==route.channelId||message.author?.id!==client.user?.id||message.author?.bot!==true||message.webhookId||message.system||hash(deathPromptPayload(message))!==row.payloadHash)throw new Error('Exact native owner death delivery readback required');
    const proof={status:'delivered',campaignId:row.terms.campaignId,channelId:route.channelId,messageId:response.messageId,payloadHash:row.payloadHash,recipientIds:[route.ownerUserId],attemptId:response.attemptId,audienceFingerprint:response.audienceFingerprint,gmRoleId:request.gmRoleId};
    return promptStore.acknowledge(ref,{check:current,readDelivery:()=>proof});
  }
  async function publish(ref,{check,signal}={}){
    const ctx=context(ref,check,signal),before=await audiences.read(ctx.request,{signal});ctx.current();
    const attempt=promptStore.claim(ref,{check:ctx.current,audienceFingerprint:before.fingerprint});
    try{
      const channel=await channelFor(ctx.route),fresh=await audiences.read(ctx.request,{signal});ctx.current();if(fresh.fingerprint!==before.fingerprint||typeof channel.send!=='function')throw new Error('Death prompt audience changed');
      const sent=await channel.send({...structuredClone(ctx.row.payload),allowedMentions:{parse:[]},nonce:hash(attempt.publication.attemptId).slice(0,24),enforceNonce:true});
      if(typeof sent?.id!=='string'||!sent.id)throw new Error('Native death send acknowledgement missing');
      const response={campaignId:ctx.row.terms.campaignId,promptRef:ref,attemptId:attempt.publication.attemptId,channelId:ctx.route.channelId,messageId:sent.id,audienceFingerprint:before.fingerprint};
      promptStore.recordResponse(ref,response.attemptId,{check:ctx.current,readResponse:()=>response});
      return await readback(ref,ctx,channel,response,signal);
    }catch(error){try{promptStore.markUncertain(ref,attempt.publication.attemptId,{check});}catch{}throw error;}
  }
  async function reconcile(ref,{check,signal}={}){
    const ctx=context(ref,check,signal),publication=ctx.row.publication,response=publication?.response;
    if(!response||!['delivering','uncertain','delivered'].includes(publication.status)||response.attemptId!==publication.attemptId||response.promptRef!==ref||response.campaignId!==ctx.row.terms.campaignId||response.channelId!==ctx.route.channelId||response.audienceFingerprint!==publication.audienceFingerprint)throw new Error('Saved native death send response required; no resend permitted');
    const before=await audiences.read(ctx.request,{signal});ctx.current();if(before.fingerprint!==response.audienceFingerprint)throw new Error('Saved death delivery audience changed');
    return readback(ref,ctx,await channelFor(ctx.route),response,signal);
  }
  return Object.freeze({publish,reconcile});
}
