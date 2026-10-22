/** Bound existing adversary provenance, never NPC creation, statistics, knowledge or execution permission. */
import {nativeEncounterActor} from './native-encounter-relations.js';
import {nativeActorControl} from './native-actor-control.js';
import {inspectArbitrationOrigin} from './scene-intent-board.js';
import {executableNativeFeatures,featureDisposition,nativeFeatureRuleContextsForTemplate} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {projectNativeAdversaryBreakTheHoldContext} from './native-adversary-break-the-hold.js';
import {projectNativeAdversaryProfessionalEntryContext} from './native-adversary-professional-entry.js';
import {projectNativeAdversaryMarkTheVariableContext} from './native-adversary-mark-the-variable.js';
import {projectNativeAdversaryReadoutContext} from './native-adversary-readout.js';
import {projectNativeAdversaryRideTheCurrentContext} from './native-adversary-ride-the-current.js';
import {projectNativeAdversaryPeripheralContext} from './native-adversary-peripheral.js';
import {projectNativeAdversaryStealTheFocusContext} from './native-adversary-steal-the-focus.js';
import {projectNativeAdversarySympatheticRelayContext} from './native-adversary-sympathetic-relay.js';
import {projectNativeAdversarySnatchALinkContext} from './native-adversary-snatch-a-link.js';
import {projectNativeAdversaryFlowAroundItContext} from './native-adversary-flow-around-it.js';
import {projectNativeAdversaryDragDownContext} from './native-adversary-drag-down.js';
import {projectNativeAdversaryBlankSpotContext} from './native-adversary-blank-spot.js';
import {projectNativeAdversaryRouteAroundContext} from './native-adversary-route-around.js';
import {projectNativeAdversaryTermsFirstContext} from './native-adversary-terms-first.js';
import {projectNativeAdversaryPinToTheDealContext} from './native-adversary-pin-to-the-deal.js';
import {projectNativeAdversaryISawThatContext} from './native-adversary-i-saw-that.js';
import {projectNativeAdversarySelfFulfillingEventContext} from './native-adversary-self-fulfilling-event.js';
import {projectNativeAdversaryAlwaysAPriceContext} from './native-adversary-always-a-price.js';
import {projectNativeAdversaryBadFutureContext} from './native-adversary-bad-future.js';
import {projectNativeAdversaryExitClauseContext} from './native-adversary-exit-clause.js';
import {projectNativeAdversaryPredatoryGraceContext} from './native-adversary-predatory-grace.js';
import {projectNativeAdversaryReputationAttackContext} from './native-adversary-reputation-attack.js';
import {projectNativeAdversaryCallSecurityContext} from './native-adversary-call-security.js';
import {projectNativeAdversaryUrbanCoverContext} from './native-adversary-urban-cover.js';
import {projectNativeAdversaryRootSnareContext} from './native-adversary-root-snare.js';
import {projectNativeAdversaryLoopholeContext} from './native-adversary-loophole.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';

/** A template/display name does not bind a person to an adversary or make its features available. */
export function nativeAdversaryFeatureContext(db,guild,origin,actor,{library}={}){
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
  return Object.freeze({...terms,feature_rule_contexts:[...projectNativeAdversaryBreakTheHoldContext(terms),
      ...projectNativeAdversaryProfessionalEntryContext(terms),...projectNativeAdversaryMarkTheVariableContext(terms),
      ...projectNativeAdversaryReadoutContext(terms),...projectNativeAdversaryRideTheCurrentContext(terms),
      ...projectNativeAdversaryPeripheralContext(terms),...projectNativeAdversaryStealTheFocusContext(terms),
      ...projectNativeAdversarySympatheticRelayContext(terms),...projectNativeAdversarySnatchALinkContext(terms),
      ...projectNativeAdversaryFlowAroundItContext(terms),...projectNativeAdversaryDragDownContext(terms),
      ...projectNativeAdversaryBlankSpotContext(terms),...projectNativeAdversaryRouteAroundContext(terms),
      ...projectNativeAdversaryTermsFirstContext(terms),...projectNativeAdversaryPinToTheDealContext(terms),
      ...projectNativeAdversaryISawThatContext(terms),...projectNativeAdversarySelfFulfillingEventContext(terms),
      ...projectNativeAdversaryAlwaysAPriceContext(terms),...projectNativeAdversaryBadFutureContext(terms),
      ...projectNativeAdversaryExitClauseContext(terms),...projectNativeAdversaryPredatoryGraceContext(terms),
      ...projectNativeAdversaryReputationAttackContext(terms),...projectNativeAdversaryCallSecurityContext(terms),
      ...projectNativeAdversaryUrbanCoverContext(terms),...projectNativeAdversaryRootSnareContext(terms),...projectNativeAdversaryLoopholeContext(terms)],
    revision:hash(terms),execution_authorized:false,publication_authorized:false});
}

/** Current-use proof only. Saved native outcomes keep their existing historical receipt readers. */
export function inspectNativeAdversaryFeatureContext(db,guild,origin,proof,options){
  if(!proof||typeof proof!=='object')throw fail('adversary_current_native_context_required');
  const current=nativeAdversaryFeatureContext(db,guild,origin,proof.actor,options);
  if(hash(current)!==hash(proof))throw fail('adversary_source_control_template_or_scene_changed');
  return current;
}

/** Necessary precondition for a NEW feature execution; no costs, targets, dice or effects are granted. */
export function requireNativeAdversaryFeature(db,guild,origin,actor,key,options){
  const disposition=featureDisposition(key);
  if(disposition.status!=='supported'||disposition.feature.actor_kind!=='adversary')
    throw fail('adversary_feature_has_no_qualified_native_handler');
  const context=nativeAdversaryFeatureContext(db,guild,origin,actor,options),feature=disposition.feature;
  if(!context.features.some(f=>f.key===key&&f.hash===hash(feature)))throw fail('adversary_feature_exact_bound_template_required');
  return {context,feature};
}
