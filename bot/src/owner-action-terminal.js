/** Native owner withdrawal tombstones bind source ranges, not fallible later model occurrence boundaries. */
import {createHash} from "node:crypto";
import {StateConflictError} from "./kernel/errors.js";
const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const key=source=>`owner-action-terminal:${hash(source)}`;
function fail(){throw new StateConflictError("Native owner terminal source ancestry needs review; never restore execution.");}
function valid(db,guild,source,span){
  const choice=db.getWorldEvent(guild,span.choice),review=choice&&db.getCityRecord(guild,"unsupported_action",choice.details.review),
    action=review&&db.getCityRecord(guild,"typed_intent",review.data.action);
  if(!source||!choice||choice.kind!=="action_review_choice"||!["action-review-withdraw","action-review-replace"].includes(choice.details.choice)
    ||choice.source_id!==`player:${source.details.author}`||choice.subject_key!==source.details.character_id
    ||review?.source_event!==source.event_key||action?.source_event!==source.event_key||action.data.gm_review_terminal!==choice.event_key
    ||span.start!==action.data.start||span.end!==action.data.end||action.data.source_hash!==source.details.raw_hash
    ||source.details.raw_text.slice(span.start,span.end)!==action.data.source_span)fail();
  // A legitimate terminal native choice is immutable history; retracting presentation never restores old intent.
}
export function recordOwnerActionTerminal(db,guild,action,choice){
  const source=db.getWorldEvent(guild,action.source_event),span={start:action.data.start,end:action.data.end,choice};
  valid(db,guild,source,span);
  const prior=db.getCityRecord(guild,"owner_action_terminal",key(source.event_key)),spans=prior?.data.spans||[];
  if(spans.some(s=>s.choice===choice))return prior;
  if(spans.length>=32)fail();
  return db.saveCityRecord(guild,{kind:"owner_action_terminal",key:key(source.event_key),status:"terminal",
    source_event:source.event_key,visibility:"character",subject_key:source.details.character_id,
    data:{version:1,source_hash:source.details.raw_hash,spans:[...spans,span],
      authority:"Owner cancellation of these original source ranges only; no action, outcome or effect."}});
}
export function overlapsOwnerActionTerminal(db,guild,sourceKey,start,end){
  const row=db.getCityRecord(guild,"owner_action_terminal",key(sourceKey));if(!row)return false;
  const source=db.getWorldEvent(guild,sourceKey);
  if(!source||row.source_event!==sourceKey||row.visibility!=="character"||row.subject_key!==source.details.character_id
    ||row.data.version!==1||row.data.source_hash!==source.details.raw_hash||!Array.isArray(row.data.spans)||row.data.spans.length>32)fail();
  for(const span of row.data.spans){valid(db,guild,source,span);if(start<span.end&&end>span.start)return true;}
  return false;
}
