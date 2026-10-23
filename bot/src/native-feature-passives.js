/** Reviewed passive modifiers from native encounter/presence, never model numeric proposals. */
import {compileNativeFeatures} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {scenePresence,sceneAccess} from './scene-continuity.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {adversaryHpState} from './frameworks/daggerheart/public.js';
import {nativeHouseErratum} from './native-house-errata.js';
import {diceSpec} from './frameworks/daggerheart/public.js';
import {activeCityProxy} from './city-constraints.js';

/** Pure expression arithmetic; it grants no feature, condition, roll or attack authority. */
export function nativeDamageBonusExpression(damage,bonus){
  const {count,sides,mod}=diceSpec(damage);
  if(!Number.isSafeInteger(bonus)||bonus<0||bonus>2)throw fail('native_damage_fixed_bonus');
  const total=mod+bonus;return bonus===0?damage:`${count}d${sides}${total>=0?'+':''}${total}`;
}

/** Exact source-pinned standard damage replacement; not a new attack or mutable stat block. */
export function nativeStandardDamage({template,combatant,damage,actor=null,target=null,conditions=[]}){
  const features=compileNativeFeatures(),sentence=features.find(f=>f.native_handler==='sentence_native_vulnerable_damage'&&f.template_hash===hash(template));
  if(sentence){
    if(!actor||!target||!Array.isArray(conditions)||conditions.some(c=>c.condition!=='Vulnerable'))throw fail('sentence_native_target_condition');
    const bonus=conditions.length?2:0;
    return {version:2,feature:sentence.feature_key,feature_hash:hash(sentence),template_hash:sentence.template_hash,source_hash:sentence.source_hash,
      combatant:combatant.id,actor,target,conditions:structuredClone(conditions),bonus,original_damage:damage,expression:nativeDamageBonusExpression(damage,bonus)};
  }
  const feature=features.find(f=>f.native_handler==='horde_marked_half_damage'&&f.template_hash===hash(template));
  if(!feature)return null;
  const hp=adversaryHpState(combatant),erratum=nativeHouseErratum('HR11');
  if(combatant.hp_max!==template.hp||erratum?.interpretation.Horde_threshold!=='marked_hp_at_least_ceiling_half_max')
    throw fail('horde_native_hp_and_erratum');
  const expression=hp.marked_half_or_more?'3d8+8':damage;
  return {feature:feature.feature_key,feature_hash:hash(feature),template_hash:feature.template_hash,erratum:'HR11',erratum_version:1,
    erratum_hash:hash(erratum),combatant:combatant.id,hp,original_damage:damage,expression};
}

export function nativeAttackPassives(db,guild,{npc,combatant,character,encounter,binding,template,library}){
  const feature=compileNativeFeatures().find(f=>f.actor_name===template.name&&f.native_handler==='pack_pressure');
  if(!feature)return [];
  if(hash(template)!==feature.template_hash)throw fail('passive_template_source_changed');
  const target=scenePresence(db,guild,'character',character),allies=[];
  for(const b of binding.data.combatants){
    if(b.actor===npc||b.id===combatant.id)continue;
    const ally=db.listCombatants(encounter.id).find(c=>c.id===b.id),presence=scenePresence(db,guild,'npc',b.actor),entity=db.getSimulationEntity(guild,'npc',b.actor);
    if(ally?.base_name!==template.name||ally.status!=='active'||ally.hp_current<1||activeCityProxy(db,guild,b.actor)
      ||hash(library.findAdversary(ally.base_name))!==feature.template_hash
      ||presence?.data.state!=='actually_present'||db.getWorldEvent(guild,presence.source_event)?.status!=='active'
      ||presence.location_key!==target.location_key||entity?.state.location_key!==target.location_key||entity.state.removed||['dead','removed'].includes(entity.state.status)
      ||presence.data.zone!==target.data.zone||!sceneAccess(db,guild,{observer_type:'npc',observer_key:b.actor,target_type:'character',target_key:character,sense:'sight'}))continue;
    // Same native zone proves Melee, a conservative subset of Very Close. No guessed pairwise range.
    allies.push({actor:b.actor,combatant:b.id,state_hash:hash(ally),presence_hash:hash(presence),entity_hash:hash(entity),range:'Melee'});
  }
  allies.sort((a,b)=>a.actor.localeCompare(b.actor));
  return [{feature:feature.feature_key,feature_hash:hash(feature),template_hash:feature.template_hash,source_hash:feature.source_hash,
    actor:npc,target:character,modifier:Math.min(2,allies.length),allies}];
}
