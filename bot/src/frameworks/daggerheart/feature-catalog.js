/** Native descriptor, handler/source and taxonomy rules. Read-only production source callbacks never grant execution, consent or disclosure. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeArbitrationFailure as fail} from './native-failure.js';
import {featureRuntimeCapability} from './feature-capability-rules.js';
export function createNativeFeatureCatalog({definitions,authoredRules,readAdversaries,readEnvironments}){
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/gu,'-').replace(/^-|-$/gu,'');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
freeze(definitions);
freeze(authoredRules);
// Populated only when a handler's real native path has passed its phase qualification.
// planned_handler in the inventory is documentation, never dispatch authority.
const handlers=Object.freeze({native_token_gain:true,blood_rush_hold_position:true,pack_pressure:true,feedback:true,first_severe_to_major:true,many_deaths_fear_opportunity:true,horde_marked_half_damage:true,local_mesh_allied_zone:true,coordinated_volley:true,flashbang_owner_choice:true,all_lanes_stop_group:true,regent_owner_resource_choice:true,stack_formation_remaining_hp:true,veil_exposure_difficulty:true,sentence_native_vulnerable_damage:true,first_pc_stress_clear:true,sirens_outside:true,upload_countdown:true,nightclub_auditory_disadvantage:true,environment_emergency_cascade:true,environment_code_blue:true,nightclub_vip_threshold:true,environment_mundane_correction:true,nightclub_inconsistent_witnesses:true,environment_maintenance_memory:true,shrine_local_memory_advantage:true,environment_door_chain:true,environment_imaging_record:true,environment_patient_procedure_context:true,environment_thin_walls_context:true,environment_chain_of_title_context:true,environment_no_consensus_context:true,environment_metaphor_physics_context:true,environment_no_ordinary_signal_context:true,environment_consensus_engine_context:true,environment_guest_right_context:true,environment_private_room_context:true,environment_price_offer_context:true,environment_auction_context:true,environment_model_room_context:true,environment_containment_shutters_context:true,environment_sealed_docket_context:true,environment_three_vectors_context:true,environment_market_neutrality_context:true,environment_contaminated_scene_context:true,environment_everyone_is_watching_context:true,environment_wrong_offering_context:true,environment_last_train_rules_context:true,environment_express_through_memory_context:true,environment_third_rail_spirit_context:true,adversary_break_the_hold_context:true,adversary_professional_entry_context:true,adversary_mark_the_variable_context:true,adversary_readout_context:true,adversary_ride_the_current_context:true,adversary_peripheral_context:true,adversary_steal_the_focus_context:true,adversary_sympathetic_relay_context:true,adversary_snatch_a_link_context:true,adversary_flow_around_it_context:true,adversary_drag_down_context:true,adversary_blank_spot_context:true,adversary_route_around_context:true,adversary_terms_first_context:true,adversary_pin_to_the_deal_context:true,adversary_i_saw_that_context:true,adversary_self_fulfilling_event_context:true,adversary_always_a_price_context:true,adversary_bad_future_context:true,adversary_exit_clause_context:true,adversary_predatory_grace_context:true,adversary_reputation_attack_context:true,adversary_call_security_context:true,adversary_urban_cover_context:true,adversary_root_snare_context:true,adversary_clause_eater_loophole_context:true,adversary_clause_eater_conflicting_duty_context:true,intrusion_trace_owner_payment:true});

function verifyFeatureDescriptor(row,actor,kind){
  if(!row||!actor||!Array.isArray(actor.features)||typeof actor.features[row.index]!=='string')throw fail('feature_source_shape');
  if(!row||row.source_hash!==hash(actor.features[row.index])||row.template_hash!==hash(actor)
    ||row.feature_key!==`${kind}:${slug(actor.name)}:${slug(row.name)}`)throw fail('feature_source_hash_changed');
  if(row.status==='supported'&&(!row.native_handler||!Object.hasOwn(handlers,row.native_handler)))throw fail('feature_handler_unqualified');
  if(row.authored_rule){
    const ref=row.authored_rule,rule=authoredRules.entries.find(r=>r.id===ref.id&&r.version===ref.version),
      source=rule?.sources?.find(s=>s.kind==='feature'&&s.key===row.feature_key);
    if(Object.keys(ref).sort().join()!=='hash,id,version'||ref.id!=='HR13'||ref.version!==1
      ||rule?.authority_ref!=='owner:break-the-pattern:v1'||hash(rule)!==ref.hash
      ||source?.source_hash!==row.source_hash||source.template_hash!==row.template_hash
      ||rule.interpretation.type!==row.type||rule.interpretation.trigger!==row.trigger_kind
      ||row.status!=='review_only'||rule.status!=='review_only'||rule.native_handler!==null||row.native_handler!==null)
      throw fail('feature_authored_rule_source_changed');
  }

  return row;
}

/** Occurrence-local inspection; one stale source cannot disable independent exact sources. */
function inspectNativeFeatureOccurrence(key,{adversaries=readAdversaries(),
  environments=readEnvironments()}={}){
  const feature=typeof key==='string'&&definitions.features.find(row=>row.feature_key===key);
  if(!feature)return freeze({status:'unknown',feature:null,reason:'unregistered_feature'});
  const actors=feature.actor_kind==='adversary'?adversaries:environments;
  const matches=Array.isArray(actors)?actors.filter(actor=>actor?.name===feature.actor_name):[];
  if(matches.length!==1)return freeze({status:'held_source',feature,reason:'missing_or_ambiguous_actor_source'});
  try{verifyFeatureDescriptor(feature,matches[0],feature.actor_kind);}
  catch(error){if(error.code!=='GM_ARBITRATION')throw error;return freeze({status:'held_source',feature,reason:error.message});}
  return freeze({status:'verified_source',feature,printed_rule:matches[0].features[feature.index],execution_authorized:false});
}

