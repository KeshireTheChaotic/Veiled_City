/** Exact source-qualified native adversary passive; no model modifier, new PC action or dice. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeArbitrationFailure as fail} from './native-failure.js';
import {createNativeStandardDamage} from './standard-damage-passives.js';
import {planFeatureModifier} from './feature-operation-descriptors.js';
export function createAdversaryAttackPassiveRules({capabilities}){
const {compileNativeFeatures,scenePresence,sceneAccess,nativeHouseErratum,activeCityProxy}=capabilities||{};
if([compileNativeFeatures,scenePresence,sceneAccess,nativeHouseErratum,activeCityProxy].some(fn=>typeof fn!=='function'))throw new TypeError('Complete native passive capabilities required.');
const nativeDamage=createNativeStandardDamage({compileNativeFeatures:(...args)=>compileNativeFeatures(...args),hash:value=>hash(value),
  nativeHouseErratum:(...args)=>nativeHouseErratum(...args),fail});
const {nativeDamageBonusExpression,nativeStandardDamage}=nativeDamage;

function nativeAttackPassives(db,guild,{npc,combatant,character,encounter,binding,template,library}){
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
    actor:npc,target:character,modifier:planFeatureModifier(feature,{count:allies.length}),allies}];
}

return Object.freeze({nativeDamageBonusExpression,nativeStandardDamage,nativeAttackPassives});
}
