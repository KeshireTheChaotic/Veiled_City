/** Structural PC target/effect authority. Model labels never authorize another PC's participation or damage. */
import { createHash } from "node:crypto";
export const pvpAttemptKey=(guild,action)=>`pvp-attempt:${createHash("sha256").update(JSON.stringify([guild,action])).digest("hex").slice(0,40)}`;
export function pvpTarget(db,guild,accepted){
  const key=String(accepted?.data?.target_key||"").replace(/^character:/,"");
  const pc=key&&db.getCharacter(key);
  return pc?.guild_id===guild&&pc.owner_user_id&&pc.id!==accepted.data.actor?pc:null;
}
export function isPvpIntent(db,guild,accepted){
  return !!pvpTarget(db,guild,accepted)&&!["speak","observe"].includes(accepted.data.type);
}
/** Reject PC combatants by native identity, independent of AI-selected attack kind or display name. */
export function assertNonPvpCombatant(db,guild,target){
  const candidates=[target?.character_id,target?.entity_key,target?.actor_key,target?.id];
  if(target?.entity_type==="character"||target?.type==="character"||target?.kind==="character"
    ||candidates.some(key=>key&&db.getCharacter(String(key).replace(/^character:/,""))?.guild_id===guild))
    throw Object.assign(new Error("PC conflict requires a locked narrative PvP agreement, never ordinary attack damage."),{code:"NARRATIVE_PVP"});
}
