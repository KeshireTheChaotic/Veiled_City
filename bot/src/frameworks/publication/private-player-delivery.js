/** Original play-channel publisher; root supplies unchanged source/output validators. */
import {publicationDiscordChannels,publicationDiscordText} from './contracts/discord-channels.js';
import {publicationOperations} from './contracts/operations.js';
import {notSent} from './delivery-receipts.js';
const {textChannel,assertPlayerPrivateChannel}=publicationDiscordChannels;
const {splitDiscordText:chunks}=publicationDiscordText;
const {turnTraceFor}=publicationOperations;
export function createPrivatePlayerPublisher({quarantineGeneratedOutput,prepareStoredOutput,substantivePreparedOutput,revalidateOutputPublication}){
  if([quarantineGeneratedOutput,prepareStoredOutput,substantivePreparedOutput,revalidateOutputPublication].some(value=>typeof value!=='function'))throw new TypeError('Play publication requires the original output validation callbacks.');
async function sendPlayerPrivate({db,guild,userId,content,sessionId=null,characterId=null,beforeSend=null,publication=null,
  recordMessage=true,allowedMentions=null,generated=false}){
  const messages=[];let attempted=false,via="unavailable",substantive=false;
  const check=()=>{
    if(generated){
      try{const scope={mode:'private',actorUserId:userId,actorCharacterId:characterId};
        substantive=substantivePreparedOutput(db,guild.id,prepareStoredOutput(db,guild.id,content,scope),scope);}
      catch(error){
        if(error.code!=='NARRATIVE_PVP')throw error;
        quarantineGeneratedOutput(db,guild.id,'direct-generated-private',{userId,characterId,content},sessionId);throw error;
      }
    }
    if(publication){
      if(publication.target_user_id!==userId||publication.target_character_id!==(characterId||null)||content!==publication.payload)
        throw notSent("Exact private publication recipient/body required.");
      revalidateOutputPublication(db,guild.id,publication);
    }
    beforeSend?.();
  };
  check(); // Generated candidates fail before any transport lookup, including between sessions.
  const send=async(target,route)=>{
    via=route;
    for(const part of chunks(content)){
      // Permission changes during an awaited send must not expose later private chunks.
      if(route==="private_channel")assertPlayerPrivateChannel({guild,channel:target,userId,gmRoleId:db.getCampaign(guild.id)?.gm_role_id||null});
      check();attempted=true;
      const sent=await target.send(allowedMentions?{content:part,allowedMentions}:part);messages.push({messageId:sent.id,channelId:sent.channelId||(route==="private_channel"?target.id:null)});
      if(generated)turnTraceFor(guild.id)?.publication(substantive);
    }
    if(sessionId&&recordMessage)db.addMessage({guildId:guild.id,sessionId,userId:null,speakerName:"Veilkeeper",visibility:characterId?"character":"player",
      subjectUserId:characterId?null:userId,subjectCharacterId:characterId,content});
    return {ok:true,via,certainty:"acknowledged",messages,...messages.at(-1)};
  };
  const p=db.getPlayer(guild.id,userId);
  if(p?.private_channel_id){
    try{
      const ch=await textChannel(guild,p.private_channel_id);
      if(ch){
        const campaign=db.getCampaign(guild.id);
        assertPlayerPrivateChannel({guild,channel:ch,userId,gmRoleId:campaign?.gm_role_id||null});
        return await send(ch,"private_channel");
      }
    }catch(error){
      if(["NARRATIVE_PVP","CHARACTER_OBSERVATION","WORLD_OBSERVATION","NPC_PROXY_AUTHORITY"].includes(error.code))throw error;
      if(attempted)return {ok:false,via,certainty:"uncertain",messages,error:String(error?.message||error)};
      // Fallback is safe only before any send has been attempted, never after partial/ambiguous I/O.
    }
  }
  try{
    const member=await guild.members.fetch(userId);
    return await send(member,"dm");
  }catch(error){
    if(["NARRATIVE_PVP","CHARACTER_OBSERVATION","WORLD_OBSERVATION","NPC_PROXY_AUTHORITY"].includes(error.code))throw error;
    return {ok:false,via,certainty:attempted?"uncertain":"not_sent",messages,error:String(error?.message||error)};
  }
}
  return sendPlayerPrivate;
}
