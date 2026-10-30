/** Original play-channel publisher; root supplies unchanged source/output validators. */
import {publicationDiscordChannels,publicationDiscordText} from './contracts/discord-channels.js';
import {publicationOperations} from './contracts/operations.js';
import {notSent} from './delivery-receipts.js';
const {textChannel}=publicationDiscordChannels;
const {splitDiscordText:chunks}=publicationDiscordText;
const {turnTraceFor}=publicationOperations;
export function createPlayMessagePublisher({assertPvpOutput,prepareStoredOutput,substantivePreparedOutput,revalidateOutputPublication}){
  if([assertPvpOutput,prepareStoredOutput,substantivePreparedOutput,revalidateOutputPublication].some(value=>typeof value!=='function'))throw new TypeError('Play publication requires the original output validation callbacks.');
async function postPlayMessage({db,guild,content,sessionId=null,authority=null,publication=null}){
  const scope={mode:"party",actorUserId:null,actorCharacterId:null},needsProof=!!db.getActiveSession(guild.id);
  let substantive=false;
  const check=()=>{
    if(publication){
      if(publication.visibility!=="party"||publication.target_user_id||content!==publication.payload)throw notSent("Exact party publication required.");
      revalidateOutputPublication(db,guild.id,publication);
    }else if(authority){
      const {result,scope:sourceScope}=authority;
      if(sourceScope?.mode!=="party"||content!==result.narration&&content!==`**Encounter Aftermath**\n${result.player_summary}`)
        throw Object.assign(new Error("Exact native output body required."),{code:"NARRATIVE_PVP"});
      assertPvpOutput(db,guild.id,result,sourceScope,{publication:true});
      substantive=substantivePreparedOutput(db,guild.id,result,sourceScope);
    }else if(needsProof)substantive=substantivePreparedOutput(db,guild.id,prepareStoredOutput(db,guild.id,content,scope),scope);
  };
  check();
  const c=db.getCampaign(guild.id);
  const ch=await textChannel(guild,c?.play_channel_id);
  if(!ch)return {ok:false,via:"unavailable",certainty:"not_sent",messages:[]};
  const messages=[];
  for(const part of chunks(content)){
    check();
    const sent=await ch.send(part);
    turnTraceFor(guild.id)?.publication(substantive);
    messages.push({messageId:sent.id,channelId:sent.channelId||ch.id});
    if(sessionId) db.addMessage({guildId:guild.id,sessionId,userId:null,speakerName:"Veilkeeper",visibility:"party",content:part});
  }
  return {ok:true,via:"play_channel",certainty:"acknowledged",messages,...messages.at(-1)};
}
  return postPlayMessage;
}
