import {createHash} from 'node:crypto';
import {MessageFlags} from 'discord.js';
import {createGmCharacterExport} from './gm-character-export.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
/** Explicit GM JSON export only. Human GM authority is refreshed around source
 * preparation. Export receipts never become gameplay or knowledge authority.
 */
export function createDiscordGmCharacterExports({client,repository,readCharacter,gmAuthority,interactionReceipts,onError=()=>{}}){
 if(typeof repository?.findExportCharacter!=='function'||typeof gmAuthority?.authorize!=='function'||typeof gmAuthority?.refresh!=='function'||typeof gmAuthority?.check!=='function'||typeof interactionReceipts?.claim!=='function')throw new TypeError('Native GM export dependencies required');
 const exports=createGmCharacterExport({repository,...(readCharacter?{readCharacter}:{})}),pending=new Map(),controller=new AbortController();let closed=false;
 const report=(error,e,stage)=>{try{onError(error,{interactionId:e.id,stage});}catch{}};
 function parse(e){try{if(e?.isChatInputCommand?.()!==true||!(e.commandName==='vc-character'||e.commandName==='vc'&&e.options.getSubcommandGroup(false)==='character')||e.options.getSubcommand()!=='export-gm'||e.options.getString('format')!=='json')return null;const character=e.options.getString('character',true);return typeof character==='string'&&character.length>0&&character.length<=256?{character,format:'json'}:null;}catch{return null;}}
 async function execute(e,parsed){
  const original=hash([e.id,e.guildId,e.channelId,e.user?.id,e.commandName,parsed]);
  const alive=()=>{controller.signal.throwIfAborted();if(closed||e.client!==client||e.user?.bot!==false||hash([e.id,e.guildId,e.channelId,e.user.id,e.commandName,parse(e)])!==original)throw new Error('GM character export command changed');};
  alive();const c=repository.findExportCharacter(e.guildId,parsed.character);if(!c||c.guild_id!==e.guildId)throw new Error('One campaign character required');
  const campaignId=e.guildId,characterId=c.id,eventId=e.id,bookkeeping=()=>{};
  const binding={id:eventId,kind:'discord_command',campaignId,sceneId:'character-export',actorId:characterId,principal:e.user.id,channelId:e.channelId,requestRef:'gm-json-export',commandHash:hash([e.commandName,parsed])};
  if(!interactionReceipts.claim(binding,{check:alive}).created)return {handled:true,status:'already_claimed'};
  let proof,stage='defer';
  const current=()=>{alive();if(e.ephemeral!==true)throw new Error('Private GM export required');gmAuthority.check(proof);};
  try{
   if(e.deferred||e.replied||typeof e.deferReply!=='function'||typeof e.editReply!=='function')throw new Error('Private GM export acknowledgement required');
   await e.deferReply({flags:MessageFlags.Ephemeral});interactionReceipts.acknowledge(eventId,'deferred',{check:bookkeeping});stage='authority';
   proof=await gmAuthority.authorize(e,{signal:controller.signal});current();if(proof.operation!=='gm_character_export'||proof.campaignId!==campaignId||proof.principal!==e.user.id)throw new Error('Exact GM export operation authority required');
   stage='source';const document=exports.prepare({campaignId,characterId},{check:current});
   proof=await gmAuthority.refresh(proof,{signal:controller.signal});document.check();stage='receipt';
   interactionReceipts.complete(eventId,{id:`gm-character-export:${eventId}`,hash:document.hash},{check:current});document.check();interactionReceipts.claimReply(eventId,{check:current});
   try{await e.editReply({content:'GM-private character exports. These include unrevealed hooks and canon suggestions.',files:document.files.map(f=>({name:f.name,attachment:Buffer.from(f.text,'utf8')})),allowedMentions:{parse:[]}});interactionReceipts.finishReply(eventId,'delivered',{check:bookkeeping});}catch(error){interactionReceipts.finishReply(eventId,'uncertain',{check:bookkeeping});report(error,e,'gm_export_reply');}
   return {handled:true,status:'export_prepared'};
  }catch(error){
   report(error,e,stage);try{
    const row=interactionReceipts.read(eventId);if(row.ack==='claimed')interactionReceipts.acknowledge(eventId,'uncertain',{check:bookkeeping});
    const held=interactionReceipts.hold(eventId,closed?'closed':stage,{check:bookkeeping});
    if(!closed&&held.ack==='deferred'&&held.reply==='not_started'&&e.ephemeral===true){interactionReceipts.claimReply(eventId,{check:bookkeeping});try{await e.editReply({content:'This GM export could not be confirmed. No file was sent; native review is required.',allowedMentions:{parse:[]}});interactionReceipts.finishReply(eventId,'delivered',{check:bookkeeping});}catch{interactionReceipts.finishReply(eventId,'uncertain',{check:bookkeeping});}}
   }catch(storageError){report(storageError,e,'gm_export_receipt');}return {handled:true,status:'native_review_required'};
  }
 }
 async function handle(e){const parsed=parse(e);if(!parsed)return false;if(pending.has(e.id))return pending.get(e.id);const job=execute(e,parsed);pending.set(e.id,job);try{return await job;}finally{pending.delete(e.id);}}
 return Object.freeze({handle,claimsRoute:e=>parse(e)!==null,close(){closed=true;controller.abort();}});
}
