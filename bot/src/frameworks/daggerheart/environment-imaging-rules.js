/** Native qualification and immutable scoped diagnostic clue; authored creative record content is unchanged. */
export function createEnvironmentImagingRules({capabilities}){
const {inspectArbitrationOrigin,inspectNativeEnvironmentInstance,featureDisposition,environmentProposalContract,nativeGmOpportunity,currentScene,indexWorldEvent,hash,narrativeSourceVisible,assertEnvironmentAudience,fail}=capabilities||{};
if([inspectArbitrationOrigin,inspectNativeEnvironmentInstance,featureDisposition,environmentProposalContract,nativeGmOpportunity,currentScene,indexWorldEvent,hash,narrativeSourceVisible,assertEnvironmentAudience,fail].some(fn=>typeof fn!=='function'))throw new TypeError('Native imaging capabilities required');
const FEATURE='environment:after-hours-emergency-department:something-in-imaging',issuer='native:environment-imaging';
const keyFor=(origin,scope,environment)=>`environment-imaging:${hash([origin.source,scope,environment,FEATURE])}`;
function featureFor(profile){
  const d=featureDisposition(FEATURE),f=d.feature;
  if(d.status!=='supported'||f.native_handler!=='environment_imaging_record'||f.template_hash!==profile.data.template_hash
    ||environmentProposalContract(f)?.handler!=='environment_imaging_record')throw fail('environment_imaging_feature_not_qualified');
  return f;
}
function validateImagingRecordProposal(feature,profile,input){
  if(feature?.feature_key!==FEATURE||feature.status!=='supported'||feature.native_handler!=='environment_imaging_record'
    ||feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'||feature.target_policy!=='none'||feature.roll_protocol!=='none'
    ||!Array.isArray(feature.costs)||feature.costs.length!==0||profile?.data?.environment!=='after-hours-emergency-department'
    ||profile.data.template_hash!==feature.template_hash||!input
    ||Object.keys(input).sort().join()!=='clue,environment,feature_ref,impossible_detail,modality,version'||input.version!==1
    ||input.feature_ref!==FEATURE||input.environment!==profile.record_key||!['scan','monitor','lab_result'].includes(input.modality)
    ||typeof input.impossible_detail!=='string'||!input.impossible_detail.trim()||input.impossible_detail.length>4000
    ||typeof input.clue!=='string'||!input.clue.trim()||input.clue.length>4000
    ||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\u202a-\u202e\u2066-\u2069]/u.test(input.impossible_detail+input.clue))
    throw fail('environment_imaging_closed_source_record');
  return {feature,record:{modality:input.modality,impossible_detail:input.impossible_detail,clue:input.clue}};
}
/** Native origin and opportunity authorize an in-fiction record; no patient or PC state is created. */
function applyEnvironmentImagingRecord(db,guild,origin,board,input){
  if(board?.kind!=='scene_intent_board'||typeof board.record_key!=='string')throw fail('environment_imaging_current_native_board');
  const o=inspectArbitrationOrigin(db,guild,origin),stored=db.getCityRecord(guild,board.kind,board.record_key);
  if(hash(stored?.data)!==hash(board.data)||hash(board.data.origin)!==hash(o.binding))throw fail('environment_imaging_current_native_board');
  const profile=inspectNativeEnvironmentInstance(db,guild,input?.environment,o.scope),feature=featureFor(profile),
    {record}=validateImagingRecordProposal(feature,profile,input),opportunity=nativeGmOpportunity(db,guild,board),
    key=keyFor(o.binding,o.scope,profile.record_key),prior=db.getCityRecord(guild,'native_environment_imaging_record',key);
  if(profile.data.location!==o.binding.location||profile.data.scene!==o.binding.scene||profile.data.session!==o.binding.session
    ||!opportunity||opportunity.pre_roll_fear)throw fail('environment_imaging_current_local_gm_opportunity');
  if(prior){const saved=inspectEnvironmentImagingRecord(db,guild,key,o.scope);
    if(saved.data.proposal_hash!==hash(input))throw fail('environment_imaging_immutable_replay');return saved;}
  return db.transaction(()=>{
    const visibility=o.scope.mode==='private'?'character':'party',subject=o.scope.mode==='private'?o.scope.actorCharacterId:null,
      data={version:1,issuer,feature:FEATURE,feature_hash:hash(feature),environment:profile.record_key,environment_hash:hash(profile),
        origin:o.binding,scope:structuredClone(o.scope),proposal:structuredClone(input),proposal_hash:hash(input),record,
        cost:{fear:0,npc_stress:0},patient:null,pc_response:'unselected',visibility,subject,
        authority:'One source-bound diagnostic finding and clue record; no patient identity, treatment, PC response or mechanic.'},
      mutation=db.recordMutation(guild,{sessionId:o.binding.session,actorType:'ai_gm',actorId:issuer,sourceLayer:'native_environment',
        mutationType:'record_impossible_imaging_finding',entityKey:key,visibility,after:data}),
      event=indexWorldEvent(db,guild,{key:`${key}:record`,kind:'native_environment_imaging_record',source_kind:'mutation',source_id:mutation.id,
        title:'Recorded impossible diagnostic finding',session_id:o.binding.session,scene:o.binding.scene,location_key:o.binding.location,
        visibility,subject_key:subject,details:{input_source:o.binding.source,payload_hash:hash(data)}},issuer);
    return db.saveCityRecord(guild,{kind:'native_environment_imaging_record',key,status:'resolved',source_event:event.event_key,
      visibility,subject_key:subject,location_key:o.binding.location,data});
  });
}
function inspectEnvironmentImagingRecord(db,guild,key,scope,{current=true}={}){
  const row=db.getCityRecord(guild,'native_environment_imaging_record',key),d=row?.data,event=row&&db.getWorldEvent(guild,row.source_event),
    mutation=event&&db.getMutation(guild,event.source_id);
  if(row?.status!=='resolved'||d?.version!==1||d.issuer!==issuer||d.feature!==FEATURE||key!==keyFor(d.origin,d.scope,d.environment)
    ||hash(d.proposal)!==d.proposal_hash||hash(d.record)!==hash({modality:d.proposal.modality,impossible_detail:d.proposal.impossible_detail,clue:d.proposal.clue})
    ||d.visibility!==(d.scope.mode==='private'?'character':'party')||d.subject!==(d.scope.mode==='private'?d.scope.actorCharacterId:null)
    ||row.visibility!==d.visibility||(row.subject_key||null)!==d.subject||d.patient!==null||d.cost?.fear!==0||d.cost?.npc_stress!==0
    ||d.pc_response!=='unselected'||event?.status!=='active'||event.kind!=='native_environment_imaging_record'
    ||event.source_kind!=='mutation'||event.details.input_source!==d.origin.source||event.details.payload_hash!==hash(d)
    ||event.session_id!==d.origin.session||event.scene!==d.origin.scene||event.location_key!==d.origin.location
    ||mutation?.actor_type!=='ai_gm'||mutation.actor_id!==issuer||mutation.source_layer!=='native_environment'
    ||mutation.mutation_type!=='record_impossible_imaging_finding'||mutation.entity_key!==key||hash(JSON.parse(mutation.after_json))!==hash(d))
    throw fail('environment_imaging_saved_native_ancestry');
  assertEnvironmentAudience(db,guild,d.scope,scope,d.origin,{current});
  const feature=featureFor(inspectNativeEnvironmentInstance(db,guild,d.environment,d.scope,{historical:!current}));
  if(hash(feature)!==d.feature_hash||hash(inspectNativeEnvironmentInstance(db,guild,d.environment,d.scope,{historical:true}))!==d.environment_hash
    ||!narrativeSourceVisible(db,guild,row.source_event,scope))throw fail('environment_imaging_source_or_audience_changed');
  if(current){const scene=currentScene(db,guild);
    if(scene.key!==d.origin.scene||scene.session_id!==d.origin.session||profileLocation(db,guild,d.environment,d.scope)!==d.origin.location)
      throw fail('environment_imaging_current_scene_changed');}
  validateImagingRecordProposal(feature,inspectNativeEnvironmentInstance(db,guild,d.environment,d.scope,{historical:true}),d.proposal);
  return row;
}
function profileLocation(db,guild,key,scope){return inspectNativeEnvironmentInstance(db,guild,key,scope).data.location;}
function environmentImagingProjection(db,guild,key,scope){
  const row=inspectEnvironmentImagingRecord(db,guild,key,scope,{current:true}),d=row.data;
  return {text:`The ${d.record.modality.replaceAll('_',' ')} shows an impossible finding: ${d.record.impossible_detail} The clue points toward: ${d.record.clue}`,
    source:db.getWorldEvent(guild,row.source_event),revision:hash(row)};
}
function nativeEnvironmentImagingSituation(db,guild,scope,location){
  const scene=currentScene(db,guild),out=[];
  for(const row of db.listCityRecords(guild,{kind:'native_environment_imaging_record',includeGM:true,limit:100})){
    if(row.data.origin?.scene!==scene.key||row.data.origin.location!==location)continue;
    try{const view=environmentImagingProjection(db,guild,row.record_key,scope);
      out.push({receipt_kind:row.kind,receipt_ref:row.record_key,source_ref:view.source.event_key,text:view.text,
        authority:'A recorded clue only; no diagnosis, treatment, PC response or mechanic.'});}
    catch(error){if(!['GM_ARBITRATION','SCENE_FICTION','STATE_CONFLICT'].includes(error.code))throw error;}
    if(out.length===6)break;
  }
  return out;
}

return Object.freeze({validateImagingRecordProposal,applyEnvironmentImagingRecord,inspectEnvironmentImagingRecord,environmentImagingProjection,nativeEnvironmentImagingSituation});
}
