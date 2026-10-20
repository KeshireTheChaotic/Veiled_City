/** Bilateral story-stakes PvP. Native agreements never authorize HP/Armor/Stress damage or another player's narration. */
import { createHash } from "node:crypto";
import {reservePvpNotices} from "./native-publications.js";
import { consentAction } from "./action-consent.js";
import { conversationPrincipal } from "./conversation-principal.js";
import { currentScene } from "./scene-continuity.js";
import { indexWorldEvent } from "./city-calendar.js";
import { TRAITS } from "./character-system.js";
import { isPvpIntent, pvpTarget, pvpAttemptKey } from "./pvp-authority.js";
import { settlePvpWindow } from "./pvp-terminal.js";
import {drainActionContinuations} from "./action-continuation.js";
import { closePartialFearGate } from "./pvp-fear-gate.js";
import { stageDamagePvp } from "./pvp-profiles.js";
import {assertPvpSafety,campaignPvpPolicy} from './pvp-campaign-policy.js';
export { choosePvp, rollPvp, progressPvp, continuePvp, authorPvpNarrative, reviewPvpNarrative, sharePvpNarrative, pvpComplication } from "./pvp-rounds.js";

const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const boundaries=["no_death","no_permanent_maiming","no_involuntary_item_loss","no_HP_armor_stress_damage",
  "no_forced_player_dialogue","no_private_information_disclosure","no_forced_player_control"];
