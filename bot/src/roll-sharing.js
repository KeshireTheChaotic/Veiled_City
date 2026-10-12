/** Explicit owner-controlled, redacted party projection of a saved native roll result. */
import { createHash } from "node:crypto";
import { StateConflictError } from "./errors.js";
import {publishNativeNotice,reserveNativeNotice} from "./native-publications.js";
import {noticeHash} from "./native-notice.js";

const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,48);
export function formatSharedRoll(row){
  const result=row.data.result;
  if(!row.data.party_disclosure||!result)throw new StateConflictError("No affirmative owner-shared saved result is available.");
  return `**${row.data.character_name} shared a roll result**\nNative total: **${result.total} — ${result.duality}**. Status: **${row.status}**.\nOnly the saved dice are disclosed; raw declarations do not establish PC reactions or other outcomes.`;
}
export function reserveRollPartyDisclosure(db,guild,row){
  const source=row.data.party_disclosure?.source_event;if(!source)return null;
  return reserveNativeNotice(db,guild,{kind:"roll_party_publication",key:`roll-party-pub:${hash([row.record_key,source])}`,source,
    notice:{kind:"roll_party",ref:row.record_key,request:row.record_key,revision:noticeHash([row.status,row.data])}});
}
export async function publishRollPartyDisclosure(db,guild,row,send){
  const disclosure=row.data.party_disclosure;if(!disclosure)return false;
  const source=db.getWorldEvent(guild,disclosure.source_event);
  if(!source||source.status!=="active"||source.visibility!=="party"||source.details.request!==row.record_key
    ||source.details.author!==row.data.owner_user_id)throw new StateConflictError("Party roll disclosure source is stale or unauthorized.");
  const key=`roll-party-pub:${hash([row.record_key,source.event_key])}`;
  return publishNativeNotice(db,guild,{kind:"roll_party_publication",key,source:source.event_key,
    notice:{kind:"roll_party",ref:row.record_key,request:row.record_key,revision:noticeHash([row.status,row.data])}},
    publication=>send(publication.payload,row.data.session_id,{publication}));
}
