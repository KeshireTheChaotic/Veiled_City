/** Source-pinned on-hit errata. Native hit/Fear ancestry, not a GM d20 face or model claim, authorizes the effect. */
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {compileNativeFeatures} from './native-feature-catalog.js';
import {nativeHouseErratum} from './native-house-errata.js';
import {inspectNativeGmDecision} from './gm-action-capability.js';
import {typedRollProof} from './typed-roll-proof.js';
import {validateIncomingDamageApplication,incomingAttackEvidence} from './pc-incoming.js';
import {indexWorldEvent} from './city-calendar.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {adversaryHpState} from './combat.js';
import {applyNativeStressPassive} from './native-stress-passives.js';

const FEATURE='adversary:wraith-pack:many-deaths';
const keyFor=attack=>`many-deaths:${hash(attack)}`;
function fearProof(db,guild,decision){
  const n=decision.data.native,o=n?.opportunity;if(!o?.request||!o.roll)return null;
  const request=db.getCityRecord(guild,'roll_request',o.request),proof=request&&typedRollProof(db,guild,request),
    receipt=proof&&db.getCityRecord(guild,'action_outcome_receipt',proof.accepted.data.outcome_receipt),
    source=proof&&db.getWorldEvent(guild,proof.accepted.source_event),difficulty=request?.data.input.difficulty_source&&db.getWorldEvent(guild,request.data.input.difficulty_source);
  if(!proof||request.data.kind==='reaction'||request.data.result.duality!=='Fear')return null;
  if(proof.outcome==='needs_review'||o.roll!==request.data.roll_id||o.source!==proof.accepted.source_event||o.key!==`gm-opportunity:roll:${o.roll}`
    ||request.data.scene!==decision.data.origin.scene||request.data.session_id!==decision.data.origin.session
    ||receipt?.status!=='resolved'||receipt.data.request!==o.request||receipt.data.native_roll_refs.length!==1||receipt.data.native_roll_refs[0]!==o.roll)
    throw fail('many_deaths_actual_causal_fear_opportunity');
  return {request:o.request,roll:o.roll,source:o.source,source_hash:hash(source),receipt:receipt.record_key,receipt_hash:hash(receipt.data),
    difficulty_source:difficulty?.event_key||null,difficulty_hash:difficulty?hash(difficulty):null,opportunity:o.key};
}

/** Evaluated before native GM attack RNG; saved eligibility is GM-only, with opaque refs in the owner offer. */
export function nativeHitFeatureCandidates(db,guild,{template,combatant,input}){
  const feature=compileNativeFeatures().find(f=>f.feature_key===FEATURE);
  if(hash(template)!==feature.template_hash||!input.ruling?.startsWith('ai-decision:'))return [];
  const hp=adversaryHpState(combatant);if(hp.remaining<4)return [];
  const {row,entry}=inspectNativeGmDecision(db,guild,input.ruling.slice(12)),proof=fearProof(db,guild,row);
  if(!proof)return [];
  if(row.data.native.operation!=='commit_adversary_attack'||entry.actor.key!==input.npc||entry.target_refs.length!==1||entry.target_refs[0]!==input.character)
    throw fail('many_deaths_native_standard_attack');
  const erratum=nativeHouseErratum('HR01');
  if(erratum?.status!=='supported'||erratum.native_handler!=='many_deaths_fear_opportunity')throw fail('many_deaths_erratum_unavailable');
  return [{feature:FEATURE,feature_hash:hash(feature),erratum:'HR01',erratum_version:1,erratum_hash:hash(erratum),actor:input.npc,combatant:combatant.id,
    remaining_hp:combatant.hp_current,template_hash:feature.template_hash,decision:row.record_key,character:input.character,proof}];
}
function eligibility(db,guild,attack){
  const o=attack.data.offer,ref=o.hit_features?.[0];if(!ref)return null;
  const row=db.getCityRecord(guild,'npc_hit_feature_proof',ref.ref),v=row?.data.proof,feature=compileNativeFeatures().find(f=>f.feature_key===FEATURE),erratum=nativeHouseErratum('HR01');
  if(o.hit_features.length!==1||row?.visibility!=='gm'||row.status!=='verified'||row.source_event!==attack.source_event||row.data.attack!==attack.record_key
    ||hash(v)!==ref.fingerprint||v.feature!==FEATURE||v.feature_hash!==hash(feature)||v.template_hash!==o.snapshot.template
    ||v.remaining_hp<4||v.erratum!=='HR01'||v.erratum_version!==1||v.erratum_hash!==hash(erratum)||v.character!==o.input.character||v.actor!==o.input.npc
    ||v.combatant!==o.input.combatant||o.input.ruling!==`ai-decision:${v.decision}`)throw fail('many_deaths_eligibility_source');
  const {row:decision}=inspectNativeGmDecision(db,guild,v.decision);
  if(hash(fearProof(db,guild,decision))!==hash(v.proof))throw fail('many_deaths_fear_source_changed');
  const {roll}=incomingAttackEvidence(db,guild,attack.record_key,{terminal:true}),cost=db.getCityRecord(guild,'gm_action_cost_receipt',roll.data.cost_ref);
  if(!roll.data.hit||roll.data.gm_decision!==v.decision||cost?.status!=='committed'||cost.source_event!==decision.source_event
    ||cost.data.decision!==v.decision||cost.data.opportunity!==v.proof.opportunity)throw fail('many_deaths_saved_hit_and_cost');
  return row;
}
export function inspectManyDeathsEffect(db,guild,key){
  const receipt=db.getCityRecord(guild,'gm_feature_effect_receipt',key),v=receipt?.data,attack=v&&db.getCityRecord(guild,'pc_incoming_attack',v.attack),
    source=receipt&&db.getWorldEvent(guild,receipt.source_event),proof=attack&&eligibility(db,guild,attack),pc=v&&db.getCharacter(v.character),
    base=v&&validateIncomingDamageApplication(db,guild,v.damage_receipt),mutation=v&&db.getMutation(guild,v.mutation),expected=v&&structuredClone(v.before);
  if(expected)expected.stress.current++;
  if(!v||receipt.status!=='resolved'||receipt.visibility!=='character'||receipt.subject_key!==v.character||key!==keyFor(v.attack)
    ||v.feature!==FEATURE||v.proof_ref!==proof?.record_key||v.proof_hash!==hash(proof?.data)||v.owner!==pc?.owner_user_id
    ||v.character!==attack?.subject_key||base?.subject_key!==v.character||hash(base.data.after)!==hash(v.before)
    ||v.before.stress.current>=v.before.stress.max||hash(v.after)!==hash(expected)
    ||source?.status!=='active'||source.kind!=='native_many_deaths_effect'||source.source_id!=='native:feature-gate'
    ||source.visibility!=='character'||source.subject_key!==v.character||source.details.payload_hash!==hash(v)
    ||source.details.input_source!==attack.source_event||mutation?.source_layer!=='native_feature'||mutation.entity_key!==v.character
    ||hash(JSON.parse(mutation.before_json))!==hash(v.before)||hash(JSON.parse(mutation.after_json))!==hash(v.after))throw fail('many_deaths_native_effect_ancestry');
  return receipt;
}

