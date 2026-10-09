/** Exclusive channel routing and rate-limited inactive-session feedback. */
const notices=new Map();
export function validateChannelRouting(campaign,patch={}){
  const values={play:patch.playChannelId??campaign?.play_channel_id,rules:patch.rulesChannelId??campaign?.rules_channel_id,
    case_board:patch.caseBoardChannelId??campaign?.case_board_channel_id,journal:patch.journalChannelId??campaign?.journal_channel_id,
    known_npcs:patch.knownNpcsChannelId??campaign?.known_npcs_channel_id,known_locations:patch.knownLocationsChannelId??campaign?.known_locations_channel_id,
    gm_log:patch.gmLogChannelId??campaign?.gm_log_channel_id,state_errors:patch.stateErrorsChannelId??campaign?.state_errors_channel_id};
  const byId=new Map();for(const [role,id] of Object.entries(values))if(id){const roles=byId.get(id)||[];roles.push(role);byId.set(id,roles);}
  const conflicts=[...byId.entries()].filter(([,roles])=>roles.length>1).map(([channel_id,roles])=>({channel_id,roles}));
  return {ok:conflicts.length===0,conflicts,values};
}
export function shouldSendInactiveSessionNotice(guild,user,{now=Date.now(),cooldownMs=300000}={}){
  const key=`${guild}:${user}`,last=notices.get(key)||0;if(now-last<cooldownMs)return false;notices.set(key,now);return true;
}
