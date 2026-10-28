/** Native window lifecycle. Closing participation never grants a result, dice, cost or custody. */
import { createHash } from "node:crypto";
import {sessionNativeActionConsent} from './frameworks/session/public.js';
const consentAction=(...args)=>sessionNativeActionConsent.consentAction(...args);
const requestActionConsent=(...args)=>sessionNativeActionConsent.requestActionConsent(...args);
const respondActionConsent=(...args)=>sessionNativeActionConsent.respondActionConsent(...args);
const validateActionConsent=(...args)=>sessionNativeActionConsent.validateActionConsent(...args);
import { currentScene } from "./scene-continuity.js";
import { conversationPrincipal } from './frameworks/session/public.js';
import { joinActionWindow, lockActionWindow, resolveActionWindow } from "./frameworks/session/public.js";
import { validatePvpAgreement } from "./narrative-pvp.js";
import {sessionNativeRules} from './frameworks/session/public.js';
function adjudicateAcceptedIntent(...args){return sessionNativeRules.adjudicateAcceptedIntent(...args);}
import {sessionIntent} from './frameworks/session/public.js';
function transitionAction(...args){return sessionIntent.transitionAction(...args);}
import {sessionWorldEvents} from './frameworks/session/public.js';
function indexWorldEvent(...args){return sessionWorldEvents.indexWorldEvent(...args);}
import {drainActionContinuations,continuationInbox} from "./action-continuation.js";
function actionReviewOperation(...args){return sessionNativeRules.actionReviewOperation(...args);}
function clearNativeConditionFromOutcome(...args){return sessionNativeRules.clearNativeConditionFromOutcome(...args);}

const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,40);
function fail(message){throw Object.assign(new Error(message),{code:"SCENE_ACTION_WINDOW",expected:true});}
function* records(db,guild,kind){
  for(let offset=0;;offset+=100){const page=db.listCityRecords(guild,{kind,includeGM:true,limit:100,offset});
    yield* page;if(page.length<100)break;}
}
function current(db,guild,key){
  const row=db.getCityRecord(guild,"scene_action_window",key),scene=currentScene(db,guild);
  if(row?.data.pvp_brawl)fail("Native multiplayer PvP target windows belong to their consent/spotlight service.");
  if(!row||row.data.scene!==scene.key||row.data.session_id!==scene.session_id
    ||db.getWorldEvent(guild,row.source_event)?.status!=="active")fail("Window scene/source is stale; GM recovery must cancel, not adjudicate it.");
  return row;
}
function log(db,guild,row,op,user){
  db.saveCityRecord(guild,{kind:"scene_window_lifecycle",key:`window-log:${hash([row.record_key,row.data.revision,op])}`,
    source_event:row.source_event,visibility:"gm",data:{window:row.record_key,revision:row.data.revision,status:row.status,op,user}});
}
function finishPlan(db,guild,action,status,receipt){
  for(const plan of records(db,guild,"compound_action"))if(plan.data.action_id===action){
    transitionAction(db,guild,plan.record_key,{expected_status:plan.data.status,status,receipt});
  }
}
function validateParticipant(db,guild,window,participant){
  const {row:action}=consentAction(db,guild,participant.data.accepted_intent),input=participant.data;
  if(db.getCharacter(action.data.actor).data.location!==participant.location_key)fail("Participant position changed; review required.");
  if(input.required_participants?.length&&!validateActionConsent(db,guild,input.consent_refs,{window,accepted:action,
    input:{...input,location_key:participant.location_key}}))fail("Current action-bound owner consent required.");
  return action;
}

function neutralClosure(db,guild,window,source,reason){
  if(window.status==="closed")return window;
  if(window.data.pvp_proposal)fail("Use the affected owner's neutral PvP withdrawal path.");
  return db.transaction(()=>{
    const outcomes=[];
    for(const plan of records(db,guild,"compound_action")){
      if(plan.data.coordination?.window!==window.record_key)continue;
      const receipt=db.saveCityRecord(guild,{kind:"window_action_receipt",key:`window-neutral:${hash([window.record_key,plan.data.action_id])}`,
        status:"resolved",source_event:source,visibility:plan.visibility,subject_key:plan.subject_key,
        data:{window:window.record_key,action_id:plan.data.action_id,outcome:"blocked",reason,
          authority:"Coordination cancelled only; no fictional failure, punishment, roll, cost or resource effect."}});
      finishPlan(db,guild,plan.data.action_id,"blocked",receipt.record_key);
      outcomes.push({action_id:plan.data.action_id,status:"blocked",receipt:{kind:receipt.kind,key:receipt.record_key}});
    }
    const resolution=`window-neutral:${hash([window.record_key,source])}`;
    db.saveCityRecord(guild,{kind:"scene_action_resolution",key:resolution,status:"closed",source_event:source,visibility:"gm",
      data:{window:window.record_key,outcomes,reason,neutral:true}});
    const closed=db.saveCityRecord(guild,{...window,key:window.record_key,status:"closed",
      data:{...window.data,resolution,revision:window.data.revision+1}});
    log(db,guild,closed,"neutral_closure","native");drainActionContinuations(db,guild);return closed;
  });
}

