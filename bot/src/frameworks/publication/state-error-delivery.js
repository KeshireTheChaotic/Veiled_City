/** Original operational error audit/report delivery; existing Operations/Discord capabilities only. */
import {randomUUID} from 'node:crypto';
import {publicationOperations} from './contracts/operations.js';
import {publicationDiscordChannels} from './contracts/discord-channels.js';
const operationalMetrics=publicationOperations;
const {failureTrace}=publicationOperations;
const {textChannel,assertGmOnlyChannel}=publicationDiscordChannels;
export async function postStateError({db,guild,error,context="runtime",sessionId=null,attempt=null}){
  const ref=randomUUID().slice(0,8);
  operationalMetrics.record('runtime_failure',{guildId:guild.id,status:'error',errorCode:error?.code});
  operationalMetrics.incident('runtime',{guildId:guild.id,reference:ref,code:error?.code});
  try{
    const diagnostic=error?.code==="NARRATIVE_INTEGRITY"&&error.diagnostic?Object.fromEntries(
      ["category","actor","entity","action","source","source_ref","source_span","recovery","reason_code"].map(key=>[key,String(error.diagnostic[key]||"").slice(0,1000)])):null;
    const lifetime=error?.interaction_diagnostic?JSON.parse(JSON.stringify(error.interaction_diagnostic)):null;
    db.audit(guild.id,sessionId,"system","veilkeeper","state_error",{ref,context,error:String(error?.message||error),
      trace:failureTrace(error,attempt||{}),...(diagnostic?{diagnostic}:{}),...(lifetime?{interaction:lifetime}:{})});
  }catch{
    // Audit logging must never prevent the primary error from being reported to Discord.
  }
  const c=db.getCampaign(guild.id);
  const ch=await textChannel(guild,c?.state_errors_channel_id);
  if(!ch) return ref;
  try { assertGmOnlyChannel({guild,channel:ch,gmRoleId:c?.gm_role_id||null}); }
  catch (privacyErr) { console.error(`Unsafe state-errors channel; error ${ref} was not published`, privacyErr); return ref; }
  const stack=String(error?.stack||error?.message||error||"Unknown error").replace(/```/g,"''' ").slice(0,1450);
  const body=`**⚠️ Veilkeeper state/runtime error · ${ref}**\nContext: ${String(context).slice(0,250)}\n` + "```\n" + stack + "\n```";
  try{ await ch.send(body); }
  catch(sendErr){ console.error(`Could not publish state error ${ref}`,sendErr); }
  return ref;
}
