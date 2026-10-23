/** Sealed owner-authorized narrative PvP. Opposed totals only; never ordinary combat damage/metacurrency. */
import { createHash } from "node:crypto";
import { dualityRoll, d } from "./frameworks/daggerheart/public.js";
import { indexWorldEvent } from "./city-calendar.js";
import { pvpOwnerContext, validatePvpAgreement } from "./narrative-pvp.js";
import { synchronizePvpWindow } from "./window-coordinator.js";
import { settlePvpWindow } from "./pvp-terminal.js";
import { capturePvpFear, gatePvpExchange, fearGateKey, pendingPvpFear } from "./pvp-fear-gate.js";
import {drainActionContinuations} from "./action-continuation.js";
import {reservePvpNotices} from "./native-publications.js";
import {resolveAutonomousPvpFear} from "./pvp-fear-moves.js";
import {assertPvpSafety} from './pvp-campaign-policy.js';
export { authorPvpNarrative, reviewPvpNarrative, sharePvpNarrative } from "./pvp-authorship.js";

const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,40);
const key=(p,round,character)=>`pvp-round:${hash([p.record_key,p.data.terms_hash,round,character])}`;
function fail(message){throw Object.assign(new Error(message),{code:"NARRATIVE_PVP",expected:true});}
function fields(input,required){
  if(!input||Object.keys(input).some(k=>!required.includes(k))||required.some(k=>!(k in input)))fail("Closed native PvP operation fields required.");
}
function source(db,guild,p,who,input,kind,details){
  if(typeof input.interaction_id!=="string"||!input.interaction_id||input.interaction_id.length>100)fail("Authenticated native interaction required.");
  const row=indexWorldEvent(db,guild,{key:`pvp-operation:${hash([guild,who.user,input.interaction_id])}`,kind,
    title:"Owner-authored private narrative PvP operation",source_id:`player:${who.user}`,session_id:p.data.session_id,scene:p.data.scene,
    visibility:"character",subject_key:who.character,details:{author:who.user,character_id:who.character,
      principal_revision:who.principal_revision,proposal:p.record_key,terms_hash:p.data.terms_hash,...details}},who.user);
  if(row.status!=="active"||row.kind!==kind||row.details.author!==who.user||row.details.proposal!==p.record_key
    ||row.details.terms_hash!==p.data.terms_hash||Object.entries(details).some(([k,v])=>JSON.stringify(row.details[k])!==JSON.stringify(v)))
    fail("PvP interaction replay changed its exact operation/source.");
  return row;
}
function windowFor(db,guild,p){return db.getCityRecord(guild,"scene_action_window",`pvp-window:${hash([p.record_key,p.data.terms_hash])}`);}
function current(db,guild,user,input){
  const c=pvpOwnerContext(db,guild,user,input.proposal),p=c.proposal;
  if(input.expected_revision!==p.data.terms_hash)fail("PvP terms revision changed.");
  validatePvpAgreement(db,guild,p.record_key);
  let w=windowFor(db,guild,p)||synchronizePvpWindow(db,guild,p.record_key);
  if(!w.data.round){w=db.saveCityRecord(guild,{...w,key:w.record_key,data:{...w.data,round:1,
    scores:Object.fromEntries(p.data.participants.map(w=>[w.character,0])),round_state:"choosing"}});}
  if(w.status!=="locked"||w.data.round!==input.round)fail("PvP round is closed, terminal or stale.");
  return {...c,p,w,t:c.terms.data.snapshot.terms};
}
function cas(w,input){if(w.data.revision!==input.expected_window_revision)fail("PvP window revision changed; refresh privately.");}
function saveWindow(db,guild,w,patch){
  return db.saveCityRecord(guild,{...w,key:w.record_key,data:{...w.data,...patch,revision:w.data.revision+1}});
}
function seal(db,guild,p,round,who){
  const row=db.getCityRecord(guild,"pvp_round_choice",key(p,round,who.character)),s=row&&db.getWorldEvent(guild,row.source_event);
  if(!row||s?.status!=="active"||s.kind!=="pvp_round_declaration"||s.details.author!==who.user
    ||row.data.terms_hash!==p.data.terms_hash||s.details.terms_hash!==p.data.terms_hash||s.visibility!=="character"||s.subject_key!==who.character
    ||s.details.principal_revision!==who.principal_revision||s.details.proposal!==p.record_key||s.details.round!==round
    ||s.details.trait!==row.data.trait||s.details.attempt!==row.data.attempt||s.details.modifier!==row.data.modifier
    ||!db.ownerAuthoredSource(guild,s.event_key,who.user)||db.getCharacter(who.character).data.traits?.[row.data.trait]!==row.data.modifier)
    fail("Both current owner-authored choices must be sealed and unchanged before dice.");
  return row;
}
const operationFields=["proposal","expected_revision","round","expected_window_revision","interaction_id"];
export function choosePvp(db,guild,user,input){
  fields(input,[...operationFields,"trait","attempt"]);
  return db.transaction(()=>{
    const {p,w,t,who}=current(db,guild,user,input);
    assertPvpSafety(db,guild,p.data.participants.map(x=>x.character));
    if(w.data.round_state!=="choosing")fail("Waiting for both continuation decisions or saved round; choices are closed.");
    if(t.option_policy!=="base_trait_only")fail("Optional PvP effects require saved native review; no dice or hidden costs.");
    const modifier=db.getCharacter(who.character).data.traits?.[input.trait];
    if(!t.traits.find(row=>row.character===who.character)?.allowed.includes(input.trait)||!Number.isSafeInteger(modifier))
      fail("Explicit relevant allowed owned trait required; no default strongest trait.");
    if(typeof input.attempt!=="string"||!input.attempt.trim()||input.attempt.length>1200)fail("Own bounded attempted response required.");
    const k=key(p,input.round,who.character),prior=db.getCityRecord(guild,"pvp_round_choice",k);
    if(prior){seal(db,guild,p,input.round,who);
      if(prior.data.attempt!==input.attempt||prior.data.trait!==input.trait)fail("Sealed PvP choice cannot change after submission.");
      return {status:"sealed",round:input.round};}
    cas(w,input);
    const s=source(db,guild,p,who,input,"pvp_round_declaration",{round:input.round,attempt:input.attempt,trait:input.trait,modifier});
    db.saveCityRecord(guild,{kind:"pvp_round_choice",key:k,status:"sealed",source_event:s.event_key,visibility:"character",subject_key:who.character,
      data:{version:1,proposal:p.record_key,terms_hash:p.data.terms_hash,round:input.round,character:who.character,user,
        principal_revision:who.principal_revision,attempt:input.attempt,trait:input.trait,modifier}});
    saveWindow(db,guild,w,{});reservePvpNotices(db,guild,p.record_key);return {status:"sealed",round:input.round};
  });
}
function resultFor(db,guild,p,round,who){
  const row=db.getCityRecord(guild,"pvp_round_receipt",key(p,round,who.character));if(!row)return null;
  const saved=db.getSavedRoll(guild,row.data.roll_id),choice=seal(db,guild,p,round,who),authorization=db.getWorldEvent(guild,row.source_event);
  if(authorization?.status!=="active"||authorization.kind!=="pvp_roll_authorization"||authorization.details.author!==who.user
    ||authorization.details.choice!==choice.record_key||authorization.details.round!==round
    ||authorization.details.terms_hash!==p.data.terms_hash||authorization.details.principal_revision!==who.principal_revision
    ||!db.ownerAuthoredSource(guild,authorization.event_key,who.user))fail("Native current owner roll authorization is stale.");
  if(row.status!=="resolved"||saved?.roll_type!=="narrative_pvp"||saved.character_id!==who.character||saved.discord_user_id!==who.user
    ||saved.session_id!==p.data.session_id||saved.payload.proposal!==p.record_key||saved.payload.terms_hash!==p.data.terms_hash
    ||saved.payload.round!==round||saved.payload.choice!==choice.record_key||saved.payload.modifier!==choice.data.modifier
    ||JSON.stringify(saved.payload)!==JSON.stringify(row.data.result))fail("Saved native PvP dice/choice ancestry is invalid.");
  return row;
}
/** Read-only exact receipt validation reused by immediate GM consequences, including neutral withdrawal. */
export function validatePvpRoundReceipt(db,guild,p,receipt){
  const native=db.getCityRecord(guild,"pvp_proposal",p.record_key);
  const who=native?.data.participants.find(w=>w.character===receipt?.data.character);
  if(!native||!receipt||!who)fail("Exact native PvP participant/receipt required.");
  const row=resultFor(db,guild,native,receipt.data.round,who);
  if(row?.record_key!==receipt.record_key)fail("Exact native PvP receipt required.");
  return row;
}
/** Read-only terminal dependency proof: exact native pair history, never narration or generic Difficulty. */
export function validatePvpResolutionReceipt(db,guild,proposal,receipt){
  const p=proposal&&db.getCityRecord(guild,"pvp_proposal",proposal.record_key),r=receipt&&db.getCityRecord(guild,"pvp_resolution_receipt",receipt.record_key);
  if(!p||r?.status!=="resolved"||p.data.resolution_receipt!==r.record_key||r.data.proposal!==p.record_key||r.data.terms_hash!==p.data.terms_hash)
    fail("Exact current terminal PvP receipt required for continuation.");
  const {terms}=pvpOwnerContext(db,guild,p.data.participants[0].user,p.record_key),t=terms.data.snapshot.terms;
  if(["declined","withdrawn"].includes(r.data.outcome)){
    const c=db.getCityRecord(guild,"pvp_consent",r.data.decision_ref),s=c&&db.getWorldEvent(guild,c.source_event);
    if(r.data.winner!==null||r.data.roll_refs.length||s?.status!=="active"||s.kind!=="pvp_consent_reply"||s.event_key!==r.source_event
      ||s.details.proposal!==p.record_key||s.details.terms_hash!==p.data.terms_hash||c.data.terms_hash!==p.data.terms_hash
      ||s.details.decision!==(r.data.outcome==="declined"?"decline":"withdraw")||!p.data.participants.some(w=>w.user===s.details.author
        &&w.character===c.subject_key&&db.ownerAuthoredSource(guild,s.event_key,w.user)))fail("Exact owner neutral closure required; never a victory.");
    return r;
  }
  const last=db.getCityRecord(guild,"pvp_strike_receipt",r.data.comparison),scores=Object.fromEntries(p.data.participants.map(w=>[w.character,0]));
  if(!last||!Number.isSafeInteger(last.data.round)||last.data.round<1||last.data.round>100)fail("Bounded native paired history required.");
  for(let round=1;round<=last.data.round;round++){
    const pair=db.getCityRecord(guild,"pvp_strike_receipt",`pvp-pair:${hash([p.record_key,p.data.terms_hash,round])}`);
    const rows=p.data.participants.map(w=>resultFor(db,guild,p,round,w));
    if(rows.some(row=>!row))fail("Two actual owner rolls required for every pair.");
    const totals=rows.map(row=>row.data.result.total),winner=totals[0]===totals[1]?null:p.data.participants[totals[0]>totals[1]?0:1].character;
    if(winner&&t.mode==="three_strikes")scores[winner]++;
    if(pair?.status!=="resolved"||pair.source_event!==p.source_event||pair.data.terms_hash!==p.data.terms_hash||pair.data.winner!==winner
      ||JSON.stringify(pair.data.round_refs)!==JSON.stringify(rows.map(row=>row.record_key))
      ||JSON.stringify(pair.data.roll_refs)!==JSON.stringify(rows.map(row=>row.data.roll_id))
      ||JSON.stringify(pair.data.totals)!==JSON.stringify(totals)||JSON.stringify(pair.data.scores)!==JSON.stringify(scores))fail("Exact native paired verdict/score required.");
  }
  if(r.source_event!==p.source_event||r.data.mode!==t.mode||r.data.winner!==last.data.winner||JSON.stringify(r.data.scores)!==JSON.stringify(scores)
    ||JSON.stringify(r.data.roll_refs)!==JSON.stringify(last.data.roll_refs)
    ||r.data.outcome!==(r.data.winner?"agreed_story_stake":"stalemate")
    ||r.data.winner&&r.data.allowed_stake!==t.stakes.find(s=>s.character===r.data.winner)?.best
    ||t.mode==="three_strikes"&&scores[r.data.winner]!==3)fail("Native terminal stake/score must be unchanged.");
  return r;
}
function compare(db,guild,p,t,w,rows){
  const k=`pvp-pair:${hash([p.record_key,p.data.terms_hash,w.data.round])}`;
  const prior=db.getCityRecord(guild,"pvp_strike_receipt",k);if(prior)return prior;
  const totals=rows.map(r=>r.data.result.total),winner=totals[0]===totals[1]?null:p.data.participants[totals[0]>totals[1]?0:1].character;
  const scores={...w.data.scores};if(winner&&t.mode==="three_strikes")scores[winner]++;
  const pair=db.saveCityRecord(guild,{kind:"pvp_strike_receipt",key:k,status:"resolved",source_event:p.source_event,visibility:"gm",
    data:{version:1,proposal:p.record_key,terms_hash:p.data.terms_hash,round:w.data.round,mode:t.mode,
      round_refs:rows.map(r=>r.record_key),roll_refs:rows.map(r=>r.data.roll_id),totals,winner,
      strike:t.mode==="three_strikes"&&winner?1:0,scores,comparison:"higher_final_total; Critical is flavor, not priority"}});
  gatePvpExchange(db,guild,p,w.data.round,rows,pair.record_key);
  const done=t.mode==="single_roll_duel"?(winner||t.tie_policy==="stalemate"):(winner&&scores[winner]===3);
  const updated=saveWindow(db,guild,w,{scores,round_state:done?"complete":"awaiting_continuation",comparison:pair.record_key});
  if(done){
    const outcome=winner?"agreed_story_stake":"stalemate",resolution=`pvp-resolution:${hash([p.record_key,p.data.terms_hash,pair.record_key])}`;
    const receipt=db.saveCityRecord(guild,{kind:"pvp_resolution_receipt",key:resolution,status:"resolved",source_event:p.source_event,visibility:"gm",
      data:{version:1,proposal:p.record_key,terms_hash:p.data.terms_hash,mode:t.mode,outcome,winner,comparison:pair.record_key,
        roll_refs:rows.map(r=>r.data.roll_id),scores,allowed_stake:winner?t.stakes.find(s=>s.character===winner).best:null,
        narration:"awaiting_separate_owner_authorship",authority:"Agreed story stake only. No HP, Armor, Stress, custody, movement or forced reaction."}});
    db.saveCityRecord(guild,{...p,key:p.record_key,status:winner?"resolved":"stalemate",data:{...p.data,resolution_receipt:resolution,state_revision:p.data.state_revision+1}});
    settlePvpWindow(db,guild,p,receipt);
  }
  return {pair,updated};
}
export function rollPvp(db,guild,user,input,{rng=d}={}){
  fields(input,operationFields);
  const saved=db.transaction(()=>{
    const {p,w,t,who}=current(db,guild,user,input);
    const prior=resultFor(db,guild,p,input.round,who);
    if(prior)return progressPvp(db,guild,user,p.record_key);
    assertPvpSafety(db,guild,p.data.participants.map(x=>x.character));
    if(w.data.round_state!=="choosing")fail("Round closed or awaiting bilateral continuation.");
    cas(w,input);
    const choices=p.data.participants.map(who=>seal(db,guild,p,input.round,who));
    const chosen=choices.find(c=>c.subject_key===who.character);
    const s=source(db,guild,p,who,input,"pvp_roll_authorization",{round:input.round,choice:chosen.record_key});
    const result={...dualityRoll({modifier:chosen.data.modifier},rng),proposal:p.record_key,terms_hash:p.data.terms_hash,
      round:input.round,choice:chosen.record_key};
    const id=db.addRoll(guild,p.data.session_id,user,who.character,"narrative_pvp",result);
    const receipt=db.saveCityRecord(guild,{kind:"pvp_round_receipt",key:key(p,input.round,who.character),status:"resolved",
      source_event:s.event_key,visibility:"character",subject_key:who.character,data:{version:1,proposal:p.record_key,
        terms_hash:p.data.terms_hash,round:input.round,character:who.character,choice:chosen.record_key,roll_id:id,result}});
    // House rule: dice are saved unchanged; neither Hope/Critical nor Fear mutates a metacurrency pool.
    capturePvpFear(db,guild,p,receipt);
    const rows=p.data.participants.map(who=>resultFor(db,guild,p,input.round,who));
    if(rows.every(Boolean))compare(db,guild,p,t,w,rows);else saveWindow(db,guild,w,{});
    // Capture the verified terminal projection before a separately source-authorized descendant may relocate its actor.
    const view=progressPvp(db,guild,user,p.record_key);
    reservePvpNotices(db,guild,p.record_key);
    drainActionContinuations(db,guild);
    return {view,proposal:p.record_key};
  });
  if(db.getCityCalendar(guild).flags.autonomous_pvp_fear!==false){
    const proposal=saved?.proposal||input.proposal;
    const triggers=db.listCityRecords(guild,{kind:"pvp_fear_trigger",includeGM:true,limit:100})
      .filter(t=>t.data.proposal===proposal&&t.status==="awaiting_move")
      .sort((a,b)=>a.data.trigger_ordinal-b.data.trigger_ordinal||a.record_key.localeCompare(b.record_key));
    for(const trigger of triggers)resolveAutonomousPvpFear(db,guild,trigger.record_key);
    return progressPvp(db,guild,user,proposal);
  }
  return saved?.view||saved;
}
export function continuePvp(db,guild,user,input){
  fields(input,operationFields);
  return db.transaction(()=>{
    const {p,w,who}=current(db,guild,user,input);
    assertPvpSafety(db,guild,p.data.participants.map(x=>x.character));
    if(pendingPvpFear(db,guild,p).length)fail("Immediate Fear consequence gate remains pending; no next exchange.");
    if(w.data.round_state!=="awaiting_continuation")fail("Both continuation decisions require a completed paired exchange.");
    const k=`pvp-continue:${hash([p.record_key,p.data.terms_hash,input.round,who.character])}`;
    if(db.getCityRecord(guild,"pvp_round_continuation",k))return progressPvp(db,guild,user,p.record_key);
    cas(w,input);
    const s=source(db,guild,p,who,input,"pvp_continuation",{round:input.round});
    db.saveCityRecord(guild,{kind:"pvp_round_continuation",key:k,status:"accepted",source_event:s.event_key,visibility:"character",subject_key:who.character,
      data:{proposal:p.record_key,terms_hash:p.data.terms_hash,round:input.round,character:who.character}});
    const both=p.data.participants.every(who=>{
      const row=db.getCityRecord(guild,"pvp_round_continuation",`pvp-continue:${hash([p.record_key,p.data.terms_hash,input.round,who.character])}`);
      const src=row&&db.getWorldEvent(guild,row.source_event);return row?.status==="accepted"&&src?.status==="active"
        &&src.details.author===who.user&&src.details.principal_revision===who.principal_revision;
    });
    saveWindow(db,guild,w,both?{round:w.data.round+1,round_state:"choosing"}:{});
    reservePvpNotices(db,guild,p.record_key);
    return progressPvp(db,guild,user,p.record_key);
  });
}
export function progressPvp(db,guild,user,proposal){
  const {proposal:p,who}=pvpOwnerContext(db,guild,user,proposal),w=windowFor(db,guild,p);
  const own=db.getCityRecord(guild,"pvp_round_receipt",key(p,w?.data.round||1,who.character));
  const resolution=p.data.resolution_receipt&&db.getCityRecord(guild,"pvp_resolution_receipt",p.data.resolution_receipt);
  const gate=db.getCityRecord(guild,"pvp_exchange_gate",fearGateKey(p,w?.data.round||1));
  return {proposal:p.record_key,terms_hash:p.data.terms_hash,status:resolution?p.status:w?.data.round_state==="awaiting_continuation"?"awaiting_continuation":p.status,
    round:w?.data.round||1,window_revision:w?.data.revision||1,scores:w?.data.scores||Object.fromEntries(p.data.participants.map(w=>[w.character,0])),
    own:own?{roll_id:own.data.roll_id,total:own.data.result.total,duality:own.data.result.duality,hope:own.data.result.hope,fear:own.data.result.fear}:null,
    ...(gate?{consequence_status:gate.status}:{}),
    ...(resolution?{resolution:{receipt:resolution.record_key,outcome:resolution.data.outcome,winner:resolution.data.winner,
      stake:resolution.data.allowed_stake||null,narration:"Each player authors or withholds their own material separately."}}:{})};
}

/** Fear scenery is bounded cosmetic proposal only, with no meter/resource/evidence effect. */
export function pvpComplication(db,guild,user,input,{gm=false}={}){
  fields(input,["proposal","round_receipt","kind"]);
  if(!gm)fail("Only authenticated GM may frame bounded environmental flavor.");
  fail("Fear requires an immediate consequential native GM move; cosmetic proposals cannot discharge it.");
}