function compileNativeFeatures({adversaries=readAdversaries(),
  environments=readEnvironments()}={}){
  const rows=[];
  for(const [kind,actors] of [['adversary',adversaries],['environment',environments]]){
    if(!Array.isArray(actors))throw fail('feature_source_shape');
    for(const actor of actors){
      if(!Array.isArray(actor.features))throw fail('feature_source_shape');
      actor.features.forEach((text,index)=>{
        const row=definitions.features.find(r=>r.actor_kind===kind&&r.actor_name===actor.name&&r.index===index);
        verifyFeatureDescriptor(row,actor,kind);
        rows.push(row);
      });
    }
  }
  if(rows.length!==definitions.features.length||new Set(rows.map(r=>r.feature_key)).size!==rows.length)throw fail('feature_source_inventory_changed');
  return Object.freeze(rows);
}

/** String IDs select only code-owned definitions. Caller objects/role/status never grant execution. */
function featureDisposition(key,sources){
  const inspected=inspectNativeFeatureOccurrence(key,sources),row=inspected.feature;
  if(inspected.status==='held_source')return Object.freeze({status:'needs_rules_review',reason:inspected.reason,feature:row});
  if(!row)return Object.freeze({status:'needs_rules_review',reason:'Unregistered feature; no native handler or execution authority.',feature:null});
  if(row.status!=='supported')return Object.freeze({status:'needs_rules_review',reason:`${featureRuntimeCapability(row).missing.join('; ')} No qualified native handler; no cost, roll or effect.`,feature:row});
  return Object.freeze({status:'supported',reason:'Qualified descriptor only; current native trigger, actor, costs and targets still required.',feature:row});
}

/** Executable discovery only. Review/source inventories must never become Director capabilities. */
function executableNativeFeatures(kind,sources){
  if(kind!==undefined&&!['adversary','environment'].includes(kind))return Object.freeze([]);
  const current=sources||{adversaries:readAdversaries(),environments:readEnvironments()};
  return Object.freeze(definitions.features.filter(row=>row.status==='supported'
    &&inspectNativeFeatureOccurrence(row.feature_key,current).status==='verified_source'
    &&Object.hasOwn(handlers,row.native_handler)&&(!kind||row.actor_kind===kind)));
}

