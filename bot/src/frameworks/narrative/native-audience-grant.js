/** Native narrative context registration and audience proof binding; context authority is injected. */
import {createAudienceAuthority} from './audience-authority.js';

export function createNativeAudienceGrantAdapter({buildNarrativeContext,sceneFictionHash,sceneFictionFailure}){
  if([buildNarrativeContext,sceneFictionHash,sceneFictionFailure].some(fn=>typeof fn!=='function'))
    throw new TypeError('Complete native narrative audience capabilities required.');
  const snapshots=new WeakMap();
  function registerNarrativeContext(ctx){
    snapshots.set(ctx,structuredClone({binding:ctx.binding,zone:ctx.packet.viewpoint.zone,operation:ctx.packet.operation}));
    return ctx;
  }
  function mintNarrativeAudience(ctx,{audience,taskIds}={}){
    const native=snapshots.get(ctx);
    if(!native||sceneFictionHash(native.binding)!==sceneFictionHash(ctx.binding))throw sceneFictionFailure('native_audience_context');
    const b=native.binding,scope=b.scope;
    const selected=scope.mode==='private'?'player_private':b.viewpoint==='character'?'player':'channel';
    if(audience&&audience!==selected)throw sceneFictionFailure('native_audience_mismatch');
    const tasks=taskIds||[`narrative-task:${sceneFictionHash([b.source,b.source_hash,scope,native.operation])}`];
    const proof={authorized:true,version:9,audience:selected,source_event:b.source,source_hash:b.source_hash,
      scene:b.scene,session:b.session,guild:b.guild,scope:structuredClone(scope),principal:b.principal,
      location:b.location,zone:native.zone,placement:b.placement,operation:native.operation,
      viewpoint:b.viewpoint,viewpoint_character_id:b.viewpoint==='character'?scope.actorCharacterId:null,
      recipient_user_id:selected==='channel'?null:scope.actorUserId,
      recipient_character_id:selected==='channel'?null:scope.actorCharacterId,task_ids:[...tasks]};
    proof.proof_ref=`audience-v9:${sceneFictionHash(proof)}`;
    const authority=createAudienceAuthority({authorize:request=>request.audience===selected?proof:null});
    const grant=authority.issue({audience:selected});
    return Object.freeze({authority,grant,proof:authority.inspect(grant)});
  }
  function revalidateNarrativeAudience(db,guild,proof,scope){
    if(!proof||proof.version!==9||proof.guild!==guild||sceneFictionHash(proof.scope)!==sceneFictionHash(scope))
      throw sceneFictionFailure('native_audience_scope');
    const ctx=buildNarrativeContext(db,guild,scope,proof.source_event,{operation:proof.operation});
    const current=mintNarrativeAudience(ctx,{audience:proof.audience,taskIds:proof.task_ids});
    if(sceneFictionHash(current.proof)!==sceneFictionHash(proof))throw sceneFictionFailure('native_audience_stale');
    return {ctx,...current};
  }
  return Object.freeze({registerNarrativeContext,mintNarrativeAudience,revalidateNarrativeAudience});
}