/** Only explicit GM closure or complete native consents close the entry boundary; no wall-clock inference. */
export function advanceActionWindow(db,guild,user,input,{gm=false}={}){
  if(!input||Object.keys(input).some(key=>!["window","expected_revision","op"].includes(key)))fail("Closed native window operation required.");
  const window=current(db,guild,input.window);
  const participants=window.data.participants.map(key=>db.getCityRecord(guild,"scene_action_participant",key));
  if(!gm&&!participants.some(p=>db.getCharacter(p.actor_key)?.owner_user_id===user))fail("Only a participant owner or GM can operate this window.");
  if(window.data.pvp_proposal)fail("Narrative PvP lifecycle belongs to the bilateral agreement service.");
  if(window.data.revision!==input.expected_revision)fail("Window revision changed; refresh.");
  if(input.op!=="close")fail("Use explicit close; no model-provided outcome or winner is accepted.");
  if(window.status==="locked")return window;
  const actions=participants.map(p=>validateParticipant(db,guild,window,p));
  if(!gm&&(!participants.length||participants.some(p=>!p.data.required_participants?.length)))
    fail("Unbounded reaction/contested entry requires explicit GM completion, not a participant timeout.");
  return db.transaction(()=>{
    const locked=lockActionWindow(db,guild,window.record_key,{expected_revision:input.expected_revision});
    log(db,guild,locked,"entry_closed",user);
    for(const action of actions){
      const a=action.data.native_adjudication;
      if(action.data.resolution==="roll_required"&&a)adjudicateAcceptedIntent(db,guild,{
        acceptedIntent:action.record_key,mode:"roll_required",risk:a.risk,stakes:a.stakes,savedRulingKey:a.saved_ruling_key,
        overrideRefs:a.override_refs,rawRefs:a.raw_refs,houseRefs:a.house_refs,homebrewRefs:a.homebrew_refs,
        trait:a.trait,kind:a.kind,difficulty:a.difficulty,modifierKeys:a.modifier_keys,attackSource:a.attack_source,explanation:a.explanation
      },user,{scope:{mode:action.visibility==='character'?'private':'party',actorUserId:action.data.owner_user_id,actorCharacterId:action.data.actor}});
    }
    return locked;
  });
}

