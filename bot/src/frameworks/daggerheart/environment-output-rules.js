/** Existing native environmental output contract; source providers and publication transport remain outside. */
export const environmentOutcomeKinds=Object.freeze(['native_environment_arrival','native_environment_scene_effect',
  'native_environment_countdown','native_environment_countdown_step','native_environment_witness_accounts']);
export function createEnvironmentOutputRules({capabilities}){
const {inspectEnvironmentArrival,environmentSceneProjection,hash,currentScene,fail,assertEnvironmentAudience,environmentCountdownProjection,environmentWitnessAccountsProjection}=capabilities||{};
if([inspectEnvironmentArrival,environmentSceneProjection,hash,currentScene,fail,assertEnvironmentAudience,environmentCountdownProjection,environmentWitnessAccountsProjection].some(fn=>typeof fn!=='function'))throw new TypeError('Native environment output capabilities required');

/** Locators are proposals, never certificates. Every selected row is reverified by the renderer. */
function nativeEnvironmentOutputCandidates(db,guild,source,scope){
  const result=[];
  for(const kind of environmentOutcomeKinds)for(const row of db.listCityRecords(guild,{kind,includeGM:true,limit:100})){
    if(row.data.origin?.source===source&&hash(row.data.scope)===hash(scope))result.push({version:4,kind:'native_outcome',receipt_kind:kind,ref:row.record_key});
  }
  return result.slice(0,4);
}
function nativeEnvironmentOutput(db,guild,kind,ref,scope){
  if(kind==='native_environment_witness_accounts')return environmentWitnessAccountsProjection(db,guild,ref,scope);
  if(kind==='native_environment_scene_effect')return environmentSceneProjection(db,guild,ref,scope);
  if(kind==='native_environment_countdown')return environmentCountdownProjection(db,guild,ref,scope);
  if(kind==='native_environment_countdown_step'){
    const row=db.getCityRecord(guild,kind,ref),root=row?.data.root;
    if(!root)throw fail('environment_output_native_countdown_step_required');
    const view=environmentCountdownProjection(db,guild,root,scope);
    if(view.source.event_key!==row.source_event)throw fail('environment_output_countdown_step_superseded');return view;
  }
  if(kind!=='native_environment_arrival')throw fail('environment_output_native_receipt_kind');
  const row=inspectEnvironmentArrival(db,guild,ref,scope),d=row.data,scene=currentScene(db,guild),
    identity=db.getCityRecord(guild,'autonomous_entity',d.identity),source=db.getWorldEvent(guild,identity.source_event),
    category={authority:'Mundane authority',media:'The media',property_management:'Property management',emergency_response:'Emergency responders'}[d.proposal.category];
  if(!category||d.origin.scene!==scene.key||d.origin.session!==scene.session_id)throw fail('environment_arrival_publication_scope_changed');
  assertEnvironmentAudience(db,guild,d.scope,scope,d.origin,{current:true});
  return {text:`${category} arrives at the scene. No PC response, surrender, restraint or injury is implied.`,source,
    revision:hash([row,identity,source])};
}

return Object.freeze({nativeEnvironmentOutputCandidates,nativeEnvironmentOutput});
}