const terminal=new Set(["declined","withdrawn","cancelled","stale","needs_review","resolved","stalemate"]);
function fail(message){throw Object.assign(new Error(message),{code:"NARRATIVE_PVP",expected:true});}
function closed(input,fields){
  if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).some(key=>!fields.includes(key))
    ||fields.some(key=>!(key in input)))fail("Closed narrative PvP fields required.");
}
function boundedText(value,max=600){return typeof value==="string"&&!!value.trim()&&value.length<=max;}
function owner(db,guild,user,character){
  const principal=conversationPrincipal(db,guild,user,character),pc=db.getCharacter(character);
  if(principal.kind!=="owner"||pc?.owner_user_id!==user)fail("PvP needs the current authenticated controlled owner.");
  return {character,user,principal_revision:principal.revision};
}
function checkTerms(db,guild,input,participants){
  closed(input,["version","objective","mode","stakes","boundaries","traits","option_policy","hope_policy","fear_policy",
    "authorship","audience","tie_policy","stop_policy","stall_policy","expires_minute"]);
  if(input.version!==2||!boundedText(input.objective)||!["single_roll_duel","three_strikes"].includes(input.mode)
    ||!Array.isArray(input.boundaries)||input.boundaries.length!==boundaries.length
    ||boundaries.some(value=>!input.boundaries.includes(value)))fail("PvP mode or mandatory hard boundaries invalid.");
  if(!Array.isArray(input.stakes)||input.stakes.length!==2||!Array.isArray(input.traits)||input.traits.length!==2)
    fail("PvP requires both players' distinct best, worst, tie and trait policies.");
  const stakes=participants.map(p=>{
    const rows=input.stakes.filter(value=>value.character===p.character),stake=rows[0];
    closed(stake,["character","best","worst","tie"]);
    if(rows.length!==1||![stake.best,stake.worst,stake.tie].every(value=>boundedText(value)))fail("Bounded bilateral stakes required.");
    return {...stake};
  });
  const traits=participants.map(p=>{
    const rows=input.traits.filter(value=>value.character===p.character),policy=rows[0];
    closed(policy,["character","allowed"]);
    const pc=db.getCharacter(p.character);
    if(rows.length!==1||!Array.isArray(policy.allowed)||!policy.allowed.length||policy.allowed.length>6
      ||new Set(policy.allowed).size!==policy.allowed.length||policy.allowed.some(trait=>!TRAITS.includes(trait)
        ||!Number.isSafeInteger(pc.data.traits?.[trait])))fail("Only explicitly allowed, verified owned traits qualify for PvP.");
    return {character:p.character,allowed:[...policy.allowed].sort()};
  });
  if(!["base_trait_only","native_review_required"].includes(input.option_policy)
    ||input.hope_policy!=="no_pvp_hope_generation"||input.fear_policy!=="immediate_contextual_fear"
    ||input.authorship!=="winner_own_success_loser_own_response"||!["private","bilateral_author_projection"].includes(input.audience)
    ||!["stalemate","mutual_reroll"].includes(input.tie_policy)||input.stop_policy!=="neutral_withdrawal"
    ||input.stall_policy!=="wait_no_forfeit"||!Number.isSafeInteger(input.expires_minute)
    ||input.expires_minute<=db.getSimulationClock(guild).minute)fail("PvP policies must preserve private authorship and nonpunitive native outcomes.");
  return {...input,stakes,traits,boundaries:[...boundaries]};
}
function termsRow(db,guild,proposal){
  const row=db.getCityRecord(guild,"pvp_terms_revision",proposal.data.terms_revision);
  if(!row||row.data.version!==1||row.data.proposal!==proposal.record_key||row.data.digest!==proposal.data.terms_hash
    ||hash(row.data.snapshot)!==row.data.digest)fail("PvP immutable terms revision/digest changed.");
  return row;
}
function liveProposal(db,guild,key,{allowTerminal=false}={}){
  const p=db.getCityRecord(guild,"pvp_proposal",key);
  if(!p||p.data.version!==1||p.data.guild!==guild)fail("Current native PvP proposal required.");
  if(!allowTerminal&&terminal.has(p.status))fail("PvP proposal is terminal or withdrawn; no fresh outcome authorized.");
  const scene=currentScene(db,guild),terms=termsRow(db,guild,p);
  if(scene.key!==p.data.scene||scene.session_id!==p.data.session_id
    ||db.getSimulationClock(guild).minute>=terms.data.snapshot.terms.expires_minute)fail("PvP source/scene expired or stale.");
  const offerSource=db.getWorldEvent(guild,terms.source_event);
  if(!offerSource||offerSource.status!=="active"||offerSource.kind!=="pvp_terms_offer"||offerSource.scene!==scene.key
    ||offerSource.session_id!==scene.session_id||offerSource.details.digest!==p.data.terms_hash
    ||offerSource.details.proposal!==p.record_key||!p.data.participants.some(value=>value.user===offerSource.details.author)
    ||!db.ownerAuthoredSource(guild,offerSource.event_key,offerSource.details.author))fail("PvP terms source is stale or retracted.");
  consentAction(db,guild,p.data.accepted_intent);
  for(const who of p.data.participants){
    const current=owner(db,guild,who.user,who.character);
    if(current.principal_revision!==who.principal_revision)fail("PvP owner principal revision is stale.");
    if(db.getCharacter(who.character).data.location!==p.data.location_key)fail("PvP participant position changed; needs review.");
  }
  return {proposal:p,terms};
}
function currentOwner(db,guild,user,key,options){
  // Check membership before returning or rendering any private metadata.
  const p=db.getCityRecord(guild,"pvp_proposal",key),who=p?.data.participants.find(value=>value.user===user);
  if(!who)fail("Only affected owner participants can inspect or operate this private proposal.");
  const current=owner(db,guild,user,who.character);
  if(current.principal_revision!==who.principal_revision)fail("PvP owner principal is stale.");
  return {...liveProposal(db,guild,key,options),who};
}
/** Internal current owner/terms boundary reused by sealed native rounds and post-result authorship. */
export function pvpOwnerContext(db,guild,user,key){return currentOwner(db,guild,user,key,{allowTerminal:true});}
function newTerms(db,guild,p,input,user,interaction){
  const terms=checkTerms(db,guild,input,p.data.participants),revision=(p.data.revision||0)+1;
  const snapshot={guild,proposal:p.record_key,revision,accepted_intent:p.data.accepted_intent,source_event:p.source_event,
    source_hash:p.data.source_hash,session_id:p.data.session_id,scene:p.data.scene,location_key:p.data.location_key,
    participants:p.data.participants,terms},digest=hash(snapshot),key=`pvp-terms:${hash([p.record_key,revision]).slice(0,40)}`;
  const source=indexWorldEvent(db,guild,{key:`pvp-offer:${hash([p.record_key,revision,interaction]).slice(0,40)}`,
    kind:"pvp_terms_offer",title:"Owner-authored narrative PvP terms",source_id:`player:${user}`,session_id:p.data.session_id,
    scene:p.data.scene,visibility:"character",subject_key:p.data.participants.find(value=>value.user===user).character,
    details:{author:user,proposal:p.record_key,digest,revision}},user);
  if(db.getCityRecord(guild,"pvp_terms_revision",key))fail("PvP terms revisions are immutable.");
  db.saveCityRecord(guild,{kind:"pvp_terms_revision",key,status:"proposed",source_event:source.event_key,visibility:"gm",
    data:{version:1,proposal:p.record_key,digest,snapshot}});
  const after=db.saveCityRecord(guild,{...p,key:p.record_key,status:revision===1?"proposed":"negotiating",data:{...p.data,
    revision,terms_revision:key,terms_hash:digest,approvals:[],agreement:null,state_revision:(p.data.state_revision||0)+1}});
  reservePvpNotices(db,guild,after.record_key);return after;
}

