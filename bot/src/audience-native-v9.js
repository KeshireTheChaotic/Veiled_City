/** Native audience adapters. Only registered native context snapshots can mint grants. */
import {createAudienceAuthority} from './audience-first-capability.js';
import {buildNarrativeContext} from './narrative-authority-context.js';
import {sceneFictionHash as hash,sceneFictionFailure as fail} from './scene-fiction-context.js';
const snapshots=new WeakMap();

// Called ONLY by the native context builder; not a JSON/model field or writer API.
export function registerNarrativeContext(ctx){
  snapshots.set(ctx,structuredClone({binding:ctx.binding,zone:ctx.packet.viewpoint.zone,operation:ctx.packet.operation}));
  return ctx;
}
export function mintNarrativeAudience(ctx,{audience,taskIds}={}){
  const native=snapshots.get(ctx);
  if(!native||hash(native.binding)!==hash(ctx.binding))throw fail('native_audience_context');
  const b=native.binding,scope=b.scope;
  const selected=scope.mode==='private'?'player_private':b.viewpoint==='character'?'player':'channel';
  if(audience&&audience!==selected)throw fail('native_audience_mismatch');
  const tasks=taskIds||[`narrative-task:${hash([b.source,b.source_hash,scope,native.operation])}`];
  const proof={authorized:true,version:9,audience:selected,source_event:b.source,source_hash:b.source_hash,
    scene:b.scene,session:b.session,guild:b.guild,scope:structuredClone(scope),principal:b.principal,
    location:b.location,zone:native.zone,placement:b.placement,operation:native.operation,
    viewpoint:b.viewpoint,viewpoint_character_id:b.viewpoint==='character'?scope.actorCharacterId:null,
    recipient_user_id:selected==='channel'?null:scope.actorUserId,
    recipient_character_id:selected==='channel'?null:scope.actorCharacterId,task_ids:[...tasks]};
  proof.proof_ref=`audience-v9:${hash(proof)}`;
  const authority=createAudienceAuthority({authorize:request=>request.audience===selected?proof:null});
  const grant=authority.issue({audience:selected});
  return Object.freeze({authority,grant,proof:authority.inspect(grant)});
}
/** Rebuild from DB on commit and delivery. Persisted JSON never revives an opaque grant. */
export function revalidateNarrativeAudience(db,guild,proof,scope){
  if(!proof||proof.version!==9||proof.guild!==guild||hash(proof.scope)!==hash(scope))throw fail('native_audience_scope');
  const ctx=buildNarrativeContext(db,guild,scope,proof.source_event,{operation:proof.operation});
  const current=mintNarrativeAudience(ctx,{audience:proof.audience,taskIds:proof.task_ids});
  if(hash(current.proof)!==hash(proof))throw fail('native_audience_stale');
  return {ctx,...current};
}