/** Native physical custody is proof, not a model-declared winner or a generic unrelated receipt. */
export function reconcileWindowCustody(db,guild,key,evidenceKey){
  const window=current(db,guild,key),native=db.getCityRecord(guild,"evidence_receipt",evidenceKey);
  if(!native||native.data.operation!=="collect")fail("Existing native evidence collection receipt required.");
  if(window.status==="closed"){
    const prior=db.getCityRecord(guild,"scene_action_resolution",window.data.resolution);
    if(prior?.data.evidence_receipt!==evidenceKey)fail("Window already closed on a different custody receipt.");
    return prior;
  }
  if(window.status!=="locked"||window.data.reason!=="contested_resource")fail("A locked scarce-resource window is required.");
  const source=db.getWorldEvent(guild,native.source_event),handout=db.getHandout(native.data.handout_id),e=handout?.metadata.evidence;
  const ps=window.data.participants.map(id=>db.getCityRecord(guild,"scene_action_participant",id));
  const winner=ps.find(p=>db.getCharacter(p.actor_key)?.owner_user_id===native.data.actor
    &&p.data.accepted_intent===source?.details.accepted_intent);
  if(!winner||source?.status!=="active"||source.kind!=="evidence_transfer"||source.details.window!==key
    ||source.details.human_reviewed!==true||e?.original.holder!==`character:${winner.actor_key}`
    ||source.details.evidence?.handout_id!==handout.id||source.details.evidence?.from!==`location:${winner.location_key}`
    ||source.details.evidence?.to!==e.original.holder||!e.history.some(h=>h.source_event===source.event_key&&h.op==="collect")
    ||ps.some(p=>!p.data.writes.includes(`item:${handout.id}:custody`)))fail("Custody receipt does not prove this exact contested action and resource.");
  ps.forEach(p=>validateParticipant(db,guild,window,p));
  return db.transaction(()=>{
    const outcomes=ps.map(p=>{
      const won=p.record_key===winner.record_key,outcome=won?"resolved":"blocked";
      const receipt=db.saveCityRecord(guild,{kind:"window_action_receipt",key:`window-action:${hash([key,p.record_key,evidenceKey])}`,
        status:"resolved",source_event:p.source_event,visibility:p.visibility,subject_key:p.subject_key,
        data:{window:key,action_id:p.data.accepted_intent,actor:p.actor_key,outcome,
          reason:won?"Native physical collection completed":"The same original is no longer available; no second collection occurred.",
          evidence_receipt:evidenceKey,resource:`item:${handout.id}:custody`}});
      finishPlan(db,guild,p.data.accepted_intent,outcome,receipt.record_key);
      return {participant:p.record_key,status:outcome,receipt:{kind:receipt.kind,key:receipt.record_key}};
    });
    const result=resolveActionWindow(db,guild,key,{expected_revision:window.data.revision,outcomes});
    const saved=db.saveCityRecord(guild,{...result,key:result.record_key,data:{...result.data,evidence_receipt:evidenceKey}});
    log(db,guild,db.getCityRecord(guild,"scene_action_window",key),"custody_resolved","native");drainActionContinuations(db,guild);return saved;
  });
}

/** Bilateral consent stages participation, NEVER a fabricated typed declaration for the defender. */
export function synchronizePvpWindow(db,guild,proposalKey){
  const {proposal:p,agreement}=validatePvpAgreement(db,guild,proposalKey),key=`pvp-window:${hash([p.record_key,p.data.terms_hash])}`;
  const prior=db.getCityRecord(guild,"scene_action_window",key);if(prior)return prior;
  return db.transaction(()=>{
    const row=db.saveCityRecord(guild,{kind:"scene_action_window",key,status:"locked",source_event:p.source_event,
      visibility:"gm",location_key:p.data.location_key,data:{version:1,scene:p.data.scene,session_id:p.data.session_id,revision:1,
        reason:"direct_pc_conflict",participants:[],pvp_participants:p.data.participants,pvp_proposal:p.record_key,
        pvp_agreement:agreement.record_key,terms_hash:p.data.terms_hash,
        authority:"Bilateral narrative participation only; paired native PvP receipts own story stakes. No damage."}});
    log(db,guild,row,"bilateral_agreement_locked","native");return row;
  });
}

