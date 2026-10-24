/** Native terminal receipt projection after mandatory PvP Fear obligations. */
import {createHash} from 'node:crypto';
export function createPvpTerminalRules({capabilities}){
const {pvpAttemptKey,transitionAction,pendingPvpFear}=capabilities||{};
if([pvpAttemptKey,transitionAction,pendingPvpFear].some(fn=>typeof fn!=='function'))throw new TypeError('Native terminal projection capabilities required');
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,40);
function settlePvpWindow(db,guild,proposal,receipt){
  if(receipt?.status!=="resolved"||receipt.kind!=="pvp_resolution_receipt"||receipt.data.proposal!==proposal.record_key
    ||receipt.data.terms_hash!==proposal.data.terms_hash)throw new Error("Exact native PvP terminal receipt required.");
  if(pendingPvpFear(db,guild,proposal).length)return {status:"consequence_pending",receipt:receipt.record_key};
  const key=`pvp-window:${hash([proposal.record_key,proposal.data.terms_hash])}`;
  const window=db.getCityRecord(guild,"scene_action_window",key);
  if(window&&window.status!=="closed"){
    db.saveCityRecord(guild,{...window,key,status:"closed",data:{...window.data,revision:window.data.revision+1,
      resolution:receipt.record_key,outcome:receipt.data.outcome}});
    db.saveCityRecord(guild,{kind:"scene_window_lifecycle",key:`pvp-close:${hash([key,receipt.record_key])}`,visibility:"gm",
      source_event:receipt.source_event,data:{window:key,revision:window.data.revision+1,op:"pvp_terminal",receipt:receipt.record_key}});
  }
  const action=db.getCityRecord(guild,"typed_intent",proposal.data.accepted_intent),attemptKey=pvpAttemptKey(guild,action.record_key);
  const attempt=db.getCityRecord(guild,"pvp_attempt",attemptKey);
  db.saveCityRecord(guild,{...(attempt||{}),kind:"pvp_attempt",key:attemptKey,status:"resolved",source_event:action.source_event,
    visibility:"character",subject_key:action.data.actor,actor_key:action.data.actor,
    data:{...attempt?.data,version:1,accepted_intent:action.record_key,proposal:proposal.record_key,
      resolution_receipt:receipt.record_key,outcome:receipt.data.outcome,winner:receipt.data.winner}});
  const nodeKey=`action:${createHash("sha256").update(String(action.record_key)).digest("hex").slice(0,32)}`;
  const node=db.getCityRecord(guild,"compound_action",nodeKey);
  const status=receipt.data.winner?(receipt.data.winner===action.data.actor?"resolved":"failed"):"blocked";
  if(node)transitionAction(db,guild,nodeKey,{expected_status:node.data.status,status,receipt:receipt.record_key});
}

return Object.freeze({settlePvpWindow});
}
