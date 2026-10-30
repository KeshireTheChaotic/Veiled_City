/** Existing reference-surface edit/create behavior; source checks stay supplied by the caller. */
import {publicationDiscordChannels} from './contracts/discord-channels.js';
const {textChannel}=publicationDiscordChannels;

export async function upsertBotMessage({db,guild,channelId,surface,key,content,beforeWrite}){
  const ch=await textChannel(guild,channelId);
  if(!ch) return null;
  const existing=db.getPublished(guild.id,surface,key);
  if(existing?.message_id && existing.channel_id===channelId){
    let message;
    try{
      message=await ch.messages.fetch(existing.message_id);
    }catch(error){
      if(error.code!==10008&&error.status!==404)throw error; // Only confirmed absence permits replacement.
    }
    if(message){
      beforeWrite?.();await message.edit(content.slice(0,1990));return message; // Uncertain edit never falls through to send.
    }
  }
  beforeWrite?.();
  const m=await ch.send(content.slice(0,1990));
  db.setPublished(guild.id,surface,key,channelId,m.id);
  return m;
}
