/** Explicit owner-controlled, redacted party projection of a saved native roll result. */
import { createHash } from "node:crypto";
import { StateConflictError } from "./errors.js";

const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,48);
export function formatSharedRoll(row){
  const result=row.data.result;
  if(!row.data.party_disclosure||!result)throw new StateConflictError("No affirmative owner-shared saved result is available.");
  return `**${row.data.character_name} shared a roll result**\n${row.data.attempt}\nNative total: **${result.total} — ${result.duality}**. Status: **${row.status}**.`;
}
export async function publishRollPartyDisclosure(db,guild,row,send){
  const disclosure=row.data.party_disclosure;if(!disclosure)return false;
  const source=db.getWorldEvent(guild,disclosure.source_event);
  if(!source||source.status!=="active"||source.visibility!=="party"||source.details.request!==row.record_key
    ||source.details.author!==row.data.owner_user_id)throw new StateConflictError("Party roll disclosure source is stale or unauthorized.");
  const key=`roll-party-pub:${hash([row.record_key,source.event_key])}`;
  let receipt=db.getCityRecord(guild,"roll_party_publication",key);
  if(receipt?.status==="delivered")return false;
  receipt=receipt||db.saveCityRecord(guild,{kind:"roll_party_publication",key,status:"pending",source_event:source.event_key,
    visibility:"party",data:{request:row.record_key,source_event:source.event_key}});
  if(await send(formatSharedRoll(row),row.data.session_id)!==true)
    throw new StateConflictError("Roll result remains committed and private sharing delivery needs recovery; do not reroll.");
  db.saveCityRecord(guild,{...receipt,key,status:"delivered"});return true;
}
