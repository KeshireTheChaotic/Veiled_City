/** Optional scene-scoped action windows for real overlap; ordinary posts never wait on this module. */
import { createHash } from "node:crypto";
import { currentScene } from "./scene-continuity.js";

const reasons=new Set(["combat_spotlight","cooperative_operation","contested_resource","reaction_opportunity","direct_pc_conflict","gm_declared_beat"]);
const terminal=new Set(["resolved","failed","blocked","declined"]);
const digest=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,32);
function fail(message){throw Object.assign(new Error(message),{code:"SCENE_ACTION_WINDOW"});}
function boundedResources(values){return Array.isArray(values)&&values.length<=32&&new Set(values).size===values.length
  &&values.every(value=>typeof value==="string"&&/^[a-z][a-z0-9_-]*:[^\s]{1,180}$/i.test(value));}

export function openActionWindow(db,guild,input){
  if(!input||!reasons.has(input.reason)||typeof input.key!=="string"||!input.key.trim())
    fail("Action windows open only for an explicit meaningful overlap reason.");
  const scene=currentScene(db,guild),source=db.getWorldEvent(guild,input.source_event);
  if(!source||source.status!=="active"||source.session_id!==scene.session_id||source.scene!==scene.key)
    fail("Action window needs a current scene-scoped source.");
  const key=`window:${digest([scene.key,input.key])}`,prior=db.getCityRecord(guild,"scene_action_window",key);
  if(prior)return prior;
  return db.saveCityRecord(guild,{kind:"scene_action_window",key,status:"open",source_event:source.event_key,
    visibility:source.visibility,subject_key:source.subject_key||null,data:{scene:scene.key,session_id:scene.session_id,
      reason:input.reason,revision:1,participants:[],reaction_open:input.reason==="reaction_opportunity",
      authority:"Coordination boundary only; participant declarations and native receipts own outcomes."}});
}

export function classifyResourceOverlap(a,b){
  if([a.operation,b.operation].includes("testimony"))return "contradictory_testimony";
  const sharedWrite=a.writes.filter(key=>b.writes.includes(key));
  if(sharedWrite.length)return a.operation==="opposed"||b.operation==="opposed"?"opposed_action":"same_scarce_resource";
  if(a.writes.some(key=>b.reads.includes(key))||b.writes.some(key=>a.reads.includes(key)))return "sequential_dependency";
  if(["help","tag_team","group_action"].includes(a.operation)||["help","tag_team","group_action"].includes(b.operation))return "cooperative";
  return "independent";
}
function consent(db,guild,refs,participants){
  if(!Array.isArray(refs))return false;
  const covered=new Set();
  for(const ref of refs){
    const row=ref&&db.getCityRecord(guild,"action_consent",ref);
    if(!row||row.status!=="accepted"||!participants.includes(row.subject_key)||row.data.decision!=="accept")return false;
    covered.add(row.subject_key);
  }
  return participants.every(value=>covered.has(value));
}

