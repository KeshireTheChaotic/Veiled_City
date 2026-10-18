/** Bounded GM-private seed proposals in the existing GM request. Native capabilities, not model fields, own execution. */
import {buildNarrativeContext} from './narrative-authority-context.js';
import {createSeededWorldContext} from './world-authorship.js';
import {worldHookSeedForGm} from './world-sanctioned-sources.js';
import {establishNarrativeEntity} from './autonomous-world.js';
import {sceneFictionHash as hash,sceneFictionFailure as fail} from './scene-fiction-context.js';
const origins=new WeakMap(),turns=new WeakMap();
const text=n=>({type:'string',maxLength:n}),closed=properties=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
export const privateWorldSeedsSchema={type:'array',maxItems:4,items:closed({seed_ref:text(200),identity:closed({
  kind:{type:'string',enum:['npc','location','faction','organization','district']},key:text(100),name:text(160),summary:text(600),
  location_key:text(160),parent_location_key:text(160),role:text(160),aliases:{type:'array',maxItems:6,items:text(80)}})})};
export const PRIVATE_WORLD_SEED_INSTRUCTIONS='private_world_seeds may propose at most four bounded ordinary identities from the listed authenticated GM-private hooks. '
  +'Use exact seed_ref and native identity fields. These identities remain GM-private, with no participant knowledge, disclosure, canon override, PC effects, encounter stats or powers. '
  +'Do not copy an identity asserted in the current player source; that is not independent GM authorship. Do not narrate hidden seed content to any player. '
  +'A premise is not proof of its allegations; no new factions, clues or actors become public merely because a hook mentions them. Unsupported proposals remain private review.';
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
