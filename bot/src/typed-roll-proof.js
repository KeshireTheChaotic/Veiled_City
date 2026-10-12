/** Read-only exact native roll ancestry. A request label, model result or absent Difficulty is never success. */
import {StateConflictError} from "./errors.js";
import {historicalActionSource} from "./action-consent.js";
import {validateBlazeSavedRoll} from "./pc-death.js";
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function fail(){throw Object.assign(new StateConflictError("Exact saved native request, source and result proof required; changed results need reviewed recovery."),{code:"TYPED_ROLL_PROOF"});}
export function typedRollProof(db,guild,request){
  if(!request?.record_key)fail();
  const q=db.getCityRecord(guild,"roll_request",request?.record_key);
  if(!q||!same(q,request)||q.status!=="resolved"||!q.data.roll_id||!q.data.result)fail();
  const a=db.getCityRecord(guild,"typed_intent",q.data.input?.accepted_intent);
  if(!a||!["resolved","accepted_for_adjudication"].includes(a.status))fail();
  historicalActionSource(db,guild,a.record_key,{resolved:a.status==="resolved"});
  const d=q.data,s=db.getSavedRoll(guild,d.roll_id),v=d.result;
  if(q.source_event!==a.source_event||q.visibility!=="character"||q.subject_key!==a.data.actor||d.input.source_event!==a.source_event
    ||d.character_id!==a.data.actor||d.input.character_id!==a.data.actor||d.owner_user_id!==a.data.owner_user_id
    ||d.session_id!==a.data.session_id||d.scene!==a.data.scene||!s||s.session_id!==d.session_id
    ||s.payload.request!==q.record_key||!same(Object.fromEntries(Object.keys(v).map(k=>[k,s.payload[k]])),v))fail();
  if(d.tag){
    const p=d.tag.participants;
    if(!Array.isArray(p)||p.length!==2||!p.every(x=>d.tag.selections[x.user]===s.id)
      ||!p.some(x=>x.character===s.character_id&&x.user===s.discord_user_id&&x.roll_id===s.id))fail();
    for(const x of p){
      const r=db.getSavedRoll(guild,x.roll_id),other=db.getCityRecord(guild,"roll_request",x.request);
      if(!r||r.roll_type!=="tag_team_action"||r.character_id!==x.character||r.discord_user_id!==x.user
        ||r.session_id!==d.session_id||r.payload.request!==q.record_key||!other
        ||other.data.owner_user_id!==x.user||other.subject_key!==x.character
        ||x.request!==q.record_key&&(other.status!=="superseded"||other.data.superseded_by!==q.record_key))fail();
      if(other.data.input?.accepted_intent){
        const accepted=db.getCityRecord(guild,"typed_intent",other.data.input.accepted_intent);
        if(!accepted)fail();historicalActionSource(db,guild,accepted.record_key,{resolved:accepted.status==="resolved"});
      }
      if(x.proof){const e=db.getWorldEvent(guild,x.proof),v=e?.details.roll_participation;
        if(e?.status!=="active"||e.kind!=="roll_adjudication"||e.details.human_reviewed!==true||e.source_kind!=="gm"
          ||e.subject_key!==x.character||v?.request!==q.record_key||v.character_id!==x.character||v.kind!=="participate")fail();}
    }
    const e=db.getWorldEvent(guild,d.tag.proof),v=e?.details.roll_participation,usage=db.getCityRecord(guild,"tag_usage",`${d.session_id}:${a.data.actor}`);
    if(e?.status!=="active"||e.kind!=="roll_adjudication"||e.details.human_reviewed!==true||e.source_kind!=="gm"
      ||e.subject_key!==a.data.actor||v?.request!==q.record_key||v.character_id!==a.data.actor||v.kind!=="tag"
      ||usage?.data.request!==q.record_key||usage.data.user!==a.data.owner_user_id||usage.data.hope_spent!==3)fail();
  }else if(s.character_id!==a.data.actor||s.discord_user_id!==a.data.owner_user_id
    ||s.roll_type!==d.kind&&s.roll_type!=="blaze_final_action")fail();
  const automatic=s.roll_type==="blaze_final_action";
  if(automatic)validateBlazeSavedRoll(db,guild,s.id);
  else if(!Number.isSafeInteger(v.hope)||v.hope<1||v.hope>12||!Number.isSafeInteger(v.fear)||v.fear<1||v.fear>12
    ||v.duality!==(v.hope===v.fear?"Critical":v.hope>v.fear?"Hope":"Fear")||!Number.isSafeInteger(v.total))fail();
  let difficulty=d.breakdown?.difficulty,basis=null;
  if(d.kind==="attack"){
    const attack=d.breakdown.attack,event=db.getWorldEvent(guild,d.input.attack_source),proof=event?.details.roll_attack;
    const target=attack&&db.listCombatants(attack.encounter_id).find(c=>c.id===attack.target_id);
    if(event?.status!=="active"||event.kind!=="roll_adjudication"||event.details.human_reviewed!==true||event.source_kind!=="gm"
      ||event.subject_key!==a.data.actor||proof?.target_id!==attack?.target_id||target?.difficulty!==attack.difficulty)fail();
    difficulty=attack.difficulty;basis={kind:"native_attack_target",source:event.event_key,target:attack.target_id,difficulty};
    if(v.duality==="Critical"||v.total>=difficulty){
      const damage=d.tag?d.tag.participants.map(x=>x.damage):[d.damage];
      if(!d.damage_result||damage.some(x=>!x||db.getSavedRoll(guild,x.roll_id)?.payload.request!==q.record_key))fail();
    }
  }else if(difficulty!==null&&difficulty!==undefined){
    const e=db.getWorldEvent(guild,d.input.difficulty_source),p=e?.details.roll_difficulty;
    if(!Number.isSafeInteger(difficulty)||difficulty<0||difficulty>100||e?.status!=="active"
      ||e.kind!=="roll_adjudication"||e.visibility!=="character"||e.subject_key!==a.data.actor
      ||!(e.source_kind==="gm"&&e.details.human_reviewed===true||e.details.native_grounded===true&&e.details.accepted_intent===a.record_key)
      ||p?.declaration!==a.source_event||p?.value!==difficulty)fail();
    basis={kind:"grounded_difficulty",source:e.event_key,difficulty};
  }
  if(v.duality==="Critical")basis={kind:automatic?"native_blaze_critical":"natural_matching_duality",roll:s.id};
  const outcome=basis?(v.duality==="Critical"||v.total>=difficulty?"success":"failure"):"needs_review";
  return {accepted:a,request:q,roll:s,outcome,basis,difficulty:difficulty??null};
}