export function joinActionWindow(db,guild,windowKey,input){
  const window=db.getCityRecord(guild,"scene_action_window",windowKey),scene=currentScene(db,guild);
  if(!window||window.status!=="open"||window.data.scene!==scene.key)fail("Only the current open action window can accept participation.");
  const accepted=db.getCityRecord(guild,"typed_intent",input.accepted_intent);
  if(!accepted||accepted.status!=="accepted_for_adjudication"||accepted.data.scene!==scene.key
    ||accepted.data.session_id!==scene.session_id||db.getWorldEvent(guild,accepted.source_event)?.status!=="active")
    fail("Participation needs a current separately accepted player intent.");
  if(!boundedResources(input.reads)||!boundedResources(input.writes)||!input.operation||input.participation!=="voluntary")
    fail("Participation needs bounded resolved resources and a voluntary operation.");
  const participants=window.data.participants.map(key=>db.getCityRecord(guild,"scene_action_participant",key));
  if(participants.some(row=>row.data.accepted_intent===accepted.record_key))return participants.find(row=>row.data.accepted_intent===accepted.record_key);
  if(participants.some(row=>row.location_key!==input.location_key
    ||row.visibility!==accepted.visibility||row.subject_key!==accepted.subject_key)
    &&(!["public","party"].includes(accepted.visibility)||participants.some(row=>!["public","party"].includes(row.visibility))))
    fail("Different audience or location scopes cannot be treated as a shared conflict.");
  const required=input.required_participants||[];
  if((window.data.reason==="direct_pc_conflict"||["help","tag_team","group_action"].includes(input.operation))
    &&(!required.length||!consent(db,guild,input.consent_refs||[],required)))
    fail("Direct PC conflict and cooperative participation require each affected owner's native consent.");
  const candidate={reads:input.reads,writes:input.writes,operation:input.operation};
  const classifications=participants.map(row=>classifyResourceOverlap(row.data,candidate));
  const classification=classifications.find(value=>value!=="independent")||"independent";
  const key=`participant:${digest([window.record_key,accepted.record_key])}`,revision=window.data.revision+1;
  const row=db.saveCityRecord(guild,{kind:"scene_action_participant",key,status:"accepted",source_event:accepted.source_event,
    visibility:accepted.visibility,subject_key:accepted.subject_key,actor_key:accepted.data.actor,location_key:input.location_key,
    data:{window:window.record_key,accepted_intent:accepted.record_key,actor:accepted.data.actor,reads:input.reads,writes:input.writes,
      operation:input.operation,classification,required_participants:required,consent_refs:input.consent_refs||[],window_revision:revision}});
  db.saveCityRecord(guild,{...window,key:window.record_key,data:{...window.data,revision,participants:[...window.data.participants,row.record_key]}});
  return row;
}

export function lockActionWindow(db,guild,key,{expected_revision}){
  const row=db.getCityRecord(guild,"scene_action_window",key);
  if(!row||row.status!=="open")fail("Only an open action window can lock.");
  if(row.data.revision!==expected_revision)fail("Action window revision is stale; rebase before locking.");
  if(row.data.participants.length<1)fail("An empty action window cannot lock.");
  return db.saveCityRecord(guild,{...row,key:row.record_key,status:"locked",data:{...row.data,revision:row.data.revision+1}});
}

export function resolveActionWindow(db,guild,key,{expected_revision,outcomes}){
  const row=db.getCityRecord(guild,"scene_action_window",key);
  if(!row)fail("Action window not found.");
  const resolutionKey=`resolution:${digest([key,outcomes])}`,prior=db.getCityRecord(guild,"scene_action_resolution",resolutionKey);
  if(prior)return prior;
  if(row.status!=="locked"||row.data.revision!==expected_revision)fail("Locked action window revision is stale.");
  if(!Array.isArray(outcomes)||outcomes.length!==row.data.participants.length
    ||new Set(outcomes.map(value=>value.participant)).size!==outcomes.length
    ||outcomes.some(value=>!row.data.participants.includes(value.participant)||!terminal.has(value.status)))
    fail("Resolution must cover every participant exactly once.");
  const participants=row.data.participants.map(id=>db.getCityRecord(guild,"scene_action_participant",id));
  const exclusive=participants.some(value=>["same_scarce_resource","opposed_action"].includes(value.data.classification));
  if(exclusive&&outcomes.filter(value=>value.status==="resolved").length>1)
    fail("Exclusive conflict requires one consistent winner set.");
  for(const outcome of outcomes){
    const receipt=outcome.receipt&&db.getCityRecord(guild,outcome.receipt.kind,outcome.receipt.key);
    if(!receipt||receipt.status!=="resolved")fail("Every coordinated outcome needs an existing native receipt.");
  }
  for(const outcome of outcomes){
    const participant=db.getCityRecord(guild,"scene_action_participant",outcome.participant);
    db.saveCityRecord(guild,{...participant,key:participant.record_key,status:outcome.status,
      data:{...participant.data,outcome_receipt:outcome.receipt}});
  }
  db.saveCityRecord(guild,{...row,key:row.record_key,status:"closed",data:{...row.data,revision:row.data.revision+1,
    resolution:resolutionKey}});
  return db.saveCityRecord(guild,{kind:"scene_action_resolution",key:resolutionKey,status:"closed",source_event:row.source_event,
    visibility:row.visibility,subject_key:row.subject_key,data:{window:key,outcomes,expected_revision,
      authority:"Coordinated projection of existing native receipts; no mechanics are inferred here."}});
}