export function proposePvp(db,guild,user,input){
  closed(input,["accepted_intent","opponent","terms"]);
  const {row:accepted,scene,principal}=consentAction(db,guild,input.accepted_intent),target=pvpTarget(db,guild,accepted);
  if(principal.user!==user||!isPvpIntent(db,guild,accepted)||!target||target.id!==input.opponent)
    fail("Owner-authored PC conflict and exact opponent required; no target substitution.");
  const participants=[owner(db,guild,user,accepted.data.actor),owner(db,guild,target.owner_user_id,target.id)];
  const location=db.getCharacter(accepted.data.actor).data.location;
  if(!location||target.data.location!==location)fail("PvP requires established co-location; no inferred movement.");
  const key=`pvp:${hash([guild,accepted.record_key,target.id]).slice(0,40)}`,prior=db.getCityRecord(guild,"pvp_proposal",key);
  if(prior){
    currentOwner(db,guild,user,key);
    if(JSON.stringify(checkTerms(db,guild,input.terms,participants))!==JSON.stringify(termsRow(db,guild,prior).data.snapshot.terms))
      fail("PvP replay cannot change terms; submit an explicit counteroffer.");
    return prior;
  }
  return db.transaction(()=>newTerms(db,guild,{kind:"pvp_proposal",record_key:key,source_event:accepted.source_event,visibility:"gm",
    data:{version:1,guild,accepted_intent:accepted.record_key,source_hash:accepted.data.source_hash,participants,
      session_id:scene.session_id,scene:scene.key,location_key:location}},input.terms,user,"proposal"));
}

export function reviewPvp(db,guild,user,key){
  const {proposal:p,terms,who}=currentOwner(db,guild,user,key,{allowTerminal:true}),t=terms.data.snapshot.terms;
  const text=[`Narrative PvP — ${p.record_key}`,`Revision ${p.data.revision}; digest ${p.data.terms_hash}; status ${p.status}`,
    `Objective: ${t.objective}`,`Mode: ${t.mode}`,"No participation or dice without two separate current-owner approvals.",
    ...t.stakes.flatMap(stake=>[`${db.getCharacter(stake.character).name}:`,
      `Best: ${stake.best}`,`Worst: ${stake.worst}`,`Tie: ${stake.tie}`]),
    `Hard boundaries: ${t.boundaries.join(", ")}`,...t.traits.map(policy=>`${db.getCharacter(policy.character).name} allowed traits: ${policy.allowed.join(", ")}`),
    `Options: ${t.option_policy}; Hope: ${t.hope_policy}; Fear: ${t.fear_policy}.`,
    `Narrative authority: ${t.authorship}; audience: ${t.audience}.`,
    `Tie: ${t.tie_policy}; stop: ${t.stop_policy}; stall: ${t.stall_policy}; fictional expiry: ${t.expires_minute}.`,
    "Winner authors only their own success. Loser authors or withholds their own response. No PC damage, forced dialogue or secret disclosure."
  ].join("\n");
  db.saveCityRecord(guild,{kind:"pvp_terms_review",key:`${p.record_key}:${who.character}`,status:"available",
    source_event:terms.source_event,visibility:"character",subject_key:who.character,
    data:{version:1,proposal:p.record_key,terms_hash:p.data.terms_hash,user,principal_revision:who.principal_revision}});
  return {proposal:p.record_key,status:p.status,terms_hash:p.data.terms_hash,visibility:"character",character_id:who.character,text};
}

