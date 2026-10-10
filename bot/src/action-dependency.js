/** Ordered accepted-action dependency plans; interpretation orders work, native receipts resolve it. */
import { createHash } from "node:crypto";

const terminal=new Set(["resolved","failed","blocked","clarification"]);
const hash=value=>createHash("sha256").update(String(value)).digest("hex").slice(0,32);
function fail(message){throw Object.assign(new Error(message),{code:"ACTION_DEPENDENCY"});}

function graph(rows){
  const ids=new Map(rows.map(row=>[row.data.proposal_id,row.record_key]));
  const byKey=new Map(rows.map(row=>[row.record_key,row]));
  const dependencies=new Map(rows.map(row=>[row.record_key,(row.data.dependencies||[]).map(dep=>{
    const key=byKey.has(dep)?dep:ids.get(dep);
    if(!key)fail(`Unknown compound-action dependency: ${dep}`);
    return key;
  })]));
  const visiting=new Set(),done=new Set();
  const visit=key=>{
    if(visiting.has(key))fail("Compound-action dependency cycle detected.");
    if(done.has(key))return;
    visiting.add(key);
    for(const dep of dependencies.get(key)||[])visit(dep);
    visiting.delete(key);done.add(key);
  };
  for(const key of byKey.keys())visit(key);
  return dependencies;
}

function initialStatus(row){
  if(row.status==="resolved")return "resolved";
  if(row.data.resolution==="roll_required")return "pending";
  if(row.data.resolution==="blocked")return "blocked";
  if(row.data.resolution==="needs_clarification")return "clarification";
  return "ready";
}

/** Persist a stable plan and recompute only nonterminal dependency states. */
export function buildActionPlan(db,guild,acceptedRows=[]){
  if(!Array.isArray(acceptedRows)||acceptedRows.length>12||acceptedRows.some(row=>row?.kind&&row.kind!=="typed_intent"))
    fail("A bounded accepted typed-intent list is required.");
  const rows=[...acceptedRows].sort((a,b)=>a.data.sequence_index-b.data.sequence_index);
  if(new Set(rows.map(row=>row.data.sequence_index)).size!==rows.length)fail("Compound actions need unique sequence positions.");
  if(rows.some(row=>!row.record_key||!row.source_event||!["accepted_for_adjudication","resolved"].includes(row.status)
    ||!row.data?.proposal_id||!Array.isArray(row.data.dependencies)))fail("Only current accepted typed intents can form an action plan.");
  if(rows.length&&rows.some(row=>row.source_event!==rows[0].source_event||row.data.actor!==rows[0].data.actor
    ||row.data.session_id!==rows[0].data.session_id||row.data.scene!==rows[0].data.scene))
    fail("Compound actions must share one authenticated actor/source/scene.");
  const dependencies=graph(rows),calculated=new Map(),result=[];
  for(const row of rows){
    const key=`action:${hash(row.record_key)}`,prior=db.getCityRecord(guild,"compound_action",key);
    let status=prior?.data.status||initialStatus(row);
    if(!terminal.has(status)){
      const depStates=dependencies.get(row.record_key).map(dep=>calculated.get(dep)?.data.status);
      if(depStates.some(value=>["failed","blocked","clarification"].includes(value)))status="blocked";
      else if(depStates.some(value=>value!=="resolved"))status="suspended";
      else status=initialStatus(row);
    }
    const saved=db.saveCityRecord(guild,{kind:"compound_action",key,status,source_event:row.source_event,
      visibility:row.visibility,subject_key:row.subject_key,data:{action_id:row.record_key,proposal_id:row.data.proposal_id,
        sequence_index:row.data.sequence_index,dependencies:dependencies.get(row.record_key),source_span:row.data.source_span,
        actor:row.data.actor,session_id:row.data.session_id,scene:row.data.scene,status,
        receipt:prior?.data.receipt||null,expected_actor_revision:row.data.actor_principal_revision??null,
        authority:"Dependency status only; native receipts own outcomes."}});
    calculated.set(row.record_key,saved);result.push(saved);
  }
  return result;
}

export function executableActionSpans(plan=[]){
  return plan.filter(row=>row.data.status==="ready").map(row=>row.data.source_span);
}

/** Compare-and-set a node after a native pending request or committed receipt exists. */
export function transitionAction(db,guild,key,{expected_status,status,receipt}){
  const row=db.getCityRecord(guild,"compound_action",key);
  if(!row||!terminal.has(status)||typeof receipt!=="string"||!receipt.trim())fail("Native action transition needs a terminal status and receipt.");
  if(row.data.status===status&&row.data.receipt===receipt)return row;
  if(row.data.status!==expected_status)fail("Compound action is stale or already has a different receipt.");
  return db.saveCityRecord(guild,{...row,key:row.record_key,status,data:{...row.data,status,receipt}});
}
