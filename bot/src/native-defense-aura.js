/** Source-pinned Local Mesh defense, not attack/reaction bonuses or a powered-destination grant. */
import {compileNativeFeatures,compileNativeActors,nativeSignalFeatureTarget} from './native-feature-catalog.js';
import {nativeEncounterActor,nativeNpcAlliance,inspectNativeNpcAllianceReceipt} from './native-encounter-relations.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {sceneAccess} from './scene-continuity.js';
import {nativeHouseErratum} from './native-house-errata.js';
import {indexWorldEvent} from './city-calendar.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';

const FEATURE='adversary:choir-relay:local-mesh';
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
