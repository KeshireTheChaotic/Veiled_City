/** Exact current owner and attendance check for private continuity. */
import {PermissionError} from '../../kernel/errors.js';
export function personalCharacter(db,guild,userId,characterId){
  const session=db.getActiveSession(guild),assignment=session?db.activeAssignment(session.id,userId):null;
  const id=characterId||assignment?.character_id,character=id?db.getCharacter(id):null;
  if(!character||character.guild_id!==guild||character.owner_user_id!==userId||assignment?.character_id!==id||!["active","reserve","guest"].includes(character.status))
    throw new PermissionError("An active owned character assignment is required; proxies do not gain private continuity.");
  const present=db.roster(session.id).some(row=>row.character_id===id&&["present","late","guest"].includes(row.presence));
  if(!present) throw new PermissionError("Personal continuity requires attendance.");
  return character;
}
