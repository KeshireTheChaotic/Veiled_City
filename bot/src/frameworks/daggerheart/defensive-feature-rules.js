import {planFeatureModifier} from './feature-operation-descriptors.js';
/** Complete native native-defense-aura policy; source and repository capabilities are explicitly injected. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeArbitrationFailure as fail} from './native-failure.js';
export function createDefensiveFeatureRules({capabilities}){
const {compileNativeFeatures,compileNativeActors,nativeSignalFeatureTarget,nativeEncounterActor,nativeNpcAlliance,inspectNativeNpcAllianceReceipt,sceneAccess,currentScene,scenePresence,activeCityProxy,EncounterLibrary,nativeHouseErratum,indexWorldEvent}=capabilities||{};
if([compileNativeFeatures,compileNativeActors,nativeSignalFeatureTarget,nativeEncounterActor,nativeNpcAlliance,inspectNativeNpcAllianceReceipt,sceneAccess,currentScene,scenePresence,activeCityProxy,EncounterLibrary,nativeHouseErratum,indexWorldEvent].some(fn=>typeof fn!=='function'))throw new TypeError('Native native-defense-aura capabilities required');
const FEATURE='adversary:choir-relay:local-mesh';
const FORMATION='adversary:ritual-enforcement-team:stack-formation';
const VEIL_FEATURES=new Set(['adversary:veil-anchor-sentinel:plausible-denial','adversary:veil-engine-custodian:consensus-pressure']);
const formationScope=recipient=>{
  const {hp_current,updated_at,...stable}=recipient.combatant;
  return hash({...recipient,combatant:stable});
};
/** Automatic bounded passive; current native actor HP is remaining HP, not PC marked slots. */
function nativeFormationDefense(db,guild,target,input){
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
    hp_remaining:target.hp_current,hp_max:target.hp_max,base_difficulty:target.difficulty,bonus:planFeatureModifier(feature,{value:target.hp_current}),
    declaration:input.source_event,attack_source:input.attack_source,character:input.character_id},ref=`defense-passive:${hash(detail)}`;
  return {detail,proof:{ref,fingerprint:hash(detail)}};
}
/** Campaign-global Veil Exposure passive. The native campaign field is the sole threshold input. */
function nativeVeilExposureDefense(db,guild,target,input){
  const binding=db.getCityRecord(guild,'encounter_binding',target.encounter_id),actor=binding?.data.combatants.find(b=>b.id===target.id)?.actor;
  if(!actor)return null;
  let recipient;
  try{recipient=nativeEncounterActor(db,guild,actor);}catch(e){if(e.code!=='GM_ARBITRATION')throw e;return null;}
  if(recipient.combatant.id!==target.id)return null;
  const feature=compileNativeFeatures().find(f=>VEIL_FEATURES.has(f.feature_key)&&f.template_hash===hash(recipient.template));
  if(!feature)return null;
  if(feature.status!=='supported'||feature.native_handler!=='veil_exposure_difficulty'||feature.type!=='Passive')throw fail('veil_passive_handler_version');
  const pc=db.getCharacter(input.character_id),exposure=db.getCampaign(guild)?.veil_exposure;
  if(pc?.guild_id!==guild||pc.data.location!==recipient.presence.location_key||target.difficulty!==recipient.template.difficulty
    ||!Number.isSafeInteger(exposure)||exposure<0||exposure>6)throw fail('veil_passive_native_state');
  const bonus=planFeatureModifier(feature,{value:exposure});
  const detail={version:2,feature:feature.feature_key,feature_hash:hash(feature),template_hash:feature.template_hash,
    actor,target:target.id,scene:recipient.scene,session:recipient.session,encounter:target.encounter_id,
    target_snapshot:hash(recipient),scope_snapshot:formationScope(recipient),actor_source:recipient.presence.source_event,binding_source:binding.source_event,
    exposure,base_difficulty:target.difficulty,bonus,declaration:input.source_event,attack_source:input.attack_source,character:input.character_id},
    ref=`defense-passive:${hash(detail)}`;
  return {detail,proof:{ref,fingerprint:hash(detail)}};
}
function persistNativeVeilExposureDefense(db,guild,request){
  const attack=request.data.breakdown.attack;if(!attack?.defense_passive||attack.defense_passive.fingerprint===undefined)return;
  const detail=attack.defense_passive.ref&&db.getCityRecord(guild,'npc_defense_passive_proof',attack.defense_passive.ref)?.data;
  if(detail?.version===1)return; // The StackFormation writer below owns its immutable v1 proof format.
  const target=db.listCombatants(attack.encounter_id).find(c=>c.id===attack.target_id),actual=target&&nativeVeilExposureDefense(db,guild,target,request.data.input);
  if(!actual||hash(actual.proof)!==hash(attack.defense_passive)||attack.defense_aura
    ||attack.difficulty!==target.difficulty+actual.detail.bonus)throw fail('veil_passive_prepare_cas');
  const event=indexWorldEvent(db,guild,{key:`${actual.proof.ref}:source`,kind:'native_defense_passive',source_id:'native:feature-gate',
    title:'Native Veil Exposure defensive Difficulty',session_id:request.data.session_id,scene:request.data.scene,visibility:'gm',
    details:{input_source:request.source_event,payload_hash:hash(actual.detail)}},'native:feature-gate');
  db.saveCityRecord(guild,{kind:'npc_defense_passive_proof',key:actual.proof.ref,status:'verified',source_event:event.event_key,visibility:'gm',data:actual.detail});
}
/** Stable live source scope for replay reconciliation; HP and campaign Exposure are intentionally excluded. */
function nativeVeilExposureScope(db,guild,v){
  const scene=currentScene(db,guild),encounter=db.getCurrentEncounter(scene.session_id),binding=db.getCityRecord(guild,'encounter_binding',v.encounter),
    bound=binding?.data.combatants?.find(b=>b.actor===v.actor&&b.id===v.target),combatant=binding&&db.listCombatants(v.encounter).find(c=>c.id===v.target),
    presence=scenePresence(db,guild,'npc',v.actor),entity=db.getSimulationEntity(guild,'npc',v.actor),
    template=combatant&&new EncounterLibrary('../content').findAdversary(combatant.base_name);
  if(scene.key!==v.scene||scene.session_id!==v.session||encounter?.id!==v.encounter||encounter.status!=='active'
    ||binding?.status!=='active'||binding.source_event!==v.binding_source||db.getWorldEvent(guild,v.binding_source)?.status!=='active'
    ||!bound||!combatant||presence?.source_event!==v.actor_source||presence.data.state!=='actually_present'||presence.data.scene!==scene.key
    ||db.getWorldEvent(guild,v.actor_source)?.status!=='active'||activeCityProxy(db,guild,v.actor)
    ||entity?.state.removed||['dead','removed'].includes(entity?.state.status)||entity?.state.location_key!==presence.location_key
    ||!template||hash(template)!==v.template_hash)throw fail('veil_passive_live_target_scope');
  return formationScope({actor:v.actor,scene:scene.key,session:scene.session_id,encounter:encounter.id,binding:hash(binding),combatant,presence,entity,template});
}
function persistNativeFormationDefense(db,guild,request){
  const attack=request.data.breakdown.attack;if(!attack?.defense_passive)return;
  const prior=db.getCityRecord(guild,'npc_defense_passive_proof',attack.defense_passive.ref)?.data;
  if(prior?.version===2){persistNativeVeilExposureDefense(db,guild,request);return;}
  const target=db.listCombatants(attack.encounter_id).find(c=>c.id===attack.target_id),actual=target&&nativeFormationDefense(db,guild,target,request.data.input);
  if(!actual){const veil=target&&nativeVeilExposureDefense(db,guild,target,request.data.input);
    if(veil&&hash(veil.proof)===hash(attack.defense_passive)){persistNativeVeilExposureDefense(db,guild,request);return;}}
  if(!actual||hash(actual.proof)!==hash(attack.defense_passive)||attack.defense_aura||attack.difficulty!==target.difficulty+actual.detail.bonus)throw fail('formation_prepare_cas');
  const event=indexWorldEvent(db,guild,{key:`${actual.proof.ref}:source`,kind:'native_defense_passive',source_id:'native:feature-gate',
    title:'Native remaining-HP defensive Difficulty',session_id:request.data.session_id,scene:request.data.scene,visibility:'gm',
    details:{input_source:request.source_event,payload_hash:hash(actual.detail)}},'native:feature-gate');
  db.saveCityRecord(guild,{kind:'npc_defense_passive_proof',key:actual.proof.ref,status:'verified',source_event:event.event_key,visibility:'gm',data:actual.detail});
}
/** Historical read proof: later legitimate damage never retroactively lowers saved attack Difficulty. */
function inspectNativeFormationDefense(db,guild,request){
  const attack=request?.data.breakdown.attack,ref=attack?.defense_passive;if(!ref)return null;
  const record=db.getCityRecord(guild,'npc_defense_passive_proof',ref.ref),v=record?.data,event=record&&db.getWorldEvent(guild,record.source_event),
    feature=compileNativeFeatures().find(f=>f.feature_key===FORMATION),actor=compileNativeActors().find(a=>a.template_hash===v?.template_hash);
  if(v?.version===2)return inspectNativeVeilExposureDefense(db,guild,request);
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
function inspectNativeVeilExposureDefense(db,guild,request){
  const attack=request?.data.breakdown.attack,ref=attack?.defense_passive;if(!ref)return null;
  const record=db.getCityRecord(guild,'npc_defense_passive_proof',ref.ref),v=record?.data,event=record&&db.getWorldEvent(guild,record.source_event),
    feature=compileNativeFeatures().find(f=>f.feature_key===v?.feature),classified=compileNativeActors().find(a=>a.actor_kind==='adversary'&&a.template_hash===v?.template_hash),
    template=classified&&new EncounterLibrary('../content').findAdversary(classified.actor_name),
    actorSource=typeof v?.actor_source==='string'&&db.getWorldEvent(guild,v.actor_source),
    bindingSource=typeof v?.binding_source==='string'&&db.getWorldEvent(guild,v.binding_source);
  const expected=v?.feature==='adversary:veil-anchor-sentinel:plausible-denial'
    ?v.exposure<=2?1:0:v?.exposure<=2?2:v?.exposure>=5?-1:0;
  if(!v||v.version!==2||record.status!=='verified'||record.visibility!=='gm'||hash(v)!==ref.fingerprint||ref.ref!==`defense-passive:${hash(v)}`
    ||event?.status!=='active'||event.kind!=='native_defense_passive'||event.source_id!=='native:feature-gate'||event.visibility!=='gm'
    ||event.details.input_source!==request.source_event||event.details.payload_hash!==hash(v)||!feature||!VEIL_FEATURES.has(v.feature)
    ||v.feature_hash!==hash(feature)||feature.status!=='supported'||feature.native_handler!=='veil_exposure_difficulty'
    ||feature.type!=='Passive'||feature.actor_kind!=='adversary'||feature.template_hash!==v.template_hash
    ||classified?.actor_name!==feature.actor_name||!template||template.difficulty!==v.base_difficulty
    ||!Number.isSafeInteger(v.exposure)||v.exposure<0||v.exposure>6||v.bonus!==expected
    ||actorSource?.status!=='active'||bindingSource?.status!=='active'
    ||v.target!==attack.target_id||v.encounter!==attack.encounter_id||attack.base_difficulty!==v.base_difficulty
    ||attack.difficulty!==v.base_difficulty+v.bonus||attack.defense_aura||v.character!==request.subject_key
    ||v.declaration!==request.source_event||v.attack_source!==request.data.input.attack_source
    ||v.scene!==request.data.scene||v.session!==request.data.session_id)throw fail('veil_passive_saved_ancestry');
  return record;
}
/** Narrow post-dice reconciliation: only the saved passive odds survive later target HP changes. */
function reconcileNativeFormationBreakdown(db,guild,request,actual){
  const d=request.data,attack=d.breakdown.attack;
  if(!attack?.defense_passive||!d.roll_id||!d.result)return actual;
  const proof=inspectNativeFormationDefense(db,guild,request);
  if(proof.data.version===2&&d.tag)throw fail('veil_passive_collaboration_history_needs_mapping');
  if(proof.data.version===2&&nativeVeilExposureScope(db,guild,proof.data)!==proof.data.scope_snapshot)throw fail('veil_passive_live_scope_changed');
  if(hash(actual.attack)===hash(attack))return actual;
  if(proof.data.version===2){
    const saved=db.getSavedRoll(guild,d.roll_id);
    if(hash(request)!==hash(db.getCityRecord(guild,'roll_request',request.record_key))||saved?.roll_type!=='attack'
      ||saved.session_id!==d.session_id||saved.character_id!==request.subject_key||saved.discord_user_id!==d.owner_user_id
      ||saved.payload.request!==request.record_key||!['hope','fear','duality','total'].every(k=>Object.hasOwn(d.result,k))
      ||Object.keys(d.result).some(k=>hash(saved.payload[k])!==hash(d.result[k]))||!actual.attack)throw fail('veil_passive_saved_roll_scope');
    const baseline=value=>{const {difficulty,base_difficulty,defense_passive,...other}=value;return other;};
    if(hash(baseline(actual.attack))!==hash(baseline(attack))||actual.attack.defense_aura
      ||(actual.attack.base_difficulty??actual.attack.difficulty)!==attack.base_difficulty)throw fail('veil_passive_other_authority_changed');
    return {...actual,attack:structuredClone(attack)};
  }
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
function nativeDefenseAura(db,guild,target,input){
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
    target_snapshot:hash(recipient),base_difficulty:target.difficulty,bonus:planFeatureModifier(feature,{count:contributors.length}),contributors,
    declaration:input.source_event,attack_source:input.attack_source,character:input.character_id},ref=`defense-aura:${hash(detail)}`;
  return {detail,proof:{ref,fingerprint:hash(detail)}};
}
function persistNativeDefenseAura(db,guild,request){
  const attack=request.data.breakdown.attack;if(!attack?.defense_aura)return;
  const target=db.listCombatants(attack.encounter_id).find(c=>c.id===attack.target_id),actual=target&&nativeDefenseAura(db,guild,target,request.data.input);
  if(!actual||hash(actual.proof)!==hash(attack.defense_aura)||attack.difficulty!==target.difficulty+1)throw fail('local_mesh_prepare_cas');
  const event=indexWorldEvent(db,guild,{key:`${actual.proof.ref}:source`,kind:'native_defense_aura',source_id:'native:feature-gate',
    title:'Native defense Difficulty aura',session_id:request.data.session_id,scene:request.data.scene,visibility:'gm',
    details:{input_source:request.source_event,payload_hash:hash(actual.detail)}},'native:feature-gate');
  db.saveCityRecord(guild,{kind:'npc_defense_aura_proof',key:actual.proof.ref,status:'verified',source_event:event.event_key,visibility:'gm',data:actual.detail});
}
/** Saved defense proof, not current-position recalculation after a legitimate attack already resolved. */
function inspectNativeDefenseAura(db,guild,request){
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

return Object.freeze({nativeFormationDefense,nativeVeilExposureDefense,persistNativeVeilExposureDefense,persistNativeFormationDefense,inspectNativeFormationDefense,inspectNativeVeilExposureDefense,reconcileNativeFormationBreakdown,nativeDefenseAura,persistNativeDefenseAura,inspectNativeDefenseAura});
}
