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
const handlers=Object.freeze({blood_rush_hold_position:true});

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
