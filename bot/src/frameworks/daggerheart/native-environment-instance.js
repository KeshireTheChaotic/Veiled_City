/** Scene-bound GM environment provenance outside combat. No feature, effect, disclosure or NPC grant. */
import {nativeWorldAuthoring,nativeNarrativeAudience} from './contracts/environment-sources.js';
import {compileNativeActors,executableNativeFeatures} from './native-feature-catalog.js';
import {nativeScenes} from './contracts/scenes.js';
import {nativeWorldEvents} from './contracts/world-events.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {arbitrationFailure as fail} from '../../kernel/arbitration-failure.js';
function verifiedWorldAuthoringContext(...args){return nativeWorldAuthoring.verifiedWorldAuthoringContext(...args);}
function mintNarrativeAudience(...args){return nativeNarrativeAudience.mintNarrativeAudience(...args);}
function revalidateNarrativeAudience(...args){return nativeNarrativeAudience.revalidateNarrativeAudience(...args);}
function currentScene(...args){return nativeScenes.currentScene(...args);}
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
const issuer='native:environment-instance';
const keyFor=d=>`environment-instance:${hash([d.session,d.scene,d.location,d.scope])}`;
const enabled=(db,guild)=>db.getCityCalendar(guild).flags.authoring===true
  &&db.getCityCalendar(guild).flags.gm_discretion===true
  &&db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode!=='manual';

/** Only a genuine registered native GM frame can establish a profile. A serialized role cannot. */
export function establishNativeEnvironmentInstance(db,guild,frame,input){
  if(!enabled(db,guild)||!input||Object.keys(input).sort().join()!=='environment,location,version'||input.version!==1
    ||typeof input.environment!=='string'||input.environment.length>200||typeof input.location!=='string'||input.location.length>160)
    throw fail('environment_native_authoring_and_closed_profile_required');
  const {context,private_seed}=verifiedWorldAuthoringContext(db,guild,frame),b=context.binding,
    template=compileNativeActors().find(a=>a.actor_kind==='environment'&&a.actor_key===input.environment),
    location=db.getSimulationEntity(guild,'location',input.location),scene=currentScene(db,guild);
  if(private_seed||!template||b.location!==input.location||!location||location.state.removed===true
    ||b.session!==scene.session_id||b.scene!==scene.key)throw fail('environment_exact_current_native_location_template');
  const audience=mintNarrativeAudience(context).proof,scope=structuredClone(context.scope),
    data={version:1,issuer,session:b.session,scene:b.scene,location:input.location,location_hash:hash(location),
      environment:template.actor_key,template_hash:template.template_hash,source_ref:template.source_ref,
      origin:b.source,origin_hash:hash(db.getWorldEvent(guild,b.source)),scope,audience,
      execution_authority:false,publication_authority:false},key=keyFor(data);
  return db.transaction(()=>{
    const prior=db.getCityRecord(guild,'native_environment_instance',key);
    if(prior){
      const actual=inspectNativeEnvironmentInstance(db,guild,key,scope);
      if(actual.data.environment!==data.environment||actual.data.template_hash!==data.template_hash)
        throw fail('environment_profile_already_established_explicit_reconciliation_required');
      return actual;
    }
    const mutation=db.recordMutation(guild,{sessionId:b.session,actorType:'ai_gm',actorId:issuer,
      sourceLayer:'native_environment',mutationType:'establish_environment_profile',entityKey:key,visibility:'gm',after:data});
    const event=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_environment_instance',title:'Source-bound local environment profile',
      source_kind:'mutation',source_id:mutation.id,session_id:b.session,scene:b.scene,location_key:input.location,
      visibility:'gm',details:{input_source:b.source,payload_hash:hash(data)}},issuer);
    const row=db.saveCityRecord(guild,{kind:'native_environment_instance',key,status:'active',source_event:event.event_key,
      location_key:input.location,visibility:'gm',data});
    inspectNativeEnvironmentInstance(db,guild,key,scope);return row;
  });
}

