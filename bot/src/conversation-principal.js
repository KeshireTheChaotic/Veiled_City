/** Authenticated conversational control, not owner impersonation or consent delegation. Rechecked on every use. */
import { createHash } from "node:crypto";
export function conversationPrincipal(db,guild,user,character=null){
  const session=db.getActiveSession(guild);if(!session)throw new Error("Active session required.");
  const own=db.activeAssignment(session.id,user);
  const roles=[...(own?[own]:[]),...db.proxyAssignments(session.id,user),...db.npcProxyAssignments(session.id,user)];
  const assignment=character?roles.find(row=>row.character_id===character):own|| (roles.length===1?roles[0]:null);
  if(!assignment)throw new Error("Select an authenticated current controlled role.");
  const attendance=db.roster(session.id);
  if(!attendance.some(row=>row.discord_user_id===user&&["present","late","guest"].includes(row.presence)))
    throw new Error("Controller attendance required.");
  const pc=assignment.npc_proxy?null:db.getCharacter(assignment.character_id);
  if(pc&&(pc.guild_id!==guild||!["active","reserve","guest"].includes(pc.status)))throw new Error("Active campaign character required.");
  const owner=!!pc&&pc.owner_user_id===user;
  const revision=createHash("sha256").update(JSON.stringify([session.id,user,assignment.character_id,
    assignment.id||assignment.joined_at,assignment.control_revision,assignment.control_policy,assignment.proxy_user_id,assignment.activated_at])).digest("hex").slice(0,24);
  return {user,session_id:session.id,character_id:assignment.character_id,kind:owner?"owner":assignment.npc_proxy?"npc_proxy":"pc_proxy",
    revision,context_id:owner?pc.id:`control:${session.id}:${user}:${revision}`,assignment,
    authority:"Conversational role only; no owner-private memory, spending, consent or voluntary PC decisions delegated."};
}
