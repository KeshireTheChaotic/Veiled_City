/** Durable native-result continuation. No model call, replacement declaration, implicit consent or effect replay. */
import {createHash} from "node:crypto";
import {sessionIntent} from './contracts/intent.js';
function buildActionPlan(...args){return sessionIntent.buildActionPlan(...args);}function transitionAction(...args){return sessionIntent.transitionAction(...args);}function signalActionContinuation(...args){return sessionIntent.signalActionContinuation(...args);}
import {sessionNativeActionConsent} from './contracts/native-action-consent.js';
const consentAction=(...args)=>sessionNativeActionConsent.consentAction(...args);
const completedActionSource=(...args)=>sessionNativeActionConsent.completedActionSource(...args);
const historicalActionSource=(...args)=>sessionNativeActionConsent.historicalActionSource(...args);
import {currentScene} from "./scene-source.js";
import {sessionWorldAutonomy} from './contracts/world-autonomy.js';
function applyAutonomousWorld(...args){return sessionWorldAutonomy.applyAutonomousWorld(...args);}
import {sessionNativeChecks} from './contracts/native-checks.js';
function assertPcCanAct(...args){return sessionNativeChecks.assertPcCanAct(...args);}
function validatePvpResolutionReceipt(...args){return sessionNativeChecks.validatePvpResolutionReceipt(...args);}
function pendingPvpFear(...args){return sessionNativeChecks.pendingPvpFear(...args);}
function validatePvpDamageApplication(...args){return sessionNativeChecks.validatePvpDamageApplication(...args);}
function validatePvpAttackRoll(...args){return sessionNativeChecks.validatePvpAttackRoll(...args);}
import {sessionPublicationContinuation,sessionContinuationNoticeSource} from "./contracts/publication-continuation.js";
function prepareContinuationOutput(...args){return sessionPublicationContinuation.prepareContinuationOutput(...args);}
function queueTurnPublications(...args){return sessionPublicationContinuation.queueTurnPublications(...args);}
function typedRollProof(...args){return sessionNativeChecks.typedRollProof(...args);}
const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
function acceptedInputHash(row){
  const data={...row.data};
  for(const key of ["outcome_receipt","native_disposition","arrival","adjudication"])delete data[key];
  return hash({key:row.record_key,source:row.source_event,visibility:row.visibility,subject:row.subject_key,data});
}
const terminal=new Set(["resolved","failed","blocked","clarification"]);
const expected=new Set(["CONTINUATION_PRECONDITION","SCENE_ACTION_WINDOW","NARRATIVE_PVP","AUTONOMOUS_WORLD","PC_NATIVE_ELIGIBILITY","PC_EFFECT_AUTHORITY","TYPED_ROLL_PROOF"]);
function hold(message){throw Object.assign(new Error(message),{code:"CONTINUATION_PRECONDITION",expected:true});}
function records(db,guild,kind){const rows=[];for(let offset=0;offset<10000;offset+=100){
  const page=db.listCityRecords(guild,{kind,includeGM:true,limit:100,offset});rows.push(...page);if(page.length<100)return rows;
}hold("Continuation inventory needs bounded reviewed recovery; no silently truncated authority.");}
function live(db,guild,a,{completed=false}={}){
  const d=a?.data,session=db.getActiveSession(guild),pc=d&&db.getCharacter(d.actor);
  if(!session||d.session_id!==session.id||pc?.owner_user_id!==d.owner_user_id||!["active","reserve","guest"].includes(pc.status)
    ||db.activeAssignment(session.id,d.owner_user_id)?.character_id!==pc.id
    ||!db.roster(session.id).some(r=>r.discord_user_id===d.owner_user_id&&["present","late","guest"].includes(r.presence)))
    hold("Continuation owner, active role or scene changed; current owner review required.");
  return completed?completedActionSource(db,guild,a.record_key):consentAction(db,guild,a.record_key);
}
/** Independently prove an exact terminal predecessor; a label/paragraph/signal is never sufficient. */
function cause(db,guild,node){
  const a=db.getCityRecord(guild,"typed_intent",node.data.action_id),key=node.data.receipt;
  const r=db.getCityRecord(guild,"action_outcome_receipt",key);
  if(r){
    if(r.status!=="resolved"||r.source_event!==a?.source_event||r.data.action_id!==a.record_key)hold("Exact action outcome ancestry required.");
    if(r.data.terminal){
      live(db,guild,a);const t=db.getCityRecord(guild,"pvp_action_terminal_receipt",r.data.terminal);
      if(t?.status!=='resolved'||t.data.action!==a.record_key||t.source_event!==a.source_event)
        hold('Exact native PvP terminal required.');
      if(t.data.effect){
        const e=validatePvpDamageApplication(db,guild,t.data.effect);
        if(e.record_key!==r.data.state_mutations?.[0])hold('Exact native PvP damage terminal required.');
      }else{
        const p=validatePvpAttackRoll(db,guild,t.data.roll),staged=db.getCityRecord(guild,'pvp_attack_intent',p.offer.input.attack);
        if(p.receipt.data.result.hit||p.request.record_key!==t.data.attack||p.request.data.terminal!==t.record_key
          ||staged?.data.accepted_intent!==a.record_key||t.data.outcome!=='failure'||r.data.outcome!=='failure'
          ||node.data.status!=='failed'||r.data.state_mutations?.length!==0||t.data.damage!==null
          ||hash(r.data.native_roll_refs)!==hash([p.receipt.data.roll_id])||pendingPvpFear(db,guild,p.contract).length)
          hold('Exact native missed attack and completed Fear gate required; no fabricated success.');
      }
    }else if(r.data.request){
      live(db,guild,a,{completed:true});const q=db.getCityRecord(guild,"roll_request",r.data.request),proof=typedRollProof(db,guild,q);
      if(proof.outcome==="needs_review")hold("Grounded native result/Difficulty required before dependency success.");
      const win=proof.outcome==="success";
      if(r.data.outcome!==(win?"success":"failure")||node.data.status!==(win?"resolved":"failed"))hold("Native predecessor verdict changed.");
    }else if(r.data.outcome==="resolved_no_roll"){
      historicalActionSource(db,guild,a.record_key,{resolved:true});
      const source=db.getWorldEvent(guild,a.source_event),ad=records(db,guild,"native_adjudication").find(x=>x.data.action_id===a.record_key&&x.data.receipts?.includes(key));
      if(source?.status!=="active"||ad?.status!=="resolved"||!ad.data.rule_basis_refs?.length||ad.source_event!==a.source_event)hold("Grounded native no-roll receipt required.");
    }else hold("Unsupported native result remains pending adjudication, never guessed success.");
    return {kind:r.kind,key:r.record_key,digest:hash(r),success:node.data.status==="resolved"};
  }
  const pvp=db.getCityRecord(guild,"pvp_resolution_receipt",key);
  if(pvp){const p=db.getCityRecord(guild,"pvp_proposal",pvp.data.proposal);validatePvpResolutionReceipt(db,guild,p,pvp);
    if(p.data.accepted_intent!==a?.record_key||pendingPvpFear(db,guild,p).length)hold("Exact PvP result and completed immediate Fear gate required.");
    return {kind:pvp.kind,key,digest:hash(pvp),success:pvp.data.winner===a.data.actor&&node.data.status==="resolved"};}
  const w=db.getCityRecord(guild,"window_action_receipt",key),window=w&&db.getCityRecord(guild,"scene_action_window",w.data.window);
  if(w&&window?.status==="closed"&&w.data.action_id===a?.record_key){
    if(w.data.outcome!=="resolved")return {kind:w.kind,key,digest:hash(w),success:false};
    const resolution=db.getCityRecord(guild,"scene_action_resolution",window.data.resolution),e=db.getCityRecord(guild,"evidence_receipt",w.data.evidence_receipt);
    const s=e&&db.getWorldEvent(guild,e.source_event),h=e&&db.getHandout(e.data.handout_id);
    if(resolution?.data.evidence_receipt!==e?.record_key||s?.status!=="active"||s.kind!=="evidence_transfer"
      ||s.details.accepted_intent!==a.record_key||s.details.window!==window.record_key||s.details.human_reviewed!==true
      ||h?.metadata.evidence?.original.holder!==`character:${a.data.actor}`)hold("Current native custody proof required; window closure alone grants no success.");
    live(db,guild,a);return {kind:w.kind,key,digest:hash(w),success:true};
  }
  const arrival=db.getWorldEvent(guild,key);
  if(arrival?.status==="active"&&arrival.kind==="arrival"&&a?.data.arrival===key&&arrival.details.entity_key===a.data.actor
    &&arrival.details.input_source===a.data.world_source_event){
    historicalActionSource(db,guild,a.record_key,{resolved:true});
    return {kind:"event",key,digest:hash(arrival),success:true};
  }
  hold("No supported exact native predecessor receipt; adjudication required.");
}
function dependencies(db,guild,node){return node.data.dependencies.map(id=>{
  const parent=records(db,guild,"compound_action").find(n=>n.data.action_id===id&&n.source_event===node.source_event);
  if(!parent||!terminal.has(parent.data.status))hold("Dependent native result is still pending.");return cause(db,guild,parent);
});}
/** Reused by the one existing native world executor. Only the task's one exact accepted move is eligible. */
export function continuationAuthorization(db,guild,key){
  const task=db.getCityRecord(guild,"action_continuation",key),a=task&&db.getCityRecord(guild,"typed_intent",task.data.action);
  const node=task&&db.getCityRecord(guild,"compound_action",task.data.node);
  if(!task||task.visibility!=="character"||task.subject_key!==a?.data.actor||task.source_event!==a.source_event
    ||task.data.accepted_hash!==hash(a)||task.data.accepted_input_hash!==acceptedInputHash(a)
    ||task.data.node!==node?.record_key||node.data.continuation!==key
    ||key!==`action-continuation:${hash([a.record_key,node.data.dependencies])}`
    ||!["pending","needs_adjudication"].includes(task.status))hold("Current exact private continuation task required.");
  const proof=live(db,guild,a),pc=db.getCharacter(a.data.actor);assertPcCanAct(pc,db,guild);
  if((a.data.from_ref||null)!==(pc.data.location||null))hold("Continuation position changed; do not redirect an old declaration.");
  if((node.data.interrupt_refs||[]).some(ref=>db.getCityRecord(guild,"action_interrupt_receipt",ref)?.status!=="resolved"))
    hold("Native interruption still requires contextual revalidation.");
  const deps=dependencies(db,guild,node);
  if(deps.some(d=>!d.success)||hash(deps)!==task.data.cause_hash)hold("Native predecessor result changed or did not succeed.");
  return {task,action:a,node,proof,scope:{mode:a.visibility==="character"?"private":"party",actorUserId:a.data.owner_user_id,actorCharacterId:a.data.actor}};
}
function notice(db,guild,task){
  const a=db.getCityRecord(guild,"typed_intent",task.data.action),session=db.getActiveSession(guild);
  const source=db.getWorldEvent(guild,a.source_event);
  if(!session||session.id!==a.data.session_id||db.activeAssignment(session.id,a.data.owner_user_id)?.character_id!==a.data.actor
    ||db.getCharacter(a.data.actor)?.owner_user_id!==a.data.owner_user_id||source?.status!=="active"
    ||a.visibility!==source.visibility||a.subject_key!==source.subject_key||currentScene(db,guild).key!==a.data.scene)return;
  const scope={mode:"private",actorUserId:a.data.owner_user_id,actorCharacterId:a.data.actor};
  try{renderContinuationNotice(db,guild,task.record_key,scope);}catch(e){if(!expected.has(e.code))throw e;return;}
  const turn=db.beginTurnAttempt({guildId:guild,messageId:`continuation:${task.record_key}:${hash(task.data)}`,actorPrincipal:scope.actorUserId,sessionId:session.id,audience:"private"});
  const result=prepareContinuationOutput(db,guild,task,scope);
  queueTurnPublications(db,{guild:{id:guild},session,result,scope,turnId:turn.turn_id});
  db.updateTurnAttempt(turn.turn_id,{stage:"committed",committed:"yes",nativeCommitId:task.record_key});
}
export function renderContinuationNotice(db,guild,key,scope){
  const task=db.getCityRecord(guild,"action_continuation",key),a=task&&db.getCityRecord(guild,"typed_intent",task.data.action),s=a&&db.getWorldEvent(guild,a.source_event);
  if(!task||scope.mode!=="private"||task.subject_key!==scope.actorCharacterId||a?.data.owner_user_id!==scope.actorUserId
    ||db.getCharacter(a.data.actor)?.owner_user_id!==scope.actorUserId||s?.status!=="active"||s.details.raw_hash!==a.data.source_hash
    ||currentScene(db,guild).key!==a.data.scene)hold("Continuation notice source/owner/audience changed.");
  historicalActionSource(db,guild,a.record_key,{resolved:a.status==="resolved"});
  if(task.data.accepted_input_hash!==acceptedInputHash(a))hold("Original continuation input changed; no notice can certify it.");
  if(task.status==="resolved"){
    if(task.data.native_kind==="action_outcome_receipt"){
      const node=db.getCityRecord(guild,"compound_action",task.data.node),native=cause(db,guild,node);
      if(native.key!==task.data.native_receipt||native.digest!==task.data.native_digest)hold("Continuation result ancestry changed.");
      return "Your original dependent action has a saved native result. No additional character response is implied.";
    }
    const r=db.getWorldEvent(guild,task.data.native_receipt);
    if(r?.status!=="active"||r.kind!=="arrival"||a.data.arrival!==r.event_key||r.details.entity_key!==a.data.actor)hold("Native continuation arrival proof required.");
    return "Your original dependent movement has a saved native arrival. No additional character response is implied.";
  }
  return task.status==="blocked"?"A dependent action did not proceed because its native prerequisite was not satisfied. Independent actions remain available."
    :"A dependent action is held for current native adjudication. No success, movement, cost or character response has been inferred. Use the private continuation inbox to inspect or retry it.";
}
/** Called inside native transactions and on restart/next turn. Every task uses its original owner source. */
export function drainActionContinuations(db,guild,{sourceEvent=null,retry=null}={}){
  return db.transaction(()=>{
    const signals=records(db,guild,"action_continuation_signal").filter(s=>s.status==="pending"&&(!sourceEvent||s.source_event===sourceEvent));
    const sources=new Set(signals.map(s=>s.source_event));
    if(sourceEvent)sources.add(sourceEvent);
    if(retry){const t=db.getCityRecord(guild,"action_continuation",retry);if(!t)hold("Continuation task not found.");sources.add(t.source_event);}
    const results=[];
    for(const source of sources){
      const nodes=records(db,guild,"compound_action").filter(n=>n.source_event===source);
      const actions=nodes.map(n=>db.getCityRecord(guild,"typed_intent",n.data.action_id));
      if(actions.some(a=>!a))hold("Continuation accepted input is unavailable.");
      const plan=buildActionPlan(db,guild,actions);
      for(const node of plan.filter(n=>terminal.has(n.data.status)&&n.data.continuation)){
        const task=db.getCityRecord(guild,"action_continuation",node.data.continuation);
        if(!task||["resolved","blocked"].includes(task.status)||!node.data.receipt)continue;
        try{
          if(task.data.accepted_input_hash!==acceptedInputHash(db.getCityRecord(guild,"typed_intent",node.data.action_id)))
            hold("Original continuation input changed; a later result cannot replace its acceptance proof.");
          const native=cause(db,guild,node);
          const settled=db.saveCityRecord(guild,{...task,key:task.record_key,status:native.success?"resolved":"blocked",
            data:{...task.data,reason:null,native_receipt:native.key,native_kind:native.kind,native_digest:native.digest}});
          notice(db,guild,settled);results.push(settled);
        }catch(e){if(!expected.has(e.code))throw e;
          db.saveCityRecord(guild,{...task,key:task.record_key,status:"needs_adjudication",data:{...task.data,reason:e.message}});
        }
      }
      for(const node of plan.filter(n=>n.data.dependencies.length&&(!terminal.has(n.data.status)||n.data.status==="blocked"))){
        const a=db.getCityRecord(guild,"typed_intent",node.data.action_id);
        const key=node.data.continuation||`action-continuation:${hash([a.record_key,node.data.dependencies])}`;
        const old=db.getCityRecord(guild,"action_continuation",key);if(old?.status==="resolved"||old?.status==="blocked")continue;
        if(!old&&node.data.dependencies.some(id=>!terminal.has(plan.find(n=>n.data.action_id===id)?.data.status)))continue;
        if(old&&retry!==key)continue;
        let deps=[],reason=null,status="pending",native=null;
        try{if(old&&old.data.accepted_hash!==hash(a))hold("Original accepted continuation changed; do not overwrite its immutable task proof.");
          live(db,guild,a);deps=dependencies(db,guild,node);if(deps.some(d=>!d.success))status="blocked";}
        catch(e){if(!expected.has(e.code))throw e;status="needs_adjudication";reason=e.message;}
        let task=db.saveCityRecord(guild,{kind:"action_continuation",key,status,source_event:source,visibility:"character",subject_key:a.data.actor,
          data:{version:1,action:a.record_key,node:node.record_key,accepted_hash:old?.data.accepted_hash||hash(a),
            accepted_input_hash:old?old.data.accepted_input_hash:acceptedInputHash(a),cause_hash:hash(deps),causes:deps,
            reason,owner:a.data.owner_user_id,session:a.data.session_id,scene:a.data.scene,native_receipt:null}});
        db.saveCityRecord(guild,{...node,key:node.record_key,status:status==="blocked"?"blocked":"pending",visibility:"character",subject_key:a.data.actor,
          data:{...node.data,status:status==="blocked"?"blocked":"pending",continuation:key}});
        if(status==="pending"){
          try{
            const c=continuationAuthorization(db,guild,key);
            if(a.data.type!=="move"||a.data.resolution!=="auto"||node.data.coordination||node.data.pvp_attempt||node.data.pvp_attack)
              hold("This dependent operation requires current native adjudication; no deterministic costless execution is available.");
            const world=applyAutonomousWorld(db,guild,{scene_actions:[{kind:"move",entity_ref:a.data.target_key,source_span:a.data.source_span,
              zone:a.data.destination==="interior"?"interior":a.data.destination==="exterior"?"exterior":"scene"}]},c.scope,
              {messageId:c.proof.source.details.discord_message_id,continuationKey:key});
            native=world.find(r=>r.status==="arrived")?.source_event;if(!native)hold("Native continuation has no arrival receipt.");
            status="resolved";
          }catch(e){if(!expected.has(e.code))throw e;status="needs_adjudication";reason=e.message;}
        }
        task=db.saveCityRecord(guild,{...task,key,status,data:{...task.data,reason,native_receipt:native}});
        if(status==="resolved")transitionAction(db,guild,node.record_key,{expected_status:"pending",status:"resolved",receipt:native});
        // Invalid authority stays durably held; notice cannot be a fallback that leaks invalid proof.
        if(db.getWorldEvent(guild,source)?.status==="active")notice(db,guild,task);
        results.push(task);
      }
      for(const signal of signals.filter(s=>s.source_event===source))db.saveCityRecord(guild,{...signal,key:signal.record_key,status:"processed"});
    }
    return results;
  });
}
export function continuationInbox(db,guild,user,{gm=false}={}){
  return records(db,guild,"action_continuation").filter(t=>gm||t.data.owner===user&&db.getActiveSession(guild)?.id===t.data.session
    &&db.getCharacter(t.subject_key)?.owner_user_id===user&&db.activeAssignment(t.data.session,user)?.character_id===t.subject_key)
    .map(t=>({task:t.record_key,status:t.status,action:t.data.action,reason:t.data.reason,source:t.source_event}));
}
export function refreshActionContinuations(db,guild){
  for(const n of records(db,guild,"compound_action")){
    if(terminal.has(n.data.status)){signalActionContinuation(db,guild,n);continue;}
    const a=db.getCityRecord(guild,"typed_intent",n.data.action_id);
    const key=a?.data.outcome_receipt||a?.data.arrival;
    if(a?.status==="resolved"&&key&&!(n.data.interrupt_refs||[]).some(ref=>db.getCityRecord(guild,"action_interrupt_receipt",ref)?.status!=="resolved")){
      const r=db.getCityRecord(guild,"action_outcome_receipt",key);
      transitionAction(db,guild,n.record_key,{expected_status:n.data.status,status:r?.data.outcome==="failure"?"failed":"resolved",receipt:key});
    }
  }
  const results=drainActionContinuations(db,guild);
  for(const source of new Set(records(db,guild,"action_continuation").filter(t=>!["resolved","blocked"].includes(t.status)).map(t=>t.source_event)))
    results.push(...drainActionContinuations(db,guild,{sourceEvent:source}));
  return results;
}
import {sessionActionContinuation,sessionContinuationAuthorization} from './contracts/action-continuation.js';
// Provide this module's original continuation drain and authorization reader to the fixed Session slots; no other authority is granted.
sessionActionContinuation.bind({drainActionContinuations});
sessionContinuationAuthorization.bind({continuationAuthorization});

sessionContinuationNoticeSource.bind({renderContinuationNotice});
