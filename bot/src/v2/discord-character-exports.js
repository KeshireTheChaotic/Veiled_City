import {createHash} from 'node:crypto';
import {MessageFlags} from 'discord.js';
import {createOwnerCharacterExport} from './owner-character-export.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id=value=>typeof value==='string'&&value.length>0&&value.length<=256;
/** Owner-only branch of the existing character export command. No inference,
 * imports, GM export, resource changes, automatic retries or channel publication.
 */
export function createDiscordCharacterExports({client,repository,readCharacter,interactionReceipts,wasObserved,clock=()=>Date.now(),onError=()=>{}}){
 if(typeof wasObserved!=='function'||typeof repository?.listCharacters!=='function'||typeof interactionReceipts?.claim!=='function')throw new TypeError('Native character export dependencies required');
 const exports=createOwnerCharacterExport({repository,...(readCharacter?{readCharacter}:{})}),pending=new Map(),controller=new AbortController();let closed=false;
 const report=(error,e,stage)=>{try{onError(error,{interactionId:e.id,stage});}catch{}};
 function parse(e){try{
  if(e?.isChatInputCommand?.()!==true||!(e.commandName==='vc-character'||e.commandName==='vc'&&e.options.getSubcommandGroup(false)==='character')||e.options.getSubcommand()!=='export')return null;
  const query=e.options.getString('character')??'',format=e.options.getString('format')??'docx';return typeof query==='string'&&query.length<=256&&['json','markdown','docx','all'].includes(format)?{query,format}:null;
 }catch{return null;}}
 function select(campaign,owner,query){
  const all=repository.listCharacters(campaign,owner,{includeClosed:true}).filter(c=>c.guild_id===campaign&&c.owner_user_id===owner);
  const choices=query?all.filter(c=>c.id===query||c.name===query):all.length===1?all:all.filter(c=>c.status==='active');
  if(choices.length!==1||!id(choices[0].id))throw new Error('One exact owned character export selection required');return choices[0].id;
 }
 async function execute(e,parsed){
  if(closed||wasObserved(e)!==true||e.client!==client||e.user?.bot!==false||![e.id,e.guildId,e.channelId,e.user.id].every(id))throw new Error('Observed native character export command required');
  const source={id:e.id,campaign:e.guildId,channel:e.channelId,principal:e.user.id,command:e.commandName,parsed},characterId=select(source.campaign,source.principal,parsed.query),bookkeeping=()=>{};
  const alive=()=>{controller.signal.throwIfAborted();if(closed||e.client!==client||e.user?.bot!==false||hash({id:e.id,campaign:e.guildId,channel:e.channelId,principal:e.user.id,command:e.commandName,parsed:parse(e)})!==hash(source))throw new Error('Character export command changed');};
  const owned=()=>{alive();const c=repository.getCharacter(characterId);if(c?.guild_id!==source.campaign||c.owner_user_id!==source.principal||c.id!==characterId)throw new Error('Character export ownership changed');};
  const binding={id:source.id,kind:'discord_command',campaignId:source.campaign,sceneId:'character-export',actorId:characterId,principal:source.principal,channelId:source.channel,requestRef:`player-${parsed.format}-export`,commandHash:hash([source.command,parsed])};
  if(!interactionReceipts.claim(binding,{check:owned}).created)return {handled:true,status:'already_claimed'};
  let stage='defer',membershipExpires=0;
  const current=()=>{owned();if(clock()>membershipExpires||e.ephemeral!==true)throw new Error('Fresh private owner export authorization required');};
  async function refresh(){
   alive();const guild=await client.guilds.fetch({guild:source.campaign,force:true}),member=guild?.id===source.campaign?await guild.members.fetch({user:source.principal,force:true}):null;
   owned();if(member?.id!==source.principal||member.guild?.id!==source.campaign||member.user?.bot!==false)throw new Error('Current guild owner membership required');membershipExpires=clock()+5000;
  }
  try{
   if(e.deferred||e.replied||typeof e.deferReply!=='function'||typeof e.editReply!=='function')throw new Error('Private export acknowledgement required');
   await e.deferReply({flags:MessageFlags.Ephemeral});interactionReceipts.acknowledge(source.id,'deferred',{check:bookkeeping});stage='source';
   await refresh();current();const document=exports.prepare({campaignId:source.campaign,ownerUserId:source.principal,characterId,format:parsed.format},{check:current});
   await refresh();document.check();stage='receipt';
   interactionReceipts.complete(source.id,{id:`character-export:${source.id}`,hash:document.hash},{check:current});
   document.check();interactionReceipts.claimReply(source.id,{check:current});
   try{
    await e.editReply({content:'Your player-safe character export.',files:document.files.map(f=>({attachment:Buffer.from(f.base64,'base64'),name:f.name})),allowedMentions:{parse:[]}});
    interactionReceipts.finishReply(source.id,'delivered',{check:bookkeeping});
   }catch(error){interactionReceipts.finishReply(source.id,'uncertain',{check:bookkeeping});report(error,e,'export_reply');}
   return {handled:true,status:'export_prepared'};
  }catch(error){
   report(error,e,stage);
   try{
    const row=interactionReceipts.read(source.id);if(row.ack==='claimed')interactionReceipts.acknowledge(source.id,'uncertain',{check:bookkeeping});
    const held=interactionReceipts.hold(source.id,closed?'closed':stage,{check:bookkeeping});
    if(!closed&&held.ack==='deferred'&&held.reply==='not_started'&&e.ephemeral===true){
     interactionReceipts.claimReply(source.id,{check:bookkeeping});try{await e.editReply({content:'This character export could not be confirmed. No file was sent; native review is required.',allowedMentions:{parse:[]}});interactionReceipts.finishReply(source.id,'delivered',{check:bookkeeping});}catch{interactionReceipts.finishReply(source.id,'uncertain',{check:bookkeeping});}
    }
   }catch(storageError){report(storageError,e,'export_receipt');}
   return {handled:true,status:'native_review_required'};
  }
 }
 async function handle(e){const parsed=parse(e);if(!parsed)return false;if(pending.has(e.id))return pending.get(e.id);const job=execute(e,parsed);pending.set(e.id,job);try{return await job;}finally{pending.delete(e.id);}}
 return Object.freeze({handle,claimsRoute:e=>parse(e)!==null,close(){closed=true;controller.abort();}});
}