/** Authenticated private adapter. It never returns foreign hidden declarations, sheet data or choices. */
export function windowOperation(db,guild,user,input,{gm=false}={}){
  return db.transaction(()=>operateWindow(db,guild,user,input,{gm}));
}
function operateWindow(db,guild,user,input,{gm=false}={}){
  if(input?.op?.startsWith("action-review-"))return actionReviewOperation(db,guild,user,input,{gm});
  const {op,...args}=input;
  if(op==='clear-condition'){
    const action=db.getCityRecord(guild,'typed_intent',args.accepted_intent);
    if(action?.data.owner_user_id!==user)fail('Only the actual owner may end a condition through their resolved declaration; GM cannot choose for them.');
    return clearNativeConditionFromOutcome(db,guild,args,{mode:action.visibility==='character'?'private':'party',
      actorUserId:user,actorCharacterId:action.data.actor});
  }
  if(op==="continuation-inbox"){
    if(Object.keys(args).length)fail("Continuation inbox takes no foreign scope.");
    return continuationInbox(db,guild,user,{gm});
  }
  if(op==="continuation-resume"){
    if(Object.keys(args).some(k=>k!=="task")||typeof args.task!=="string")fail("Exact continuation task required.");
    const task=db.getCityRecord(guild,"action_continuation",args.task),a=task&&db.getCityRecord(guild,"typed_intent",task.data.action);
    if(!task||!gm&&(a?.data.owner_user_id!==user||db.getCharacter(a.data.actor)?.owner_user_id!==user
      ||db.activeAssignment(a.data.session_id,user)?.character_id!==a.data.actor))fail("Only the current owner or authenticated GM can retry this private continuation.");
    drainActionContinuations(db,guild,{retry:args.task});
    return continuationInbox(db,guild,user,{gm}).filter(t=>t.task===args.task);
  }
  if(op==="cancel"){
    if(!gm)fail("Stale window recovery requires explicit GM cancellation, never an inferred winner.");
    if(Object.keys(args).some(key=>!["window","expected_revision","interaction_id"].includes(key))||!args.interaction_id)
      fail("Exact native cancellation fields required.");
    const row=db.getCityRecord(guild,"scene_action_window",args.window);
    if(!row||row.data.revision!==args.expected_revision)fail("Cancellation revision changed.");
    const source=indexWorldEvent(db,guild,{key:`window-cancel:${hash([guild,user,args.interaction_id])}`,kind:"window_cancellation",
      source_id:`human_gm:${user}`,title:"GM cancelled coordination without fictional consequences",visibility:"gm",
      details:{window:row.record_key,revision:row.data.revision}},user);
    const closed=neutralClosure(db,guild,row,source.event_key,"Explicit GM recovery cancelled coordination; no consequences applied.");
    return {window:closed.record_key,status:closed.status};
  }
  if(op==="close")return {window:advanceActionWindow(db,guild,user,{...args,op},{gm}).record_key,status:"locked"};
  if(op==="custody"){
    if(!gm)fail("GM reconciliation requires established native evidence; no player-declared success.");
    const row=reconcileWindowCustody(db,guild,args.window,args.receipt);return {window:args.window,status:row.status};
  }
  if(op==="request"){
    if(Object.keys(args).some(key=>!["window","expected_revision","accepted_intent","consequences","expires_minute"].includes(key)))
      fail("Consent request cannot redirect accepted operation/resources or participants.");
    const {row:action,principal}=consentAction(db,guild,args.accepted_intent);
    if(principal.user!==user)fail("Only the action owner may request participation.");
    if(args.window!==[...records(db,guild,"compound_action")].find(p=>p.data.action_id===action.record_key)?.data.coordination?.window)
      fail("Request must use the action's current pending window.");
    const c=action.data.coordination;
    const row=requestActionConsent(db,guild,{reads:c.reads,writes:c.writes,location_key:c.location_key,operation:c.operation,
      required_participants:c.required_participants,participation:"voluntary",...args});
    return {request:row.record_key,terms_hash:row.data.terms_hash,status:row.status};
  }
  if(op==="respond"){
    const reply=respondActionConsent(db,guild,user,args),offer=db.getCityRecord(guild,"action_consent_request",reply.data.request);
    const window=current(db,guild,offer.data.terms.window),action=consentAction(db,guild,offer.data.terms.accepted_intent).row;
    if(reply.status!=="accepted"){
      neutralClosure(db,guild,window,reply.source_event,"An affected owner declined or revoked participation; no forced outcome.");
      return {request:offer.record_key,status:reply.status};
    }
    const refs=offer.data.owners.map(w=>`action-consent:${hash([offer.record_key,w.character])}`);
    // The same sha256 prefix is used by the native consent service.
    const join={...offer.data.terms,participation:"voluntary",consent_refs:refs};
    if(validateActionConsent(db,guild,refs,{window,accepted:action,input:join})){
      const participant=joinActionWindow(db,guild,window.record_key,join);
      for(const plan of records(db,guild,"compound_action"))if(plan.data.action_id===action.record_key)
        db.saveCityRecord(guild,{...plan,key:plan.record_key,data:{...plan.data,coordination:{window:window.record_key,participant:participant.record_key}}});
    }
    return {request:offer.record_key,status:reply.status};
  }
  if(op!=="inbox")fail("Use inbox, request, respond, close, custody or GM cancel.");
  const principal=gm?null:conversationPrincipal(db,guild,user),rows=[];
  for(const row of records(db,guild,"action_consent_request")){
    if(!gm&&!row.data.owners.some(w=>w.user===user&&w.character===principal.character_id))continue;
    rows.push({request:row.record_key,status:row.status,terms_hash:row.data.terms_hash,terms:row.data.terms,
      consequences:row.data.consequences,expires_minute:row.data.expires_minute});
  }
  for(const row of records(db,guild,"scene_action_window")){
    if(!gm&&!row.data.participants.some(key=>{
      const p=db.getCityRecord(guild,"scene_action_participant",key);return p?.actor_key===principal.character_id;
    }))continue;
    rows.push({window:row.record_key,status:row.status,expected_revision:row.data.revision,
      guidance:"No timeout infers consent. GM may close entry, reconcile native custody, or cancel neutrally."});
  }
  return rows;
}
