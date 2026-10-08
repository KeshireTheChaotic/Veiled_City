/**
 * Campaign health diagnostics.
 *
 * This module is intentionally read-only. It combines SQLite invariants with
 * live Discord channel visibility checks so `/vc-admin doctor` can distinguish
 * persisted-state problems from server-permission problems.
 */
import fs from "node:fs";
import path from "node:path";
import { assertGmOnlyChannel, assertPlayerPrivateChannel } from "../discord/privacy.js";

export async function runCampaignDiagnostics({db,guild}){
  const data=db.doctorData(guild.id);
  const campaign=db.getCampaign(guild.id);
  const issues=[];
  const passed=[];
  if(data.schemaVersion<370) issues.push(`Database schema version ${data.schemaVersion}; expected 370+.`);
  else passed.push(`Database schema v${data.schemaVersion}`);
  if(data.presentWithoutCharacter.length) issues.push(`${data.presentWithoutCharacter.length} present roster entr${data.presentWithoutCharacter.length===1?"y has":"ies have"} no active character.`);
  if(data.duplicateCanon.length) issues.push(`${data.duplicateCanon.length} canon key(s) have multiple current entries.`);
  if(data.orphanCharacters.length) issues.push(`${data.orphanCharacters.length} owned character(s) reference missing players.`);
  if(data.orphanAssignments.length) issues.push(`${data.orphanAssignments.length} session character assignment(s) reference missing characters.`);
  if(data.orphanHandouts.length) issues.push(`${data.orphanHandouts.length} handout(s) reference missing player/character subjects.`);
  if(data.brokenProxies.length) issues.push(`${data.brokenProxies.length} absence proxy assignment(s) have no present valid proxy controller.`);
  if(data.absentControl.length) issues.push(`${data.absentControl.length} absent player assignment(s) remain player_only instead of offscreen/background/proxy control.`);
  if(data.invalidVisibility.length) issues.push(`Invalid visibility values detected: ${data.invalidVisibility.map(x=>`${x.table}=${x.count}`).join(", ")}.`);
  if(data.pendingDirector){
    const queued=Date.parse(data.pendingDirector.queued_at||"");
    if(Number.isFinite(queued) && Date.now()-queued>24*60*60*1000) issues.push(`Pending director pass ${data.pendingDirector.layer} has remained technically queued for over 24 hours; inspect/retry or clear it.`);
    else passed.push(`Pending director pass: ${data.pendingDirector.layer}`);
  } else passed.push("No pending director pass");
  for(const required of ["package.json","sql/schema.sql","../content/manifest.json"]){
    const resolved=path.resolve(process.cwd(),required);
    if(!fs.existsSync(resolved)) issues.push(`Required runtime file missing: ${required}`); else passed.push(`Runtime file present: ${required}`);
  }

  if(!campaign?.gm_role_id) issues.push("GM role is not configured; GM-only authorization relies on Manage Server permission.");
  else if(!guild.roles?.cache?.has?.(campaign.gm_role_id)) issues.push("Configured GM role no longer exists in this Discord server.");
  else passed.push("Configured GM role exists");

  for(const [label,id,privacy] of [
    ["GM log",campaign?.gm_log_channel_id,"gm"],
    ["State errors",campaign?.state_errors_channel_id,"gm"],
    ["Play",campaign?.play_channel_id,"play"]
  ]){
    if(!id){ issues.push(`${label} channel is not configured.`); continue; }
    try{
      const channel=await guild.channels.fetch(id);
      if(!channel?.isTextBased()) issues.push(`${label} channel is missing/not text-based.`);
      else if(privacy==="gm"){
        assertGmOnlyChannel({guild,channel,gmRoleId:campaign?.gm_role_id||null});
        passed.push(`${label} privacy verified`);
      }else passed.push(`${label} channel reachable`);
    }catch(err){ issues.push(`${label}: ${err.message||err}`); }
  }

  for(const player of db.listPlayers(guild.id).filter(p=>p.private_channel_id)){
    try{
      const channel=await guild.channels.fetch(player.private_channel_id);
      assertPlayerPrivateChannel({guild,channel,userId:player.discord_user_id,gmRoleId:campaign?.gm_role_id||null});
    }catch(err){ issues.push(`Private channel for ${player.display_name}: ${err.message||err}`); }
  }
  return {data,campaign,issues,passed};
}

export function formatDiagnostics({issues,passed}){
  const status=issues.length?`⚠️ ${issues.length} issue(s) found`:`✅ No blocking issues found`;
  return [
    `**Veilkeeper Doctor — ${status}**`,
    ...(issues.length?["**Issues**",...issues.map(x=>`• ${x}`)]:[]),
    "**Checks passed**",
    ...passed.map(x=>`• ${x}`)
  ];
}
