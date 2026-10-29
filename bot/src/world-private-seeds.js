/** Bounded GM-private seed proposals in the existing GM request. Native capabilities, not model fields, own execution. */
import {worldNarrativeSources} from './frameworks/world/public.js';
function buildNarrativeContext(...args){return worldNarrativeSources.buildNarrativeContext(...args);}
import {createSeededWorldContext} from './frameworks/world/public.js';
import {worldHookSeedForGm} from './frameworks/world/public.js';
import {establishNarrativeEntity} from './frameworks/world/public.js';
import {jsonHash as hash} from './kernel/json-hash.js';
import {sceneFictionFailure as fail} from './kernel/scene-fiction-failure.js';
import {privateWorldSeedsSchema,PRIVATE_WORLD_SEED_INSTRUCTIONS} from './frameworks/world/private-world-seed-contract.js';
export {privateWorldSeedsSchema,PRIVATE_WORLD_SEED_INSTRUCTIONS};
const origins=new WeakMap(),turns=new WeakMap();
/** The existing GM service mints this before requesting proposals. No JSON capability survives serialization. */
export function createPrivateSeedOrigin(db,guild,scope,sourceRef){
  const frame=buildNarrativeContext(db,guild,scope,sourceRef),refs=[];
  for(const hook of db.listCharacterGmHooks(guild,scope.actorCharacterId)){
    const source=worldHookSeedForGm(db,guild,hook.id);
    if(source.status==='verified_private_seed'&&refs.length<4)refs.push(source.source_ref);
  }
  const origin=Object.freeze(Object.create(null));origins.set(origin,{db,guild,frame,refs});return origin;
}
export function privateSeedPrompt(origin){
  const native=origins.get(origin);if(!native)throw fail('native_private_seed_origin');
  return {version:1,seed_refs:[...native.refs],instructions:PRIVATE_WORLD_SEED_INSTRUCTIONS};
}
export function bindPrivateSeedTurn(result,origin){
  if(!origins.has(origin))throw fail('native_private_seed_origin');turns.set(result,origin);return result;
}
/** Same preview/commit transaction as all other native effects. One unsupported sibling cannot authorize or cancel another. */
export function applyPrivateSeedTurn(db,guild,result,{content}={}){
  const proposals=result?.private_world_seeds;if(proposals==null)return [];
  if(!Array.isArray(proposals)||proposals.length>4)throw fail('private_seed_proposal_bound');
  if(!proposals.length)return [];
  const native=origins.get(turns.get(result));
  if(!native||native.db!==db||native.guild!==guild)throw fail('native_private_seed_turn_binding');
  return proposals.map(proposal=>{
    try{
      if(!proposal||Object.keys(proposal).sort().join()!=='identity,seed_ref'||!native.refs.includes(proposal.seed_ref))throw fail('unqualified_seed_reference');
      const ctx=createSeededWorldContext(db,guild,native.frame,proposal.seed_ref),row=establishNarrativeEntity(db,guild,proposal.identity,ctx,{content});
      return {status:'materialized_private_identity',ref:row.record_key,source_ref:row.source_event};
    }catch(error){
      if(!['SCENE_FICTION','AUTONOMOUS_WORLD'].includes(error.code))throw error;
      const key=`private-seed-review:${hash([native.frame.binding.source,proposal])}`,reason=error.diagnostic?.category||error.code;
      db.saveCityRecord(guild,{kind:'world_private_seed_review',key,status:'needs_review',visibility:'gm',source_event:native.frame.binding.source,
        data:{version:1,proposal_hash:hash(proposal),reason,execution_authority:false,publication_authority:false}});
      return {status:'needs_review',ref:key,reason};
    }
  });
}
