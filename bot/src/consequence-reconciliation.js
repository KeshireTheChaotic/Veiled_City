/** Receipt-first action/narration reconciliation; prose projects outcomes but never creates them. */
import { createHash } from "node:crypto";

const digest=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,40);
function fail(message){throw Object.assign(new Error(message),{code:"CONSEQUENCE_RECONCILIATION"});}
function actionAdjudication(db,guild,id){return db.listCityRecords(guild,{kind:"native_adjudication",includeGM:true,limit:500})
  .find(row=>row.data.action_id===id);}
function outcomeReceipt(db,guild,row){
  const key=row.data.outcome_receipt;
  const receipt=key&&db.getCityRecord(guild,"action_outcome_receipt",key);
  if(receipt)return {status:receipt.status,ref:receipt.record_key};
  const arrival=row.data.arrival&&db.getWorldEvent(guild,row.data.arrival);
  return arrival?.status==="active"&&["arrival","travel"].includes(arrival.kind)?{status:"resolved",ref:arrival.event_key}:null;
}
function uncertain(text,claim){
  const at=text.toLocaleLowerCase().indexOf(claim.toLocaleLowerCase());
  if(at<0)return true;
  return /(?:whether|attempt|try|uncertain|unresolved|not yet|might|may|could)[^.!?]{0,80}$/i.test(text.slice(Math.max(0,at-90),at));
}

export function reconcileConsequences(db,guild,{intents=[],narration="",private_messages=[],scope={},strict=true}){
  const actions=[];
  for(const original of intents){
    const row=db.getCityRecord(guild,"typed_intent",original.record_key)||original;
    const adjudication=actionAdjudication(db,guild,row.record_key),receipt=outcomeReceipt(db,guild,row);
    let disposition="unresolved",refs=[];
    if(receipt?.status==="resolved"){disposition="resolved";refs=[receipt.ref];}
    else if(adjudication?.data.disposition==="roll_pending"){
      const request=db.getCityRecord(guild,"roll_request",adjudication.data.roll_request_ref);
      if(!request||request.status!=="pending")fail("Roll-pending narration requires an actual current pending request.");
      disposition="roll_pending";refs=[request.record_key];
    }else if(["blocked","needs_clarification"].includes(row.data.resolution))disposition=row.data.resolution;
    else if(["speak","observe","other"].includes(row.data.type))disposition="acknowledged_nonconsequential";
    else if(strict)fail("Immediate actionable intent has no native resolved, pending, blocked or clarification state.");
    const claim=row.data.authored_outcome_claim;
    if(claim?.status==="unverified"&&disposition!=="resolved"&&!uncertain(String(narration),claim.text))
      fail("Unverified player outcome claim cannot be narrated as success while resolution is pending.");
    actions.push({action_id:row.record_key,disposition,receipt_refs:refs,claim_status:claim?.status||null});
  }
  const projections=[];
  if(String(narration).trim())projections.push({visibility:scope.mode==="private"?(scope.actorCharacterId?"character":"player"):"party",
    subject_key:scope.mode==="private"?(scope.actorCharacterId||scope.actorUserId):null,text:String(narration)});
  for(const message of private_messages||[])projections.push({visibility:"player",subject_key:message.discord_user_id,text:message.content});
  const source=intents[0]?.source_event||null,key=`reconciliation:${digest([actions,projections])}`;
  const prior=db.getCityRecord(guild,"turn_consequence_reconciliation",key);if(prior)return {...prior.data,record_key:prior.record_key,status:prior.status};
  const saved=db.saveCityRecord(guild,{kind:"turn_consequence_reconciliation",key,status:"verified",source_event:source,
    visibility:scope.mode==="private"?(scope.actorCharacterId?"character":"player"):"party",
    subject_key:scope.mode==="private"?(scope.actorCharacterId||scope.actorUserId):null,
    data:{actions,projections,authority:"Narration projection only; cited native requests and receipts own consequences."}});
  return {...saved.data,record_key:saved.record_key,status:saved.status};
}