export function pvpInbox(db,guild,user){
  const session=db.getActiveSession(guild);if(!session)return [];
  const principal=conversationPrincipal(db,guild,user);
  if(principal.kind!=="owner")fail("Only current owners can inspect narrative PvP offers.");
  const rows=[];
  for(let offset=0;offset<2000;offset+=100){
    const page=db.listCityRecords(guild,{kind:"pvp_proposal",includeGM:true,limit:100,offset});
    for(const row of page){
      if(row.data.session_id!==session.id||!row.data.participants.some(p=>p.user===user&&p.character===principal.character_id))continue;
      rows.push({proposal:row.record_key,status:row.status,terms_hash:row.data.terms_hash,
        authority:"Review privately before explicit accept, decline, counteroffer or withdrawal. No automatic participation."});
    }
    if(page.length<100)break;
  }
  return rows;
}

export function revisePvp(db,guild,user,input){
  closed(input,["proposal","expected_revision","terms","interaction_id"]);
  const {proposal:p}=currentOwner(db,guild,user,input.proposal);
  if(p.data.terms_hash!==input.expected_revision)fail("PvP terms revision is stale.");
  if(db.listCityRecords(guild,{kind:"pvp_round_receipt",includeGM:true,limit:500}).some(row=>row.data.proposal===p.record_key))
    fail("PvP dice already exist; negotiated terms cannot be changed retroactively.");
  if(!boundedText(input.interaction_id,100))fail("Authenticated counteroffer interaction required.");
  return db.transaction(()=>{
    if(p.data.agreement){
      const agreement=db.getCityRecord(guild,"pvp_agreement",p.data.agreement);
      db.saveCityRecord(guild,{...agreement,key:agreement.record_key,status:"superseded"});
    }
    return newTerms(db,guild,p,input.terms,user,input.interaction_id);
  });
}

function validSignature(db,guild,p,ref){
  const row=db.getCityRecord(guild,"pvp_consent",ref),source=row&&db.getWorldEvent(guild,row.source_event);
  const who=p.data.participants.find(value=>value.character===row?.subject_key&&value.user===row?.data.user);
  return !!who&&row.status==="accepted"&&row.visibility==="character"&&row.data.version===1
    &&row.data.proposal===p.record_key&&row.data.terms_hash===p.data.terms_hash&&row.data.principal_revision===who.principal_revision
    &&source?.status==="active"&&source.kind==="pvp_consent_reply"&&source.source_id===`player:${who.user}`
    &&source.visibility==="character"&&source.subject_key===who.character&&source.session_id===p.data.session_id&&source.scene===p.data.scene
    &&source.details.author===who.user&&source.details.decision==="accept"&&source.details.terms_hash===p.data.terms_hash
    &&source.details.proposal===p.record_key&&source.details.principal_revision===who.principal_revision
    &&db.ownerAuthoredSource(guild,source.event_key,who.user);
}
export function validatePvpAgreement(db,guild,key){
  const {proposal:p,terms}=liveProposal(db,guild,key),agreement=p.data.agreement&&db.getCityRecord(guild,"pvp_agreement",p.data.agreement);
  checkTerms(db,guild,terms.data.snapshot.terms,p.data.participants);
  if(p.status!=="locked"||!agreement||agreement.status!=="locked"||agreement.data.terms_hash!==p.data.terms_hash
    ||agreement.data.proposal!==p.record_key||p.data.approvals.length!==2
    ||new Set(p.data.approvals).size!==2||p.data.approvals.some(ref=>!validSignature(db,guild,p,ref))
    ||new Set(p.data.approvals.map(ref=>db.getCityRecord(guild,"pvp_consent",ref).subject_key)).size!==2
    ||JSON.stringify(agreement.data.approvals)!==JSON.stringify(p.data.approvals))fail("Current locked bilateral PvP agreement required.");
  if(db.getWorldEvent(guild,terms.source_event)?.status!=="active")fail("PvP terms source was retracted.");
  return {proposal:p,agreement,terms:terms.data.snapshot.terms};
}

