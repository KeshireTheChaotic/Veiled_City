/** Native source-defined environmental feature qualification and immutable receipts. World identity creation stays behind its existing producer capability. */
import {featureCostPlan,commitFeatureResources} from './feature-costs.js';
import {featureOperationDescriptor,requireFeatureOperation} from './feature-operation-descriptors.js';
export function createEnvironmentArrivalRules({capabilities}){
const {inspectArbitrationOrigin,buildNarrativeContext,inspectNativeEnvironmentInstance,featureDisposition,nativeGmOpportunity,reservedCampaignFear,establishNarrativeEntity,worldIdentityOrigin,indexWorldEvent,hash,fail,assertEnvironmentAudience}=capabilities||{};
if([inspectArbitrationOrigin,buildNarrativeContext,inspectNativeEnvironmentInstance,featureDisposition,nativeGmOpportunity,reservedCampaignFear,establishNarrativeEntity,worldIdentityOrigin,indexWorldEvent,hash,fail,assertEnvironmentAudience].some(fn=>typeof fn!=='function'))throw new TypeError('Native environment identity feature capabilities required');
const FEATURE='environment:occult-crime-scene:sirens-outside',issuer='native:environment-arrival';
const operation=featureOperationDescriptor(FEATURE).operation,categories=operation.categories;
function rule(){
  const disposition=featureDisposition(FEATURE);
  if(disposition.status!=='supported'||disposition.feature.native_handler!=='sirens_outside')throw fail('environment_arrival_feature_not_qualified');
  requireFeatureOperation(disposition.feature,'ordinary_arrival');return disposition.feature;
}
function applyEnvironmentArrival(db,guild,origin,board,input,{content}={}){
  const o=inspectArbitrationOrigin(db,guild,origin),feature=rule();
  if(!input||Object.keys(input).sort().join()!=='category,environment,feature_ref,npc,version'||input.version!==1
    ||input.feature_ref!==FEATURE||!categories.includes(input.category)||typeof input.environment!=='string'
    ||hash(db.getCityRecord(guild,board.kind,board.record_key)?.data)!==hash(board.data)||hash(board.data.origin)!==hash(o.binding))
    throw fail('environment_arrival_closed_current_gm_action');
  const profile=inspectNativeEnvironmentInstance(db,guild,input.environment,o.scope),opportunity=nativeGmOpportunity(db,guild,board),
    key=`environment-arrival:${hash([o.binding.source,o.scope,input.environment,FEATURE])}`,
    prior=db.getCityRecord(guild,'native_environment_arrival',key);
  if(prior){const saved=inspectEnvironmentArrival(db,guild,key,o.scope);
    if(saved.data.proposal_hash!==hash(input))throw fail('environment_arrival_immutable_proposal');return saved;}
  if(profile.data.template_hash!==feature.template_hash||profile.data.location!==o.binding.location||!opportunity||opportunity.pre_roll_fear)
    throw fail('environment_arrival_native_local_opportunity');
  const npc=input.npc;
  if(!npc||npc.kind!=='npc'||npc.location_key!==o.binding.location||npc.parent_location_key!==''
    ||npc.role!==input.category||typeof content?.read!=='function')throw fail('environment_arrival_ordinary_native_identity_required');
  return db.transaction(()=>{
    const before=db.getCampaign(guild).fear,available=before-reservedCampaignFear(db,guild),
      cost=featureCostPlan(feature,{timing:'spotlight_action',additionalSpotlight:false,experience:false,fear:available,stress:0,stressMax:0});
    if(cost.fear!==operation.fear||cost.npc_stress!==0)throw fail('environment_arrival_exact_printed_fear');
    const existing=db.getCityRecord(guild,'autonomous_entity',`npc:${npc.key}`);
    if(existing||db.getNpcProfile(guild,npc.key))throw fail('environment_arrival_requires_new_identity_no_relocation_shortcut');
    const frame=buildNarrativeContext(db,guild,o.scope,o.binding.source),identity=establishNarrativeEntity(db,guild,npc,frame,{content});
    commitFeatureResources(db,guild,null,cost);
    const data={version:1,issuer,feature:FEATURE,feature_hash:hash(feature),environment:profile.record_key,environment_hash:hash(profile),
      origin:o.binding,scope:o.scope,proposal:structuredClone(input),proposal_hash:hash(input),opportunity,
      identity:identity.record_key,identity_source:identity.source_event,identity_definition_hash:hash(npc),
      fear:{before,after:db.getCampaign(guild).fear,spent:1},cost,
      authority:'Ordinary responder presence only; no combat stats, encounter activation, NPC knowledge, custody, PC action or resource effect.'};
    const mutation=db.recordMutation(guild,{sessionId:o.binding.session,actorType:'ai_gm',actorId:issuer,sourceLayer:'native_environment',
      mutationType:'sirens_ordinary_responder_arrival',entityKey:key,visibility:'gm',after:data});
    const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_environment_arrival',title:'Native source-defined responder arrival',
      source_kind:'mutation',source_id:mutation.id,session_id:o.binding.session,scene:o.binding.scene,location_key:o.binding.location,
      visibility:'gm',details:{input_source:o.binding.source,payload_hash:hash(data)}},issuer);
    return db.saveCityRecord(guild,{kind:'native_environment_arrival',key,status:'resolved',visibility:'gm',location_key:o.binding.location,source_event:source.event_key,data});
  });
}
/** Read-only receipt proof. Changed source/owner holds publication, never repeats costs or reverses presence. */
function inspectEnvironmentArrival(db,guild,key,scope){
  const row=db.getCityRecord(guild,'native_environment_arrival',key),d=row?.data,source=row&&db.getWorldEvent(guild,row.source_event),
    mutation=source&&db.getMutation(guild,source.source_id),feature=rule();
  if(row?.status!=='resolved'||row.visibility!=='gm'||d?.version!==1||d.issuer!==issuer||d.feature!==FEATURE||d.feature_hash!==hash(feature)
    ||d.proposal_hash!==hash(d.proposal)||d.identity_definition_hash!==hash(d.proposal.npc)
    ||key!==`environment-arrival:${hash([d.origin.source,d.scope,d.environment,FEATURE])}`||source?.status!=='active'
    ||source.kind!=='native_environment_arrival'||source.source_kind!=='mutation'||source.visibility!=='gm'
    ||source.session_id!==d.origin.session||source.scene!==d.origin.scene||source.location_key!==d.origin.location
    ||source.details.input_source!==d.origin.source||source.details.payload_hash!==hash(d)
    ||mutation?.actor_type!=='ai_gm'||mutation.actor_id!==issuer||mutation.source_layer!=='native_environment'
    ||mutation.mutation_type!=='sirens_ordinary_responder_arrival'||mutation.entity_key!==key||hash(JSON.parse(mutation.after_json))!==hash(d)
    ||!Number.isSafeInteger(d.fear.before)||d.fear.before<1||d.fear.before>12
    ||d.fear.spent!==1||d.fear.after!==d.fear.before-1||d.cost.fear!==1||d.cost.npc_stress!==0)
    throw fail('environment_arrival_saved_native_receipt');
  assertEnvironmentAudience(db,guild,d.scope,scope,d.origin);
  const profile=inspectNativeEnvironmentInstance(db,guild,d.environment,d.scope,{historical:true}),
    identity=db.getCityRecord(guild,'autonomous_entity',d.identity),verified=identity&&worldIdentityOrigin(db,guild,identity,scope);
  if(hash(profile)!==d.environment_hash||profile.data.template_hash!==feature.template_hash
    ||profile.data.location!==d.origin.location||profile.data.session!==d.origin.session||profile.data.scene!==d.origin.scene
    ||!verified||identity.source_event!==d.identity_source
    ||verified.version!==1||verified.identity_hash!==d.identity_definition_hash
    ||db.getWorldEvent(guild,d.origin.source)?.status!=='active')throw fail('environment_arrival_original_identity_or_source_changed');
  return row;
}

return Object.freeze({applyEnvironmentArrival,inspectEnvironmentArrival});
}
