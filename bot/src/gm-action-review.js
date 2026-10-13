/** Private non-actionable action review through authenticated owner/GM adapters; never a new effect executor. */
import {createHash} from "node:crypto";
import {consentAction} from "./action-consent.js";
import {personalCharacter} from "./personal-continuity.js";
import {indexWorldEvent} from "./city-calendar.js";
import {adjudicateGmRuling} from "./gm-action-ruling.js";
import {currentScene} from "./scene-continuity.js";
import {StateConflictError} from "./errors.js";
import {recordOwnerActionTerminal} from "./owner-action-terminal.js";
const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const principalFailures=new Set(["Active session required.","Select an authenticated current controlled role.",
  "Controller attendance required.","Active campaign character required."]);
const messages={feature_permission:"This needs a verified character capability; no power was granted.",
  native_adapter_absence:"This effect needs a supported native adapter; no effect was applied.",
  world_epistemic:"Current scene evidence is missing; no hidden fact was invented.",
  rules_ambiguity:"A verified applicable rule is missing; no dice or cost was authorized.",
  authorization_or_clarification:"Current authorization or clarification is required; no effect was applied."};
function fail(message){throw new StateConflictError(message);}
function inventory(db,guild){const rows=[];
  for(let offset=0;offset<10000;offset+=100){const page=db.listCityRecords(guild,{kind:"unsupported_action",includeGM:true,limit:100,offset});
    rows.push(...page);if(page.length<100)return rows;}
  fail("Review inventory needs bounded GM inspection; no authority is silently truncated.");
}
export function actionReviewInbox(db,guild,user,{gm=false}={}){
  if(!db.getActiveSession(guild))return [];
  const scene=currentScene(db,guild),assignment=scene.session_id&&db.activeAssignment(scene.session_id,user);
  if(!gm&&(!assignment||db.getCharacter(assignment.character_id)?.owner_user_id!==user))return [];
  const pc=gm?null:personalCharacter(db,guild,user);
  return inventory(db,guild).filter(r=>gm||r.data.owner===user&&r.data.actor===pc.id&&r.data.session===scene.session_id)
    .map(r=>{let proof=null;try{proof=consentAction(db,guild,r.data.action);}catch(error){
      if(error.code!=="SCENE_ACTION_WINDOW"&&!principalFailures.has(error.message))throw error;
      // Expected stale proof remains auditable, never executable; unexpected storage/runtime faults propagate.
    }
      const live=!!proof;
      return {review:r.record_key,revision:hash(r),action:r.data.action,status:r.status,
        category:r.data.category,current_source:live,attempt:proof?.row.data.source_span||null,
        message:`${messages[r.data.category]} ${live?r.data.alternative:"The original source is stale; use a new owner declaration, never replay it."}`,
        ...(gm?{reason_code:r.data.reason_code,source:r.source_event,ruling:r.data.ruling}:{}),
        authority:"Status only; never consent, dice, success or effect permission."};});
}
/** Called only by windowOperation with authenticated Discord user / native isGM. Model fields cannot supply gm. */
export function actionReviewOperation(db,guild,user,input,{gm=false}={}){
  const {op,...args}=input;
  if(op==="action-review-inbox"){
    if(Object.keys(args).length)fail("Review inbox takes no foreign scope.");return actionReviewInbox(db,guild,user,{gm});
  }
  const fields=op==="action-review-retry"?["review","revision","ruling_key"]
    :op==="action-review-replace"?["review","revision","replacement"]:["review","revision"];
  if(!["action-review-retry","action-review-withdraw","action-review-replace"].includes(op)
    ||Object.keys(args).sort().join(",")!==fields.sort().join(","))fail("Closed exact native review operation required.");
  return db.transaction(()=>{
    const r=db.getCityRecord(guild,"unsupported_action",args.review),a=r&&db.getCityRecord(guild,"typed_intent",r.data.action);
    if(!r||args.revision!==hash(r)||r.status!=="needs_review")fail("Review changed or is terminal; inspect its current private status.");
    if(r.visibility!=="gm"||r.source_event!==a?.source_event||r.data.source_hash!==a.data.source_hash
      ||r.data.actor!==a.data.actor||r.data.owner!==a.data.owner_user_id||r.data.principal_revision!==a.data.actor_principal_revision)
      fail("Exact source-bound review ancestry required.");
    const proof=consentAction(db,guild,a?.record_key),scope={mode:a.visibility==="character"?"private":"party",
      actorUserId:a.data.owner_user_id,actorCharacterId:a.data.actor};
    if(op==="action-review-retry"){
      const ruling=db.getCityRecord(guild,"gm_action_ruling",r.data.ruling),saved=db.getRulesRuling(guild,args.ruling_key);
      if(!gm||!saved||r.data.reason_code!=="RULE_UNVERIFIED"||r.data.original_resolution!=="roll_required"
        ||ruling?.data.proposal.disposition!=="standard_action_roll"||ruling.data.proposal.saved_ruling_key!==args.ruling_key)
        fail("Authenticated GM and the exact missing saved rule required; no capability/adapter override.");
      const source=indexWorldEvent(db,guild,{key:`gm-action-review:${hash([r.record_key,args.revision,hash(saved)])}`,
        kind:"gm_action_review",source_id:`human_gm:${user}`,title:"Revalidate exact saved rule",visibility:"gm",
        session_id:proof.scene.session_id,scene:proof.scene.key,details:{human_reviewed:true,review:r.record_key,
          proposal_hash:ruling.data.proposal_hash,previous_hash:hash(ruling),rule_hash:hash(saved)}},user);
      db.saveCityRecord(guild,{kind:"gm_action_review_receipt",key:source.event_key,status:"authorized",
        source_event:source.event_key,visibility:"gm",data:{version:1,review:r.record_key,event_hash:hash(source),reviewer:user,
          authority:"Authenticated GM saved-rule revalidation only; no new intent, ability, cost or effect."}});
      adjudicateGmRuling(db,guild,a.record_key,ruling.data.proposal,scope,{reviewRef:source.event_key});
    }else{
      if(proof.principal.user!==user)fail("Only the current action owner may withdraw or replace their intent.");
      if(op==="action-review-replace"){
        const next=consentAction(db,guild,args.replacement);
        if(next.principal.user!==user||next.row.data.actor!==a.data.actor||next.row.source_event===a.source_event)
          fail("Replacement needs a distinct current owner-authored declaration; it is not an inferred tactic.");
      }
      const source=indexWorldEvent(db,guild,{key:`action-review-choice:${hash([r.record_key,user,op,args.replacement||null])}`,
        kind:"action_review_choice",source_id:`player:${user}`,title:"Owner's native review choice",visibility:"character",subject_key:a.data.actor,
        session_id:proof.scene.session_id,scene:proof.scene.key,details:{author:user,character_id:a.data.actor,
          review:r.record_key,choice:op,replacement:args.replacement||null}},user);
      db.saveCityRecord(guild,{...r,key:r.record_key,status:op==="action-review-withdraw"?"withdrawn":"superseded",
        data:{...r.data,choice_source:source.event_key,replacement:args.replacement||null}});
      const terminal=db.saveCityRecord(guild,{...a,key:a.record_key,data:{...a.data,gm_review_terminal:source.event_key}});
      recordOwnerActionTerminal(db,guild,terminal,source.event_key);
    }
    return actionReviewInbox(db,guild,user,{gm}).find(row=>row.review===r.record_key);
  });
}
