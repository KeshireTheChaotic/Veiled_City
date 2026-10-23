/** Convert a terminal native roll request into one typed-action outcome receipt and resume its DAG. */
import { createHash } from "node:crypto";
import { buildActionPlan, transitionAction } from "./action-dependency.js";
import { StateConflictError } from "./kernel/errors.js";
import {drainActionContinuations} from "./action-continuation.js";
import {typedRollProof} from "./typed-roll-proof.js";
import {rollBreakdown,rollRevision,reserveRollAmendment} from "./roll-requests.js";
import {captureActionFeatureWindows} from './native-feature-windows.js';
import {captureEnvironmentTrace} from './native-environment-trace.js';

const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,40);
export function finalizeTypedRollAction(db,guild,request){
  return db.transaction(()=>finalize(db,guild,request));
}
function finalize(db,guild,request){
  const actionId=request?.data?.input?.accepted_intent;
  if(!actionId)return null;
  if(request.status!=="resolved"||!request.data.result||!request.data.roll_id)
    throw new StateConflictError("Typed roll action can finalize only from an actual terminal native result.");
  const {accepted,difficulty,outcome,basis}=typedRollProof(db,guild,request),result=request.data.result;
  // A public declaration is not consent to disclose privately selected mechanics/results.
  // This can only narrow the native receipt audience, never authorize an effect or a public promotion.
  const privateResult=request.data.input.private_result===true,visibility=privateResult?"character":accepted.visibility;
  const subject=privateResult?accepted.data.actor:accepted.subject_key;
  const success=outcome==="success",review=outcome==="needs_review";
  const key=`action-receipt:${hash([actionId,request.record_key,request.data.roll_id,...(request.data.outcome_review?[request.data.outcome_review.source]:[])])}`;
  const receipt=db.getCityRecord(guild,"action_outcome_receipt",key)||db.saveCityRecord(guild,{
    kind:"action_outcome_receipt",key,status:review?"needs_review":"resolved",source_event:accepted.source_event,
    visibility,subject_key:subject,data:{idempotency_key:key,action_id:actionId,
      source_event:accepted.source_event,actor_ref:accepted.data.actor,outcome,success_basis:basis,
      state_mutations:[],native_roll_refs:[request.data.roll_id],rule_refs:[],observed_by:[accepted.data.actor],
      audience:visibility,request:request.record_key,total:result.total,duality:result.duality,difficulty}});
  if(receipt.visibility!==visibility||receipt.subject_key!==subject||receipt.data.audience!==visibility)
    throw new StateConflictError("Native result audience changed; reviewed recovery required, never promote private mechanics.");
  if(receipt.data.outcome!==outcome||receipt.status!==(review?"needs_review":"resolved"))
    throw new StateConflictError("Native verdict changed; reviewed recovery required, never rewrite a saved outcome.");
  db.saveCityRecord(guild,{...accepted,key:accepted.record_key,status:review?"accepted_for_adjudication":"resolved",data:{...accepted.data,
    outcome_receipt:receipt.record_key,native_disposition:review?"roll_result_needs_review":privateResult?"private_roll_resolved":success?"roll_success":"roll_failure"}});
  const adjudication=db.listCityRecords(guild,{kind:"native_adjudication",includeGM:true,limit:500})
    .find(row=>row.data.action_id===actionId&&row.data.roll_request_ref===request.record_key);
  if(adjudication)db.saveCityRecord(guild,{...adjudication,key:adjudication.record_key,status:review?"needs_review":"resolved",visibility,subject_key:subject,
    data:{...adjudication.data,disposition:review?"needs_review":"resolved",receipts:[receipt.record_key],
      review_reasons:review?["Native dice saved; no grounded Difficulty. GM result review required; do not reroll."]:[]}});
  const nodes=db.listCityRecords(guild,{kind:"compound_action",includeGM:true,limit:500}),node=nodes.find(row=>row.data.action_id===actionId);
  if(review&&node&&!(["resolved","failed"].includes(node.data.status)))db.saveCityRecord(guild,{...node,key:node.record_key,status:"pending",visibility,subject_key:subject,
    data:{...node.data,status:"pending",roll_review:receipt.record_key}});
  if(!review&&node&&!(["resolved","failed"].includes(node.data.status)&&node.data.receipt===receipt.record_key))
    transitionAction(db,guild,node.record_key,{expected_status:node.data.status,status:success?"resolved":"failed",receipt:receipt.record_key});
  const related=nodes.filter(row=>row.source_event===accepted.source_event).map(row=>db.getCityRecord(guild,"typed_intent",row.data.action_id)).filter(Boolean);
  if(related.length)buildActionPlan(db,guild,related);
  if(!review&&request.data.kind!=='reaction')captureActionFeatureWindows(db,guild,receipt.record_key);
  if(!review&&request.data.kind==='action')captureEnvironmentTrace(db,guild,actionId);
  drainActionContinuations(db,guild,{sourceEvent:accepted.source_event});
  const plan=related.map(a=>db.getCityRecord(guild,"compound_action",`action:${createHash("sha256").update(String(a.record_key)).digest("hex").slice(0,32)}`));
  return {receipt:receipt.record_key,outcome,plan};
}

/** Called only after authenticated human GM adapter authorization. Reclassifies saved dice, never rolls/spends. */
export function reviewTypedRollOutcome(db,guild,input,reviewer,{gm=false}={}){
  if(!gm||!reviewer||Object.keys(input).sort().join(",")!=="difficulty_source,expected_revision,op,request"||input.op!=="resolve-outcome")
    throw new StateConflictError("Exact authenticated GM outcome review required.");
  return db.transaction(()=>{
    const q=db.getCityRecord(guild,"roll_request",input.request),proof=typedRollProof(db,guild,q);
    const e=db.getWorldEvent(guild,input.difficulty_source);
    if(proof.outcome!=="needs_review"||rollRevision(q)!==input.expected_revision||q.data.kind==="attack"
      ||e?.source_kind!=="gm"||e.details.human_reviewed!==true||e.source_id!==reviewer)
      throw new StateConflictError("Current neutral saved roll and exact human-reviewed Difficulty required; no outcome override.");
    const nextInput={...q.data.input,difficulty_source:input.difficulty_source},pc=db.getCharacter(q.subject_key);
    const breakdown=rollBreakdown(db,guild,nextInput,pc);
    if(breakdown.difficulty===null||JSON.stringify({...breakdown,difficulty:null})!==JSON.stringify(q.data.breakdown))
      throw new StateConflictError("Review may supply only missing Difficulty, not alter saved traits, options or native dice.");
    const current=db.saveCityRecord(guild,{...q,key:q.record_key,data:{...q.data,input:nextInput,breakdown,revision:q.data.revision+1,
      outcome_review:{source:e.event_key,reviewer,previous_revision:input.expected_revision,previous_receipt:proof.accepted.data.outcome_receipt}}});
    const result=finalizeTypedRollAction(db,guild,current);
    reserveRollAmendment(db,guild,current);
    db.audit(guild,q.data.session_id,"gm",reviewer,"typed_roll_outcome_review",{request:q.record_key,roll:q.data.roll_id,...result});
    return result;
  });
}
