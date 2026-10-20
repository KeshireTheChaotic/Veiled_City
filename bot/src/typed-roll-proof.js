/** Read-only exact native roll ancestry. A request label, model result or absent Difficulty is never success. */
import {StateConflictError} from "./errors.js";
import {historicalActionSource} from "./action-consent.js";
import {validateBlazeSavedRoll} from "./pc-death.js";
import {inspectAdversaryDamageDefense} from './native-feature-damage.js';
import {inspectNativeDefenseAura,inspectNativeFormationDefense} from './native-defense-aura.js';
import {validateSavedNativeExperienceEligibility} from './native-experience-eligibility.js';
import {inspectNativeUnarmedAttack} from './native-unarmed-attacks.js';
import {inspectOrdinaryRollModifier} from './native-roll-modifiers.js';
import {inspectNativeRollParticipation} from './native-roll-participation.js';
import {inspectNativeEquippedAttack} from './native-equipped-attacks.js';
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
  const modifierKeys=d.input.modifier_keys||[],savedModifiers=d.breakdown?.modifiers||[];
  if(modifierKeys.length!==savedModifiers.length||new Set(modifierKeys).size!==modifierKeys.length
    ||savedModifiers.some(m=>!modifierKeys.includes(m.source)))fail();
  for(const modifier of savedModifiers){
    const event=db.getWorldEvent(guild,modifier.source);
    if(event?.details?.issuer==='native:ordinary-roll-modifier'||event?.source_kind==='mutation'){
      const native=inspectOrdinaryRollModifier(db,guild,d.input,db.getCharacter(a.data.actor),event,{historical:true});
      if(!same(modifier,{source:event.event_key,name:native.name,kind:native.kind,amount:native.amount,ruling_key:native.ruling_key}))fail();
    }else{
      const mod=event?.details?.roll_modifier;
      if(event?.status!=='active'||event.kind!=='roll_adjudication'||event.source_kind!=='gm'||event.details.human_reviewed!==true
        ||event.session_id!==d.session_id||event.scene!==d.scene
        ||event.visibility!=='character'||event.subject_key!==a.data.actor||!mod
        ||mod.trait!==d.input.trait||mod.roll_kind!==d.input.kind||mod.feature
        ||!db.getRulesRuling(guild,mod.ruling_key)
        ||!same(modifier,{source:event.event_key,name:mod.name,kind:mod.kind,amount:mod.amount,ruling_key:mod.ruling_key}))fail();
    }
  }
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
        if(e?.details?.issuer==='native:roll-participation'){
          inspectNativeRollParticipation(db,guild,q,db.getCharacter(x.character),e,'participate',x.description,{historical:true});
          const op=db.getCityRecord(guild,'roll_operation',x.operation_key),auth=op?.data?.authorization;
          if(op?.data.user!==x.user||op.data.op!=='participate'||op.data.request!==q.record_key||op.subject_key!==x.character
            ||auth?.op!=='participate'||auth.request!==q.record_key||auth.proof!==x.proof||(auth.description??e.details.binding.description)!==x.description)fail();
        }else if(e?.status!=="active"||e.kind!=="roll_adjudication"||e.details.human_reviewed!==true||e.source_kind!=="gm"
          ||e.subject_key!==x.character||v?.request!==q.record_key||v.character_id!==x.character||v.kind!=="participate")fail();}
    }
    const e=db.getWorldEvent(guild,d.tag.proof),v=e?.details.roll_participation,usage=db.getCityRecord(guild,"tag_usage",`${d.session_id}:${a.data.actor}`);
    if(e?.details?.issuer==='native:roll-participation'){
      inspectNativeRollParticipation(db,guild,q,db.getCharacter(a.data.actor),e,'tag',d.tag.description,{historical:true});
      const op=db.getCityRecord(guild,'roll_operation',d.tag.operation_key),auth=op?.data?.authorization;
      if(op?.data.user!==a.data.owner_user_id||op.data.op!=='tag'||op.subject_key!==a.data.actor||op.data.request!==q.record_key
        ||auth?.pay_hope!==true||auth.proof!==d.tag.proof||(auth.description??e.details.binding.description)!==d.tag.description||auth.partner_request!==d.tag.partner_request
        ||usage?.data.request!==q.record_key||usage.data.user!==a.data.owner_user_id||usage.data.hope_spent!==3)fail();
    }else if(e?.status!=="active"||e.kind!=="roll_adjudication"||e.details.human_reviewed!==true||e.source_kind!=="gm"
      ||e.subject_key!==a.data.actor||v?.request!==q.record_key||v.character_id!==a.data.actor||v.kind!=="tag"
      ||usage?.data.request!==q.record_key||usage.data.user!==a.data.owner_user_id||usage.data.hope_spent!==3)fail();
  }else if(s.character_id!==a.data.actor||s.discord_user_id!==a.data.owner_user_id
    ||s.roll_type!==d.kind&&s.roll_type!=="blaze_final_action")fail();
  for(const helper of d.helpers||[]){
    const event=db.getWorldEvent(guild,helper.proof);
    if(event?.details?.issuer!=='native:roll-participation')continue;
    inspectNativeRollParticipation(db,guild,q,db.getCharacter(helper.character),event,'help',helper.description,{historical:true});
    const op=db.getCityRecord(guild,'roll_operation',helper.operation_key),auth=op?.data?.authorization,
      roll=db.getSavedRoll(guild,helper.roll_id),delta=op?.data?.resource_deltas?.find(r=>r.character===helper.character);
    if(op?.data.op!=='help'||op.data.user!==helper.user||op.data.request!==q.record_key||op.subject_key!==helper.character
      ||op.source_event!==q.source_event||auth?.pay_hope!==true||auth.proof!==helper.proof||(auth.description??event.details.binding.description)!==helper.description
      ||delta?.hope?.delta!==-1||delta.hope.before-delta.hope.after!==1||roll?.roll_type!=='help'||roll.character_id!==helper.character
      ||roll.discord_user_id!==helper.user||roll.payload.request!==q.record_key||roll.payload.die!==helper.die||roll.payload.proof!==helper.proof)fail();
  }
  for(const experience of d.experiences||[]){
    const event=db.getWorldEvent(guild,experience.proof);
    if(experience.hope_spent!==1||!Number.isSafeInteger(experience.bonus)||experience.bonus<0||experience.bonus>20)fail();
    if(experience.operation_key){
      const operation=db.getCityRecord(guild,'roll_operation',experience.operation_key),auth=operation?.data?.authorization,
        delta=operation?.data?.resource_deltas?.find(item=>item.character===a.data.actor),result=operation?.data?.result,
        resultExperience=result?.data?.experiences?.find(item=>item.operation_key===experience.operation_key);
      if(operation?.status!=='active'||operation.visibility!=='character'||operation.subject_key!==a.data.actor
        ||operation.source_event!==q.source_event||operation.data.user!==a.data.owner_user_id||operation.data.request!==q.record_key
        ||operation.data.op!=='experience'||auth?.op!=='experience'||auth.request!==q.record_key
        ||auth.experience!==experience.name||auth.proof!==experience.proof||auth.pay_hope!==true
        ||!delta||delta.hope?.before-delta.hope?.after!==1||delta.hope?.delta!==-1
        ||result?.record_key!==q.record_key||!resultExperience||resultExperience.name!==experience.name
        ||resultExperience.bonus!==experience.bonus||resultExperience.proof!==experience.proof||resultExperience.hope_spent!==1)fail();
    }else if(event?.kind==='native_experience_eligibility')fail();
    if(event?.kind==='native_experience_eligibility'&&event.source_id==='native:experience-eligibility')
      validateSavedNativeExperienceEligibility(db,guild,q,db.getCharacter(a.data.actor),experience);
    else{
      const p=event?.details?.roll_participation;
      if(event?.status!=='active'||event.kind!=='roll_adjudication'||event.source_kind!=='gm'||event.details.human_reviewed!==true
        ||event.session_id!==d.session_id||event.scene!==d.scene||event.visibility!=='character'||event.subject_key!==a.data.actor
        ||p?.request!==q.record_key||p.character_id!==a.data.actor||p.kind!=='experience'||p.experience!==experience.name
        ||!db.getRulesRuling(guild,event.details.ruling_key||p.ruling_key))fail();
    }
  }
  const automatic=s.roll_type==="blaze_final_action";
  if(automatic)validateBlazeSavedRoll(db,guild,s.id);
  else if(!Number.isSafeInteger(v.hope)||v.hope<1||v.hope>12||!Number.isSafeInteger(v.fear)||v.fear<1||v.fear>12
    ||v.duality!==(v.hope===v.fear?"Critical":v.hope>v.fear?"Hope":"Fear")||!Number.isSafeInteger(v.total))fail();
  let difficulty=d.breakdown?.difficulty,basis=null;
  if(d.kind==="attack"){
    const attack=d.breakdown.attack,event=db.getWorldEvent(guild,d.input.attack_source),proof=event?.details.roll_attack;
    const target=attack&&db.listCombatants(attack.encounter_id).find(c=>c.id===attack.target_id);
    if(event?.kind==='native_unarmed_attack'){
      const native=inspectNativeUnarmedAttack(db,guild,d.input,db.getCharacter(a.data.actor),{historical:true}).attack;
      if(native.target_id!==attack?.target_id||native.encounter_id!==attack.encounter_id||native.weapon!==attack.weapon
        ||native.damage!==attack.damage||native.damage_type!==attack.damage_type
        ||native.difficulty!==(attack.defense_aura||attack.defense_passive?attack.base_difficulty:attack.difficulty))fail();
    }else if(d.input.native_equipped_ref){
      const native=inspectNativeEquippedAttack(db,guild,d.input,db.getCharacter(a.data.actor),{historical:true}).attack;
      if(native.target_id!==attack?.target_id||native.encounter_id!==attack.encounter_id||native.weapon!==attack.weapon||native.damage!==attack.damage
        ||native.damage_type!==attack.damage_type||native.difficulty!==(attack.defense_aura||attack.defense_passive?attack.base_difficulty:attack.difficulty))fail();
    }else if(event?.status!=="active"||event.kind!=="roll_adjudication"||event.details.human_reviewed!==true||event.source_kind!=="gm"
      ||event.subject_key!==a.data.actor||proof?.target_id!==attack?.target_id)fail();
    if(target?.difficulty!==(attack.defense_aura||attack.defense_passive?attack.base_difficulty:attack.difficulty))fail();
    if(attack.defense_aura)inspectNativeDefenseAura(db,guild,q);
    if(attack.defense_passive)inspectNativeFormationDefense(db,guild,q);
    difficulty=attack.difficulty;basis={kind:"native_attack_target",source:event.event_key,target:attack.target_id,difficulty};
    if(v.duality==="Critical"||v.total>=difficulty){
      const damage=d.tag?d.tag.participants.map(x=>x.damage):[d.damage];
      if(!d.damage_result||damage.some(x=>!x||db.getSavedRoll(guild,x.roll_id)?.payload.request!==q.record_key))fail();
      if(d.damage_result.defense_ref)inspectAdversaryDamageDefense(db,guild,q);
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
