import {createHash} from 'node:crypto';
import {MessageFlags} from 'discord.js';
import {gmHookImportInput} from './gm-hook-import-input.js';
import {createGmHookAttachmentReader} from './gm-hook-attachment-reader.js';
import {createCharacterPackageService} from './character-package-service.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
/** Existing human-GM command only. Imported material stays private and proposed;
 * neither this transport receipt nor an imported relationship controls a PC.
 */
export function createDiscordGmHookImports({client,repository,readCharacter,hookStore,gmAuthority,interactionReceipts,fetchImpl=fetch,onError=()=>{}}){
 if(typeof repository?.findExportCharacter!=='function'||typeof readCharacter!=='function'||typeof hookStore?.commitImport!=='function'||typeof interactionReceipts?.claim!=='function')throw new TypeError('Native private GM import dependencies required');
 const reader=createGmHookAttachmentReader({gmAuthority,fetchImpl}),pending=new Map(),controller=new AbortController();let closed=false;
 const claimsRoute=e=>{try{return e?.isChatInputCommand?.()===true&&(e.commandName==='vc-character'||e.commandName==='vc'&&e.options.getSubcommandGroup(false)==='character')&&e.options.getSubcommand()==='import-gm-hooks';}catch{return false;}};
 const report=(error,e,stage)=>{try{onError(error,{interactionId:e.id,stage});}catch{}};
 async function execute(e){
  const input=gmHookImportInput(e),original=hash([e.id,e.guildId,e.channelId,e.user?.id,e.commandName,input]);
  const alive=()=>{controller.signal.throwIfAborted();if(closed||e.client!==client||e.user?.bot!==false||hash([e.id,e.guildId,e.channelId,e.user.id,e.commandName,gmHookImportInput(e)])!==original)throw new Error('GM hook import command changed');};
  alive();const eventId=e.id,campaignId=e.guildId,principal=e.user.id,bookkeeping=()=>{};
  const binding={id:eventId,kind:'discord_command',campaignId,sceneId:'gm-hook-import',actorId:`human-gm:${principal}`,principal,channelId:e.channelId,requestRef:'gm-hook-import',commandHash:hash([e.commandName,input])};
  if(!interactionReceipts.claim(binding,{check:alive}).created)return {handled:true,status:'already_claimed'};
  let stage='defer';
  try{
   if(e.deferred||e.replied||typeof e.deferReply!=='function'||typeof e.editReply!=='function')throw new Error('Private GM import acknowledgement required');
   await e.deferReply({flags:MessageFlags.Ephemeral});interactionReceipts.acknowledge(eventId,'deferred',{check:bookkeeping});stage='source';
   alive();if(e.ephemeral!==true)throw new Error('Private GM import required');const prepared=await reader.read(e,{signal:controller.signal});
   const selected=repository.findExportCharacter(campaignId,prepared.character);if(!selected||selected.guild_id!==campaignId)throw new Error('One current campaign character required');
   const characterId=selected.id,selection=hash(selected);
   const current=()=>{alive();if(e.ephemeral!==true||prepared.campaignId!==campaignId||prepared.principal!==principal)throw new Error('Exact private GM import source required');prepared.check();if(hash(repository.findExportCharacter(campaignId,prepared.character))!==selection)throw new Error('GM import character selection changed');};
   const service=createCharacterPackageService({repository,hookStore,readCharacter,readRevision:(c,id)=>hash(readCharacter(c,id)),authenticate(){current();return {principal,campaign:campaignId,role:'human_gm',sourceRef:prepared.sourceRef,revision:prepared.sourceRevision};},resolveRelationshipTarget(c,query){
    // Labels alone do not establish NPC/faction identities. Preserve unresolved
    // targets as import holds until their authoritative identity readers exist.
    if(query.type!=='character')return null;const target=repository.findExportCharacter(c,query.key||query.label);
    if(!target||target.guild_id!==c||target.status!=='active')return null;
    return {campaignId:c,type:'character',status:'active',id:target.id,label:target.name,revision:hash(target)};
   }});
   const file=prepared.attachments.find(a=>a.id===input.narrative?.id),narrative=prepared.narrative===null?null:{text:prepared.narrative,attachmentId:file.id,sourceFilename:file.name,sha256:file.sha256};
   current();stage='effects';const receipt=service.importHooks(e,{characterId,payload:prepared.packet,narrative});stage='receipt';
   interactionReceipts.complete(eventId,{id:receipt.id,hash:hash(receipt)},{check:current});interactionReceipts.claimReply(eventId,{check:current});
   try{await e.editReply({content:`GM-private import saved: ${receipt.hooks} hooks, ${receipt.canonSuggestions} pending canon suggestions, ${receipt.relationshipsApplied} private connections${receipt.narrativeRevision===null?'':', and private narrative'}. ${receipt.relationshipHolds.length} connection targets need review. Canon approval and player choices remain separate.`,allowedMentions:{parse:[]}});interactionReceipts.finishReply(eventId,'delivered',{check:bookkeeping});}catch(error){interactionReceipts.finishReply(eventId,'uncertain',{check:bookkeeping});report(error,e,'gm_import_reply');}
   return {handled:true,status:'imported_private'};
  }catch(error){
   report(error,e,stage);try{const row=interactionReceipts.read(eventId);if(row.ack==='claimed')interactionReceipts.acknowledge(eventId,'uncertain',{check:bookkeeping});const held=interactionReceipts.hold(eventId,closed?'closed':stage,{check:bookkeeping});
    if(!closed&&held.ack==='deferred'&&held.reply==='not_started'&&e.ephemeral===true){interactionReceipts.claimReply(eventId,{check:bookkeeping});try{await e.editReply({content:'This private import needs native review. Do not repeat it to resolve an uncertain result.',allowedMentions:{parse:[]}});interactionReceipts.finishReply(eventId,'delivered',{check:bookkeeping});}catch{interactionReceipts.finishReply(eventId,'uncertain',{check:bookkeeping});}}
   }catch(storageError){report(storageError,e,'gm_import_receipt');}return {handled:true,status:'native_review_required'};
  }
 }
 async function handle(e){if(!claimsRoute(e))return false;if(pending.has(e.id))return pending.get(e.id);const job=execute(e);pending.set(e.id,job);try{return await job;}finally{pending.delete(e.id);}}
 return Object.freeze({claimsRoute,handle,close(){closed=true;controller.abort();}});
}
