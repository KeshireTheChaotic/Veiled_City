/** Explicit owner-controlled, redacted party projection of a saved native roll result. */
import { createHash } from "node:crypto";
import { StateConflictError } from "./kernel/errors.js";
import {publishNativeNotice,reserveNativeNotice,queueNativeNotice} from "./native-publications.js";
import {noticeHash} from "./native-notice.js";
import {ownedRollRequest} from './roll-requests.js';
import {historicalActionSource} from './action-consent.js';
import {protectedPvpScope} from './pvp-output.js';

const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,48);
export function formatSharedRoll(row){
  const result=row.data.result;
  if(!row.data.party_disclosure||!result)throw new StateConflictError("No affirmative owner-shared saved result is available.");
  return `**${row.data.character_name} shared a roll result**\n${row.data.party_disclosure.context?`Owner-reviewed attempt (not an outcome): ${row.data.party_disclosure.context}\n`:''}Native total: **${result.total} — ${result.duality}**. Status: **${row.status}**.\nOnly saved dice and any exact reviewed attempt are disclosed; declarations do not establish PC reactions or other outcomes.`;
}
const material=row=>noticeHash([row.source_event,row.subject_key,row.data.owner_user_id,row.data.input.accepted_intent,row.data.roll_id,row.data.result||null]);
export function sourceConfirmedRollAttempt(db,guild,row){
  if(!row.data.input.accepted_intent)return '';
  const accepted=db.getCityRecord(guild,'typed_intent',row.data.input.accepted_intent);
  if(!accepted||accepted.data.authored_outcome_claim||accepted.data.target?.kind==='character')return '';
  const {row:a}=historicalActionSource(db,guild,accepted.record_key,{resolved:accepted.status==='resolved'});
  if(a.source_event!==row.source_event||a.data.actor!==row.subject_key||a.data.owner_user_id!==row.data.owner_user_id)
    throw new StateConflictError('Exact accepted request occurrence and owner required.');
  return a.data.source_span;
}
export function createRollSharePreview(db,guild,user,request){
  if(protectedPvpScope(db,guild,{mode:'party'}).length)throw new StateConflictError('PvP-scoped prose needs independently verified clauses; generic preview cannot certify it. Dice/status-only sharing remains available.');
  const row=ownedRollRequest(db,guild,user,request),accepted=row.data.input.accepted_intent&&db.getCityRecord(guild,'typed_intent',row.data.input.accepted_intent);
  if(!accepted||accepted.data.authored_outcome_claim||accepted.data.target?.kind==='character')throw new StateConflictError('Only a source-confirmed own non-PC-target accepted attempt can supply context; share dice/status only otherwise.');
  const {row:a}=historicalActionSource(db,guild,accepted.record_key,{resolved:accepted.status==='resolved'});
  if(a.source_event!==row.source_event||a.data.actor!==row.subject_key||a.data.owner_user_id!==user||!a.data.source_span)
    throw new StateConflictError('Exact accepted request occurrence and owner required.');
  const data={version:1,request:row.record_key,owner:user,character:row.subject_key,accepted:a.record_key,source_hash:a.data.source_hash,
    start:a.data.start,end:a.data.end,text:a.data.source_span,material:material(row),audience:'party',
    authority:'Preview only. Explicit owner share approves this attributed attempt, never outcomes or another PC agency.'};
  const key=`roll-share-preview:${noticeHash(data)}`;
  return db.getCityRecord(guild,'roll_share_preview',key)||db.saveCityRecord(guild,{kind:'roll_share_preview',key,status:'preview',
    source_event:row.source_event,visibility:'character',subject_key:row.subject_key,data});
}
export function validateRollSharePreview(db,guild,row,key){
  if(protectedPvpScope(db,guild,{mode:'party'}).length)throw new StateConflictError('PvP-scoped prose requires independent clause authority; share saved dice/status without context.');
  const p=db.getCityRecord(guild,'roll_share_preview',key),d=p?.data;
  if(!d||p.status!=='preview'||p.visibility!=='character'||p.subject_key!==row.subject_key||p.source_event!==row.source_event
    ||key!==`roll-share-preview:${noticeHash(d)}`||d.request!==row.record_key||d.owner!==row.data.owner_user_id
    ||d.character!==row.subject_key||d.material!==material(row)||d.audience!=='party')throw new StateConflictError('Exact current owner-reviewed roll preview required.');
  const a=db.getCityRecord(guild,'typed_intent',d.accepted),proof=historicalActionSource(db,guild,d.accepted,{resolved:a?.status==='resolved'}).row;
  if(proof.record_key!==row.data.input.accepted_intent||proof.data.authored_outcome_claim||proof.data.target?.kind==='character'
    ||proof.data.source_hash!==d.source_hash||proof.data.start!==d.start||proof.data.end!==d.end||proof.data.source_span!==d.text)
    throw new StateConflictError('Share preview source/scope changed.');
  return p;
}
function partySpec(row){const source=row.data.party_disclosure?.source_event;return source?{kind:'roll_party_publication',
  key:`roll-party-pub:${hash([row.record_key,source])}`,source,notice:{kind:'roll_party',ref:row.record_key,request:row.record_key,revision:noticeHash([row.status,row.data])}}:null;}
export function queueRollPartyDisclosure(db,guild,row){const spec=partySpec(row);return spec?queueNativeNotice(db,guild,spec):null;}
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
