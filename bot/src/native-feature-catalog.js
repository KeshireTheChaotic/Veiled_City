/** Code-owned content inventory. A descriptor is not a trigger, capability or effect receipt. */
import fs from 'node:fs';
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';

const read=relative=>JSON.parse(fs.readFileSync(new URL(relative,import.meta.url),'utf8'));
const definitions=read('./native-feature-definitions.json');
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/gu,'-').replace(/^-|-$/gu,'');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
freeze(definitions);
// Populated only when a handler's real native path has passed its phase qualification.
// planned_handler in the inventory is documentation, never dispatch authority.
const handlers=Object.freeze({blood_rush_hold_position:true,pack_pressure:true,feedback:true,first_severe_to_major:true,many_deaths_fear_opportunity:true,horde_marked_half_damage:true,local_mesh_allied_zone:true,coordinated_volley:true,flashbang_owner_choice:true,all_lanes_stop_group:true,regent_owner_resource_choice:true,stack_formation_remaining_hp:true,veil_exposure_difficulty:true,sentence_native_vulnerable_damage:true,first_pc_stress_clear:true});

export function compileNativeFeatures({adversaries=read('../../content/GM_PRIVATE/ADVERSARIES/adversaries.json'),
  environments=read('../../content/GM_PRIVATE/ENVIRONMENTS/environments.json')}={}){
  const rows=[];
  for(const [kind,actors] of [['adversary',adversaries],['environment',environments]]){
    if(!Array.isArray(actors))throw fail('feature_source_shape');
    for(const actor of actors){
      if(!Array.isArray(actor.features))throw fail('feature_source_shape');
      actor.features.forEach((text,index)=>{
        const row=definitions.features.find(r=>r.actor_kind===kind&&r.actor_name===actor.name&&r.index===index);
        if(!row||row.source_hash!==hash(text)||row.template_hash!==hash(actor)
          ||row.feature_key!==`${kind}:${slug(actor.name)}:${slug(row.name)}`)throw fail('feature_source_hash_changed');
        if(row.status==='supported'&&(!row.native_handler||!Object.hasOwn(handlers,row.native_handler)))throw fail('feature_handler_unqualified');
        rows.push(row);
      });
    }
  }
  if(rows.length!==definitions.features.length||new Set(rows.map(r=>r.feature_key)).size!==rows.length)throw fail('feature_source_inventory_changed');
  return Object.freeze(rows);
}

/** String IDs select only code-owned definitions. Caller objects/role/status never grant execution. */
export function featureDisposition(key){
  const row=typeof key==='string'&&compileNativeFeatures().find(r=>r.feature_key===key);
  if(!row)return Object.freeze({status:'needs_rules_review',reason:'Unregistered feature; no native handler or execution authority.',feature:null});
  if(row.status!=='supported')return Object.freeze({status:'needs_rules_review',reason:`${row.reason} No qualified native handler; no cost, roll or effect.`,feature:row});
  return Object.freeze({status:'supported',reason:'Qualified descriptor only; current native trigger, actor, costs and targets still required.',feature:row});
}

/** Owner taxonomy is additive: existing closed feature descriptors and their saved hashes do not change. */
export function compileNativeActors({adversaries=read('../../content/GM_PRIVATE/ADVERSARIES/adversaries.json'),
  environments=read('../../content/GM_PRIVATE/ENVIRONMENTS/environments.json')}={}){
  const features=compileNativeFeatures({adversaries,environments}),taxonomy=definitions.actor_taxonomy,
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
  return freeze(rows);
}

/** Read-only classification of an exact trusted template; this grants no alliance, move, cost or effect capability. */
export function nativeActorTaxonomy(kind,template){
  if(!['adversary','environment'].includes(kind)||!template||typeof template!=='object'||Array.isArray(template))throw fail('actor_template_source_shape');
  const fingerprint=hash(template),actor=compileNativeActors().find(a=>a.actor_kind===kind&&a.template_hash===fingerprint);
  if(!actor)throw fail('actor_template_source_changed');
  return actor;
}

/** Shared necessary-only taxonomy gate. Callers must separately prove live actors, alliance, timing and host legality. */
export function nativeSignalFeatureTarget(featureKey,template){
  if(!['adversary:choir-relay:local-mesh','adversary:choir-relay:route-around'].includes(featureKey))throw fail('signal_feature_source');
  const feature=compileNativeFeatures().find(f=>f.feature_key===featureKey),actor=nativeActorTaxonomy('adversary',template);
  if(!feature)throw fail('signal_feature_source');
  return freeze({feature_key:featureKey,feature_hash:hash(feature),target:actor});
}