export function respondPvp(db,guild,user,input){
  closed(input,["proposal","expected_revision","decision","interaction_id"]);
  const {proposal:p,who,terms}=currentOwner(db,guild,user,input.proposal);
  if(p.data.terms_hash!==input.expected_revision)fail("PvP terms revision changed; review and approve the new revision.");
  if(!["accept","decline","withdraw"].includes(input.decision)||!boundedText(input.interaction_id,100))fail("Explicit owner decision required.");
  // Historical v1 is readable/declinable, never freshly signed under a superseded policy.
  if(input.decision==="accept")checkTerms(db,guild,terms.data.snapshot.terms,p.data.participants);
  const review=db.getCityRecord(guild,"pvp_terms_review",`${p.record_key}:${who.character}`);
  if(input.decision==="accept"&&review?.data.terms_hash!==p.data.terms_hash)fail("Review the complete private terms before approval.");
  const key=`pvp-consent:${hash([p.record_key,p.data.terms_hash,who.character]).slice(0,40)}`;
  const prior=db.getCityRecord(guild,"pvp_consent",key);
  if(prior?.status==="accepted"&&input.decision==="accept")return p;
  return db.transaction(()=>{
    const source=indexWorldEvent(db,guild,{key:`pvp-reply:${hash([guild,user,input.interaction_id]).slice(0,40)}`,
      kind:"pvp_consent_reply",title:"Authenticated narrative PvP consent",source_id:`player:${user}`,session_id:p.data.session_id,
      scene:p.data.scene,visibility:"character",subject_key:who.character,
      details:{author:user,proposal:p.record_key,terms_hash:p.data.terms_hash,principal_revision:who.principal_revision,decision:input.decision}},user);
    if(source.status!=="active"||source.details.proposal!==p.record_key||source.details.terms_hash!==p.data.terms_hash
      ||source.details.decision!==input.decision||source.details.author!==user)fail("PvP interaction replay changed its exact terms or decision.");
    const signature=db.saveCityRecord(guild,{kind:"pvp_consent",key,source_event:source.event_key,visibility:"character",subject_key:who.character,
      status:input.decision==="accept"?"accepted":input.decision==="withdraw"?"revoked":"declined",
      data:{version:1,user,proposal:p.record_key,terms_hash:p.data.terms_hash,principal_revision:who.principal_revision,interaction_id:input.interaction_id}});
    if(input.decision!=="accept"){
      const status=input.decision==="decline"?"declined":"withdrawn",receiptKey=`pvp-resolution:${hash([p.record_key,p.data.terms_hash,status]).slice(0,40)}`;
      db.saveCityRecord(guild,{kind:"pvp_resolution_receipt",key:receiptKey,status:"resolved",source_event:source.event_key,visibility:"gm",
        data:{version:1,proposal:p.record_key,terms_hash:p.data.terms_hash,outcome:status,winner:null,roll_refs:[],decision_ref:signature.record_key}});
      const receipt=db.getCityRecord(guild,"pvp_resolution_receipt",receiptKey);
      closePartialFearGate(db,guild,p,receipt);
      settlePvpWindow(db,guild,p,receipt);
      if(p.data.agreement){
        const agreement=db.getCityRecord(guild,"pvp_agreement",p.data.agreement);
        db.saveCityRecord(guild,{...agreement,key:agreement.record_key,status});
      }
      const closed=db.saveCityRecord(guild,{...p,key:p.record_key,status,data:{...p.data,resolution_receipt:receiptKey,state_revision:p.data.state_revision+1}});
      reservePvpNotices(db,guild,closed.record_key);drainActionContinuations(db,guild);return closed;
    }
    const approvals=[...p.data.approvals.filter(ref=>db.getCityRecord(guild,"pvp_consent",ref)?.subject_key!==who.character),signature.record_key];
    const both=approvals.length===2&&approvals.every(ref=>validSignature(db,guild,p,ref));
    let agreement=null;
    if(both){
      agreement=`pvp-agreement:${hash([p.record_key,p.data.terms_hash]).slice(0,40)}`;
      db.saveCityRecord(guild,{kind:"pvp_agreement",key:agreement,status:"locked",source_event:p.source_event,visibility:"gm",
        data:{version:1,proposal:p.record_key,terms_hash:p.data.terms_hash,terms_revision:p.data.terms_revision,approvals,participants:p.data.participants}});
    }
    const after=db.saveCityRecord(guild,{...p,key:p.record_key,status:both?"locked":"awaiting_mutual_consent",
      data:{...p.data,approvals,agreement,state_revision:p.data.state_revision+1}});
    reservePvpNotices(db,guild,after.record_key);return after;
  });
}