/** Optional feature failure holds only this effect; an independently legitimate standard attack stays committed. */
export function applyManyDeathsAfterIncoming(db,guild,attackKey){
  const attack=db.getCityRecord(guild,'pc_incoming_attack',attackKey);
  if(!attack?.data.offer.hit_features?.length)return null;
  let result;
  try{result=db.transaction(()=>{
    const key=keyFor(attackKey),prior=db.getCityRecord(guild,'gm_feature_effect_receipt',key);if(prior)return inspectManyDeathsEffect(db,guild,key);
    const proof=eligibility(db,guild,attack);if(!proof)return null;
    const base=validateIncomingDamageApplication(db,guild,`${attackKey}:damage`),pc=db.getCharacter(attack.subject_key),before=structuredClone(pc.data.resources);
    if(hash(before)!==hash(base.data.after))throw fail('many_deaths_postdamage_state_requires_reconciliation');
    if(pc.data.domain_cards?.some(c=>c?.name==='Signal-Touched'&&c.active===true))throw fail('signal_touched_owner_preconsequence_choice_required');
    if(!Number.isSafeInteger(before.stress?.current)||!Number.isSafeInteger(before.stress?.max)||before.stress.current<0
      ||before.stress.current>=before.stress.max)throw fail('many_deaths_native_stress_overflow_review');
    db.updateCharacterData(pc.id,d=>{d.resources.stress.current++;});
    const after=db.getCharacter(pc.id).data.resources,mutation=db.recordMutation(guild,{sessionId:base.data.session,actorType:'ai_gm',actorId:'native:feature-gate',
      sourceLayer:'native_feature',mutationType:'many_deaths_verified_stress',entityKey:pc.id,visibility:'character',before,after,
      rationale:'Explicit source-pinned HR01; native hit caused by verified PC Fear opportunity.',payload:{attack:attackKey,proof:proof.record_key}}),
      material={version:1,feature:FEATURE,attack:attackKey,character:pc.id,owner:pc.owner_user_id,damage_receipt:base.record_key,
        proof_ref:proof.record_key,proof_hash:hash(proof.data),before,after,mutation:mutation.id};
    const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_many_deaths_effect',source_id:'native:feature-gate',title:'Native attack additional Stress',
      session_id:base.data.session,scene:base.data.scene,visibility:'character',subject_key:pc.id,
      details:{input_source:attack.source_event,payload_hash:hash(material)}},'native:feature-gate');
    return db.saveCityRecord(guild,{kind:'gm_feature_effect_receipt',key,status:'resolved',source_event:source.event_key,visibility:'character',subject_key:pc.id,data:material});
  });}catch(error){
    if(!['GM_ARBITRATION','PC_EFFECT_AUTHORITY','TYPED_ROLL_PROOF','SCENE_ACTION_WINDOW','SCENE_FICTION'].includes(error.code))throw error;
    return db.saveCityRecord(guild,{kind:'gm_feature_effect_review',key:`${keyFor(attackKey)}:review`,status:'needs_rules_review',source_event:attack.source_event,
      visibility:'gm',data:{feature:FEATURE,attack:attackKey,reason:error.message,
        authority:'Extra effect unresolved. Keep valid attack/damage; no reroll, substituted consequence or private disclosure.'}});
  }
  if(result?.kind==='gm_feature_effect_receipt'&&result.data.feature===FEATURE)
    applyNativeStressPassive(db,guild,'feature',result.record_key);
  return result;
}
