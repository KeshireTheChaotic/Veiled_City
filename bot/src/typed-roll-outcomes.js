/** Convert a terminal native roll request into one typed-action outcome receipt and resume its DAG. */
import { createHash } from "node:crypto";
import { buildActionPlan, transitionAction } from "./action-dependency.js";
import { StateConflictError } from "./errors.js";

const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,40);
export function finalizeTypedRollAction(db,guild,request){
  const actionId=request?.data?.input?.accepted_intent;
  if(!actionId)return null;
  if(request.status!=="resolved"||!request.data.result||!request.data.roll_id)
    throw new StateConflictError("Typed roll action can finalize only from an actual terminal native result.");
  const accepted=db.getCityRecord(guild,"typed_intent",actionId);
  if(!accepted)throw new StateConflictError("Typed roll action acceptance is unavailable.");
  const difficulty=request.data.breakdown?.difficulty,result=request.data.result;
  // A public declaration is not consent to disclose privately selected mechanics/results.
  // This can only narrow the native receipt audience, never authorize an effect or a public promotion.
  const privateResult=request.data.input.private_result===true,visibility=privateResult?"character":accepted.visibility;
  const subject=privateResult?accepted.data.actor:accepted.subject_key;
  const success=result.duality==="Critical"||difficulty===null||difficulty===undefined||result.total>=difficulty;
  const key=`action-receipt:${hash([actionId,request.record_key,request.data.roll_id])}`;
  const receipt=db.getCityRecord(guild,"action_outcome_receipt",key)||db.saveCityRecord(guild,{
    kind:"action_outcome_receipt",key,status:"resolved",source_event:accepted.source_event,
    visibility,subject_key:subject,data:{idempotency_key:key,action_id:actionId,
      source_event:accepted.source_event,actor_ref:accepted.data.actor,outcome:success?"success":"failure",
      state_mutations:[],native_roll_refs:[request.data.roll_id],rule_refs:[],observed_by:[accepted.data.actor],
      audience:visibility,request:request.record_key,total:result.total,duality:result.duality,difficulty}});
  if(receipt.visibility!==visibility||receipt.subject_key!==subject||receipt.data.audience!==visibility)
    throw new StateConflictError("Native result audience changed; reviewed recovery required, never promote private mechanics.");
  db.saveCityRecord(guild,{...accepted,key:accepted.record_key,status:"resolved",data:{...accepted.data,
    outcome_receipt:receipt.record_key,native_disposition:privateResult?"private_roll_resolved":success?"roll_success":"roll_failure"}});
  const adjudication=db.listCityRecords(guild,{kind:"native_adjudication",includeGM:true,limit:500})
    .find(row=>row.data.action_id===actionId&&row.data.roll_request_ref===request.record_key);
  if(adjudication)db.saveCityRecord(guild,{...adjudication,key:adjudication.record_key,status:"resolved",visibility,subject_key:subject,
    data:{...adjudication.data,disposition:"resolved",receipts:[receipt.record_key]}});
  const nodes=db.listCityRecords(guild,{kind:"compound_action",includeGM:true,limit:500}),node=nodes.find(row=>row.data.action_id===actionId);
  if(node&&!(["resolved","failed"].includes(node.data.status)&&node.data.receipt===receipt.record_key))
    transitionAction(db,guild,node.record_key,{expected_status:node.data.status,status:success?"resolved":"failed",receipt:receipt.record_key});
  const related=nodes.filter(row=>row.source_event===accepted.source_event).map(row=>db.getCityRecord(guild,"typed_intent",row.data.action_id)).filter(Boolean);
  const plan=related.length?buildActionPlan(db,guild,related):[];
  return {receipt:receipt.record_key,outcome:success?"success":"failure",plan};
}