/** Exact printed rules for GM planning/review only. Never mutate descriptors or mint execution authority. */
function compileNativeFeatureRuleContexts({adversaries=readAdversaries(),
  environments=readEnvironments()}={}){
  const features=compileNativeFeatures({adversaries,environments}),actors=new Map();
  for(const [kind,rows] of [['adversary',adversaries],['environment',environments]])
    for(const actor of rows)actors.set(`${kind}:${actor.name}`,actor);
  return freeze(features.map(feature=>({version:1,feature:feature.feature_key,source_ref:feature.source_ref,
    source_hash:feature.source_hash,template_hash:feature.template_hash,index:feature.index,
    printed_rule:actors.get(`${feature.actor_kind}:${feature.actor_name}`).features[feature.index],
    catalog_status:feature.status,native_handler:feature.native_handler,capability:featureRuntimeCapability(feature),
    authority:'Printed source context only; native trigger, owner choices, effects and publication require their own verified adapters.',
    execution_authorized:false})));
}
function nativeFeatureRuleContext(key){
  const inspected=inspectNativeFeatureOccurrence(key);
  if(inspected.status!=='verified_source')return null;
  const feature=inspected.feature;
  return freeze({version:1,feature:feature.feature_key,source_ref:feature.source_ref,source_hash:feature.source_hash,template_hash:feature.template_hash,index:feature.index,
    printed_rule:inspected.printed_rule,catalog_status:feature.status,native_handler:feature.native_handler,capability:featureRuntimeCapability(feature),
    authority:'Printed source context only; native trigger, owner choices, effects and publication require their own verified adapters.',execution_authorized:false});
}

/** Current-template GM-private source only. Review-only rules inform fiction, never native dispatch. */
function nativeFeatureRuleContextsForTemplate(kind,template,{adversaries=readAdversaries(),
  environments=readEnvironments()}={}){
  if(!['adversary','environment'].includes(kind)||!template||typeof template!=='object'||Array.isArray(template))return Object.freeze([]);
  const actors=kind==='adversary'?adversaries:environments;
  if(!Array.isArray(actors))return Object.freeze([]);
  const matches=actors.filter(actor=>actor?.name===template.name&&hash(actor)===hash(template));
  if(matches.length!==1)return Object.freeze([]);
  const actor=matches[0],templateHash=hash(actor),rows=definitions.features
    .filter(feature=>feature.actor_kind===kind&&feature.actor_name===actor.name&&feature.template_hash===templateHash)
    .flatMap(feature=>{
      const inspected=inspectNativeFeatureOccurrence(feature.feature_key,{adversaries,environments});
      if(inspected.status!=='verified_source')return [];
      const printed_rule=actor.features[feature.index];
      const rules=authoredRules.entries.filter(rule=>rule.sources.some(source=>source.kind==='feature'&&source.key===feature.feature_key));
      // A changed linked ruling holds only this occurrence, not independent source rules.
      if(rules.some(rule=>rule.sources.some(source=>source.kind==='feature'&&source.key===feature.feature_key
        &&(source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash))))return [];
      return [{version:1,feature:feature.feature_key,source_ref:feature.source_ref,source_hash:feature.source_hash,
        template_hash:feature.template_hash,feature_hash:hash(feature),index:feature.index,printed_rule,
        catalog_status:feature.status,native_handler:feature.native_handler,capability:featureRuntimeCapability(feature),visibility:'gm',
        trigger_kind:feature.trigger_kind,target_policy:feature.target_policy,roll_protocol:feature.roll_protocol,costs:feature.costs,
        house_rules:rules.map(rule=>({id:rule.id,version:rule.version,hash:hash(rule),status:rule.status,
          interpretation:structuredClone(rule.interpretation),limitations:structuredClone(rule.limitations||[])})),
        precedence:'Exact printed rule plus the native operation\'s explicit versioned owner ruling. Historical versions remain pinned; the highest version is not automatic execution authority.',
        authority:'GM-private source rule context only; native trigger, costs, owner choices, effects and publication require their own validators.',
        execution_authorized:false,publication_authorized:false}];
    });
  return freeze(rows);
}

/** Native profile hashes select current templates; this read grants no actor or audience authority. */
function nativeFeatureRuleContextsForTemplateHash(kind,templateHash){
  if(!['adversary','environment'].includes(kind)||typeof templateHash!=='string')return freeze([]);
  const actors=kind==='adversary'?readAdversaries():readEnvironments(),matches=actors.filter(actor=>hash(actor)===templateHash);
  if(matches.length!==1)return freeze([]);
  return nativeFeatureRuleContextsForTemplate(kind,matches[0],kind==='adversary'?{adversaries:actors}:{environments:actors});
}

