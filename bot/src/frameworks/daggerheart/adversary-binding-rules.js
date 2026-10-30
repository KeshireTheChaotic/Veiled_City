/** Exact current native adversary source/template/control binding; never execution or disclosure authority. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeArbitrationFailure as fail} from './native-failure.js';
import {projectFeatureRuleContexts} from './feature-context-projection.js';
export function createAdversaryBindingRules({capabilities}){
const {nativeEncounterActor,nativeActorControl,inspectArbitrationOrigin,executableNativeFeatures,featureDisposition,nativeFeatureRuleContext,nativeFeatureRuleContextsForTemplate}=capabilities||{};
if([nativeEncounterActor,nativeActorControl,inspectArbitrationOrigin,executableNativeFeatures,featureDisposition,nativeFeatureRuleContext,nativeFeatureRuleContextsForTemplate].some(fn=>typeof fn!=='function'))throw new TypeError('Complete native adversary binding capabilities required.');


/** A template/display name does not bind a person to an adversary or make its features available. */
function nativeAdversaryFeatureContext(db,guild,origin,actor,{library}={}){
  if(typeof actor!=='string'||!actor||actor.length>160)throw fail('adversary_exact_native_actor_required');
  const o=inspectArbitrationOrigin(db,guild,origin),control=nativeActorControl(db,guild,'npc',actor),
    bound=nativeEncounterActor(db,guild,actor,{library});
  if(control.owner_control_type!=='ai_world'||!o.eligible.some(n=>n.key===actor)||bound.scene!==o.binding.scene
    ||bound.session!==o.binding.session||bound.presence.location_key!==o.binding.location)
    throw fail('adversary_current_gm_owned_local_source_required');
  const templateHash=hash(bound.template),features=executableNativeFeatures('adversary').filter(f=>f.template_hash===templateHash),
    authoredFeatureRules=nativeFeatureRuleContextsForTemplate('adversary',bound.template),
    terms={version:1,actor,combatant:bound.combatant.id,encounter:bound.encounter,session:bound.session,scene:bound.scene,
      location:bound.presence.location_key,template_hash:templateHash,actor_snapshot:hash(bound),control_revision:control.revision,
      source:o.binding.source,source_hash:o.binding.source_hash,scope:structuredClone(o.scope),authored_feature_rules:authoredFeatureRules,
      features:features.map(f=>({key:f.feature_key,hash:hash(f)}))};
  return Object.freeze({...terms,feature_rule_contexts:projectFeatureRuleContexts(terms,authoredFeatureRules),
    revision:hash(terms),execution_authorized:false,publication_authorized:false});
}

/** Current-use proof only. Saved native outcomes keep their existing historical receipt readers. */
function inspectNativeAdversaryFeatureContext(db,guild,origin,proof,options){
  if(!proof||typeof proof!=='object')throw fail('adversary_current_native_context_required');
  const current=nativeAdversaryFeatureContext(db,guild,origin,proof.actor,options);
  if(hash(current)!==hash(proof))throw fail('adversary_source_control_template_or_scene_changed');
  return current;
}

/** Necessary precondition for a NEW feature execution; no costs, targets, dice or effects are granted. */
function requireNativeAdversaryFeature(db,guild,origin,actor,key,options){
  const disposition=featureDisposition(key);
  if(disposition.status!=='supported'||disposition.feature.actor_kind!=='adversary')
    throw fail('adversary_feature_has_no_qualified_native_handler');
  const context=nativeAdversaryFeatureContext(db,guild,origin,actor,options),feature=disposition.feature;
  if(!context.features.some(f=>f.key===key&&f.hash===hash(feature)))throw fail('adversary_feature_exact_bound_template_required');
  return {context,feature};
}

return Object.freeze({nativeAdversaryFeatureContext,inspectNativeAdversaryFeatureContext,requireNativeAdversaryFeature});
}
