/** Source-pinned native Difficulty defenses, never attack/reaction bonuses or model effect grants. */
import {compileNativeFeatures,compileNativeActors,nativeSignalFeatureTarget} from './native-feature-catalog.js';
import {nativeEncounterActor,nativeNpcAlliance,inspectNativeNpcAllianceReceipt} from './native-encounter-relations.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {sceneAccess} from './scene-continuity.js';
import {nativeHouseErratum} from './native-house-errata.js';
import {indexWorldEvent} from './city-calendar.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';

const FEATURE='adversary:choir-relay:local-mesh';
const FORMATION='adversary:ritual-enforcement-team:stack-formation';
const formationScope=recipient=>{
  const {hp_current,updated_at,...stable}=recipient.combatant;
  return hash({...recipient,combatant:stable});
};
/** Automatic bounded passive; current native actor HP is remaining HP, not PC marked slots. */
export function nativeFormationDefense(db,guild,target,input){
  const feature=compileNativeFeatures().find(f=>f.feature_key===FORMATION);
  if(feature?.status!=='supported'||feature.native_handler!=='stack_formation_remaining_hp')return null;
  const binding=db.getCityRecord(guild,'encounter_binding',target.encounter_id),actor=binding?.data.combatants.find(b=>b.id===target.id)?.actor;
  if(!actor)return null;
  let recipient;
  try{recipient=nativeEncounterActor(db,guild,actor);}catch(e){if(e.code!=='GM_ARBITRATION')throw e;return null;}
  if(recipient.combatant.id!==target.id||hash(recipient.template)!==feature.template_hash)return null;
  const pc=db.getCharacter(input.character_id);
  if(pc?.guild_id!==guild||pc.data.location!==recipient.presence.location_key||target.difficulty!==recipient.template.difficulty
    ||!Number.isSafeInteger(target.hp_current)||target.hp_current>target.hp_max||target.hp_max!==recipient.template.hp)throw fail('formation_native_target_state');
  const detail={version:1,feature:FORMATION,feature_hash:hash(feature),template_hash:feature.template_hash,
    actor,target:target.id,scene:recipient.scene,session:recipient.session,encounter:target.encounter_id,target_snapshot:hash(recipient),scope_snapshot:formationScope(recipient),
    actor_source:recipient.presence.source_event,binding_source:binding.source_event,
    hp_remaining:target.hp_current,hp_max:target.hp_max,base_difficulty:target.difficulty,bonus:target.hp_current>=4?1:0,
    declaration:input.source_event,attack_source:input.attack_source,character:input.character_id},ref=`defense-passive:${hash(detail)}`;
  return {detail,proof:{ref,fingerprint:hash(detail)}};
}
export function persistNativeFormationDefense(db,guild,request){
  const attack=request.data.breakdown.attack;if(!attack?.defense_passive)return;
  const target=db.listCombatants(attack.encounter_id).find(c=>c.id===attack.target_id),actual=target&&nativeFormationDefense(db,guild,target,request.data.input);
  if(!actual||hash(actual.proof)!==hash(attack.defense_passive)||attack.defense_aura||attack.difficulty!==target.difficulty+actual.detail.bonus)throw fail('formation_prepare_cas');
  const event=indexWorldEvent(db,guild,{key:`${actual.proof.ref}:source`,kind:'native_defense_passive',source_id:'native:feature-gate',
    title:'Native remaining-HP defensive Difficulty',session_id:request.data.session_id,scene:request.data.scene,visibility:'gm',
    details:{input_source:request.source_event,payload_hash:hash(actual.detail)}},'native:feature-gate');
  db.saveCityRecord(guild,{kind:'npc_defense_passive_proof',key:actual.proof.ref,status:'verified',source_event:event.event_key,visibility:'gm',data:actual.detail});
}
/** Historical read proof: later legitimate damage never retroactively lowers saved attack Difficulty. */
export function inspectNativeFormationDefense(db,guild,request){
  const attack=request?.data.breakdown.attack,ref=attack?.defense_passive;if(!ref)return null;
  const record=db.getCityRecord(guild,'npc_defense_passive_proof',ref.ref),v=record?.data,event=record&&db.getWorldEvent(guild,record.source_event),
    feature=compileNativeFeatures().find(f=>f.feature_key===FORMATION),actor=compileNativeActors().find(a=>a.template_hash===v?.template_hash);
  if(!v||record.status!=='verified'||record.visibility!=='gm'||hash(v)!==ref.fingerprint||ref.ref!==`defense-passive:${hash(v)}`
    ||event?.status!=='active'||event.kind!=='native_defense_passive'||event.source_id!=='native:feature-gate'||event.visibility!=='gm'
    ||event.details.input_source!==request.source_event||event.details.payload_hash!==hash(v)||v.version!==1||v.feature!==FORMATION
    ||feature.native_handler!=='stack_formation_remaining_hp'||v.feature_hash!==hash(feature)||v.template_hash!==feature.template_hash
    ||db.getWorldEvent(guild,v.actor_source)?.status!=='active'||db.getWorldEvent(guild,v.binding_source)?.status!=='active'
    ||!actor||v.bonus!==(v.hp_remaining>=4?1:0)||!Number.isSafeInteger(v.hp_remaining)||v.hp_remaining<1||v.hp_remaining>v.hp_max
    ||v.hp_max!==6||v.base_difficulty!==14||attack.base_difficulty!==v.base_difficulty||attack.difficulty!==v.base_difficulty+v.bonus||attack.defense_aura
    ||v.target!==attack.target_id||v.encounter!==attack.encounter_id||v.character!==request.subject_key||v.declaration!==request.source_event
    ||v.attack_source!==request.data.input.attack_source||v.scene!==request.data.scene||v.session!==request.data.session_id)throw fail('formation_saved_defense_ancestry');
  return record;
}
/** Narrow post-dice reconciliation: only the saved passive odds survive later target HP changes. */
export function reconcileNativeFormationBreakdown(db,guild,request,actual){
  const d=request.data,attack=d.breakdown.attack;
  if(!attack?.defense_passive||!d.roll_id||!d.result)return actual;
  const proof=inspectNativeFormationDefense(db,guild,request);
  if(hash(actual.attack)===hash(attack))return actual;
  if(d.tag)throw fail('formation_collaboration_history_needs_mapping');
  const saved=db.getSavedRoll(guild,d.roll_id),recipient=nativeEncounterActor(db,guild,proof.data.actor);
  if(hash(request)!==hash(db.getCityRecord(guild,'roll_request',request.record_key))||saved?.roll_type!=='attack'
    ||saved.session_id!==d.session_id||saved.character_id!==request.subject_key||saved.discord_user_id!==d.owner_user_id
    ||saved.payload.request!==request.record_key||!['hope','fear','duality','total'].every(k=>Object.hasOwn(d.result,k))
    ||Object.keys(d.result).some(k=>hash(saved.payload[k])!==hash(d.result[k]))
    ||formationScope(recipient)!==proof.data.scope_snapshot||!actual.attack)throw fail('formation_actual_saved_roll_scope');
  const baseline=value=>{const {difficulty,base_difficulty,defense_passive,...other}=value;return other;};
  if(hash(baseline(actual.attack))!==hash(baseline(attack))||actual.attack.defense_aura
    ||(actual.attack.base_difficulty??actual.attack.difficulty)!==attack.base_difficulty)throw fail('formation_other_attack_authority_changed');
  return {...actual,attack:structuredClone(attack)};
}
export function nativeDefenseAura(db,guild,target,input){
  const feature=compileNativeFeatures().find(f=>f.feature_key===FEATURE),erratum=nativeHouseErratum('HR03',2),
    binding=db.getCityRecord(guild,'encounter_binding',target.encounter_id),actor=binding?.data.combatants.find(b=>b.id===target.id)?.actor;
  if(!actor)return null;
  if(feature.native_handler!=='local_mesh_allied_zone'||erratum?.native_handler!=='local_mesh_allied_zone'||erratum.status!=='supported')throw fail('local_mesh_handler_version');
  let recipient;
  try{recipient=nativeEncounterActor(db,guild,actor);}catch(e){if(e.code!=='GM_ARBITRATION')throw e;return null;}
  if(recipient.combatant.id!==target.id||!nativeSignalFeatureTarget(FEATURE,recipient.template).target.signal_based)return null;
  const contributors=[];
  for(const b of binding.data.combatants){
    if(b.actor===actor)continue;
    try{
      const emitter=nativeEncounterActor(db,guild,b.actor),alliance=nativeNpcAlliance(db,guild,target.encounter_id,actor,b.actor);
      if(!alliance||hash(emitter.template)!==feature.template_hash||emitter.presence.location_key!==recipient.presence.location_key
        ||emitter.presence.data.zone!==recipient.presence.data.zone
        ||!sceneAccess(db,guild,{observer_type:'npc',observer_key:emitter.actor,target_type:'npc',target_key:recipient.actor}))continue;
      // Same native zone proves Melee, a conservative subset of Close. No PC-relative pairwise range inference.
      contributors.push({actor:emitter.actor,combatant:emitter.combatant.id,snapshot:hash(emitter),range:'Melee',
        alliance:alliance.record_key,alliance_hash:hash(alliance),alliance_receipt:alliance.data.receipt});
    }catch(e){if(e.code!=='GM_ARBITRATION')throw e;}
  }
  if(!contributors.length)return null;
  contributors.sort((a,b)=>a.actor.localeCompare(b.actor));
  if(erratum?.interpretation.maximum_aura_bonus!==1||erratum.interpretation.self!==false)throw fail('local_mesh_native_erratum');
  const detail={version:1,feature:FEATURE,feature_hash:hash(feature),erratum:'HR03',erratum_version:2,erratum_hash:hash(erratum),
    scene:recipient.scene,session:recipient.session,encounter:target.encounter_id,actor,target:target.id,target_template:hash(recipient.template),
    target_snapshot:hash(recipient),base_difficulty:target.difficulty,bonus:1,contributors,
    declaration:input.source_event,attack_source:input.attack_source,character:input.character_id},ref=`defense-aura:${hash(detail)}`;
  return {detail,proof:{ref,fingerprint:hash(detail)}};
}
export function persistNativeDefenseAura(db,guild,request){
  const attack=request.data.breakdown.attack;if(!attack?.defense_aura)return;
  const target=db.listCombatants(attack.encounter_id).find(c=>c.id===attack.target_id),actual=target&&nativeDefenseAura(db,guild,target,request.data.input);
  if(!actual||hash(actual.proof)!==hash(attack.defense_aura)||attack.difficulty!==target.difficulty+1)throw fail('local_mesh_prepare_cas');
  const event=indexWorldEvent(db,guild,{key:`${actual.proof.ref}:source`,kind:'native_defense_aura',source_id:'native:feature-gate',
    title:'Native defense Difficulty aura',session_id:request.data.session_id,scene:request.data.scene,visibility:'gm',
    details:{input_source:request.source_event,payload_hash:hash(actual.detail)}},'native:feature-gate');
  db.saveCityRecord(guild,{kind:'npc_defense_aura_proof',key:actual.proof.ref,status:'verified',source_event:event.event_key,visibility:'gm',data:actual.detail});
}
/** Saved defense proof, not current-position recalculation after a legitimate attack already resolved. */
export function inspectNativeDefenseAura(db,guild,request){
  const attack=request?.data.breakdown.attack,ref=attack?.defense_aura;if(!ref)return null;
  const record=db.getCityRecord(guild,'npc_defense_aura_proof',ref.ref),v=record?.data,event=record&&db.getWorldEvent(guild,record.source_event),
    feature=compileNativeFeatures().find(f=>f.feature_key===FEATURE),erratum=nativeHouseErratum('HR03',2),
    classified=compileNativeActors().find(a=>a.template_hash===v?.target_template);
  if(!v||record.status!=='verified'||record.visibility!=='gm'||hash(v)!==ref.fingerprint||ref.ref!==`defense-aura:${hash(v)}`
    ||event?.status!=='active'||event.kind!=='native_defense_aura'||event.source_id!=='native:feature-gate'||event.visibility!=='gm'
    ||event.details.input_source!==request.source_event||event.details.payload_hash!==hash(v)||v.feature!==FEATURE||v.feature_hash!==hash(feature)
    ||v.erratum!=='HR03'||v.erratum_version!==2||v.erratum_hash!==hash(erratum)||!classified?.signal_based||v.bonus!==1
    ||v.target!==attack.target_id||v.encounter!==attack.encounter_id||attack.base_difficulty!==v.base_difficulty||attack.difficulty!==v.base_difficulty+1
    ||v.character!==request.subject_key||v.declaration!==request.source_event||v.attack_source!==request.data.input.attack_source
    ||v.scene!==request.data.scene||v.session!==request.data.session_id||!v.contributors.length
    ||new Set(v.contributors.map(c=>c.actor)).size!==v.contributors.length)throw fail('local_mesh_saved_defense_ancestry');
  for(const c of v.contributors){
    const alliance=inspectNativeNpcAllianceReceipt(db,guild,c.alliance_receipt),n=alliance.data.plan;
    if(c.actor===v.actor||c.range!=='Melee'||n.encounter!==v.encounter||n.state!=='allied'
      ||![v.actor,c.actor].includes(n.actor)||!n.targets.some(t=>t.actor===(n.actor===v.actor?c.actor:v.actor)))throw fail('local_mesh_saved_alliance');
  }
  return record;
}