/** Owner taxonomy is additive: existing closed feature descriptors and their saved hashes do not change. */
function compileNativeActors({adversaries=readAdversaries(),
  environments=readEnvironments()}={}){
  // Discovery is source-local. The strict full inventory audit remains compileNativeFeatures.
  // Classify the pinned definitions first, then omit an entire stale/ambiguous template.
  const features=definitions.features,taxonomy=definitions.actor_taxonomy,
    rows=[...new Map(features.map(f=>[`${f.actor_kind}:${f.actor_name}`,{
      version:1,actor_kind:f.actor_kind,actor_key:`${f.actor_kind}:${slug(f.actor_name)}`,actor_name:f.actor_name,
      template_hash:f.template_hash,source_ref:f.source_ref.split('/features/')[0],signal_based:false,taxonomy_ruling:null
    }])).values()];
  if(taxonomy?.version!==1||taxonomy.ruling_ref!=='owner:signal-taxonomy:v1'||!Array.isArray(taxonomy.signal_based)
    ||taxonomy.signal_based.length!==8||new Set(taxonomy.signal_based.map(a=>a.template_hash)).size!==8)throw fail('actor_taxonomy_source_inventory');
  for(const classification of taxonomy.signal_based){
    if(Object.keys(classification).sort().join()!=='actor_name,signal_based,template_hash'||classification.signal_based!==true)
      throw fail('actor_taxonomy_source_shape');
    // Hash selects the immutable template. The exact name is an integrity cross-check, never a semantic gate.
    const actor=rows.find(a=>a.actor_kind==='adversary'&&a.template_hash===classification.template_hash);
    if(!actor||actor.actor_name!==classification.actor_name)throw fail('actor_taxonomy_source_hash_changed');
    actor.signal_based=true;actor.taxonomy_ruling=taxonomy.ruling_ref;
  }
  return freeze(rows.filter(actor=>{
    const expected=features.filter(f=>f.actor_kind===actor.actor_kind&&f.template_hash===actor.template_hash),
      sources=actor.actor_kind==='adversary'?adversaries:environments;
    if(!Array.isArray(sources))return false;
    const matches=sources.filter(source=>source?.name===actor.actor_name&&hash(source)===actor.template_hash);
    return matches.length===1&&matches[0].features?.length===expected.length
      &&expected.every(feature=>inspectNativeFeatureOccurrence(feature.feature_key,{adversaries,environments}).status==='verified_source');
  }));
}

/** Read-only classification of an exact trusted template; this grants no alliance, move, cost or effect capability. */
function nativeActorTaxonomy(kind,template){
  if(!['adversary','environment'].includes(kind)||!template||typeof template!=='object'||Array.isArray(template))throw fail('actor_template_source_shape');
  const fingerprint=hash(template),actor=compileNativeActors().find(a=>a.actor_kind===kind&&a.template_hash===fingerprint);
  if(!actor)throw fail('actor_template_source_changed');
  return actor;
}

/** Shared necessary-only taxonomy gate. Callers must separately prove live actors, alliance, timing and host legality. */
function nativeSignalFeatureTarget(featureKey,template){
  if(!['adversary:choir-relay:local-mesh','adversary:choir-relay:route-around'].includes(featureKey))throw fail('signal_feature_source');
  const inspected=inspectNativeFeatureOccurrence(featureKey),feature=inspected.feature,actor=nativeActorTaxonomy('adversary',template);
  if(inspected.status!=='verified_source')throw fail('signal_feature_source');
  return freeze({feature_key:featureKey,feature_hash:hash(feature),target:actor});
}

  return Object.freeze({inspectNativeFeatureOccurrence,compileNativeFeatures,featureDisposition,executableNativeFeatures,compileNativeFeatureRuleContexts,nativeFeatureRuleContext,nativeFeatureRuleContextsForTemplate,nativeFeatureRuleContextsForTemplateHash,compileNativeActors,nativeActorTaxonomy,nativeSignalFeatureTarget});
}
