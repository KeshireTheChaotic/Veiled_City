/** Original private relay; existing GM privacy, source callback and transport behavior retained. */
import {randomUUID} from 'node:crypto';
import {publicationDiscordChannels,publicationDiscordText} from './contracts/discord-channels.js';
const {textChannel,assertGmOnlyChannel}=publicationDiscordChannels;
const {splitDiscordText:chunks}=publicationDiscordText;
export async function postPrivateRelay({db,guild,userId,title="Private delivery relay required",content,sessionId=null,context="private-delivery",beforeSend=null}){
  const ref=randomUUID().slice(0,8);
  try{
    db.audit(guild.id,sessionId,"system","veilkeeper","private_delivery_relay",{ref,context,userId,title});
  }catch{
    // Relay auditing is best-effort; delivery can still proceed when the audit insert fails.
  }
  const c=db.getCampaign(guild.id);
  const ch=await textChannel(guild,c?.state_errors_channel_id);
  if(!ch) return {ok:false,ref,via:"unavailable"};
  try { assertGmOnlyChannel({guild,channel:ch,gmRoleId:c?.gm_role_id||null}); }
  catch { return {ok:false,ref,via:"unsafe_channel"}; }
  const header=`**⚠️ ${title} · ${ref}**\nTarget player: <@${userId}>\nContext: ${String(context).slice(0,250)}\n\n**ADMIN GM: relay the following sanitized player-facing package exactly as needed:**`;
  beforeSend?.();await ch.send(header.slice(0,1990));
  for(const part of chunks(content)){beforeSend?.();await ch.send(part);}
  return {ok:true,ref,via:"state_errors"};
}
