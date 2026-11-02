import {npcControlLabel} from './npc-proxy-packet.js';

/** Original Discord presentation for the GM/player NPC proxy assignment status. */
export function npcProxyAssignmentsText(displayRows){
  if(!displayRows.length)return "No active/offered NPC proxy assignments are visible to you.";
  const lines=displayRows.map(({proxy,showUserId})=>
    `• **${proxy.npc_name}** — ${proxy.status} — ${npcControlLabel(proxy.control_level)}${showUserId?` — <@${proxy.discord_user_id}>`:""}`);
  return `**NPC Proxy Assignments**\n${lines.join("\n")}`;
}
