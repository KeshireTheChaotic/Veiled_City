/** Read immutable authored turns and their native-consumption annotations without startup. */
import {createHash} from 'node:crypto';

export const authoredTurnHash=value=>createHash('sha256').update(String(value)).digest('hex');
export const authoredTurnKey=(messageId,character)=>`authored-turn:${authoredTurnHash(JSON.stringify([messageId,character])).slice(0,40)}`;
export const authoredAnnotationKey=(messageId,character)=>`authored-envelope:${authoredTurnHash(JSON.stringify([messageId,character])).slice(0,40)}`;

export function authoredTurnEnvelope(db,guild,messageId,character){
  const event=db.getWorldEvent(guild,authoredTurnKey(messageId,character));
  if(!event)return null;
  const annotation=db.getCityRecord(guild,'authored_turn_envelope',authoredAnnotationKey(messageId,character));
  return {version:1,source_event:event.event_key,discord_message_id:event.details.discord_message_id,
    guild_id:guild,session_id:event.details.session_id,scene_id:event.details.scene_id,user_id:event.details.author,
    character_id:event.details.character_id,control_role:event.details.control_role,
    principal_revision:event.details.principal_revision,visibility:event.visibility,subject_key:event.subject_key||null,
    raw_text:event.details.raw_text,raw_hash:event.details.raw_hash,native_consumed_spans:annotation?.data.native_consumed_spans||[]};
}
