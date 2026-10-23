/** Existing source-pinned damage passives; this module cannot create attacks or native outcomes. */
import {adversaryHpState} from './combat.js';
import {diceSpec} from './dice.js';

export function createNativeStandardDamage({compileNativeFeatures,hash,nativeHouseErratum,fail}){
  if(typeof compileNativeFeatures!=='function'||typeof hash!=='function'||typeof nativeHouseErratum!=='function'||typeof fail!=='function')
    throw new TypeError('Standard damage passives require current native source and failure capabilities.');

  function nativeDamageBonusExpression(damage,bonus){
    const {count,sides,mod}=diceSpec(damage);
    if(!Number.isSafeInteger(bonus)||bonus<0||bonus>2)throw fail('native_damage_fixed_bonus');
    const total=mod+bonus;return bonus===0?damage:`${count}d${sides}${total>=0?'+':''}${total}`;
  }

  function nativeStandardDamage({template,combatant,damage,actor=null,target=null,conditions=[]}){
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
    if(erratum?.status!=='supported')return null;
    if(combatant.hp_max!==template.hp||erratum?.interpretation.Horde_threshold!=='marked_hp_at_least_ceiling_half_max')
      throw fail('horde_native_hp_and_erratum');
    const expression=hp.marked_half_or_more?'3d8+8':damage;
    return {feature:feature.feature_key,feature_hash:hash(feature),template_hash:feature.template_hash,erratum:'HR11',erratum_version:1,
      erratum_hash:hash(erratum),combatant:combatant.id,hp,original_damage:damage,expression};
  }

  return Object.freeze({nativeDamageBonusExpression,nativeStandardDamage});
}