/** Called before ordinary roll preparation in the authoritative transaction, even without coordination metadata. */
export function stagePvpAttempts(db,guild,intents,plans){
  const rows=[];
  for(const action of intents.filter(value=>isPvpIntent(db,guild,value))){
    consentAction(db,guild,action.record_key);
    try{assertPvpSafety(db,guild,[action.data.actor,pvpTarget(db,guild,action).id]);}
    catch(error){
      if(error.code!=='NARRATIVE_PVP'||error.pvpSafetyHold!==true)throw error;
      const key=pvpAttemptKey(guild,action.record_key),prior=db.getCityRecord(guild,'pvp_attempt',key),
        held=db.saveCityRecord(guild,{kind:'pvp_attempt',key,status:'held_safety',source_event:action.source_event,
          visibility:'character',subject_key:action.data.actor,actor_key:action.data.actor,
          data:{...prior?.data,version:1,accepted_intent:action.record_key,opponent:pvpTarget(db,guild,action).id,
            authority:'Campaign safety hold only. No consent, outcome or hostile effect; independent actions remain available.'}});
      const plan=plans.find(value=>value.data.action_id===action.record_key);
      if(plan&&!['resolved','failed','blocked','clarification'].includes(plan.data.status))
        db.saveCityRecord(guild,{...plan,key:plan.record_key,status:'pending',data:{...plan.data,status:'pending',pvp_attempt:held.record_key}});
      rows.push(held);continue;
    }
    let damage;
    try{damage=stageDamagePvp(db,guild,action);}
    catch(error){
      if(error.code!=='NARRATIVE_PVP'||error.expected!==true||!campaignPvpPolicy(db,guild).enabled)throw error;
      // Keep this declared attempt pending. A stale native scope is neither ordinary-action permission
      // nor a reason to roll back another independently authenticated declaration in the same message.
      const key=pvpAttemptKey(guild,action.record_key),prior=db.getCityRecord(guild,'pvp_attempt',key),
        held=db.saveCityRecord(guild,{kind:'pvp_attempt',key,status:'held_review',source_event:action.source_event,
          visibility:'character',subject_key:action.data.actor,actor_key:action.data.actor,
          data:{...prior?.data,version:1,accepted_intent:action.record_key,opponent:pvpTarget(db,guild,action).id,
            authority:'Native campaign scope needs review; no hostile effect or ordinary-action fallback.'}});
      db.saveCityRecord(guild,{kind:'pvp_campaign_review',key,status:'needs_review',visibility:'gm',source_event:action.source_event,
        data:{version:1,accepted_intent:action.record_key,reason:String(error.message).slice(0,500)}});
      const plan=plans.find(value=>value.data.action_id===action.record_key);
      if(plan&&!['resolved','failed','blocked','clarification'].includes(plan.data.status))
        db.saveCityRecord(guild,{...plan,key:plan.record_key,status:'pending',data:{...plan.data,status:'pending',pvp_attempt:held.record_key}});
      rows.push(held);continue;
    }
    if(damage){
      const plan=plans.find(value=>value.data.action_id===action.record_key);
      if(plan&&!["resolved","failed","blocked","clarification"].includes(plan.data.status))
        db.saveCityRecord(guild,{...plan,key:plan.record_key,status:"pending",data:{...plan.data,status:"pending",pvp_attack:damage.record_key}});
      rows.push(damage);continue;
    }
    const key=pvpAttemptKey(guild,action.record_key);
    const row=db.getCityRecord(guild,"pvp_attempt",key)||db.saveCityRecord(guild,{kind:"pvp_attempt",key,status:"awaiting_stakes",
      source_event:action.source_event,visibility:"character",subject_key:action.data.actor,actor_key:action.data.actor,
      data:{version:1,accepted_intent:action.record_key,opponent:pvpTarget(db,guild,action).id,
        authority:"Attempt only; await bilateral story stakes. No forced reaction, dice or PC damage."}});
    const plan=plans.find(value=>value.data.action_id===action.record_key);
    if(plan&&!["resolved","failed","blocked","clarification"].includes(plan.data.status))
      db.saveCityRecord(guild,{...plan,key:plan.record_key,status:"pending",data:{...plan.data,status:"pending",pvp_attempt:row.record_key}});
    rows.push(row);
  }
  return rows;
}
