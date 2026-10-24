/** Exact structured Experience availability; separate owner choice and Hope payment remain mandatory. */
import {createHash} from 'node:crypto';
import {StateConflictError} from '../../kernel/errors.js';
export function createExperienceEligibilityRules({sources}){
const {indexWorldEvent,consentAction,historicalActionSource,personalCharacter}=sources||{};
if([indexWorldEvent,consentAction,historicalActionSource,personalCharacter].some(fn=>typeof fn!=='function'))throw new TypeError('Complete Experience source capabilities required.');
const issuer='native:experience-eligibility';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fail(){throw Object.assign(new StateConflictError('Exact current native structured Experience eligibility proof required; owner choice and payment remain separate.'),{code:'NATIVE_EXPERIENCE_ELIGIBILITY'});}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function sourceProof(db,guild,accepted){
  if(accepted?.status==='accepted_for_adjudication')return consentAction(db,guild,accepted.record_key);
  if(accepted?.status==='resolved')return historicalActionSource(db,guild,accepted.record_key,{resolved:true});
  fail();
}
function contextFor(db,guild,row,pc){
  const accepted=row?.data?.input?.accepted_intent&&db.getCityRecord(guild,'typed_intent',row.data.input.accepted_intent);
  const action=sourceProof(db,guild,accepted),d=accepted?.data,source=action?.source;
  if(row?.kind!=='roll_request'||!accepted||accepted.record_key!==row.data.input.accepted_intent
    ||!['pending','needs_review','awaiting_selection','resolved'].includes(row.status)
    ||row.subject_key!==pc?.id||row.data.character_id!==pc.id||row.data.owner_user_id!==d?.owner_user_id
    ||row.source_event!==accepted.source_event||row.data.input.source_event!==accepted.source_event
    ||d.actor!==pc.id||d.session_id!==row.data.session_id||d.scene!==row.data.scene
    ||row.visibility!=='character'||row.subject_key!==pc.id
    ||source?.status!=='active'||source.kind!=='authored_turn'||source.event_key!==accepted.source_event
    ||source.details.author!==d.owner_user_id||source.details.character_id!==pc.id
    ||source.details.principal_revision!==d.actor_principal_revision)fail();
  return {accepted,source,principal:action.principal,operation:d.operation};
}
function snapshot(item){
  return {name:item.name,modifier:item.modifier,applies_to:item.applies_to};
}
function exactApplicability(value,context){
  if(!value||typeof value!=='object'||Array.isArray(value)
    ||Object.keys(value).sort().join(',')!=='operations,roll_kinds,traits')return false;
  for(const [field,actual] of [['operations',context.operation],['traits',context.trait],['roll_kinds',context.roll_kind]]){
    const values=value[field];
    if(!Array.isArray(values)||!values.length||values.length>32||new Set(values).size!==values.length
      ||values.some(entry=>typeof entry!=='string'||!entry.trim()||entry.length>100)||!values.includes(actual))return false;
  }
  return true;
}
function validSnapshot(item,context){
  return item&&typeof item.name==='string'&&item.name.trim().length>0&&item.name.length<=120
    &&Number.isSafeInteger(item.modifier)&&item.modifier>=0&&item.modifier<=20
    &&exactApplicability(item.applies_to,context);
}
function bindingFor(row,pc,action,experience){
  const accepted=action.accepted,d=accepted.data,context={operation:action.operation,trait:row.data.breakdown?.trait,roll_kind:row.data.kind};
  if(!validSnapshot(experience,context)||!context.trait||!context.roll_kind)fail();
  return {version:1,issuer,request:row.record_key,request_source:row.source_event,accepted_intent:accepted.record_key,
    source_event:accepted.source_event,source_hash:d.source_hash,source_span:d.source_span,source_start:d.start,source_end:d.end,
    source_audience:accepted.visibility,source_subject:accepted.subject_key||null,owner_user_id:d.owner_user_id,
    owner_principal_revision:d.actor_principal_revision,character_id:pc.id,session_id:d.session_id,scene:d.scene,
    context,experience:snapshot(experience),authority:'Eligibility only; owner selection and explicit 1 Hope payment required.'};
}
function receiptKey(binding){return `native-experience:${hash(binding).slice(0,48)}`;}
function currentExperience(pc,name){
  const found=(pc.data.experiences||[]).filter(item=>typeof item==='object'&&item?.name===name);
  return found.length===1?found[0]:null;
}
function validateReceipt(db,guild,row,pc,event,experience,{historical=false}={}){
  if(!event||event.status!=='active'||event.kind!=='native_experience_eligibility'||event.source_kind!=='gm'
    ||event.source_id!==issuer||event.visibility!=='character'||event.subject_key!==pc.id
    ||event.session_id!==row.data.session_id||event.scene!==row.data.scene)fail();
  const d=event.details,b=d?.binding,action=contextFor(db,guild,row,pc);
  if(d?.version!==1||d.issuer!==issuer||d.payload_hash!==hash(b)||!b||event.event_key!==receiptKey(b))fail();
  const expected=historical
    ?bindingFor(row,pc,action,b.experience)
    :bindingFor(row,pc,action,currentExperience(pc,b.experience?.name));
  if(!same(b,expected)||experience&&(experience.name!==b.experience.name||experience.bonus!==b.experience.modifier))fail();
  return {event,binding:b};
}

/** Create native availability receipts only for the authenticated owner and exact accepted typed action. */
function recordNativeExperienceEligibility(db,guild,user,request){
 return db.transaction(()=>{
  const row=db.getCityRecord(guild,'roll_request',request);
  if(!row||row.data.owner_user_id!==user||row.subject_key===null)fail();
  const pc=personalCharacter(db,guild,user,row.subject_key),action=contextFor(db,guild,row,pc),context={operation:action.operation,
    trait:row.data.breakdown?.trait,roll_kind:row.data.kind},created=[];
  if(!['pending','needs_review'].includes(row.status))return created;
  for(const item of pc.data.experiences||[]){
    if(!validSnapshot(item,context)||currentExperience(pc,item.name)!==item)continue;
    const binding=bindingFor(row,pc,action,item),key=receiptKey(binding),prior=db.getWorldEvent(guild,key);
    if(prior){validateReceipt(db,guild,row,pc,prior,null);created.push(prior);continue;}
    const data={version:1,issuer,binding,payload_hash:hash(binding)};
    const event=indexWorldEvent(db,guild,{key,kind:'native_experience_eligibility',title:'Native structured Experience eligibility',
      source_id:issuer,session_id:row.data.session_id,scene:row.data.scene,visibility:'character',subject_key:pc.id,details:data},issuer);
    validateReceipt(db,guild,row,pc,event,null);created.push(event);
  }
  return created;
 });
}

/** Current-use validation also rechecks owner control and the live exact Experience sheet entry. */
function validateNativeExperienceEligibility(db,guild,row,pc,proof,experience){
  const event=db.getWorldEvent(guild,proof);return validateReceipt(db,guild,row,pc,event,experience);
}

/** Saved-roll reader verifies immutable receipt ancestry without treating the owner's Hope decrement as a sheet change. */
function validateSavedNativeExperienceEligibility(db,guild,row,pc,experience){
  const event=db.getWorldEvent(guild,experience?.proof);
  return validateReceipt(db,guild,row,pc,event,experience,{historical:true});
}

function inspectNativeExperienceEligibility(db,guild,row,pc,name){
  const matching=(pc.data.experiences||[]).filter(item=>typeof item==='object'&&item?.name===name);
  if(matching.length!==1)return null;
  const item=matching[0],action=contextFor(db,guild,row,pc),context={operation:action.operation,trait:row.data.breakdown?.trait,roll_kind:row.data.kind};
  if(!validSnapshot(item,context))return null;
  const binding=bindingFor(row,pc,action,item),event=db.getWorldEvent(guild,receiptKey(binding));
  if(!event)return null;
  try{return validateReceipt(db,guild,row,pc,event,null).event;}
  catch(error){if(error.code==='NATIVE_EXPERIENCE_ELIGIBILITY')return null;throw error;}
}

return Object.freeze({recordNativeExperienceEligibility,validateNativeExperienceEligibility,validateSavedNativeExperienceEligibility,inspectNativeExperienceEligibility});
}
