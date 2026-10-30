/** Original GM log delivery; existing Discord ports own channel lookup, privacy validation and splitting. */
import {publicationDiscordChannels,publicationDiscordText} from './contracts/discord-channels.js';
const {textChannel,assertGmOnlyChannel}=publicationDiscordChannels;
const {splitDiscordText:chunks}=publicationDiscordText;
export async function postGmLog({db,guild,sessionId=null,title="GM Log",details=""}){
  const c=db.getCampaign(guild.id);
  const ch=await textChannel(guild,c?.gm_log_channel_id);
  if(!ch) return false;
  try { assertGmOnlyChannel({guild,channel:ch,gmRoleId:c?.gm_role_id||null}); }
  catch (err) { console.error("Unsafe GM log channel configuration", err); return false; }
  const text=`**${title}**${sessionId?` · session ${sessionId.slice(0,8)}`:""}\n${String(details||"")}`;
  for(const part of chunks(text))await ch.send(part);
  return true;
}