/** Rebuilding an audience proof cannot revive an opaque execution grant or turn a template into effects. */
export function inspectNativeEnvironmentInstance(db,guild,key,scope,{historical=false}={}){
  const row=typeof key==='string'&&db.getCityRecord(guild,'native_environment_instance',key),d=row?.data,
    event=row&&db.getWorldEvent(guild,row.source_event),mutation=event&&db.getMutation(guild,event.source_id),
    origin=d&&db.getWorldEvent(guild,d.origin),template=d&&compileNativeActors().find(a=>a.actor_kind==='environment'&&a.actor_key===d.environment),
    scene=historical?null:currentScene(db,guild),location=d&&db.getSimulationEntity(guild,'location',d.location);
  if(row?.status!=='active'||row.visibility!=='gm'||row.subject_key||d?.version!==1||d.issuer!==issuer||key!==keyFor(d)
    ||hash(d.scope)!==hash(scope)||db.getSession(d.session)?.guild_id!==guild
    ||!historical&&(d.session!==scene.session_id||d.scene!==scene.key||!location||location.state.removed===true||hash(location)!==d.location_hash)
    ||row.location_key!==d.location||template?.template_hash!==d.template_hash||template.source_ref!==d.source_ref
    ||d.execution_authority!==false||d.publication_authority!==false||origin?.status!=='active'||hash(origin)!==d.origin_hash
    ||event?.status!=='active'||event.kind!=='native_environment_instance'||event.source_kind!=='mutation'||event.visibility!=='gm'
    ||event.subject_key||event.session_id!==d.session||event.scene!==d.scene||event.location_key!==d.location
    ||event.details.input_source!==d.origin||event.details.payload_hash!==hash(d)
    ||mutation?.actor_type!=='ai_gm'||mutation.actor_id!==issuer||mutation.source_layer!=='native_environment'
    ||mutation.mutation_type!=='establish_environment_profile'||mutation.entity_key!==key||mutation.visibility!=='gm'
    ||mutation.session_id!==d.session||hash(JSON.parse(mutation.after_json))!==hash(d))
    throw fail('environment_native_instance_source_owner_scene_changed');
  // The immutable native establishment receipt attests the original viewpoint. A saved
  // reader may inspect it after movement/scene end, never reuse it for new effects.
  const {proof_ref,...audience}=d.audience||{},pc=d.scope.actorCharacterId&&db.getCharacter(d.scope.actorCharacterId);
  if(proof_ref!==`audience-v9:${hash(audience)}`||audience.guild!==guild||audience.session!==d.session||audience.scene!==d.scene
    ||audience.location!==d.location||audience.source_event!==d.origin||audience.source_hash!==hash(origin.details)
    ||hash(audience.scope)!==hash(scope)||d.scope.actorCharacterId&&(pc?.guild_id!==guild||pc.owner_user_id!==d.scope.actorUserId))
    throw fail('environment_original_audience_or_owner_changed');
  if(!historical){
    if(!enabled(db,guild))throw fail('environment_native_authority_disabled');
    const current=revalidateNarrativeAudience(db,guild,d.audience,scope);
    if(current.ctx.binding.location!==d.location)throw fail('environment_current_native_viewpoint_changed');
  }
  return row;
}

/** GM-private capability discovery only, including zero capabilities for an unsupported environment. */
export function nativeEnvironmentInstanceCapabilities(db,guild,key,scope){
  const row=inspectNativeEnvironmentInstance(db,guild,key,scope);
  return {instance:row.record_key,revision:hash(row),environment:row.data.environment,execution_authorized:false,
    features:executableNativeFeatures('environment').filter(f=>f.template_hash===row.data.template_hash)
      .map(f=>({key:f.feature_key,hash:hash(f),proposal_contract:environmentProposalContract(f)}))};
}

/** Exact scoped lookup, not a global latest-profile query that could cross private viewpoints. */
export function nativeEnvironmentInstanceForScope(db,guild,scope,location){
  const scene=currentScene(db,guild),key=keyFor({session:scene.session_id,scene:scene.key,location,scope});
  if(!db.getCityRecord(guild,'native_environment_instance',key))return null;
  return nativeEnvironmentInstanceCapabilities(db,guild,key,scope);
}
